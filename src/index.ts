import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { sessionStart, sessionEnd, sessionResume, sessionHandoff } from "./tools/session.js";
import { taskCreate, taskUpdate, taskList } from "./tools/task.js";
import { verifyRun } from "./tools/verify.js";
import { skillLoad, skillList, skillCreateFromSession } from "./tools/skill.js";
import { instinctAdd, instinctGet, instinctPrune, instinctEvolve, instinctPromote } from "./tools/instinct.js";
import { getDb } from "./db/client.js";
import { detectRuntime } from "./lib/runtime.js";
import {
  progressLog,
  featureListRead,
  featureListUpdate,
  handoffWrite,
  handoffRead,
} from "./tools/state.js";
import { scopeGet, scopeCheck } from "./tools/scope.js";
import { auditLog, harnessStatus } from "./tools/observe.js";

const server = new McpServer({
  name: "harness-os",
  version: "0.3.0",
});

// === Session tools ===

server.tool(
  "session_start",
  "Start a new harness session for a repo. Returns session ID, last handoff, and pending tasks.",
  { repo_path: z.string().describe("Absolute or relative path to the repo") },
  async ({ repo_path }) => {
    const result = sessionStart(repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "session_resume",
  "Resume work on a repo (alias for session_start with 'continue' semantics).",
  { repo_path: z.string().describe("Absolute or relative path to the repo") },
  async ({ repo_path }) => {
    const result = sessionResume(repo_path);
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

server.tool(
  "session_handoff",
  "End session with handoff: write handoff file + progress log + close session atomically.",
  {
    session_id: z.string().describe("Session ID"),
    summary: z.string().describe("Summary of what was accomplished"),
    unfinished: z.array(z.string()).describe("List of unfinished items"),
    next_steps: z.array(z.string()).describe("Suggested next steps for following session"),
  },
  async ({ session_id, summary, unfinished, next_steps }) => {
    try {
      const result = sessionHandoff(session_id, summary, unfinished, next_steps);
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
  "Load a skill by name. Returns skill content and metadata.",
  {
    name: z.string().describe("Skill name (e.g. 'karpathy-guidelines')"),
    repo_path: z.string().optional().describe("Repo path for repo-specific skill lookup"),
  },
  async ({ name, repo_path }) => {
    const result = skillLoad(name, repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "skill_list",
  "List all available skills with metadata. Optionally filter by stack.",
  {
    stack_filter: z.string().optional().describe("Filter by stack (e.g. 'node', 'dotnet')"),
    repo_path: z.string().optional().describe("Include repo-specific skills"),
  },
  async ({ stack_filter, repo_path }) => {
    const result = skillList(stack_filter, repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "skill_create_from_session",
  "Generate a SKILL.md draft from a session's audit log. Returns draft only (does NOT auto-save).",
  {
    session_id: z.string().describe("Session ID to extract patterns from"),
    theme: z.string().describe("Theme/name for the skill (e.g. 'refactoring-workflow')"),
  },
  async ({ session_id, theme }) => {
    const db = getDb();
    const result = skillCreateFromSession(session_id, theme, db, detectRuntime);
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
    confidence: z.number().optional().describe("Initial confidence (0-1, default 0.5)"),
    ttl_days: z.number().optional().describe("Time-to-live in days (null = permanent)"),
  },
  async ({ description, tags, confidence, ttl_days }) => {
    const result = instinctAdd(description, tags, confidence, ttl_days);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "instinct_get",
  "Get instincts, optionally filtered by tags. Also returns available_tags for discovery.",
  {
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags (returns instincts matching any tag)"),
    min_confidence: z.number().optional().describe("Minimum confidence threshold"),
  },
  async ({ tags, min_confidence }) => {
    const result = instinctGet(tags, min_confidence);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "instinct_prune",
  "Remove low-confidence or expired instincts. Use dry_run to preview.",
  {
    confidence_below: z.number().optional().describe("Remove instincts below this confidence (default 0.2)"),
    expired_only: z.boolean().optional().describe("Only remove expired instincts (past TTL)"),
    dry_run: z.boolean().optional().describe("Preview what would be removed without deleting"),
  },
  async ({ confidence_below, expired_only, dry_run }) => {
    const result = instinctPrune(confidence_below, expired_only, dry_run);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "instinct_evolve",
  "Group instincts by tag cluster and suggest a SKILL.md draft. Needs 5+ instincts.",
  {
    tag_cluster: z.string().optional().describe("Tag to cluster instincts by"),
  },
  async ({ tag_cluster }) => {
    const result = instinctEvolve(tag_cluster);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "instinct_promote",
  "Promote an instinct from pending to permanent (removes TTL, boosts confidence).",
  {
    instinct_id: z.string().describe("Instinct ID to promote"),
  },
  async ({ instinct_id }) => {
    try {
      const result = instinctPromote(instinct_id);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err: unknown) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
        isError: true,
      };
    }
  }
);

// === State tools ===

server.tool(
  "progress_log",
  "Append a progress entry to .harness/progress.md.",
  {
    repo_path: z.string().describe("Path to the repo"),
    entry: z.object({
      task_id: z.string().optional().describe("Related task ID"),
      summary: z.string().describe("What was done"),
      status: z.string().describe("done | in-progress | blocked"),
      evidence_ref: z.string().optional().describe("Path to evidence file"),
    }),
  },
  async ({ repo_path, entry }) => {
    const result = progressLog(repo_path, entry);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "feature_list_read",
  "Read the feature list from .harness/feature_list.json.",
  { repo_path: z.string().describe("Path to the repo") },
  async ({ repo_path }) => {
    const result = featureListRead(repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "feature_list_update",
  "Update a feature entry in .harness/feature_list.json (upsert).",
  {
    repo_path: z.string().describe("Path to the repo"),
    feature_id: z.string().describe("Feature ID to update or create"),
    patch: z.record(z.string(), z.unknown()).describe("Fields to merge into the feature entry"),
  },
  async ({ repo_path, feature_id, patch }) => {
    const result = featureListUpdate(repo_path, feature_id, patch);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "handoff_write",
  "Write a handoff file for the next session.",
  {
    repo_path: z.string().describe("Path to the repo"),
    session_id: z.string().describe("Current session ID"),
    next_steps: z.array(z.string()).describe("What the next session should do"),
    unfinished: z.array(z.string()).describe("Items not completed"),
    last_known_good: z.string().describe("Last verified good state description"),
  },
  async ({ repo_path, session_id, next_steps, unfinished, last_known_good }) => {
    const result = handoffWrite(repo_path, session_id, next_steps, unfinished, last_known_good);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "handoff_read",
  "Read the last handoff file from .harness/handoff/last.json.",
  { repo_path: z.string().describe("Path to the repo") },
  async ({ repo_path }) => {
    const result = handoffRead(repo_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Scope tools ===

server.tool(
  "scope_get",
  "Get scope configuration for a task (allowed paths, forbidden paths, definition of done).",
  {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID for task-specific scope"),
  },
  async ({ repo_path, task_id }) => {
    const result = scopeGet(repo_path, task_id);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "scope_check",
  "Check if a file path is within scope for a task.",
  {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID"),
    file_path: z.string().describe("File path to check (relative to repo)"),
  },
  async ({ repo_path, task_id, file_path }) => {
    const result = scopeCheck(repo_path, task_id, file_path);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// === Observe tools ===

server.tool(
  "audit_log",
  "Log an audit event (stored in SQLite + JSONL).",
  {
    event_type: z.string().describe("Event type (e.g. 'tool_call', 'verify_run', 'error')"),
    payload: z.record(z.string(), z.unknown()).describe("Event payload data"),
  },
  async ({ event_type, payload }) => {
    const result = auditLog(event_type, payload);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

server.tool(
  "harness_status",
  "Get current harness status: active session, pending tasks, last verify, recent instincts.",
  {
    repo_path: z.string().optional().describe("Filter by repo path"),
  },
  async ({ repo_path }) => {
    const result = harnessStatus(repo_path);
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
