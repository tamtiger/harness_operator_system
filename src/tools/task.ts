import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { skillSuggest } from "./skill.js";
import { detectRuntime } from "../lib/runtime.js";

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
}

export function taskCreate(
  title: string,
  scope?: string,
  sessionId?: string
): TaskCreateResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO tasks (id, session_id, title, scope, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`
  ).run(id, sessionId ?? null, title, scope ?? null, now);

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
