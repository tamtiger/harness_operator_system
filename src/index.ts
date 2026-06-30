process.env.DOTENV_CONFIG_QUIET = "true";
process.env.DOTENV_LOG_LEVEL = "quiet";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegisteredTools } from "./lib/dynamic-registry.js";
import { wrapTool } from "./lib/wrapper.js";
import { log } from "./lib/logger.js";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));

const server = new McpServer({
  name: "harness-os",
  version: packageJson.version,
});

const MAX_OUTPUT = 8192;
const FIELD_PREVIEW = 512;

function summarizeOutput(val: unknown): unknown {
  if (typeof val === "string") {
    if (val.length > FIELD_PREVIEW) {
      const preview = val.slice(0, FIELD_PREVIEW);
      return `${preview}\n... [${val.length} chars total — field summarised, use a dedicated tool to retrieve full content]`;
    }
    return val;
  }
  if (Array.isArray(val)) {
    const items = val.slice(0, 20).map(summarizeOutput);
    if (val.length > 20) {
      items.push(`... [${val.length - 20} more items omitted]` as unknown);
    }
    return items;
  }
  if (val && typeof val === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      res[k] = summarizeOutput(v);
    }
    return res;
  }
  return val;
}

function makeHandler<T extends Record<string, unknown>>(
  name: string,
  fn: (args: T) => any
) {
  return wrapTool(name, async (args) => {
    const result = await fn(args as T);
    const jsonStr = JSON.stringify(result);

    if (jsonStr.length > MAX_OUTPUT) {
      const summarised = summarizeOutput(result);
      return { content: [{ type: "text", text: JSON.stringify(summarised) }] };
    }

    return { content: [{ type: "text", text: jsonStr }] };
  });
}

async function main() {
  log("info", "harness-os starting", { pid: process.pid });
  
  // Dynamic tool registration
  const tools = await loadRegisteredTools();
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      makeHandler(tool.name, tool.handler)
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "harness-os connected");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
