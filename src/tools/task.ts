import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { skillSuggest } from "./skill.js";
import { detectRuntime } from "../lib/runtime.js";
import { complianceCheck } from "./compliance.js";

export interface TaskCreateResult {
  task_id: string;
  suggested_skills: Array<{ name: string; score: number }>;
  workflow_guidance: { current_phase: string; next_action: string };
}

export interface TaskRecord {
  id: string;
  session_id: string | null;
  title: string;
  scope: string | null;
  status: string;
  created_at: string;
  task_type: string;
}

function inferTaskType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("bug") || t.includes("fix") || t.includes("lỗi") || t.includes("sửa")) return "bugfix";
  if (t.includes("feature") || t.includes("tính năng") || t.includes("thêm")) return "feature";
  if (t.includes("refactor") || t.includes("cấu trúc lại")) return "refactor";
  if (t.includes("test") || t.includes("kiểm thử")) return "test";
  if (t.includes("doc") || t.includes("tài liệu") || t.includes("readme")) return "docs";
  if (t.includes("config") || t.includes("cấu hình")) return "config";
  if (t.includes("research") || t.includes("tìm hiểu") || t.includes("nghiên cứu")) return "research";
  if (t.includes("debug") || t.includes("chẩn đoán")) return "debug";
  if (t.includes("hotfix")) return "hotfix";
  return "unknown";
}

export function taskCreate(
  title: string,
  scope?: string,
  sessionId?: string,
  taskType?: string
): TaskCreateResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resolvedTaskType = taskType || inferTaskType(title);

  db.prepare(
    `INSERT INTO tasks (id, session_id, title, scope, status, created_at, task_type) VALUES (?, ?, ?, ?, 'pending', ?, ?)`
  ).run(id, sessionId ?? null, title, scope ?? null, now, resolvedTaskType);

  let repoPath: string | undefined;
  if (sessionId) {
    const row = db.prepare("SELECT repo_path FROM sessions WHERE id = ?").get(sessionId) as { repo_path: string } | undefined;
    if (row) {
      repoPath = row.repo_path;
      // Update session phase to SELECT
      db.prepare("UPDATE sessions SET current_phase = 'SELECT' WHERE id = ?").run(sessionId);
    }
  }

  const runtime = repoPath ? detectRuntime(repoPath) : undefined;
  const stack = runtime && runtime.runtime !== "unknown" ? runtime.runtime : undefined;
  const suggestRes = skillSuggest(title, scope, stack, 10, repoPath);
  const suggested = suggestRes.suggested_skills
    .filter(s => s.tier >= 2)
    .slice(0, 3)
    .map(s => ({ name: s.name, score: s.score }));

  return {
    task_id: id,
    suggested_skills: suggested,
    workflow_guidance: {
      current_phase: "SELECT",
      next_action: "Consider loading suggested skills, then set task to 'in-progress' and proceed to EXECUTE phase",
    },
  };
}

export function taskUpdate(
  taskId: string,
  status: string
): { task_id: string; status: string; workflow_guidance?: { current_phase: string; next_action: string } } {
  const db = getDb();

  const validStatuses = ["pending", "in-progress", "done", "blocked"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const task = db.prepare("SELECT session_id FROM tasks WHERE id = ?").get(taskId) as { session_id: string | null } | undefined;
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  if (task.session_id && status === "done") {
    const session = db.prepare("SELECT verify_passed FROM sessions WHERE id = ?").get(task.session_id) as { verify_passed: number } | undefined;
    if (session) {
      const comp = complianceCheck(task.session_id);
      if (session.verify_passed === 0 || comp.status === "FAIL") {
        const err = new Error(
          `ERR_COMPLIANCE: Cannot complete task because verification failed or compliance check failed. Verification passed: ${session.verify_passed === 1}, Compliance status: ${comp.status}.`
        );
        (err as any).code = "ERR_COMPLIANCE";
        throw err;
      }
    }
  }

  const result = db
    .prepare(`UPDATE tasks SET status = ? WHERE id = ?`)
    .run(status, taskId);

  let workflow_guidance: { current_phase: string; next_action: string } | undefined;

  if (task.session_id) {
    if (status === "in-progress") {
      db.prepare("UPDATE sessions SET current_phase = 'EXECUTE' WHERE id = ?").run(task.session_id);
      workflow_guidance = {
        current_phase: "EXECUTE",
        next_action: "You are in the EXECUTE phase. Perform surgical changes and log progress incrementally.",
      };
    } else if (status === "done") {
      workflow_guidance = {
        current_phase: "EXECUTE",
        next_action: "Task marked done. Run verify_run() to proceed to VERIFY phase.",
      };
    }
  }

  return {
    task_id: taskId,
    status,
    ...(workflow_guidance ? { workflow_guidance } : {}),
  };
}

export function taskList(
  repoPath?: string,
  status?: string
): { tasks: TaskRecord[] } {
  const db = getDb();

  let query = `SELECT t.* FROM tasks t`;
  const params: string[] = [];
  const conditions: string[] = [];

  if (repoPath) {
    query += ` JOIN sessions s ON t.session_id = s.id`;
    conditions.push(`s.repo_path = ?`);
    params.push(repoPath);
  }

  if (status) {
    conditions.push(`t.status = ?`);
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY t.created_at DESC`;

  const tasks = db.prepare(query).all(...params) as TaskRecord[];
  return { tasks };
}

import { z } from "zod";

export const mcpTools = [
  {
    name: "task_create",
    description: "Create a new task with title and optional scope.",
    inputSchema: {
      title: z.string().describe("Task title"),
      scope: z.string().optional().describe("Scope description or allowed paths"),
      session_id: z.string().optional().describe("Link task to a session"),
      task_type: z.string().optional().describe("Task type taxonomy (e.g. 'feature', 'bugfix', 'refactor', 'test', 'docs', 'config', 'research', 'debug', 'hotfix')"),
    },
    handler: async (args: any) => taskCreate(args.title, args.scope, args.session_id, args.task_type),
  },
  {
    name: "task_update",
    description: "Update task status.",
    inputSchema: {
      task_id: z.string().describe("Task ID"),
      status: z.enum(["pending", "in-progress", "done", "blocked"]).describe("New status"),
    },
    handler: async (args: any) => taskUpdate(args.task_id, args.status),
  },
  {
    name: "task_list",
    description: "List tasks, optionally filtered by repo or status.",
    inputSchema: {
      repo_path: z.string().optional().describe("Filter by repo path"),
      status: z.enum(["pending", "in-progress", "done", "blocked"]).optional().describe("Filter by status"),
    },
    handler: async (args: any) => taskList(args.repo_path, args.status),
  },
];
