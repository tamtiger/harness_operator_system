import { auditLog } from "../tools/observe.js";
import { checkLoop } from "./loop-guard.js";
import { log } from "./logger.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

/**
 * Wrap a tool handler with:
 * - try/catch (never throws to MCP transport)
 * - audit logging (success + error)
 * - loop detection
 */
export function wrapTool(name: string, handler: ToolHandler): ToolHandler {
  return async (args: Record<string, unknown>) => {
    // Loop guard
    const loopWarn = checkLoop(name, args);
    if (loopWarn) {
      log("warn", loopWarn, { tool: name });
      auditLog("loop_warning", { tool: name, warning: loopWarn });
    }

    try {
      const result = await handler(args);

      // Audit success
      auditLog("tool_success", { tool: name, args_keys: Object.keys(args) });

      // Append loop warning if detected
      if (loopWarn && result.content.length > 0) {
        const existing = JSON.parse(result.content[0].text);
        existing._warn = loopWarn;
        result.content[0].text = JSON.stringify(existing);
      }

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      log("error", `Tool error: ${name}`, { error: errorMsg, stack });
      auditLog("tool_error", { tool: name, error: errorMsg, stack });

      return {
        content: [{ type: "text", text: JSON.stringify({ error: errorMsg }) }],
        isError: true,
      };
    }
  };
}
