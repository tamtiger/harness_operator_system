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
import { repoSummaryRead } from "./tools/repo_summary.js";
import { wrapTool } from "./lib/wrapper.js";
import { log } from "./lib/logger.js";

const server = new McpServer({
  name: "harness-os",
  version: "1.0.0",
});

/**
 * Helper: build a wrapped MCP tool handler from a sync function returning a value.
 * The wrapper handles try/catch + audit + loop detection.
 */
function makeHandler<T extends Record<string, unknown>>(
  name: string,
  fn: (args: T) => unknown
) {
  return wrapTool(name, async (args) => {
    const result = fn(args as T);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
}

// === Session tools ===

server.tool(
  "session_start",
  "Start a new harness session for a repo. Returns session ID, last handoff, and pending tasks.",
  { repo_path: z.string().describe("Absolute or relative path to the repo") },
  makeHandler("session_start", ({ repo_path }: { repo_path: string }) => sessionStart(repo_path))
);

server.tool(
  "session_resume",
  "Resume work on a repo (alias for session_start with 'continue' semantics).",
  { repo_path: z.string().describe("Absolute or relative path to the repo") },
  makeHandler("session_resume", ({ repo_path }: { repo_path: string }) => sessionResume(repo_path))
);

server.tool(
  "session_end",
  "End an active harness session.",
  { session_id: z.string().describe("Session ID to close") },
  makeHandler("session_end", ({ session_id }: { session_id: string }) => sessionEnd(session_id))
);

server.tool(
  "session_handoff",
  "End session with handoff: write handoff file + progress log + close session atomically.",
  {
    session_id: z.string().describe("Session ID"),
    summary: z.string().describe("Summary of what was accomplished"),
    unfinished: z.array(z.string()).describe("List of unfinished items"),
    next_steps: z.array(z.string()).describe("Suggested next steps for following session"),
    verify_status: z.object({
      passed: z.boolean(),
      steps_run: z.array(z.string()),
      failed_step: z.string().optional(),
    }).optional().describe("Last verify_run result summary"),
  },
  makeHandler(
    "session_handoff",
    ({
      session_id,
      summary,
      unfinished,
      next_steps,
      verify_status,
    }: {
      session_id: string;
      summary: string;
      unfinished: string[];
      next_steps: string[];
      verify_status?: { passed: boolean; steps_run: string[]; failed_step?: string };
    }) => sessionHandoff(session_id, summary, unfinished, next_steps, verify_status)
  )
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
  makeHandler(
    "task_create",
    ({ title, scope, session_id }: { title: string; scope?: string; session_id?: string }) =>
      taskCreate(title, scope, session_id)
  )
);

server.tool(
  "task_update",
  "Update task status.",
  {
    task_id: z.string().describe("Task ID"),
    status: z.enum(["pending", "in-progress", "done", "blocked"]).describe("New status"),
  },
  makeHandler(
    "task_update",
    ({ task_id, status }: { task_id: string; status: string }) => taskUpdate(task_id, status)
  )
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
  makeHandler(
    "task_list",
    ({ repo_path, status }: { repo_path?: string; status?: string }) => taskList(repo_path, status)
  )
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
    fail_fast: z.boolean().optional().describe("Stop on first failure (default true)"),
    changed_only: z.boolean().optional().describe("Lint only changed files (default false)"),
    task_id: z.string().optional().describe("If provided, auto-save evidence for this task"),
  },
  makeHandler(
    "verify_run",
    ({ repo_path, steps, fail_fast, changed_only, task_id }: {
      repo_path: string;
      steps?: string[];
      fail_fast?: boolean;
      changed_only?: boolean;
      task_id?: string;
    }) => verifyRun(repo_path, { steps, fail_fast, changed_only, task_id })
  )
);

// === Skill tools ===

server.tool(
  "skill_load",
  "Load a skill by name. Returns skill content and metadata.",
  {
    name: z.string().describe("Skill name (e.g. 'karpathy-guidelines')"),
    repo_path: z.string().optional().describe("Repo path for repo-specific skill lookup"),
  },
  makeHandler(
    "skill_load",
    ({ name, repo_path }: { name: string; repo_path?: string }) => skillLoad(name, repo_path)
  )
);

server.tool(
  "skill_list",
  "List all available skills with metadata. Optionally filter by stack.",
  {
    stack_filter: z.string().optional().describe("Filter by stack (e.g. 'node', 'dotnet')"),
    repo_path: z.string().optional().describe("Include repo-specific skills"),
  },
  makeHandler(
    "skill_list",
    ({ stack_filter, repo_path }: { stack_filter?: string; repo_path?: string }) =>
      skillList(stack_filter, repo_path)
  )
);

server.tool(
  "skill_create_from_session",
  "Generate a SKILL.md draft from a session's audit log. Returns draft only (does NOT auto-save).",
  {
    session_id: z.string().describe("Session ID to extract patterns from"),
    theme: z.string().describe("Theme/name for the skill (e.g. 'refactoring-workflow')"),
  },
  makeHandler(
    "skill_create_from_session",
    ({ session_id, theme }: { session_id: string; theme: string }) =>
      skillCreateFromSession(session_id, theme, getDb(), detectRuntime)
  )
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
  makeHandler(
    "instinct_add",
    ({
      description,
      tags,
      confidence,
      ttl_days,
    }: {
      description: string;
      tags: string[];
      confidence?: number;
      ttl_days?: number;
    }) => instinctAdd(description, tags, confidence, ttl_days)
  )
);

server.tool(
  "instinct_get",
  "Get instincts, optionally filtered by tags. Also returns available_tags for discovery.",
  {
    tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
    min_confidence: z.number().optional().describe("Minimum confidence threshold"),
  },
  makeHandler(
    "instinct_get",
    ({ tags, min_confidence }: { tags?: string[]; min_confidence?: number }) =>
      instinctGet(tags, min_confidence)
  )
);

server.tool(
  "instinct_prune",
  "Remove low-confidence or expired instincts. Use dry_run to preview.",
  {
    confidence_below: z.number().optional().describe("Remove instincts below this confidence (default 0.2)"),
    expired_only: z.boolean().optional().describe("Only remove expired instincts (past TTL)"),
    dry_run: z.boolean().optional().describe("Preview what would be removed without deleting"),
  },
  makeHandler(
    "instinct_prune",
    ({
      confidence_below,
      expired_only,
      dry_run,
    }: {
      confidence_below?: number;
      expired_only?: boolean;
      dry_run?: boolean;
    }) => instinctPrune(confidence_below, expired_only, dry_run)
  )
);

server.tool(
  "instinct_evolve",
  "Group instincts by tag cluster and suggest a SKILL.md draft. Needs 5+ instincts.",
  {
    tag_cluster: z.string().optional().describe("Tag to cluster instincts by"),
  },
  makeHandler(
    "instinct_evolve",
    ({ tag_cluster }: { tag_cluster?: string }) => instinctEvolve(tag_cluster)
  )
);

server.tool(
  "instinct_promote",
  "Promote an instinct from pending to permanent (removes TTL, boosts confidence).",
  {
    instinct_id: z.string().describe("Instinct ID to promote"),
  },
  makeHandler(
    "instinct_promote",
    ({ instinct_id }: { instinct_id: string }) => instinctPromote(instinct_id)
  )
);

// === State tools ===

server.tool(
  "progress_log",
  "Append a progress entry to .harness/progress.md.",
  {
    repo_path: z.string().describe("Path to the repo"),
    entry: z.object({
      task_id: z.string().optional(),
      summary: z.string(),
      status: z.string(),
      evidence_ref: z.string().optional(),
      files_changed: z.array(z.string()).optional().describe("List of files modified"),
    }),
  },
  makeHandler(
    "progress_log",
    ({
      repo_path,
      entry,
    }: {
      repo_path: string;
      entry: { task_id?: string; summary: string; status: string; evidence_ref?: string; files_changed?: string[] };
    }) => progressLog(repo_path, entry)
  )
);

server.tool(
  "feature_list_read",
  "Read the feature list from .harness/feature_list.json.",
  { repo_path: z.string().describe("Path to the repo") },
  makeHandler("feature_list_read", ({ repo_path }: { repo_path: string }) => featureListRead(repo_path))
);

server.tool(
  "feature_list_update",
  "Update a feature entry in .harness/feature_list.json (upsert).",
  {
    repo_path: z.string().describe("Path to the repo"),
    feature_id: z.string().describe("Feature ID"),
    patch: z.record(z.string(), z.unknown()).describe("Fields to merge"),
  },
  makeHandler(
    "feature_list_update",
    ({
      repo_path,
      feature_id,
      patch,
    }: {
      repo_path: string;
      feature_id: string;
      patch: Record<string, unknown>;
    }) => featureListUpdate(repo_path, feature_id, patch)
  )
);

server.tool(
  "handoff_write",
  "Write a handoff file for the next session.",
  {
    repo_path: z.string().describe("Path to the repo"),
    session_id: z.string().describe("Current session ID"),
    next_steps: z.array(z.string()),
    unfinished: z.array(z.string()),
    last_known_good: z.string(),
  },
  makeHandler(
    "handoff_write",
    ({
      repo_path,
      session_id,
      next_steps,
      unfinished,
      last_known_good,
    }: {
      repo_path: string;
      session_id: string;
      next_steps: string[];
      unfinished: string[];
      last_known_good: string;
    }) => handoffWrite(repo_path, session_id, next_steps, unfinished, last_known_good)
  )
);

server.tool(
  "handoff_read",
  "Read the last handoff file from .harness/handoff/last.json.",
  { repo_path: z.string().describe("Path to the repo") },
  makeHandler("handoff_read", ({ repo_path }: { repo_path: string }) => handoffRead(repo_path))
);

// === Scope tools ===

server.tool(
  "scope_get",
  "Get scope configuration for a task.",
  {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID"),
  },
  makeHandler(
    "scope_get",
    ({ repo_path, task_id }: { repo_path: string; task_id?: string }) => scopeGet(repo_path, task_id)
  )
);

server.tool(
  "scope_check",
  "Check if a file path is within scope for a task.",
  {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID"),
    file_path: z.string().describe("File path to check"),
  },
  makeHandler(
    "scope_check",
    ({
      repo_path,
      task_id,
      file_path,
    }: {
      repo_path: string;
      task_id?: string;
      file_path: string;
    }) => scopeCheck(repo_path, task_id, file_path)
  )
);

// === Observe tools ===

server.tool(
  "audit_log",
  "Log an audit event (stored in SQLite + JSONL).",
  {
    event_type: z.string(),
    payload: z.record(z.string(), z.unknown()),
  },
  makeHandler(
    "audit_log",
    ({ event_type, payload }: { event_type: string; payload: Record<string, unknown> }) =>
      auditLog(event_type, payload)
  )
);

server.tool(
  "harness_status",
  "Get current harness status: active session, pending tasks, last verify, recent instincts.",
  {
    repo_path: z.string().optional(),
  },
  makeHandler("harness_status", ({ repo_path }: { repo_path?: string }) => harnessStatus(repo_path))
);

// === Repo Summary tool ===

server.tool(
  "repo_summary_read",
  "Read or auto-generate a repo summary with tree structure and stack info. Auto-reindexes if code changes detected.",
  {
    repo_path: z.string().describe("Path to the repo"),
  },
  makeHandler(
    "repo_summary_read",
    ({ repo_path }: { repo_path: string }) => repoSummaryRead({ repo_path })
  )
);

// === Start server ===

async function main() {
  log("info", "harness-os starting", { pid: process.pid });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("info", "harness-os connected");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err}\n`);
  process.exit(1);
});
