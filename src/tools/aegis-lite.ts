import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { runTraceAnalysis } from "../lib/trace-analyzer.js";
import { checkRegressionGate } from "./instinct.js";

export interface AegisAnalyzeResult {
  signals: Array<{
    type: string;
    session_id?: string;
    task_id?: string;
    instinct_id?: string;
    payload: any;
  }>;
  summary: {
    total_scorecards: number;
    signals_found: number;
    last_analyzed: string;
  };
}

export interface AegisProposeResult {
  proposal_id: string;
  status: string;
  gate_pre_check: {
    passed: boolean;
    failed_checks: string[];
  };
}

/**
 * MCP tool handler for aegis_analyze
 */
export function aegisAnalyze(repoPath: string): AegisAnalyzeResult {
  const db = getDb();
  
  // Re-run trace analysis globally to ensure latest data is evaluated
  runTraceAnalysis();

  const events = db.prepare(`
    SELECT event_type as type, session_id, task_id, instinct_id, payload
    FROM analysis_events
    ORDER BY created_at DESC
  `).all() as Array<{
    type: string;
    session_id: string | null;
    task_id: string | null;
    instinct_id: string | null;
    payload: string;
  }>;

  const totalScorecards = db.prepare(`SELECT COUNT(*) as count FROM scorecards`).get() as { count: number } | undefined;

  const signals = events.map(e => ({
    type: e.type,
    session_id: e.session_id ?? undefined,
    task_id: e.task_id ?? undefined,
    instinct_id: e.instinct_id ?? undefined,
    payload: JSON.parse(e.payload)
  }));

  return {
    signals,
    summary: {
      total_scorecards: totalScorecards?.count ?? 0,
      signals_found: signals.length,
      last_analyzed: new Date().toISOString()
    }
  };
}

/**
 * MCP tool handler for aegis_propose
 */
export function aegisPropose(
  repoPath: string,
  type: "merge" | "prune" | "evolve" | "penalize",
  instinctIds: string[],
  rationale: string,
  suggestedChange?: string
): AegisProposeResult {
  const db = getDb();
  const proposalId = randomUUID();
  const now = new Date().toISOString();

  // Run regression gate checks on matching instincts for early feedback
  const failed_checks: string[] = [];
  for (const instId of instinctIds) {
    try {
      const gateRes = checkRegressionGate(instId);
      if (!gateRes.passed) {
        failed_checks.push(...gateRes.failed_checks.map(c => `${instId}: ${c}`));
      }
    } catch (err: any) {
      failed_checks.push(`${instId}: ${err.message}`);
    }
  }

  // Insert proposal
  db.prepare(`
    INSERT INTO proposals (id, type, instinct_ids, rationale, suggested_change, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending_review', ?)
  `).run(
    proposalId,
    type,
    JSON.stringify(instinctIds),
    rationale,
    suggestedChange || null,
    now
  );

  return {
    proposal_id: proposalId,
    status: "pending_review",
    gate_pre_check: {
      passed: failed_checks.length === 0,
      failed_checks
    }
  };
}
