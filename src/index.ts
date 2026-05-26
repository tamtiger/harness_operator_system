import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { sessionStart, sessionEnd } from "./tools/session.js";
import { taskCreate, taskUpdate, taskList } from "./tools/task.js";
import { verifyRun } from "./tools/verify.js";
import { skillLoad } from "./tools/skill.js";
import { instinctAdd, instinctGet } from "./tools/instinct.js";

const server = new McpServer({
  name: "harness-os",
  version: "0.1.0",
});

// === Session tools ===

server.tool(
  "session_start",
  "Start a new harness session for a repo. Returns session ID and instructions to read.",
  { repo_path: z.string().describe("Absolute or relative path to the repo") },
  async ({ repo_path }) => {
    const result = sessionStart(repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "session_end",
  "End an active harness session.",
  { session_id: z.string().describe("Session ID to close") },
  async ({ session_id }) => {
    try {
      const result = sessionEnd(session_id);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err: unknown) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      };
    }
  }
);

// === Task tools ===

server.tool(
  "task_create",
  "Create a new task with title and optional scope.",
  {
    title: z.string().describe("Task title"),
    scope: z.string().optional().describe("Scope description or allowed paths"),
    session_id: z.string().optional().describe("Link task to a session"),
  },
  async ({ title, scope, session_id }) => {
    const result = taskCreate(title, scope, session_id);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "task_update",
  "Update task status.",
  {
    task_id: z.string().describe("Task ID"),
    status: z
      .enum(["pending", "in-progress", "done", "blocked"])
      .describe("New status"),
  },
  async ({ task_id, status }) => {
    try {
      const result = taskUpdate(task_id, status);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err: unknown) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  "task_list",
  "List tasks, optionally filtered by repo or status.",
  {
    repo_path: z.string().optional().describe("Filter by repo path"),
    status: z
      .enum(["pending", "in-progress", "done", "blocked"])
      .optional()
      .describe("Filter by status"),
  },
  async ({ repo_path, status }) => {
    const result = taskList(repo_path, status);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Verify tools ===

server.tool(
  "verify_run",
  "Run verification pipeline for a repo (install, build, test, lint).",
  {
    repo_path: z.string().describe("Path to the repo to verify"),
    steps: z
      .array(z.string())
      .optional()
      .describe("Explicit commands to run (overrides auto-detect)"),
  },
  async ({ repo_path, steps }) => {
    const result = verifyRun(repo_path, steps);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Skill tools ===

server.tool(
  "skill_load",
  "Load a skill by name. Returns skill content or error.",
  { name: z.string().describe("Skill name (e.g. 'karpathy-guidelines')") },
  async ({ name }) => {
    const result = skillLoad(name);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Instinct tools ===

server.tool(
  "instinct_add",
  "Add a new instinct (reusable pattern learned from experience).",
  {
    description: z.string().describe("What the instinct captures"),
    tags: z.array(z.string()).describe("Tags for filtering (e.g. ['node', 'testing'])"),
  },
  async ({ description, tags }) => {
    const result = instinctAdd(description, tags);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "instinct_get",
  "Get instincts, optionally filtered by tags.",
  {
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags (returns instincts matching any tag)"),
  },
  async ({ tags }) => {
    const result = instinctGet(tags);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Start server ===

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
