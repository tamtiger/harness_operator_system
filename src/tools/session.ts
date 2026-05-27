import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { detectRuntime } from "../lib/runtime.js";
import { handoffRead, handoffWrite, progressLog, type HandoffData } from "./state.js";
import { taskList } from "./task.js";
import { skillList } from "./skill.js";

export interface SessionStartResult {
  session_id: string;
  last_handoff: HandoffData | null;
  pending_tasks_count: number;
  applicable_skills: string[];
  instructions_to_read: string[];
}

export interface SessionEndResult {
  session_id: string;
  status: string;
}

export interface SessionHandoffResult {
  session_id: string;
  handoff_path: string;
  progress_logged: boolean;
}

export function sessionStart(repoPath: string): SessionStartResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sessions (id, repo_path, status, started_at) VALUES (?, ?, 'active', ?)`
  ).run(id, repoPath, now);

  // Read last handoff
  const { handoff } = handoffRead(repoPath);

  // Count pending tasks
  const { tasks } = taskList(repoPath, "pending");
  const pendingCount = tasks.length;

  // Detect stack and get applicable skills
  const runtime = detectRuntime(repoPath);
  const { skills } = skillList(runtime.runtime !== "unknown" ? runtime.runtime : undefined, repoPath);
  const applicableSkills = skills.map((s) => s.name);

  // Determine instructions to read
  const instructions: string[] = ["AGENTS.md", "skill:harness-workflow"];

  return {
    session_id: id,
    last_handoff: handoff,
    pending_tasks_count: pendingCount,
    applicable_skills: applicableSkills,
    instructions_to_read: instructions,
  };
}

export function sessionResume(repoPath: string): SessionStartResult {
  // Same as session_start but semantically "continue previous work"
  return sessionStart(repoPath);
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

export function sessionHandoff(
  sessionId: string,
  summary: string,
  unfinished: string[],
  nextSteps: string[]
): SessionHandoffResult {
  const db = getDb();

  // Get session's repo_path
  const session = db
    .prepare(`SELECT repo_path FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string } | undefined;

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const repoPath = session.repo_path;

  // Write handoff file
  const { path: handoffPath } = handoffWrite(
    repoPath,
    sessionId,
    nextSteps,
    unfinished,
    summary
  );

  // Append progress log
  progressLog(repoPath, {
    summary,
    status: "handoff",
  });

  // Close session
  const now = new Date().toISOString();
  db.prepare(`UPDATE sessions SET status = 'closed', ended_at = ? WHERE id = ?`).run(
    now,
    sessionId
  );

  return {
    session_id: sessionId,
    handoff_path: handoffPath,
    progress_logged: true,
  };
}
