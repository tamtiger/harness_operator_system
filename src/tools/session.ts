import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { z } from "zod";
import { getDb, registerRepo, updateRepoLastActive, backupDatabase } from "../db/client.js";
import { detectRuntime } from "../lib/runtime.js";
import { readRepoConfig, createRepoConfig, resolveGlobalRepoPath } from "../lib/repo-identity.js";
import { migrateRepoState } from "../lib/state-migration.js";
import { ensureDir } from "../lib/repo.js";
import { handoffRead, handoffWrite, progressLog, type HandoffData } from "./state.js";
import { taskList } from "./task.js";
import { skillList, skillSuggest, skillLoad } from "./skill.js";
import { getTier1Skills, type SkillWithMetadata } from "../lib/skill-matcher.js";
import { checkStopValidation } from "../lib/hooks.js";
import { cleanupExpiredWorkers } from "../lib/worker-registry.js";
import { instinctGet, type InstinctRecord } from "./instinct.js";
import { recordScorecard } from "../lib/scorecard.js";
import { runTraceAnalysis } from "../lib/trace-analyzer.js";
import { log } from "../lib/logger.js";
import { ErrorCode } from "../lib/errors.js";
import { scopeCheck } from "./scope.js";
import { getChangedFiles } from "../lib/git-diff.js";

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e.code === "EPERM";
  }
}

export interface SuggestedSkill {
  name: string;
  score: number;
  reason: string;
}

export interface WorkflowGuidance {
  current_phase: string;
  next_action: string;
  ctr_needed: boolean;
  checklist?: string[];
}

export interface SessionStartResult {
  session_id: string;
  last_handoff: HandoffData | null;
  pending_tasks_count: number;
  applicable_skills: string[];
  workflow_content: string | null; // Content of harness-workflow
  suggested_skills: SuggestedSkill[];
  instructions_to_read: string[];
  never_again: string[];
  relevant_knowledge: Array<{ id: string; description: string }>;
  workflow_guidance: WorkflowGuidance;
  quick_task_id?: string;
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
  _warn?: string;
  aegis_warnings?: string[];
}

export interface SessionStartOptions {
  quick?: boolean;
  quick_task_title?: string;
  variant_id?: string;
  skip_workflow_content?: boolean;
}

export function sessionStart(repoPath: string, options: SessionStartOptions = {}): SessionStartResult {
  // Trigger automatic SQLite backup
  backupDatabase();

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

  const host = hostname();
  const currentPid = process.pid;

  // Auto-detect and recover orphaned sessions for this repo or detect conflicts
  const activeSessions = db.prepare(
    "SELECT id, started_at, pid, machine_id FROM sessions WHERE repo_path = ? AND status = 'active'"
  ).all(repoPath) as Array<{ id: string; started_at: string; pid: number | null; machine_id: string | null }>;

  const actualOrphaned: string[] = [];

  for (const s of activeSessions) {
    if (s.pid) {
      const isSameMachine = s.machine_id === host;
      const isSameProcess = s.pid === currentPid;

      if (isSameProcess && isSameMachine) {
        actualOrphaned.push(s.id);
      } else if (isSameMachine && isPidRunning(s.pid)) {
        const err = new Error(`Parallel session conflict: Another active session (ID: ${s.id}) is running in process ${s.pid} on this machine.`);
        (err as any).code = ErrorCode.ERR_PARALLEL_CONFLICT;
        throw err;
      } else if (!isSameMachine) {
        const err = new Error(`Parallel session conflict: Another active session (ID: ${s.id}) is running on machine ${s.machine_id || "unknown"}.`);
        (err as any).code = ErrorCode.ERR_PARALLEL_CONFLICT;
        throw err;
      } else {
        actualOrphaned.push(s.id);
      }
    } else {
      actualOrphaned.push(s.id);
    }
  }

  let orphanWarning: string | undefined;

  if (actualOrphaned.length > 0) {
    const nowStr = new Date().toISOString();
    for (const orphanId of actualOrphaned) {
      db.prepare("UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?")
        .run(nowStr, orphanId);
    }

    // Log to progress
    progressLog(repoPath, {
      summary: `${actualOrphaned.length} orphaned session(s) auto-closed (IDE likely crashed)`,
      status: 'orphaned',
    });

    orphanWarning = `${actualOrphaned.length} orphaned session(s) found and auto-closed. Check progress.md.`;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const variantId = options.variant_id || "default";

  db.prepare(
    `INSERT INTO sessions (id, repo_path, status, started_at, variant_id, pid, machine_id) VALUES (?, ?, 'active', ?, ?, ?, ?)`
  ).run(id, repoPath, now, variantId, currentPid, host);

  // If quick start is selected, auto-create an active task
  let quickTaskId: string | undefined;
  if (options.quick || options.quick_task_title) {
    quickTaskId = randomUUID();
    const taskTitle = options.quick_task_title || "Quick modification";
    db.prepare(`
      INSERT INTO tasks (id, session_id, title, scope, status, created_at)
      VALUES (?, ?, ?, '*', 'in-progress', ?)
    `).run(quickTaskId, id, taskTitle, now);

    progressLog(repoPath, {
      task_id: quickTaskId,
      summary: `Started quick modification: ${taskTitle}`,
      status: "in-progress",
    });
  }

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

  // Auto-suggest skills based on context
  const stack = runtime.runtime !== "unknown" ? runtime.runtime : undefined;
  const firstTask = tasks.find(t => t.status === "pending") || tasks[0];
  const taskTitle = firstTask ? firstTask.title : undefined;
  const taskScope = firstTask ? firstTask.scope || undefined : undefined;
  const suggestRes = skillSuggest(taskTitle, taskScope, stack, 15, repoPath);
  
  const suggestedSkills = suggestRes.suggested_skills
    .filter(s => s.tier >= 2)
    .slice(0, 3)
    .map(s => ({
      name: s.name,
      score: s.score,
      reason: `Matched for stack ${stack || "generic"} and task context`
    }));

  // Determine instructions to read
  const instructions: string[] = ["AGENTS.md", "skill:harness-workflow"];
  const stackBaseline = `${runtime.runtime}-baseline`;
  if (skills.some(s => s.name === stackBaseline)) {
    instructions.push(`skill:${stackBaseline}`);
  }
  if (suggestedSkills.length > 0 && suggestedSkills[0].score >= 1.5) {
    instructions.push(`skill:${suggestedSkills[0].name}`);
  }

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

  let optimizedHandoff: HandoffData | null = null;
  if (handoff) {
    optimizedHandoff = { ...handoff };
    if (optimizedHandoff.verify_status && optimizedHandoff.verify_status.output) {
      const out = optimizedHandoff.verify_status.output;
      optimizedHandoff.verify_status = {
        ...optimizedHandoff.verify_status,
        output: out.length > 200 ? out.slice(0, 200) + "\n... [truncated for context]" : out
      };
    }
  }

  const optimizedKnowledge = relevantKnowledge.map((k) => ({
    id: k.id,
    description: k.description,
  }));

  const skipWorkflowContent = options.skip_workflow_content === true;
  let workflowContent: string | null = null;
  if (!skipWorkflowContent) {
    try {
      const loaded = skillLoad("harness-workflow", repoPath);
      if (loaded && !("error" in loaded)) {
        workflowContent = loaded.content;
      }
    } catch (err) {
      log("warn", `Failed to pre-load harness-workflow skill: ${err}`);
    }
  }

  // Infer task type for checklist
  const firstPendingTask = db.prepare(
    "SELECT id, title, scope, status FROM tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
  ).get() as { id: string; title: string; scope: string; status: string } | undefined;
  const targetTitle = quickTaskId ? (options.quick_task_title || "Quick modification") : (firstPendingTask ? firstPendingTask.title : "");
  
  let taskType = "generic";
  if (targetTitle) {
    const t = targetTitle.toLowerCase();
    if (t.includes("fix") || t.includes("bug") || t.includes("issue") || t.includes("error")) taskType = "bugfix";
    else if (t.includes("refactor") || t.includes("clean") || t.includes("restructure")) taskType = "refactor";
    else if (t.includes("test")) taskType = "test";
    else if (t.includes("doc") || t.includes("readme")) taskType = "docs";
    else if (t.includes("config") || t.includes("setting")) taskType = "config";
    else if (t.includes("research") || t.includes("explore")) taskType = "research";
    else if (t.includes("debug")) taskType = "debug";
    else if (t.includes("hotfix")) taskType = "hotfix";
  }

  let checklist: string[] = [];
  if (taskType === "bugfix" || taskType === "hotfix") {
    checklist = [
      "1. Run systematic-diagnosis to find the root cause",
      "2. Create a reproduction test case if possible",
      "3. Check file scope via scope_check before modifying any files",
      "4. Make changes incrementally and run verify_run frequently",
      "5. Review changes against code-review-workflow checklist",
      "6. Call session_handoff to submit the bugfix"
    ];
  } else if (taskType === "refactor") {
    checklist = [
      "1. Establish regression tests to ensure behavior remains identical",
      "2. Check file scope via scope_check before refactoring",
      "3. Perform modifications in small, compiler-verifiable chunks",
      "4. Run verify_run after each refactoring step",
      "5. Review changes using code-review-workflow checklist",
      "6. Call session_handoff to submit the refactored code"
    ];
  } else if (taskType === "feature") {
    checklist = [
      "1. Review design guidelines and establish vertical slices",
      "2. Check file scope via scope_check before modifying any files",
      "3. Write tests first following TDD workflow",
      "4. Implement the feature code incrementally",
      "5. Run verify_run to ensure all tests, build, and lint pass",
      "6. Review changes using code-review-workflow checklist",
      "7. Call session_handoff to submit the feature"
    ];
  } else {
    checklist = [
      "1. Verify requirements and define task scope",
      "2. Check file scope via scope_check before editing",
      "3. Apply modifications incrementally",
      "4. Run verify_run to validate build, tests, and lint",
      "5. Call session_handoff to persist progress and next steps"
    ];
  }

  const result: SessionStartResult = {
    session_id: id,
    last_handoff: optimizedHandoff,
    pending_tasks_count: pendingCount,
    applicable_skills: applicableSkills,
    workflow_content: workflowContent,
    suggested_skills: suggestedSkills,
    instructions_to_read: instructions,
    never_again: neverAgainWarnings,
    relevant_knowledge: optimizedKnowledge,
    workflow_guidance: {
      current_phase: "START",
      next_action: "Read instructions_to_read, review last_handoff, then load suggested skills and proceed to SELECT phase",
      ctr_needed: false,
      checklist: checklist,
    }
  };

  if (quickTaskId) {
    result.quick_task_id = quickTaskId;
  }

  if (orphanWarning) {
    result._warn = orphanWarning;
  }

  return result;
}

export async function sessionEnd(sessionId: string): Promise<SessionEndResult> {
  const db = getDb();
  const now = new Date().toISOString();

  const session = db
    .prepare(`SELECT repo_path, started_at FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string; started_at: string } | undefined;

  if (!session) {
    return { session_id: sessionId, status: "error", duration_seconds: 0, error: `Session not found: ${sessionId}` };
  }

  // Hook validation check
  const stopValidationCheck = await checkStopValidation(session.repo_path);
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

  try {
    recordScorecard(sessionId);
  } catch (err) {
    // ignore scorecard errors to ensure session closing is infallible
  }

  const durationSeconds = Math.round(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  return { session_id: sessionId, status: "closed", duration_seconds: durationSeconds };
}

export async function sessionHandoff(
  sessionId: string,
  summary: string,
  unfinished: string[],
  nextSteps: string[],
  verifyStatus?: { passed: boolean; steps_run: string[]; failed_step?: string; output?: string },
  suggestedSkills?: string[],
  bypassVerify?: boolean,
  bypassRationale?: string
): Promise<SessionHandoffResult> {
  const db = getDb();

  // Get session's repo_path, started_at, verify_called and verify_passed status
  const session = db
    .prepare(`SELECT repo_path, started_at, verify_called, verify_passed FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string; started_at: string; verify_called: number; verify_passed: number } | undefined;

  if (!session) {
    const err = new Error(`Session not found: ${sessionId}`);
    (err as any).code = ErrorCode.ERR_SESSION_NOT_FOUND;
    throw err;
  }

  if (verifyStatus && verifyStatus.passed) {
    db.prepare("UPDATE sessions SET verify_passed = 1, verify_called = 1 WHERE id = ?").run(sessionId);
    session.verify_passed = 1;
    session.verify_called = 1;
  }

  // Hook validation check
  const stopValidationCheck = await checkStopValidation(session.repo_path, verifyStatus);
  if (!stopValidationCheck.passed) {
    return {
      session_id: sessionId,
      error: stopValidationCheck.error,
    };
  }

  const repoPath = session.repo_path;

  // Check if any changed files are out of scope (A5)
  const changedFilesList = getChangedFiles(repoPath);
  if (changedFilesList.length > 0) {
    const activeTask = db.prepare("SELECT id FROM tasks WHERE session_id = ? AND status = 'in-progress'").get(sessionId) as { id: string } | undefined;
    const taskId = activeTask?.id;

    const outOfScopeFiles: string[] = [];
    for (const file of changedFilesList) {
      const check = scopeCheck(repoPath, taskId, file);
      if (!check.in_scope) {
        outOfScopeFiles.push(`${file} (${check.reason})`);
      }
    }

    if (outOfScopeFiles.length > 0) {
      const err = new Error(`ERR_OUT_OF_SCOPE: Cannot perform handoff because modified files are out of scope: \n${outOfScopeFiles.join("\n")}`);
      (err as any).code = ErrorCode.ERR_OUT_OF_SCOPE;
      throw err;
    }
  }
  const durationSeconds = Math.round(
    (Date.now() - new Date(session.started_at).getTime()) / 1000
  );

  // A1: Verify mặc định bật - session_handoff tự động chặn nếu verify_run chưa từng pass
  if (!session.verify_passed) {
    if (!bypassVerify) {
      const err = new Error("ERR_VERIFY_FAILED: Verification (verify_run) must pass successfully before handoff. If you must bypass, set bypass_verify: true and provide a non-empty bypass_rationale.");
      (err as any).code = ErrorCode.ERR_VERIFY_FAILED;
      throw err;
    }
    // A8: Escape Hatch - bypass_verify: true & bypass_rationale
    if (!bypassRationale || bypassRationale.trim().length < 10) {
      const err = new Error("ERR_VERIFY_FAILED: You must provide a valid justification (at least 10 characters) in bypass_rationale to bypass verification.");
      (err as any).code = ErrorCode.ERR_VERIFY_FAILED;
      throw err;
    }

    // Log the bypass to progress.md and DB
    progressLog(repoPath, {
      summary: `Bypassed verification checklist. Rationale: ${bypassRationale}`,
      status: "bypass",
    });
  }

  let warning: string | undefined;
  if (!session.verify_called) {
    warning = "⚠️ verify_run() was not called during this session. Consider running verification before ending.";
  }

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

  // Close session and update phase to WRAP_UP
  const now = new Date().toISOString();
  db.prepare(`UPDATE sessions SET status = 'closed', ended_at = ?, current_phase = 'WRAP_UP' WHERE id = ?`).run(
    now,
    sessionId
  );

  try {
    recordScorecard(sessionId);
  } catch (err) {
    // ignore scorecard errors to ensure session handoff is infallible
  }

  // Evaluate AEGIS critical warnings
  const aegisWarnings: string[] = [];
  try {
    runTraceAnalysis(sessionId);
    const criticalEvents = db.prepare(`
      SELECT event_type FROM analysis_events
      WHERE session_id = ? AND severity = 'critical'
    `).all(sessionId) as Array<{ event_type: string }>;

    if (criticalEvents.length > 0) {
      const types = Array.from(new Set(criticalEvents.map(e => e.event_type)));
      aegisWarnings.push(`⚠️ AEGIS detected ${criticalEvents.length} critical signals: ${types.join(", ")}. Run aegis_analyze for details.`);
    }
  } catch (err: any) {
    log("warn", `AEGIS handoff warning evaluation failed: ${err.message}`);
  }

  // Warn if verification was bypassed
  const finalWarning = !session.verify_passed && bypassVerify
    ? `⚠️ Verification bypassed! Rationale: ${bypassRationale}`
    : warning;

  return {
    session_id: sessionId,
    handoff_path: handoffPath,
    progress_logged: true,
    duration_seconds: durationSeconds,
    ...(finalWarning ? { _warn: finalWarning } : {}),
    ...(aegisWarnings.length > 0 ? { aegis_warnings: aegisWarnings } : {}),
  };
}

export const mcpTools = [
  {
    name: "session_start",
    description: "Start a new harness session for a repo. Returns session ID, last handoff, and pending tasks.",
    inputSchema: {
      repo_path: z.string().describe("Absolute or relative path to the repo"),
      quick: z.boolean().optional().describe("If true, auto-creates a quick active task and sets scope to *"),
      quick_task_title: z.string().optional().describe("Custom title for the quick task"),
      variant_id: z.string().optional().describe("Named configuration profile variant ID (e.g. 'coding-strict', 'coding-fast', etc.)"),
      skip_workflow_content: z.boolean().optional().describe("If true, skips loading and returning the full harness-workflow content to prevent context bloating"),
    },
    handler: async (args: any) => sessionStart(args.repo_path, args),
  },
  {
    name: "session_end",
    description: "End an active harness session.",
    inputSchema: {
      session_id: z.string().describe("Session ID to close"),
    },
    handler: async (args: any) => sessionEnd(args.session_id),
  },
  {
    name: "session_handoff",
    description: "End session with handoff: write handoff file + progress log + close session atomically.",
    inputSchema: {
      session_id: z.string().describe("Session ID"),
      summary: z.string().describe("Summary of what was accomplished"),
      unfinished: z.preprocess(
        (val) => typeof val === "string" ? [val] : val,
        z.array(z.string())
      ).describe("List of unfinished items (accepts string or array)"),
      next_steps: z.preprocess(
        (val) => typeof val === "string" ? [val] : val,
        z.array(z.string())
      ).describe("Suggested next steps for following session (accepts string or array)"),
      verify_status: z.object({
        passed: z.boolean(),
        steps_run: z.array(z.string()),
        failed_step: z.string().optional(),
        output: z.string().optional(),
      }).optional().describe("Last verify_run result summary"),
      suggested_skills: z.array(z.string()).optional().describe("Names of skills suggested for the next session"),
      bypass_verify: z.boolean().optional().describe("If true, bypasses the verification check (A1)"),
      bypass_rationale: z.string().optional().describe("Required justification if bypassing verification (A8)"),
    },
    handler: async (args: any) => sessionHandoff(
      args.session_id,
      args.summary,
      args.unfinished,
      args.next_steps,
      args.verify_status,
      args.suggested_skills,
      args.bypass_verify,
      args.bypass_rationale
    ),
  },
];
