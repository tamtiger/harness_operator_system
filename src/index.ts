import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { sessionStart, sessionEnd, sessionResume, sessionHandoff } from "./tools/session.js";
import { taskCreate, taskUpdate, taskList } from "./tools/task.js";
import { verifyRun } from "./tools/verify.js";
import { skillLoad, skillList, skillCreateFromSession, skillSuggest } from "./tools/skill.js";
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
import { subagentInvoke } from "./tools/subagent.js";
import { wrapTool } from "./lib/wrapper.js";
import { log } from "./lib/logger.js";

const server = new McpServer({
  name: "harness-os",
  version: "1.3.2",
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

server.registerTool(
  "session_start",
  {
    description: "Start a new harness session for a repo. Returns session ID, last handoff, and pending tasks.",
    inputSchema: { repo_path: z.string().describe("Absolute or relative path to the repo") },
  },
  makeHandler("session_start", ({ repo_path }: { repo_path: string }) => sessionStart(repo_path))
);

server.registerTool(
  "session_resume",
  {
    description: "Resume work on a repo (alias for session_start with 'continue' semantics).",
    inputSchema: { repo_path: z.string().describe("Absolute or relative path to the repo") },
  },
  makeHandler("session_resume", ({ repo_path }: { repo_path: string }) => sessionResume(repo_path))
);

server.registerTool(
  "session_end",
  {
    description: "End an active harness session.",
    inputSchema: { session_id: z.string().describe("Session ID to close") },
  },
  makeHandler("session_end", ({ session_id }: { session_id: string }) => sessionEnd(session_id))
);

server.registerTool(
  "session_handoff",
  {
    description: "End session with handoff: write handoff file + progress log + close session atomically.",
    inputSchema: {
    session_id: z.string().describe("Session ID"),
    summary: z.string().describe("Summary of what was accomplished"),
    unfinished: z.array(z.string()).describe("List of unfinished items"),
    next_steps: z.array(z.string()).describe("Suggested next steps for following session"),
    verify_status: z.object({
      passed: z.boolean(),
      steps_run: z.array(z.string()),
      failed_step: z.string().optional(),
    }).optional().describe("Last verify_run result summary"),
    suggested_skills: z.array(z.string()).optional().describe("Names of skills suggested for the next session"),
  },
  },
  makeHandler(
    "session_handoff",
    ({
      session_id,
      summary,
      unfinished,
      next_steps,
      verify_status,
      suggested_skills,
    }: {
      session_id: string;
      summary: string;
      unfinished: string[];
      next_steps: string[];
      verify_status?: { passed: boolean; steps_run: string[]; failed_step?: string };
      suggested_skills?: string[];
    }) => sessionHandoff(session_id, summary, unfinished, next_steps, verify_status, suggested_skills)
  )
);

// === Task tools ===

server.registerTool(
  "task_create",
  {
    description: "Create a new task with title and optional scope.",
    inputSchema: {
    title: z.string().describe("Task title"),
    scope: z.string().optional().describe("Scope description or allowed paths"),
    session_id: z.string().optional().describe("Link task to a session"),
  },
  },
  makeHandler(
    "task_create",
    ({ title, scope, session_id }: { title: string; scope?: string; session_id?: string }) =>
      taskCreate(title, scope, session_id)
  )
);

server.registerTool(
  "task_update",
  {
    description: "Update task status.",
    inputSchema: {
    task_id: z.string().describe("Task ID"),
    status: z.enum(["pending", "in-progress", "done", "blocked"]).describe("New status"),
  },
  },
  makeHandler(
    "task_update",
    ({ task_id, status }: { task_id: string; status: string }) => taskUpdate(task_id, status)
  )
);

server.registerTool(
  "task_list",
  {
    description: "List tasks, optionally filtered by repo or status.",
    inputSchema: {
    repo_path: z.string().optional().describe("Filter by repo path"),
    status: z
      .enum(["pending", "in-progress", "done", "blocked"])
      .optional()
      .describe("Filter by status"),
  },
  },
  makeHandler(
    "task_list",
    ({ repo_path, status }: { repo_path?: string; status?: string }) => taskList(repo_path, status)
  )
);

// === Verify tools ===

server.registerTool(
  "verify_run",
  {
    description: "Run verification pipeline for a repo (install, build, test, lint).",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo to verify"),
    steps: z
      .array(z.string())
      .optional()
      .describe("Explicit commands to run (overrides auto-detect)"),
    fail_fast: z.boolean().optional().describe("Stop on first failure (default true)"),
    changed_only: z.boolean().optional().describe("Lint only changed files (default false)"),
    task_id: z.string().optional().describe("If provided, auto-save evidence for this task"),
  },
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

server.registerTool(
  "skill_load",
  {
    description: "Load a skill by name. Returns skill content and metadata.",
    inputSchema: {
    name: z.string().describe("Skill name (e.g. 'karpathy-guidelines')"),
    repo_path: z.string().optional().describe("Repo path for repo-specific skill lookup"),
  },
  },
  makeHandler(
    "skill_load",
    ({ name, repo_path }: { name: string; repo_path?: string }) => skillLoad(name, repo_path)
  )
);

server.registerTool(
  "skill_list",
  {
    description: "List all available skills with metadata. Optionally filter by stack.",
    inputSchema: {
    stack_filter: z.string().optional().describe("Filter by stack (e.g. 'node', 'dotnet')"),
    repo_path: z.string().optional().describe("Include repo-specific skills"),
  },
  },
  makeHandler(
    "skill_list",
    ({ stack_filter, repo_path }: { stack_filter?: string; repo_path?: string }) =>
      skillList(stack_filter, repo_path)
  )
);

server.registerTool(
  "skill_create_from_session",
  {
    description: "Generate a SKILL.md draft from a session's audit log. Returns draft only (does NOT auto-save).",
    inputSchema: {
    session_id: z.string().describe("Session ID to extract patterns from"),
    theme: z.string().describe("Theme/name for the skill (e.g. 'refactoring-workflow')"),
  },
  },
  makeHandler(
    "skill_create_from_session",
    ({ session_id, theme }: { session_id: string; theme: string }) =>
      skillCreateFromSession(session_id, theme, getDb(), detectRuntime)
  )
);

server.registerTool(
  "skill_suggest",
  {
    description: "Suggest relevant skills for a task based on title and context.",
    inputSchema: {
      task_title: z.string().optional().describe("Task title to match against"),
      task_scope: z.string().optional().describe("Task scope for additional context"),
      stack: z.string().optional().describe("Stack filter (node, dotnet, etc.)"),
      max_results: z.number().optional().describe("Max skills to return (default 8)"),
      repo_path: z.string().optional().describe("Repo path for repo-specific skills"),
    },
  },
  makeHandler(
    "skill_suggest",
    ({
      task_title,
      task_scope,
      stack,
      max_results,
      repo_path,
    }: {
      task_title?: string;
      task_scope?: string;
      stack?: string;
      max_results?: number;
      repo_path?: string;
    }) => skillSuggest(task_title, task_scope, stack, max_results, repo_path)
  )
);

server.registerTool(
  "subagent_invoke",
  {
    description: "Invoke a specialized subagent to execute a specific plan task. Performs scope verification on all context files.",
    inputSchema: {
      role: z.string().describe("The specialized role for the subagent (e.g., Coder, Tester, Reviewer)"),
      prompt: z.string().describe("Instructions, goals, and rules for the subagent to execute"),
      context_files: z.array(z.string()).describe("A list of files containing necessary context that the subagent needs to access"),
      commands: z.array(z.string()).describe("Shell commands for the worker to execute sequentially"),
      repo_path: z.string().optional().describe("Root path of the repository"),
      timeout_seconds: z.number().optional().describe("Timeout per command in seconds (default 300)"),
      wait: z.boolean().optional().describe("If true, block until worker completes (default false)"),
    },
  },
  makeHandler(
    "subagent_invoke",
    ({
      role,
      prompt,
      context_files,
      commands,
      repo_path,
      timeout_seconds,
      wait,
    }: {
      role: string;
      prompt: string;
      context_files: string[];
      commands: string[];
      repo_path?: string;
      timeout_seconds?: number;
      wait?: boolean;
    }) => subagentInvoke(role, prompt, context_files, commands, repo_path || ".", timeout_seconds || 300, wait || false)
  )
);

// === Instinct tools ===

server.registerTool(
  "instinct_add",
  {
    description: "Add a new instinct (reusable pattern learned from experience).",
    inputSchema: {
    description: z.string().describe("What the instinct captures"),
    tags: z.array(z.string()).describe("Tags for filtering (e.g. ['node', 'testing'])"),
    confidence: z.number().optional().describe("Initial confidence (0-1, default 0.5)"),
    ttl_days: z.number().optional().describe("Time-to-live in days (null = permanent)"),
  },
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

server.registerTool(
  "instinct_get",
  {
    description: "Get instincts, optionally filtered by tags. Also returns available_tags for discovery.",
    inputSchema: {
    tags: z.array(z.string()).optional().describe("Filter by tags (any match)"),
    min_confidence: z.number().optional().describe("Minimum confidence threshold"),
  },
  },
  makeHandler(
    "instinct_get",
    ({ tags, min_confidence }: { tags?: string[]; min_confidence?: number }) =>
      instinctGet(tags, min_confidence)
  )
);

server.registerTool(
  "instinct_prune",
  {
    description: "Remove low-confidence or expired instincts. Use dry_run to preview.",
    inputSchema: {
    confidence_below: z.number().optional().describe("Remove instincts below this confidence (default 0.2)"),
    expired_only: z.boolean().optional().describe("Only remove expired instincts (past TTL)"),
    dry_run: z.boolean().optional().describe("Preview what would be removed without deleting"),
  },
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

server.registerTool(
  "instinct_evolve",
  {
    description: "Group instincts by tag cluster and suggest a SKILL.md draft. Needs 5+ instincts.",
    inputSchema: {
    tag_cluster: z.string().optional().describe("Tag to cluster instincts by"),
  },
  },
  makeHandler(
    "instinct_evolve",
    ({ tag_cluster }: { tag_cluster?: string }) => instinctEvolve(tag_cluster)
  )
);

server.registerTool(
  "instinct_promote",
  {
    description: "Promote an instinct from pending to permanent (removes TTL, boosts confidence).",
    inputSchema: {
    instinct_id: z.string().describe("Instinct ID to promote"),
  },
  },
  makeHandler(
    "instinct_promote",
    ({ instinct_id }: { instinct_id: string }) => instinctPromote(instinct_id)
  )
);

// === State tools ===

server.registerTool(
  "progress_log",
  {
    description: "Append a progress entry to .harness/progress.md.",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
    entry: z.object({
      task_id: z.string().optional(),
      summary: z.string(),
      status: z.string(),
      evidence_ref: z.string().optional(),
      files_changed: z.array(z.string()).optional().describe("List of files modified"),
    }),
  },
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

server.registerTool(
  "feature_list_read",
  {
    description: "Read the feature list from .harness/feature_list.json.",
    inputSchema: { repo_path: z.string().describe("Path to the repo") },
  },
  makeHandler("feature_list_read", ({ repo_path }: { repo_path: string }) => featureListRead(repo_path))
);

server.registerTool(
  "feature_list_update",
  {
    description: "Update a feature entry in .harness/feature_list.json (upsert).",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
    feature_id: z.string().describe("Feature ID"),
    patch: z.record(z.string(), z.unknown()).describe("Fields to merge"),
  },
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

server.registerTool(
  "handoff_write",
  {
    description: "Write a handoff file for the next session.",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
    session_id: z.string().describe("Current session ID"),
    next_steps: z.array(z.string()),
    unfinished: z.array(z.string()),
    last_known_good: z.string(),
    suggested_skills: z.array(z.string()).optional().describe("Suggested skills"),
  },
  },
  makeHandler(
    "handoff_write",
    ({
      repo_path,
      session_id,
      next_steps,
      unfinished,
      last_known_good,
      suggested_skills,
    }: {
      repo_path: string;
      session_id: string;
      next_steps: string[];
      unfinished: string[];
      last_known_good: string;
      suggested_skills?: string[];
    }) => handoffWrite(repo_path, session_id, next_steps, unfinished, last_known_good, undefined, undefined, suggested_skills)
  )
);

server.registerTool(
  "handoff_read",
  {
    description: "Read the last handoff file from .harness/handoff_last.json.",
    inputSchema: { repo_path: z.string().describe("Path to the repo") },
  },
  makeHandler("handoff_read", ({ repo_path }: { repo_path: string }) => handoffRead(repo_path))
);

// === Scope tools ===

server.registerTool(
  "scope_get",
  {
    description: "Get scope configuration for a task.",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID"),
  },
  },
  makeHandler(
    "scope_get",
    ({ repo_path, task_id }: { repo_path: string; task_id?: string }) => scopeGet(repo_path, task_id)
  )
);

server.registerTool(
  "scope_check",
  {
    description: "Check if a file path is within scope for a task.",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
    task_id: z.string().optional().describe("Task ID"),
    file_path: z.string().describe("File path to check"),
  },
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

server.registerTool(
  "audit_log",
  {
    description: "Log an audit event (stored in SQLite + JSONL).",
    inputSchema: {
    event_type: z.string(),
    payload: z.record(z.string(), z.unknown()),
  },
  },
  makeHandler(
    "audit_log",
    ({ event_type, payload }: { event_type: string; payload: Record<string, unknown> }) =>
      auditLog(event_type, payload)
  )
);

server.registerTool(
  "harness_status",
  {
    description: "Get current harness status: active session, pending tasks, last verify, recent instincts.",
    inputSchema: {
    repo_path: z.string().optional(),
  },
  },
  makeHandler("harness_status", ({ repo_path }: { repo_path?: string }) => harnessStatus(repo_path))
);

// === Repo Summary tool ===

server.registerTool(
  "repo_summary_read",
  {
    description: "Read or auto-generate a repo summary with tree structure and stack info. Auto-reindexes if code changes detected.",
    inputSchema: {
    repo_path: z.string().describe("Path to the repo"),
  },
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
