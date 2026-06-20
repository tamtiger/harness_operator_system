import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { skillSuggest } from "../tools/skill.js";

export interface AnalysisSignal {
  type: string;
  session_id?: string;
  task_id?: string;
  instinct_id?: string;
  payload: any;
  severity?: string;
}

/**
 * Runs rule-based analysis on scorecards, instinct outcomes, and audit logs.
 * Saves detected signals to `analysis_events`.
 */
export function runTraceAnalysis(sessionId?: string): { signals_found: number } {
  const db = getDb();
  const now = new Date().toISOString();
  let signalsCount = 0;

  // Clean up analysis events older than 30 days
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`DELETE FROM analysis_events WHERE created_at < ?`).run(thirtyDaysAgo);
  } catch {}

  const saveSignal = (signal: AnalysisSignal, customId?: string) => {
    const id = customId || randomUUID();
    const severity = signal.severity || "info";
    db.prepare(`
      INSERT OR REPLACE INTO analysis_events (
        id, event_type, session_id, task_id, instinct_id, payload, created_at, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      signal.type,
      signal.session_id || null,
      signal.task_id || null,
      signal.instinct_id || null,
      JSON.stringify(signal.payload),
      now,
      severity
    );
    signalsCount++;
  };

  // 1. Repeated Failures: Same task_type + same instinct_id fails >= 3 times consecutively
  const pairs = db.prepare(`
    SELECT DISTINCT instinct_id, task_type FROM instinct_outcomes
  `).all() as Array<{ instinct_id: string; task_type: string }>;

  for (const pair of pairs) {
    const outcomes = db.prepare(`
      SELECT outcome, task_id, scorecard_id, timestamp
      FROM instinct_outcomes
      WHERE instinct_id = ? AND task_type = ?
      ORDER BY timestamp DESC
      LIMIT 3
    `).all(pair.instinct_id, pair.task_type) as Array<{
      outcome: string;
      task_id: string;
      scorecard_id: string;
      timestamp: string;
    }>;

    if (outcomes.length >= 3 && outcomes.every(o => o.outcome === "failure")) {
      const latest = outcomes[0];
      const sessionRow = db.prepare(`SELECT session_id FROM scorecards WHERE id = ?`).get(latest.scorecard_id) as { session_id: string } | undefined;
      
      saveSignal({
        type: "repeated_failures",
        instinct_id: pair.instinct_id,
        session_id: sessionRow?.session_id,
        task_id: latest.task_id,
        severity: "critical",
        payload: {
          consecutive_failures: outcomes.length,
          task_type: pair.task_type,
          last_failed_at: latest.timestamp
        }
      }, `repeated_failures:${pair.instinct_id}:${pair.task_type}`);
    }
  }

  // 2. Loop Patterns: loop_events > 0 or (retry_count > 3 and verify_pass = 0)
  const loopScorecards = db.prepare(`
    SELECT id, task_id, session_id, loop_events, retry_count, verify_pass
    FROM scorecards
    WHERE loop_events > 0 OR (retry_count > 3 AND verify_pass = 0)
  `).all() as Array<{
    id: string;
    task_id: string;
    session_id: string;
    loop_events: number;
    retry_count: number;
    verify_pass: number;
  }>;

  for (const sc of loopScorecards) {
    saveSignal({
      type: "loop_patterns",
      session_id: sc.session_id,
      task_id: sc.task_id,
      severity: sc.verify_pass === 0 ? "critical" : "warning",
      payload: {
        loop_events: sc.loop_events,
        retry_count: sc.retry_count,
        verify_pass: sc.verify_pass
      }
    }, `loop_patterns:${sc.session_id}:${sc.task_id}`);
  }

  // 3. Low Value Instinct: used >= 5 times, success rate < 40%
  const instinctStats = db.prepare(`
    SELECT instinct_id, COUNT(*) as usage_count,
           SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as success_count
    FROM instinct_outcomes
    GROUP BY instinct_id
  `).all() as Array<{ instinct_id: string; usage_count: number; success_count: number }>;

  for (const stat of instinctStats) {
    const successRate = stat.usage_count > 0 ? stat.success_count / stat.usage_count : 0;
    if (stat.usage_count >= 5 && successRate < 0.4) {
      saveSignal({
        type: "low_value_instinct",
        instinct_id: stat.instinct_id,
        severity: "warning",
        payload: {
          usage_count: stat.usage_count,
          success_rate: successRate
        }
      }, `low_value:${stat.instinct_id}`);
    }
  }

  // 4. Under-exploration: Same instinct used for > 80% of tasks in a task_type group out of the last 30 scorecards
  const last30Scorecards = db.prepare(`
    SELECT id, task_type, instincts_used
    FROM scorecards
    ORDER BY created_at DESC
    LIMIT 30
  `).all() as Array<{ id: string; task_type: string; instincts_used: string }>;

  const typeGroups: Record<string, Array<string[]>> = {};
  for (const sc of last30Scorecards) {
    const type = sc.task_type || "unknown";
    if (!typeGroups[type]) typeGroups[type] = [];
    try {
      const instincts = JSON.parse(sc.instincts_used || "[]") as string[];
      typeGroups[type].push(instincts);
    } catch {}
  }

  for (const [taskType, groups] of Object.entries(typeGroups)) {
    const totalTasks = groups.length;
    if (totalTasks >= 5) {
      const counts: Record<string, number> = {};
      for (const instincts of groups) {
        for (const instId of instincts) {
          counts[instId] = (counts[instId] || 0) + 1;
        }
      }

      for (const [instId, count] of Object.entries(counts)) {
        const usageRate = count / totalTasks;
        if (usageRate > 0.8) {
          saveSignal({
            type: "under_exploration",
            instinct_id: instId,
            severity: "info",
            payload: {
              task_type: taskType,
              usage_percentage: usageRate,
              total_tasks: totalTasks
            }
          }, `under_exploration:${instId}:${taskType}`);
        }
      }
    }
  }

  // 5. Workflow Non-Compliance (Integrity Check)
  const sessionsToAnalyze = (sessionId 
    ? [db.prepare(`SELECT id, repo_path FROM sessions WHERE id = ?`).get(sessionId)]
    : db.prepare(`SELECT id, repo_path FROM sessions`).all()) as any[];

  for (const sess of sessionsToAnalyze) {
    if (!sess) continue;
    const sId = sess.id;
    const repoPath = sess.repo_path;

    const scs = db.prepare(`
      SELECT id, task_id, verify_pass, tool_calls, retry_count, loop_events, files_touched
      FROM scorecards
      WHERE session_id = ?
    `).all(sId) as Array<{
      id: string;
      task_id: string;
      verify_pass: number;
      tool_calls: number;
      retry_count: number;
      loop_events: number;
      files_touched: number;
    }>;

    for (const sc of scs) {
      if (sc.files_touched > 0 && sc.retry_count === 0) {
        saveSignal({
          type: "workflow_non_compliance",
          session_id: sId,
          task_id: sc.task_id,
          severity: "critical",
          payload: {
            reason: "Critical Workflow Violation: verify_run was not called once despite files being modified.",
            files_touched: sc.files_touched,
            severity: "critical"
          }
        }, `workflow_non_compliance:missing_verify:${sId}:${sc.task_id}`);
      }

      if (sc.verify_pass === 1 && sc.files_touched > 0 && sc.tool_calls < 3) {
        saveSignal({
          type: "workflow_non_compliance",
          session_id: sId,
          task_id: sc.task_id,
          severity: "critical",
          payload: {
            reason: "Critical Workflow Violation: verify_pass is success (1) but MCP tool calls count is abnormally low.",
            tool_calls: sc.tool_calls,
            files_touched: sc.files_touched,
            severity: "critical"
          }
        }, `workflow_non_compliance:suspicious_pass:${sId}:${sc.task_id}`);
      }

      if (sc.retry_count === 0 && sc.loop_events > 2) {
        saveSignal({
          type: "workflow_non_compliance",
          session_id: sId,
          task_id: sc.task_id,
          severity: "critical",
          payload: {
            reason: "Critical Workflow Violation: Agent got stuck in loop but did not run verify_run.",
            loop_events: sc.loop_events,
            severity: "critical"
          }
        }, `workflow_non_compliance:stuck_without_verify:${sId}:${sc.task_id}`);
      }
    }

    const tasks = db.prepare(`SELECT id, title, scope FROM tasks WHERE session_id = ?`).all(sess.id) as Array<{
      id: string;
      title: string;
      scope: string | null;
    }>;

    const skillLoadEvents = db.prepare(`
      SELECT json_extract(payload, '$.args.name') as skill_name
      FROM audit_events
      WHERE json_extract(payload, '$.session_id') = ?
        AND event_type = 'tool_success'
        AND json_extract(payload, '$.tool') = 'skill_load'
    `).all(sess.id) as Array<{ skill_name: string | null }>;
    const loadedSkills = new Set(skillLoadEvents.map(e => e.skill_name).filter(Boolean) as string[]);

    for (const task of tasks) {
      try {
        const suggestions = skillSuggest(task.title, task.scope || undefined, undefined, 10, repoPath);
        for (const sug of suggestions.suggested_skills) {
          if (sug.score >= 1.5 && !loadedSkills.has(sug.name)) {
            const touched = scs.find(s => s.task_id === task.id)?.files_touched ?? 0;
            if (touched > 0) {
              saveSignal({
                type: "skipped_skill_loading",
                session_id: sId,
                task_id: task.id,
                severity: "warning",
                payload: {
                  reason: "Skipped Skill Warning: Suggested skill with high score (>= 1.5) was not loaded before modifying files.",
                  suggested_skill: sug.name,
                  score: sug.score
                }
              }, `skipped_skill:${sId}:${task.id}:${sug.name}`);
            }
          }
        }
      } catch {}
    }
  }

  // 6. Forgetting Detection
  const variantStats = db.prepare(`
    SELECT variant_id, COUNT(*) as count, COUNT(DISTINCT task_type) as types_count
    FROM scorecards
    GROUP BY variant_id
  `).all() as Array<{ variant_id: string; count: number; types_count: number }>;

  const hasData = variantStats.some(v => v.count >= 10 && v.types_count >= 2);
  if (hasData) {
    const snapshots = db.prepare(`
      SELECT id, instinct_id, task_type, variant_id, success_rate, captured_at
      FROM promotion_snapshots
    `).all() as Array<{
      id: string;
      instinct_id: string;
      task_type: string;
      variant_id: string;
      success_rate: number;
      captured_at: string;
    }>;

    for (const snap of snapshots) {
      const capturedTime = new Date(snap.captured_at).getTime();
      const elapsedMs = Date.now() - capturedTime;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (elapsedMs >= sevenDaysMs || process.env.HARNESS_DEBUG === "1" || process.env.NODE_ENV === "test") {
        const liveScorecards = db.prepare(`
          SELECT verify_pass FROM scorecards
          WHERE task_type = ? AND variant_id = ? AND created_at > ?
        `).all(snap.task_type, snap.variant_id, snap.captured_at) as Array<{ verify_pass: number }>;

        if (liveScorecards.length >= 5) {
          const liveSuccess = liveScorecards.filter(sc => sc.verify_pass === 1).length;
          const liveRate = liveSuccess / liveScorecards.length;

          if (liveRate < snap.success_rate - 0.15) {
            saveSignal({
              type: "forgetting",
              instinct_id: snap.instinct_id,
              severity: "warning",
              payload: {
                task_type: snap.task_type,
                variant_id: snap.variant_id,
                snapshot_rate: snap.success_rate,
                live_rate: liveRate,
                diff: snap.success_rate - liveRate
              }
            }, `forgetting:${snap.instinct_id}:${snap.task_type}:${snap.variant_id}`);
          }
        }
      }
    }
  }

  // 7. Stale Instinct Detection: instinct not referenced in last 90 days (or created > 90 days ago and never referenced)
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const staleInstincts = db.prepare(`
      SELECT id, description, last_referenced_at, created_at
      FROM instincts
      WHERE (status = 'promoted' OR status = 'shadow' OR status IS NULL)
        AND (
          (last_referenced_at IS NOT NULL AND last_referenced_at < ?)
          OR (last_referenced_at IS NULL AND created_at < ?)
        )
    `).all(ninetyDaysAgo, ninetyDaysAgo) as Array<{
      id: string;
      description: string;
      last_referenced_at: string | null;
      created_at: string;
    }>;

    for (const inst of staleInstincts) {
      saveSignal({
        type: "stale_instinct",
        instinct_id: inst.id,
        severity: "info",
        payload: {
          reason: `Instinct "${inst.description.slice(0, 40)}..." has not been used/referenced in the last 90 days.`,
          last_referenced_at: inst.last_referenced_at,
          created_at: inst.created_at
        }
      }, `stale_instinct:${inst.id}`);
    }
  } catch {}

  // 8. Over-reliance Detection: a skill loaded in > 90% of the last 20 sessions
  try {
    const recentSessions = db.prepare(`
      SELECT id FROM sessions
      ORDER BY started_at DESC
      LIMIT 20
    `).all() as Array<{ id: string }>;

    if (recentSessions.length >= 5) {
      const sessionIds = recentSessions.map(s => s.id);
      const placeholders = sessionIds.map(() => "?").join(",");

      const skillLoads = db.prepare(`
        SELECT json_extract(payload, '$.args.name') as skill_name,
               json_extract(payload, '$.session_id') as session_id
        FROM audit_events
        WHERE json_extract(payload, '$.session_id') IN (${placeholders})
          AND event_type = 'tool_success'
          AND json_extract(payload, '$.tool') = 'skill_load'
      `).all(...sessionIds) as Array<{ skill_name: string | null; session_id: string | null }>;

      const sessionSkills = new Map<string, Set<string>>();
      for (const load of skillLoads) {
        if (load.skill_name && load.session_id) {
          if (!sessionSkills.has(load.session_id)) {
            sessionSkills.set(load.session_id, new Set());
          }
          sessionSkills.get(load.session_id)!.add(load.skill_name);
        }
      }

      const skillCounts = new Map<string, number>();
      for (const [_, skills] of sessionSkills.entries()) {
        for (const skill of skills) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }

      for (const [skillName, count] of skillCounts.entries()) {
        if (skillName === "harness-workflow" || skillName === "code-review-workflow") continue;

        const rate = count / recentSessions.length;
        if (rate > 0.9) {
          saveSignal({
            type: "over_reliance",
            severity: "info",
            payload: {
              reason: `Over-reliance: Skill "${skillName}" was loaded in ${(rate * 100).toFixed(0)}% of the last ${recentSessions.length} sessions. Consider merging its patterns into core.`,
              skill_name: skillName,
              session_count: count,
              total_sessions: recentSessions.length
            }
          }, `over_reliance:${skillName}`);
        }
      }
    }
  } catch {}

  return { signals_found: signalsCount };
}
