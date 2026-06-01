import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";

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
  ttlDays?: number
): InstinctAddResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO instincts (id, description, tags, confidence, ttl_days, created_at, success_count, failure_count, reference_count) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)`
  ).run(id, description, JSON.stringify(tags), confidence ?? 0.5, ttlDays ?? null, now);

  return { id };
}

export function instinctGet(
  tags?: string[],
  minConfidence?: number,
  sessionId?: string
): InstinctGetResult {
  const db = getDb();

  let rows = db
    .prepare(`SELECT * FROM instincts ORDER BY confidence DESC, created_at DESC`)
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
  }>;

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

export function instinctPromote(
  instinctId: string,
  toRepo?: string
): { ok: true; id: string } {
  const db = getDb();

  // Remove TTL (make permanent) and boost confidence
  const result = db
    .prepare(`UPDATE instincts SET ttl_days = NULL, confidence = MAX(confidence, 0.7) WHERE id = ?`)
    .run(instinctId);

  if (result.changes === 0) {
    throw new Error(`Instinct not found: ${instinctId}`);
  }

  return { ok: true, id: instinctId };
}
