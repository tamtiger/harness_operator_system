import { auditLog } from "../tools/observe.js";
import { checkLoop, type LoopCheckResult } from "./loop-guard.js";
import { checkCircuit, recordSuccess, recordFailure } from "./circuit-breaker.js";
import { log } from "./logger.js";
import { checkPreToolHooks } from "./hooks.js";
import { resolveToolContext } from "./tool-context.js";

interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string; [x: string]: unknown }>;
  isError?: boolean;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Helper to create an error result
 */
function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/**
 * Helper to append warning to result
 */
function appendWarn(result: ToolResult, warning: string): void {
  if (result.content.length > 0) {
    try {
      const existing = JSON.parse(result.content[0].text);
      existing._warn = warning;
      result.content[0].text = JSON.stringify(existing);
    } catch {
      // payload not JSON — skip
    }
  }
}

/**
 * Wrap a tool handler with:
 * - try/catch (never throws to MCP transport)
 * - audit logging (success + error with duration)
 * - loop detection (session-scoped)
 * - circuit breaker (repo-scoped)
 * - pre-tool hooks
 * - duration tracking for analytics
 */
export function wrapTool(name: string, handler: ToolHandler): ToolHandler {
  return async (args: Record<string, unknown>): Promise<ToolResult> => {
    const startTime = Date.now();
    const ctx = resolveToolContext(args);

    // 1. Pre-tool hook check
    const hookCheck = checkPreToolHooks(ctx.repo_path, name, args);
    if (!hookCheck.allowed) {
      const duration_ms = Date.now() - startTime;
      auditLog("hook_blocked", { 
        tool: name, 
        reason: hookCheck.reason, 
        duration_ms,
        repo_id: ctx.repo_id,
        session_id: ctx.session_id
      });
      return errorResult(hookCheck.reason!);
    }

    // 2. Circuit breaker check
    const circuitCheck = checkCircuit(ctx.repo_id, name);
    if (circuitCheck.open) {
      const duration_ms = Date.now() - startTime;
      auditLog("tool_circuit_open", { 
        tool: name, 
        repo_id: ctx.repo_id, 
        cooldown_remaining_ms: circuitCheck.cooldown_remaining_ms,
        duration_ms,
        session_id: ctx.session_id
      });
      return errorResult(`Circuit open: ${name} failed ${circuitCheck.failures} times consecutively in this repo. Cooldown ${Math.ceil(circuitCheck.cooldown_remaining_ms! / 1000)}s remaining.`);
    }

    // 3. Loop guard check
    const loopCheck = checkLoop(ctx.session_id, name, args);
    if (loopCheck.status === 'blocked') {
      const duration_ms = Date.now() - startTime;
      auditLog("loop_blocked", { 
        tool: name, 
        session_id: ctx.session_id, 
        count: loopCheck.count, 
        duration_ms,
        repo_id: ctx.repo_id
      });
      return errorResult(`Loop detected: ${name} called ${loopCheck.count} times in 60s with same args. Blocked.`);
    }

    // 4. Execute handler
    try {
      const result = await handler(args);
      const duration_ms = Date.now() - startTime;
      const verbose = process.env.HARNESS_VERBOSE_AUDIT !== '0';

      // Record success for circuit breaker
      recordSuccess(ctx.repo_id, name);

      let resultData: unknown = undefined;
      if (verbose && result.content && result.content.length > 0) {
        try {
          resultData = JSON.parse(result.content[0].text);
        } catch {
          resultData = result.content[0].text;
        }
      }

      // Audit success with duration
      auditLog("tool_success", { 
        tool: name, 
        args_keys: Object.keys(args), 
        ...(verbose && { args, result: resultData }),
        duration_ms,
        repo_id: ctx.repo_id,
        session_id: ctx.session_id
      });

      // Append loop warning if tier 1
      if (loopCheck.status === 'warn') {
        appendWarn(result, `Loop warning: ${name} called ${loopCheck.count} times in 60s`);
      }

      return result;
    } catch (err: unknown) {
      const duration_ms = Date.now() - startTime;
      const verbose = process.env.HARNESS_VERBOSE_AUDIT !== '0';
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Record failure for circuit breaker
      recordFailure(ctx.repo_id, name);

      auditLog("tool_error", { 
        tool: name, 
        error: errorMsg, 
        ...(verbose && { args }),
        duration_ms,
        repo_id: ctx.repo_id,
        session_id: ctx.session_id
      });
      return errorResult(errorMsg);
    }
  };
}