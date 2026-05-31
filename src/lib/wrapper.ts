import { auditLog } from "../tools/observe.js";
import { checkLoop } from "./loop-guard.js";
import { log } from "./logger.js";
import { checkPreToolHooks } from "./hooks.js";

interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string; [x: string]: unknown }>;
  isError?: boolean;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Wrap a tool handler with:
 * - try/catch (never throws to MCP transport)
 * - audit logging (success + error)
 * - loop detection
 * - pre-tool hooks
 */
export function wrapTool(name: string, handler: ToolHandler): ToolHandler {
  return async (args: Record<string, unknown>): Promise<ToolResult> => {
    // Pre-tool block hook check
    const repoPath = (args.repo_path as string) || ".";
    const hookCheck = checkPreToolHooks(repoPath, name, args);
    if (!hookCheck.allowed) {
      log("warn", `Tool blocked by hook: ${name}`, { reason: hookCheck.reason });
      try {
        auditLog("hook_blocked", { tool: name, reason: hookCheck.reason });
      } catch {
        // ignore
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ error: hookCheck.reason }) }],
        isError: true,
      };
    }

    // Loop guard
    const loopWarn = checkLoop(name, args);
    if (loopWarn) {
      log("warn", loopWarn, { tool: name });
      try {
        auditLog("loop_warning", { tool: name, warning: loopWarn });
      } catch {
        // ignore audit failures — never break the tool
      }
    }

    try {
      const result = await handler(args);

      // Audit success (best-effort)
      try {
        auditLog("tool_success", { tool: name, args_keys: Object.keys(args) });
      } catch {
        // ignore
      }

      // Append loop warning if detected
      if (loopWarn && result.content.length > 0) {
        try {
          const existing = JSON.parse(result.content[0].text);
          existing._warn = loopWarn;
          result.content[0].text = JSON.stringify(existing);
        } catch {
          // payload not JSON — skip
        }
      }

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      log("error", `Tool error: ${name}`, { error: errorMsg, stack });
      try {
        auditLog("tool_error", { tool: name, error: errorMsg, stack });
      } catch {
        // ignore
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
        isError: true,
      };
    }
  };
}
