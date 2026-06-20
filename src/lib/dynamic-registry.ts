import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: any) => any;
}

export async function loadRegisteredTools(): Promise<McpToolDefinition[]> {
  const toolsDir = join(__dirname, "..", "tools");
  const files = readdirSync(toolsDir);
  const registeredTools: McpToolDefinition[] = [];

  for (const file of files) {
    if (
      (file.endsWith(".ts") || file.endsWith(".js")) &&
      !file.includes(".test.") &&
      !file.includes(".spec.")
    ) {
      const filePath = join(toolsDir, file);
      const fileUrl = pathToFileURL(filePath).href;
      try {
        const module = await import(fileUrl);
        if (module && Array.isArray(module.mcpTools)) {
          registeredTools.push(...module.mcpTools);
        }
      } catch (err: any) {
        process.stderr.write(`[Registry] Error loading tool file ${file}: ${err.message}\n`);
      }
    }
  }

  return registeredTools;
}
