import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";

export interface TaskCreateResult {
  task_id: string;
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

  return { task_id: id };
}

export function taskUpdate(
  taskId: string,
  status: string
): { task_id: string; status: string } {
  const db = getDb();

  const validStatuses = ["pending", "in-progress", "done", "blocked"];
  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const result = db
    .prepare(`UPDATE tasks SET status = ? WHERE id = ?`)
    .run(status, taskId);

  if (result.changes === 0) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return { task_id: taskId, status };
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
