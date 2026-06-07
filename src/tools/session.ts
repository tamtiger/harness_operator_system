import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { getDb, registerRepo, updateRepoLastActive } from "../db/client.js";
import { detectRuntime } from "../lib/runtime.js";
import { readRepoConfig, createRepoConfig, resolveGlobalRepoPath } from "../lib/repo-identity.js";
import { migrateRepoState } from "../lib/state-migration.js";
import { ensureDir } from "../lib/repo.js";
import { handoffRead, handoffWrite, progressLog, type HandoffData } from "./state.js";
import { taskList } from "./task.js";
import { skillList } from "./skill.js";
import { getTier1Skills, type SkillWithMetadata } from "../lib/skill-matcher.js";
import { checkStopValidation } from "../lib/hooks.js";
import { cleanupExpiredWorkers } from "../lib/worker-registry.js";
import { instinctGet, type InstinctRecord } from "./instinct.js";

export interface SessionStartResult {
  session_id: string;
  last_handoff: HandoffData | null;
  pending_tasks_count: number;
  applicable_skills: string[];
  instructions_to_read: string[];
  never_again: string[];
  relevant_knowledge: InstinctRecord[];
  _warn?: string;
}

export interface SessionEndResult {
  session_id: string;
  status: string;
  duration_seconds: number;
  error?: string;
}

export interface SessionHandoffResult {
  session_id: string;
  handoff_path?: string;
  progress_logged?: boolean;
  duration_seconds?: number;
  error?: string;
}

export function sessionStart(repoPath: string): SessionStartResult {
  // --- v1.0 auto-migration: config, register, migrate, ensure dirs ---
  let config = readRepoConfig(repoPath);
  if (!config) config = createRepoConfig(repoPath);

  registerRepo(config);
  updateRepoLastActive(config.repo_id);

  migrateRepoState(repoPath, config.repo_id);

  const globalRepoDir = resolveGlobalRepoPath(config.repo_id);
  ensureDir(join(globalRepoDir, "artifacts", "plans"));
  ensureDir(join(globalRepoDir, "artifacts", "research"));
  ensureDir(join(globalRepoDir, "artifacts", "reviews"));
  // --- end v1.0 auto-migration ---

  const db = getDb();

  // Auto-detect and recover orphaned sessions for this repo
  const orphaned = db.prepare(
    "SELECT id, started_at FROM sessions WHERE repo_path = ? AND status = 'active'"
  ).all(repoPath) as Array<{ id: string; started_at: string }>;

  let orphanWarning: string | undefined;

  if (orphaned.length > 0) {
    const nowStr = new Date().toISOString();
    for (const s of orphaned) {
      db.prepare("UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?")
        .run(nowStr, s.id);
    }

    // Log to progress
    progressLog(repoPath, {
      summary: `${orphaned.length} orphaned session(s) auto-closed (IDE likely crashed)`,
      status: 'orphaned',
    });

    orphanWarning = `${orphaned.length} orphaned session(s) found and auto-closed. Check progress.md.`;
  }

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

  // Detect stack and get applicable skills (tier 1 only for session_start)
  const runtime = detectRuntime(repoPath);
  const { skills } = skillList(runtime.runtime !== "unknown" ? runtime.runtime : undefined, repoPath);
  
  // Convert to SkillWithMetadata format for tier filtering
  const skillsWithMeta: SkillWithMetadata[] = skills.map((s) => ({
    name: s.name,
    description: s.description ?? undefined,
    metadata: s.metadata,
  }));
  
  // Get only tier 1 skills for session_start
  const tier1Results = getTier1Skills(skillsWithMeta);
  const applicableSkills = tier1Results.map((r) => r.name);

  // Determine instructions to read
  const instructions: string[] = ["AGENTS.md", "skill:harness-workflow"];

  // Read never_again.md warnings
  const neverAgainPath = join(repoPath, ".harness", "never_again.md");
  let neverAgainWarnings: string[] = [];
  if (existsSync(neverAgainPath)) {
    try {
      const content = readFileSync(neverAgainPath, "utf-8");
      neverAgainWarnings = content
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => line.trim().slice(2).trim());
    } catch {}
  }

  // Get relevant knowledge
  const contextText = [
    ...(handoff?.next_steps ?? []),
    ...tasks.map((t) => t.title),
  ].join(" ");

  let relevantKnowledge: InstinctRecord[] = [];
  if (contextText.trim().length > 0) {
    try {
      const knowledgeResult = instinctGet(
        undefined,
        0.4,
        undefined,
        ["lesson", "pattern", "anti_pattern", "decision"],
        contextText
      );
      relevantKnowledge = knowledgeResult.instincts.slice(0, 5);
    } catch {}
  }

  const result: SessionStartResult = {
    session_id: id,
    last_handoff: handoff,
    pending_tasks_count: pendingCount,
    applicable_skills: applicableSkills,
    instructions_to_read: instructions,
    never_again: neverAgainWarnings,
    relevant_knowledge: relevantKnowledge,
  };

  if (orphanWarning) {
    result._warn = orphanWarning;
  }

  return result;
}

export function sessionResume(repoPath: string): SessionStartResult {
  // Same as session_start but semantically "continue previous work"
  return sessionStart(repoPath);
}

export function sessionEnd(sessionId: string): SessionEndResult {
  const db = getDb();
  const now = new Date().toISOString();

  const session = db
    .prepare(`SELECT repo_path, started_at FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string; started_at: string } | undefined;

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Hook validation check
  const stopValidationCheck = checkStopValidation(session.repo_path);
  if (!stopValidationCheck.passed) {
    return {
      session_id: sessionId,
      status: "active",
      duration_seconds: 0,
      error: stopValidationCheck.error,
    };
  }

  cleanupExpiredWorkers(session.repo_path);

  db.prepare(`UPDATE sessions SET status = 'closed', ended_at = ? WHERE id = ?`).run(
    now,
    sessionId
  );

  const durationSeconds = Math.round(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  return { session_id: sessionId, status: "closed", duration_seconds: durationSeconds };
}

export function sessionHandoff(
  sessionId: string,
  summary: string,
  unfinished: string[],
  nextSteps: string[],
  verifyStatus?: { passed: boolean; steps_run: string[]; failed_step?: string; output?: string },
  suggestedSkills?: string[]
): SessionHandoffResult {
  const db = getDb();

  // Get session's repo_path and started_at
  const session = db
    .prepare(`SELECT repo_path, started_at FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string; started_at: string } | undefined;

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Hook validation check
  const stopValidationCheck = checkStopValidation(session.repo_path, verifyStatus);
  if (!stopValidationCheck.passed) {
    return {
      session_id: sessionId,
      error: stopValidationCheck.error,
    };
  }

  const repoPath = session.repo_path;
  const durationSeconds = Math.round(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  // Write handoff file
  const { path: handoffPath } = handoffWrite(
    repoPath,
    sessionId,
    nextSteps,
    unfinished,
    summary,
    verifyStatus,
    durationSeconds,
    suggestedSkills
  );

  // Append progress log
  progressLog(repoPath, {
    summary,
    status: "handoff",
  });

  cleanupExpiredWorkers(session.repo_path);

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
    duration_seconds: durationSeconds,
  };
}
