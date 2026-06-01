import { getDb } from "../db/client.js";
import { resolveToolContext } from "./tool-context.js";

export interface ToolUsageStats {
  tool: string;
  calls: number;
  success: number;
  error: number;
  blocked: number;
}

export interface ToolLatencyStats {
  tool: string;
  p50: number;
  p95: number;
}

export interface SkillEffectivenessStats {
  skill: string;
  loaded: number;
  sessions_passed: number;
  rate: number;
}

export interface AnalyticsReport {
  period: string;
  repo_id?: string;
  total_tool_calls: number;
  tool_usage: ToolUsageStats[];
  tool_latency: ToolLatencyStats[];
  skill_effectiveness: SkillEffectivenessStats[];
  reliability_score: number;
}

export function generateReport(options: { period: "7d" | "30d" | "all"; repoPath?: string }): AnalyticsReport {
  const db = getDb();

  let sinceDate: string | null = null;
  if (options.period === "7d") {
    sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.period === "30d") {
    sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  let repoId: string | undefined;
  if (options.repoPath) {
    const ctx = resolveToolContext({ repo_path: options.repoPath });
    repoId = ctx.repo_id;
  }

  // Fetch all audit events
  let eventsQuery = "SELECT event_type, payload, created_at FROM audit_events";
  const params: any[] = [];
  if (sinceDate) {
    eventsQuery += " WHERE created_at >= ?";
    params.push(sinceDate);
  }
  eventsQuery += " ORDER BY created_at ASC";

  const allEvents = db.prepare(eventsQuery).all(...params) as Array<{
    event_type: string;
    payload: string;
    created_at: string;
  }>;

  // Filter events by repo_id if provided
  const filteredEvents = allEvents.filter(e => {
    if (!repoId) return true;
    try {
      const payload = JSON.parse(e.payload);
      return payload.repo_id === repoId;
    } catch {
      return false;
    }
  });

  // Fetch sessions for rate computation
  let sessionsQuery = "SELECT id, status, repo_path, started_at FROM sessions";
  const sessionParams: any[] = [];
  if (sinceDate) {
    sessionsQuery += " WHERE started_at >= ?";
    sessionParams.push(sinceDate);
  }
  const allSessions = db.prepare(sessionsQuery).all(...sessionParams) as Array<{
    id: string;
    status: string;
    repo_path: string;
    started_at: string;
  }>;

  const filteredSessions = allSessions.filter(s => {
    if (!options.repoPath) return true;
    // Simple path equivalence (normalize or compare directly)
    return s.repo_path === options.repoPath;
  });

  // A. Tool Usage
  const toolMap = new Map<string, ToolUsageStats>();
  let totalToolCalls = 0;
  let loopBlocks = 0;
  let circuitOpens = 0;

  for (const e of filteredEvents) {
    let payload: any;
    try {
      payload = JSON.parse(e.payload);
    } catch {
      continue;
    }

    const tool = payload.tool;
    if (!tool) continue;

    if (!toolMap.has(tool)) {
      toolMap.set(tool, { tool, calls: 0, success: 0, error: 0, blocked: 0 });
    }

    const stats = toolMap.get(tool)!;

    if (e.event_type === "tool_success") {
      stats.calls++;
      stats.success++;
      totalToolCalls++;
    } else if (e.event_type === "tool_error") {
      stats.calls++;
      stats.error++;
      totalToolCalls++;
    } else if (e.event_type === "loop_blocked") {
      stats.blocked++;
      loopBlocks++;
    } else if (e.event_type === "tool_circuit_open") {
      stats.blocked++;
      circuitOpens++;
    } else if (e.event_type === "hook_blocked") {
      stats.blocked++;
    }
  }

  // B. Latency
  const latencyMap = new Map<string, number[]>();
  for (const e of filteredEvents) {
    if (e.event_type === "tool_success" || e.event_type === "tool_error") {
      try {
        const payload = JSON.parse(e.payload);
        if (payload.tool && typeof payload.duration_ms === "number") {
          if (!latencyMap.has(payload.tool)) {
            latencyMap.set(payload.tool, []);
          }
          latencyMap.get(payload.tool)!.push(payload.duration_ms);
        }
      } catch {}
    }
  }

  const toolLatency: ToolLatencyStats[] = [];
  for (const [tool, durations] of latencyMap.entries()) {
    durations.sort((a, b) => a - b);
    const p50Idx = Math.floor(durations.length * 0.5);
    const p95Idx = Math.floor(durations.length * 0.95);
    toolLatency.push({
      tool,
      p50: durations[p50Idx] / 1000, // convert ms to seconds
      p95: durations[p95Idx] / 1000,
    });
  }

  // C. Skill Effectiveness
  // Join audit_events (event_type='skill_loaded') + sessions (status='closed' or similar)
  // Track which skills were loaded in which sessions
  const sessionSkillsMap = new Map<string, Set<string>>(); // sessionId -> Set of skill names
  for (const e of filteredEvents) {
    if (e.event_type === "skill_loaded") {
      try {
        const payload = JSON.parse(e.payload);
        if (payload.session_id && payload.skill) {
          if (!sessionSkillsMap.has(payload.session_id)) {
            sessionSkillsMap.set(payload.session_id, new Set());
          }
          sessionSkillsMap.get(payload.session_id)!.add(payload.skill);
        }
      } catch {}
    }
  }

  // Query handoffs to see verify status of sessions
  // Handoffs are not directly in DB, but sessions have status and we can query sessions with status 'closed'.
  // We can consider a session "passed" if it closed without error, or we can check the handoff status if available.
  // Since handoff verify status is stored in SQLite (in session_instinct_refs or we can deduce it),
  // wait, did we have verifyStatus in handoff? Yes.
  // Let's count session as passed if it ended successfully (status = 'closed'). If status = 'orphaned' or 'failed', it did not pass.
  const passedSessions = new Set<string>();
  for (const s of filteredSessions) {
    if (s.status === "closed") {
      passedSessions.add(s.id);
    }
  }

  const skillStatsMap = new Map<string, { loaded: number; passed: number }>();
  for (const [sessionId, skills] of sessionSkillsMap.entries()) {
    const passed = passedSessions.has(sessionId);
    for (const skill of skills) {
      if (!skillStatsMap.has(skill)) {
        skillStatsMap.set(skill, { loaded: 0, passed: 0 });
      }
      const stats = skillStatsMap.get(skill)!;
      stats.loaded++;
      if (passed) stats.passed++;
    }
  }

  const skillEffectiveness: SkillEffectivenessStats[] = [];
  for (const [skill, stats] of skillStatsMap.entries()) {
    skillEffectiveness.push({
      skill,
      loaded: stats.loaded,
      sessions_passed: stats.passed,
      rate: stats.loaded > 0 ? Math.round((stats.passed / stats.loaded) * 100) : 0,
    });
  }

  // D. Reliability Score
  // Query workers to check timeouts
  let workersQuery = "SELECT status FROM workers";
  const workerParams: any[] = [];
  if (sinceDate) {
    workersQuery += " WHERE started_at >= ?";
    workerParams.push(sinceDate);
  }
  const workers = db.prepare(workersQuery).all(...workerParams) as Array<{ status: string }>;
  const totalWorkers = workers.length;
  const workerTimeouts = workers.filter(w => w.status === "timeout").length;

  const totalSessions = filteredSessions.length;
  const orphanedSessions = filteredSessions.filter(s => s.status === "orphaned").length;
  const sessionFailRate = totalSessions > 0 ? orphanedSessions / totalSessions : 0;

  const loopPenalty = totalToolCalls > 0 ? (loopBlocks / totalToolCalls) * 0.3 : 0;
  const circuitPenalty = totalSessions > 0 ? (circuitOpens / totalSessions) * 0.3 : 0;
  const workerPenalty = totalWorkers > 0 ? (workerTimeouts / totalWorkers) * 0.2 : 0;
  const sessionPenalty = sessionFailRate * 0.2;

  const reliabilityScore = Math.max(0, Math.min(1.0, 1.0 - loopPenalty - circuitPenalty - workerPenalty - sessionPenalty));

  return {
    period: options.period,
    repo_id: repoId,
    total_tool_calls: totalToolCalls,
    tool_usage: Array.from(toolMap.values()),
    tool_latency: toolLatency,
    skill_effectiveness: skillEffectiveness,
    reliability_score: parseFloat(reliabilityScore.toFixed(3)),
  };
}
