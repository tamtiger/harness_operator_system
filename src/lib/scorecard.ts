import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { readEvidence } from "./evidence.js";
import { checkRegressionGate } from "../tools/instinct.js";
import { runTraceAnalysis } from "./trace-analyzer.js";

/**
 * Record a scorecard for each task completed in the closed session.
 * Also writes instinct outcomes and handles shadow promotion exit checks.
 */
export function recordScorecard(sessionId: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Get session info
  const session = db.prepare(`
    SELECT repo_path, started_at, ended_at, variant_id, verify_called
    FROM sessions WHERE id = ?
  `).get(sessionId) as {
    repo_path: string;
    started_at: string;
    ended_at: string | null;
    variant_id: string;
    verify_called: number;
  } | undefined;

  if (!session) return;

  const repoPath = session.repo_path;
  const variantId = session.variant_id || "default";

  // 2. Find tasks in this session
  const tasks = db.prepare(`
    SELECT id, task_type, title, status FROM tasks WHERE session_id = ?
  `).all(sessionId) as Array<{ id: string; task_type: string; title: string; status: string }>;

  if (tasks.length === 0) return;

  // Compute common session metrics
  const startedTime = new Date(session.started_at).getTime();
  const endedTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const executionTimeMs = endedTime - startedTime;

  // Tool calls count
  const toolCallsRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type LIKE 'tool_%'
  `).get(sessionId) as { count: number } | undefined;
  const toolCalls = toolCallsRow?.count ?? 0;

  // Retry count (verify_run calls)
  const retryCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'verify_run'
  `).get(sessionId) as { count: number } | undefined;
  const retryCount = retryCountRow?.count ?? 0;

  // Loop events count
  const loopEventsRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND (event_type = 'loop_blocked' OR event_type = 'loop_detected')
  `).get(sessionId) as { count: number } | undefined;
  const loopEvents = loopEventsRow?.count ?? 0;

  // Files touched
  const scopeCheckEvents = db.prepare(`
    SELECT json_extract(payload, '$.args.file_path') as file_path
    FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'scope_check'
  `).all(sessionId) as Array<{ file_path: string | null }>;
  const filesTouched = new Set(scopeCheckEvents.map(e => e.file_path).filter(Boolean)).size;

  // Instincts used
  const instinctRows = db.prepare(`
    SELECT instinct_id FROM session_instinct_refs WHERE session_id = ?
  `).all(sessionId) as Array<{ instinct_id: string }>;
  const instinctsUsed = JSON.stringify(instinctRows.map(r => r.instinct_id));

  // Skills used
  const skillEvents = db.prepare(`
    SELECT json_extract(payload, '$.args.name') as skill_name
    FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'skill_load'
  `).all(sessionId) as Array<{ skill_name: string | null }>;
  const skillsUsed = JSON.stringify(skillEvents.map(e => e.skill_name).filter(Boolean));

  for (const task of tasks) {
    // Read task verification evidence
    const evidence = readEvidence(repoPath, task.id);
    const verifyPass = evidence?.passed ? 1 : 0;
    const taskType = task.task_type || "unknown";

    const scorecardId = randomUUID();

    // Insert scorecard
    db.prepare(`
      INSERT INTO scorecards (
        id, task_id, session_id, task_type, variant_id, verify_pass,
        tool_calls, retry_count, loop_events, files_touched,
        execution_time_ms, instincts_used, skills_used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scorecardId,
      task.id,
      sessionId,
      taskType,
      variantId,
      verifyPass,
      toolCalls,
      retryCount,
      loopEvents,
      filesTouched,
      executionTimeMs,
      instinctsUsed,
      skillsUsed,
      now
    );

    // 3. Record instinct outcomes
    const refs = db.prepare(`
      SELECT instinct_id, outcome FROM session_instinct_refs WHERE session_id = ?
    `).all(sessionId) as Array<{ instinct_id: string; outcome: string | null }>;

    for (const ref of refs) {
      const outcome = ref.outcome || (verifyPass === 1 ? "success" : "failure");
      db.prepare(`
        INSERT OR REPLACE INTO instinct_outcomes (
          instinct_id, task_id, task_type, variant_id, outcome, scorecard_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ref.instinct_id, task.id, taskType, variantId, outcome, scorecardId, now);

      // Check shadow exit check trigger for this instinct
      checkShadowPromotion(ref.instinct_id);
    }
  }

  // Trigger Trace Analysis for this session
  try {
    runTraceAnalysis(sessionId);
  } catch {}
}

/**
 * Check if a shadow instinct meets the exit criteria to be promoted.
 */
function checkShadowPromotion(instinctId: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  // Find the instinct
  const instinct = db.prepare(`
    SELECT id, status, tags, confidence FROM instincts WHERE id = ?
  `).get(instinctId) as { id: string; status: string; tags: string; confidence: number } | undefined;

  if (!instinct || instinct.status !== "shadow") return;

  // Exit conditions checks:
  // 1. Min 10 outcomes
  const outcomes = db.prepare(`
    SELECT outcome, scorecard_id FROM instinct_outcomes WHERE instinct_id = ?
  `).all(instinctId) as Array<{ outcome: string; scorecard_id: string }>;

  if (outcomes.length < 10) return;

  // 2. Success rate >= 70%
  const successCount = outcomes.filter(o => o.outcome === "success").length;
  const successRate = successCount / outcomes.length;
  
  // Auto-demote check (if success rate drops below 60% after >= 5 outcomes)
  // Wait, the rule says: "Nếu tỷ lệ thành công giảm xuống dưới 60% tại bất kỳ thời điểm nào trong quá trình shadow (khi đã có >= 5 kết quả): tự động hạ cấp xuống lại candidate"
  if (outcomes.length >= 5 && successRate < 0.6) {
    db.prepare(`UPDATE instincts SET status = 'candidate' WHERE id = ?`).run(instinctId);
    return;
  }

  if (successRate < 0.7) return;

  // 3. Shadow duration >= 5 distinct sessions
  const distinctSessionsRow = db.prepare(`
    SELECT COUNT(DISTINCT scorecard_id) as count
    FROM instinct_outcomes
    WHERE instinct_id = ?
  `).get(instinctId) as { count: number } | undefined;
  const distinctSessions = distinctSessionsRow?.count ?? 0;

  if (distinctSessions < 5) return;

  // 4. Regression gate check (must pass)
  const regressionCheck = checkRegressionGate(instinctId);
  if (!regressionCheck.passed) return;

  // Capture snapshots for Forgetting Detection (Phase 2-C) before promoting
  const shadowPairs = db.prepare(`
    SELECT DISTINCT task_type, variant_id FROM instinct_outcomes WHERE instinct_id = ?
  `).all(instinctId) as Array<{ task_type: string; variant_id: string }>;

  for (const pair of shadowPairs) {
    const stats = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN verify_pass = 1 THEN 1 ELSE 0 END) as success
      FROM scorecards
      WHERE task_type = ? AND variant_id = ?
    `).get(pair.task_type, pair.variant_id) as { total: number; success: number } | undefined;

    if (stats && stats.total > 0) {
      const rate = stats.success / stats.total;
      db.prepare(`
        INSERT OR REPLACE INTO promotion_snapshots (id, instinct_id, task_type, variant_id, success_rate, captured_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), instinctId, pair.task_type, pair.variant_id, rate, now);
    }
  }

  // All exit conditions met -> Promote to 'promoted'!
  db.prepare(`
    UPDATE instincts
    SET status = 'promoted', ttl_days = NULL, confidence = MAX(confidence, 0.7)
    WHERE id = ?
  `).run(instinctId);
}
