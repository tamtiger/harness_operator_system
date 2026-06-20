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
    severity?: string;
    actionable_suggestions?: string[];
  }>;
  summary: {
    total_scorecards: number;
    signals_found: number;
    last_analyzed: string;
  };
}

export interface AegisProposeResult {
  proposal_id?: string;
  status?: string;
  gate_pre_check?: {
    passed: boolean;
    failed_checks: string[];
  };
  evidence_summary?: string;
  error?: string;
}

function getActionableSuggestions(type: string, payload: any, instinctId?: string): string[] {
  const suggestions: string[] = [];
  switch (type) {
    case "repeated_failures":
      suggestions.push(`Consistently failing on task type '${payload.task_type}' using instinct '${instinctId}'. Consider editing or refining this instinct's description to narrow its context.`);
      suggestions.push(`Verify that the environment setup and verification commands are correct for task type '${payload.task_type}'.`);
      break;
    case "loop_patterns":
      suggestions.push(`Agent encountered loops or high retry counts in session. Review the command output logs and verify the verification commands are non-blocking.`);
      break;
    case "low_value_instinct":
      suggestions.push(`Instinct '${instinctId}' has a low success rate of ${(payload.success_rate * 100).toFixed(0)}%. Consider proposing to prune this instinct (aegis_propose with type='prune') or penalize it.`);
      break;
    case "workflow_non_compliance":
      suggestions.push(`Workflow violation: ${payload.reason}`);
      suggestions.push(`Ensure all steps of the compliance checklist in AGENTS.md are followed, especially running verify_run before handing off.`);
      break;
    case "forgetting":
      suggestions.push(`Performance for instinct '${instinctId}' on task type '${payload.task_type}' dropped by ${(payload.diff * 100).toFixed(0)}% (from ${(payload.snapshot_rate * 100).toFixed(0)}% to ${(payload.live_rate * 100).toFixed(0)}%). Consider reviewing recent commits or updating the instinct.`);
      break;
    case "stale_instinct":
      suggestions.push(`Instinct '${instinctId}' has not been used in over 90 days. Consider pruning it.`);
      break;
    case "over_reliance":
      suggestions.push(`Skill '${payload.skill_name}' was loaded in ${(payload.usage_percentage * 100).toFixed(0)}% of recent sessions. Suggest merging its patterns directly into the core AGENTS.md rules.`);
      break;
  }
  return suggestions;
}

/**
 * MCP tool handler for aegis_analyze
 */
export function aegisAnalyze(
  repoPath: string,
  include_info: boolean = false,
  limit: number = 20
): AegisAnalyzeResult {
  const db = getDb();
  
  // Re-run trace analysis globally to ensure latest data is evaluated
  runTraceAnalysis();

  const events = db.prepare(`
    SELECT event_type as type, session_id, task_id, instinct_id, payload, severity
    FROM analysis_events
    ORDER BY created_at DESC
  `).all() as Array<{
    type: string;
    session_id: string | null;
    task_id: string | null;
    instinct_id: string | null;
    payload: string;
    severity: string;
  }>;

  const totalScorecards = db.prepare(`SELECT COUNT(*) as count FROM scorecards`).get() as { count: number } | undefined;

  let filteredEvents = events;
  if (!include_info) {
    filteredEvents = events.filter(e => e.severity !== "info");
  }

  // Cap at limit
  const maxLimit = Math.min(20, Math.max(1, limit));
  filteredEvents = filteredEvents.slice(0, maxLimit);

  const signals = filteredEvents.map(e => {
    const payloadParsed = JSON.parse(e.payload);
    return {
      type: e.type,
      session_id: e.session_id ?? undefined,
      task_id: e.task_id ?? undefined,
      instinct_id: e.instinct_id ?? undefined,
      payload: payloadParsed,
      severity: e.severity,
      actionable_suggestions: getActionableSuggestions(e.type, payloadParsed, e.instinct_id ?? undefined)
    };
  });

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

  // Validation
  if (!instinctIds || instinctIds.length === 0) {
    return { error: "Proposals must specify at least one instinct ID." };
  }
  if (type === "merge" && instinctIds.length < 2) {
    return { error: "Merge proposals must specify at least two instinct IDs." };
  }

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

  // Generate evidence summary
  let evidenceSummary = "";
  try {
    const placeholders = instinctIds.map(() => "?").join(",");
    const instinctsInfo = db.prepare(`
      SELECT id, description, confidence, success_count, failure_count
      FROM instincts
      WHERE id IN (${placeholders})
    `).all(...instinctIds) as Array<{
      id: string;
      description: string;
      confidence: number;
      success_count: number;
      failure_count: number;
    }>;

    evidenceSummary += `### Proposal Evidence Summary\n\n`;
    for (const inst of instinctsInfo) {
      const total = inst.success_count + inst.failure_count;
      const rate = total > 0 ? (inst.success_count / total * 100).toFixed(0) : "N/A";
      evidenceSummary += `- **Instinct ${inst.id.slice(0, 8)}**: "${inst.description}"\n`;
      evidenceSummary += `  - Confidence: ${inst.confidence.toFixed(2)}\n`;
      evidenceSummary += `  - History: ${inst.success_count} success, ${inst.failure_count} failure (Success Rate: ${rate}%)\n`;
    }
  } catch (err: any) {
    evidenceSummary = `Failed to generate evidence summary: ${err.message}`;
  }

  // Insert proposal
  db.prepare(`
    INSERT INTO proposals (id, type, instinct_ids, rationale, suggested_change, status, created_at, evidence_summary)
    VALUES (?, ?, ?, ?, ?, 'pending_review', ?, ?)
  `).run(
    proposalId,
    type,
    JSON.stringify(instinctIds),
    rationale,
    suggestedChange || null,
    now,
    evidenceSummary
  );

  return {
    proposal_id: proposalId,
    status: "pending_review",
    evidence_summary: evidenceSummary,
    gate_pre_check: {
      passed: failed_checks.length === 0,
      failed_checks
    }
  };
}

import { z } from "zod";

export const mcpTools = [
  {
    name: "aegis_analyze",
    description: "Analyze traces and return structured signals about failures, loop patterns, workflow non-compliance, and forgetting.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
      include_info: z.boolean().optional().describe("If true, include info-level signals (default: false)"),
      limit: z.number().optional().describe("Maximum number of signals to return (default: 20, max: 20)"),
    },
    handler: async (args: any) => aegisAnalyze(args.repo_path, args.include_info ?? false, args.limit ?? 20),
  },
  {
    name: "aegis_propose",
    description: "Submit a proposal (merge, prune, evolve, penalize) based on trace signals.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
      type: z.enum(["merge", "prune", "evolve", "penalize"]).describe("Proposal type"),
      instinct_ids: z.array(z.string()).describe("IDs of the target instincts"),
      rationale: z.string().describe("Explanation for why this change is suggested"),
      suggested_change: z.string().optional().describe("Description or code content of the change"),
    },
    handler: async (args: any) => aegisPropose(
      args.repo_path,
      args.type,
      args.instinct_ids,
      args.rationale,
      args.suggested_change
    ),
  },
];
