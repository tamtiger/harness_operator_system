import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";
import { tokenize, expandTokens } from "../lib/skill-matcher.js";

export interface InstinctRecord {
  id: string;
  description: string;
  tags: string[];
  confidence: number;
  ttl_days: number | null;
  created_at: string;
  success_count: number;
  failure_count: number;
  reference_count: number;
  last_outcome: string | null;
  last_referenced_at: string | null;
  type: string;
  context: string | null;
  resolution: string | null;
  review_trigger: string | null;
  status?: string;
  shadow?: boolean;
}

export interface InstinctAddResult {
  id: string;
}

export interface InstinctGetResult {
  instincts: InstinctRecord[];
  available_tags: string[];
}

export interface InstinctPruneResult {
  removed: number;
  dry_run: boolean;
  candidates: Array<{ id: string; description: string; reason: string }>;
}

export interface InstinctEvolveResult {
  suggested_skill: string;
  source_instincts: number;
}

export function instinctAdd(
  description: string,
  tags: string[],
  confidence?: number,
  ttlDays?: number,
  type?: "instinct" | "lesson" | "pattern" | "anti_pattern" | "decision" | "experiment",
  context?: string,
  resolution?: string,
  reviewTrigger?: string
): InstinctAddResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO instincts (
      id, description, tags, confidence, ttl_days, created_at, 
      success_count, failure_count, reference_count, 
      type, context, resolution, review_trigger, status
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, 'draft')`
  ).run(
    id,
    description,
    JSON.stringify(tags),
    confidence ?? 0.5,
    ttlDays ?? null,
    now,
    type ?? "instinct",
    context ?? null,
    resolution ?? null,
    reviewTrigger ?? null
  );

  return { id };
}

export function instinctGet(
  tags?: string[],
  minConfidence?: number,
  sessionId?: string,
  type?: string[],
  query?: string
): InstinctGetResult {
  const db = getDb();

  let rows = db
    .prepare(`SELECT * FROM instincts WHERE status = 'promoted' OR status = 'shadow' OR status IS NULL ORDER BY confidence DESC, created_at DESC`)
    .all() as Array<{
    id: string;
    description: string;
    tags: string;
    confidence: number;
    ttl_days: number | null;
    created_at: string;
    success_count: number;
    failure_count: number;
    reference_count: number;
    last_outcome: string | null;
    last_referenced_at: string | null;
    type: string;
    context: string | null;
    resolution: string | null;
    review_trigger: string | null;
    status: string;
  }>;

  // Filter by type
  if (type && type.length > 0) {
    rows = rows.filter((row) => type.includes(row.type));
  }

  // Filter by tags
  if (tags && tags.length > 0) {
    rows = rows.filter((row) => {
      const rowTags: string[] = JSON.parse(row.tags);
      return tags.some((t) => rowTags.includes(t));
    });
  }

  // Filter by min confidence
  if (minConfidence !== undefined) {
    rows = rows.filter((row) => row.confidence >= minConfidence);
  }

  // Fuzzy match by query
  if (query) {
    const queryTokens = expandTokens(tokenize(query));
    if (queryTokens.length > 0) {
      rows = rows
        .map((row) => {
          const descTokens = tokenize(row.description);
          const rowTags = JSON.parse(row.tags) as string[];
          const tagTokens = rowTags.flatMap((t) => tokenize(t));
          const allTokens = new Set([...descTokens, ...tagTokens]);

          let matches = 0;
          for (const t of queryTokens) {
            if (allTokens.has(t)) {
              matches++;
            }
          }

          const score = matches > 0 ? (matches / queryTokens.length) * 0.7 + row.confidence * 0.3 : 0;
          return { row, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.row);
    }
  }

  // Track references and update Bayesian confidence
  const now = new Date().toISOString();
  if (sessionId && rows.length > 0) {
    for (const row of rows) {
      // Record reference in session_instinct_refs
      db.prepare(`
        INSERT OR REPLACE INTO session_instinct_refs (session_id, instinct_id, referenced_at)
        VALUES (?, ?, ?)
      `).run(sessionId, row.id, now);

      // Update reference count and last_referenced_at
      const newRefCount = row.reference_count + 1;
      db.prepare(`
        UPDATE instincts 
        SET reference_count = ?, last_referenced_at = ?
        WHERE id = ?
      `).run(newRefCount, now, row.id);

      // Calculate Bayesian confidence: (success_count + 1) / (success_count + failure_count + 2)
      const totalOutcomes = row.success_count + row.failure_count;
      if (totalOutcomes > 0) {
        const bayesianConfidence = (row.success_count + 1) / (totalOutcomes + 2);
        // Blend with existing confidence: 70% Bayesian, 30% existing
        const blendedConfidence = 0.7 * bayesianConfidence + 0.3 * row.confidence;
        db.prepare(`UPDATE instincts SET confidence = ? WHERE id = ?`).run(blendedConfidence, row.id);
        row.confidence = blendedConfidence;
      }
    }
  }

  // Collect all available tags
  const allRows = db.prepare(`SELECT tags FROM instincts`).all() as Array<{ tags: string }>;
  const tagSet = new Set<string>();
  for (const r of allRows) {
    const parsed: string[] = JSON.parse(r.tags);
    for (const t of parsed) tagSet.add(t);
  }

  const instincts: InstinctRecord[] = rows.map((row) => ({
    id: row.id,
    description: row.description,
    tags: JSON.parse(row.tags) as string[],
    confidence: row.confidence,
    ttl_days: row.ttl_days,
    created_at: row.created_at,
    success_count: row.success_count,
    failure_count: row.failure_count,
    reference_count: row.reference_count,
    last_outcome: row.last_outcome,
    last_referenced_at: row.last_referenced_at,
    type: row.type,
    context: row.context,
    resolution: row.resolution,
    review_trigger: row.review_trigger,
    status: row.status,
    shadow: row.status === "shadow",
  }));

  return { instincts, available_tags: Array.from(tagSet).sort() };
}

/**
 * Record outcome for instincts referenced in a session
 */
export function recordInstinctOutcomes(
  sessionId: string,
  outcome: 'success' | 'failure',
  instinctIds?: string[]
): void {
  const db = getDb();
  const now = new Date().toISOString();

  // If specific instinct IDs provided, update only those
  if (instinctIds && instinctIds.length > 0) {
    for (const instinctId of instinctIds) {
      // Update session_instinct_refs
      db.prepare(`
        UPDATE session_instinct_refs 
        SET outcome = ?
        WHERE session_id = ? AND instinct_id = ?
      `).run(outcome, sessionId, instinctId);

      // Update instinct statistics
      if (outcome === 'success') {
        db.prepare(`
          UPDATE instincts 
          SET success_count = success_count + 1, last_outcome = ?, last_referenced_at = ?
          WHERE id = ?
        `).run(outcome, now, instinctId);
      } else {
        db.prepare(`
          UPDATE instincts 
          SET failure_count = failure_count + 1, last_outcome = ?, last_referenced_at = ?
          WHERE id = ?
        `).run(outcome, now, instinctId);
      }
    }
  } else {
    // Update all instincts referenced in this session
    const refs = db.prepare(`
      SELECT instinct_id FROM session_instinct_refs 
      WHERE session_id = ? AND outcome IS NULL
    `).all(sessionId) as Array<{ instinct_id: string }>;

    for (const ref of refs) {
      // Update session_instinct_refs
      db.prepare(`
        UPDATE session_instinct_refs 
        SET outcome = ?
        WHERE session_id = ? AND instinct_id = ?
      `).run(outcome, sessionId, ref.instinct_id);

      // Update instinct statistics
      if (outcome === 'success') {
        db.prepare(`
          UPDATE instincts 
          SET success_count = success_count + 1, last_outcome = ?, last_referenced_at = ?
          WHERE id = ?
        `).run(outcome, now, ref.instinct_id);
      } else {
        db.prepare(`
          UPDATE instincts 
          SET failure_count = failure_count + 1, last_outcome = ?, last_referenced_at = ?
          WHERE id = ?
        `).run(outcome, now, ref.instinct_id);
      }
    }
  }
}

export function instinctPrune(
  confidenceBelow?: number,
  expiredOnly?: boolean,
  dryRun?: boolean
): InstinctPruneResult {
  const db = getDb();
  const now = new Date();
  const threshold = confidenceBelow ?? 0.2;

  const allRows = db.prepare(`SELECT * FROM instincts`).all() as Array<{
    id: string;
    description: string;
    tags: string;
    confidence: number;
    ttl_days: number | null;
    created_at: string;
  }>;

  const candidates: Array<{ id: string; description: string; reason: string }> = [];

  for (const row of allRows) {
    // Check expired
    if (row.ttl_days !== null) {
      const created = new Date(row.created_at);
      const expiresAt = new Date(created.getTime() + row.ttl_days * 24 * 60 * 60 * 1000);
      if (now > expiresAt) {
        candidates.push({ id: row.id, description: row.description, reason: "expired (past TTL)" });
        continue;
      }
    }

    // Check low confidence (skip if expiredOnly)
    if (!expiredOnly && row.confidence < threshold) {
      candidates.push({
        id: row.id,
        description: row.description,
        reason: `low confidence (${row.confidence.toFixed(2)} < ${threshold})`,
      });
    }
  }

  if (!dryRun && candidates.length > 0) {
    const ids = candidates.map((c) => c.id);
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM instincts WHERE id IN (${placeholders})`).run(...ids);
  }

  return {
    removed: dryRun ? 0 : candidates.length,
    dry_run: dryRun ?? false,
    candidates,
  };
}

export function instinctEvolve(tagCluster?: string): InstinctEvolveResult {
  const db = getDb();

  let rows = db
    .prepare(`SELECT * FROM instincts ORDER BY confidence DESC`)
    .all() as Array<{
    id: string;
    description: string;
    tags: string;
    confidence: number;
    created_at: string;
  }>;

  // Filter by tag cluster if provided
  if (tagCluster) {
    rows = rows.filter((row) => {
      const tags: string[] = JSON.parse(row.tags);
      return tags.includes(tagCluster);
    });
  }

  if (rows.length < 5) {
    return {
      suggested_skill: `# Not enough instincts\n\nNeed at least 5 instincts${tagCluster ? ` tagged "${tagCluster}"` : ""} to evolve into a skill. Currently have ${rows.length}.`,
      source_instincts: rows.length,
    };
  }

  // Generate skill draft from instincts
  const tagName = tagCluster || "general";
  const descriptions = rows.map((r) => `- ${r.description}`).join("\n");

  const skillDraft = `---
name: ${tagName}-patterns
version: "1.0"
updated: ${new Date().toISOString().slice(0, 10)}
applies_to: ["*"]
triggers: ["session_start"]
description: Patterns evolved from ${rows.length} instincts tagged "${tagName}".
---

# ${tagName.charAt(0).toUpperCase() + tagName.slice(1)} Patterns

Evolved from ${rows.length} validated instincts.

## Patterns

${descriptions}

## Application

Apply these patterns when working on tasks related to "${tagName}".
Review and refine this skill — it was auto-generated from instincts.

## Source

Generated by \`instinct_evolve("${tagCluster || ""}")\` from ${rows.length} instincts
with average confidence ${(rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length).toFixed(2)}.
`;

  return {
    suggested_skill: skillDraft,
    source_instincts: rows.length,
  };
}

export function checkRegressionGate(
  instinctId: string,
  threshold?: number
): { passed: boolean; failed_checks: string[]; reason?: string } {
  const db = getDb();
  const instinct = db.prepare(`SELECT * FROM instincts WHERE id = ?`).get(instinctId) as {
    id: string;
    tags: string;
    confidence: number;
    status: string;
  } | undefined;

  if (!instinct) {
    return { passed: false, failed_checks: ["Not found"], reason: "Instinct not found" };
  }

  const failed_checks: string[] = [];

  // 1. Manifest check: tags
  let tags: string[] = [];
  try {
    tags = JSON.parse(instinct.tags || "[]");
  } catch {}

  if (tags.length === 0) {
    failed_checks.push("Missing tags");
  }

  // 2. Manifest check: confidence
  const confThreshold = threshold ?? 0.7;
  if (instinct.confidence < confThreshold) {
    failed_checks.push(`Confidence below threshold (${instinct.confidence} < ${confThreshold})`);
  }

  // 3. Manifest check: outcomes evidence (only if checking for shadow -> promoted)
  const outcomes = db.prepare(`SELECT outcome FROM instinct_outcomes WHERE instinct_id = ?`).all(instinctId) as Array<{ outcome: string }>;
  if (instinct.status === "shadow" && outcomes.length === 0) {
    failed_checks.push("Missing outcomes evidence");
  }

  // 4. Regression check
  if (tags.length > 0 && outcomes.length > 0) {
    const primaryTag = tags[0];

    // Find all promoted instincts with same primary tag
    const promotedInstincts = db.prepare(`SELECT id FROM instincts WHERE status = 'promoted'`).all() as Array<{ id: string }>;
    const matchingInstinctIds = promotedInstincts.filter(pi => {
      const piTagsRow = db.prepare(`SELECT tags FROM instincts WHERE id = ?`).get(pi.id) as { tags: string };
      try {
        const piTags = JSON.parse(piTagsRow.tags);
        return piTags[0] === primaryTag;
      } catch {
        return false;
      }
    }).map(pi => pi.id);

    if (matchingInstinctIds.length > 0) {
      // Find last 20 scorecards using any of these matching promoted instincts
      const allScorecards = db.prepare(`
        SELECT id, verify_pass, instincts_used
        FROM scorecards
        ORDER BY created_at DESC
      `).all() as Array<{ id: string; verify_pass: number; instincts_used: string }>;

      const relevantScorecards = allScorecards.filter(sc => {
        try {
          const scInstincts = JSON.parse(sc.instincts_used || "[]") as string[];
          return scInstincts.some(id => matchingInstinctIds.includes(id));
        } catch {
          return false;
        }
      }).slice(0, 20);

      if (relevantScorecards.length > 0) {
        const existingSuccessCount = relevantScorecards.filter(sc => sc.verify_pass === 1).length;
        const existingSuccessRate = existingSuccessCount / relevantScorecards.length;

        const newSuccessCount = outcomes.filter(o => o.outcome === "success").length;
        const newSuccessRate = newSuccessCount / outcomes.length;

        if (newSuccessRate < existingSuccessRate - 0.10) {
          failed_checks.push(`Regression check failed: success rate of this instinct (${(newSuccessRate * 100).toFixed(0)}%) is more than 10% lower than matching promoted instincts (${(existingSuccessRate * 100).toFixed(0)}%)`);
        }
      }
    }
  }

  return {
    passed: failed_checks.length === 0,
    failed_checks,
    reason: failed_checks.length > 0 ? failed_checks.join(", ") : undefined
  };
}

export function instinctPromote(
  instinctId: string,
  toRepo?: string
): { ok: boolean; id: string; status: string; error?: string; gate_check?: any } {
  const db = getDb();

  const instinct = db.prepare(`SELECT status, confidence FROM instincts WHERE id = ?`).get(instinctId) as { status: string; confidence: number } | undefined;
  if (!instinct) {
    throw new Error(`Instinct not found: ${instinctId}`);
  }

  // 1. Transition to candidate
  db.prepare(`UPDATE instincts SET status = 'candidate' WHERE id = ?`).run(instinctId);

  // 2. Check Regression Gate for candidate (using threshold 0.5 since confidence starts at 0.5)
  const gateCheck = checkRegressionGate(instinctId, 0.5);

  if (gateCheck.passed) {
    // 3. Move to shadow
    db.prepare(`UPDATE instincts SET status = 'shadow' WHERE id = ?`).run(instinctId);
    return { ok: true, id: instinctId, status: "shadow", gate_check: gateCheck };
  } else {
    // Remain candidate
    return { ok: false, id: instinctId, status: "candidate", error: gateCheck.reason, gate_check: gateCheck };
  }
}
