import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";

export interface SessionStartResult {
  session_id: string;
  instructions_to_read: string[];
}

export interface SessionEndResult {
  session_id: string;
  status: string;
}

export function sessionStart(repoPath: string): SessionStartResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sessions (id, repo_path, status, started_at) VALUES (?, ?, 'active', ?)`
  ).run(id, repoPath, now);

  return {
    session_id: id,
    instructions_to_read: ["AGENTS.md"],
  };
}

export function sessionEnd(sessionId: string): SessionEndResult {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(`UPDATE sessions SET status = 'closed', ended_at = ? WHERE id = ?`)
    .run(now, sessionId);

  if (result.changes === 0) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return { session_id: sessionId, status: "closed" };
}
