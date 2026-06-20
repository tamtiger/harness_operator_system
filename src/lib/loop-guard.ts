import { createHash } from "node:crypto";
import { getDb } from "../db/client.js";

const WINDOW_MS = 60_000;
const WARN_THRESHOLD = 5;
const BLOCK_THRESHOLD = 10;

export type LoopCheckResult =
  | { status: 'ok' }
  | { status: 'warn'; count: number }
  | { status: 'blocked'; count: number };

/**
 * Check if a tool call is potentially looping.
 * Returns warning or block status based on call count within time window.
 * 
 * Scoped by session_id to avoid false positives across parallel sessions.
 */
export function checkLoop(sessionId: string, toolName: string, args: unknown): LoopCheckResult {
  const argsHash = hashArgs(args);
  const key = `${sessionId}:${toolName}:${argsHash}`;
  const now = Date.now();

  const db = getDb();
  let record: { count: number; last_triggered_at: number } | undefined;
  
  try {
    record = db.prepare("SELECT count, last_triggered_at FROM guard_state WHERE key = ? AND type = 'loop_guard'").get(key) as any;
  } catch (err) {
    // Ignore error
  }

  if (!record) {
    try {
      db.prepare("INSERT OR REPLACE INTO guard_state (key, count, last_triggered_at, type) VALUES (?, ?, ?, 'loop_guard')").run(key, 1, now);
    } catch {}
    return { status: 'ok' };
  }

  // Reset if window expired
  if (now - record.last_triggered_at > WINDOW_MS) {
    try {
      db.prepare("INSERT OR REPLACE INTO guard_state (key, count, last_triggered_at, type) VALUES (?, ?, ?, 'loop_guard')").run(key, 1, now);
    } catch {}
    return { status: 'ok' };
  }

  const newCount = record.count + 1;
  try {
    db.prepare("UPDATE guard_state SET count = ? WHERE key = ?").run(newCount, key);
  } catch {}

  if (newCount >= BLOCK_THRESHOLD) {
    return { status: 'blocked', count: newCount };
  }

  if (newCount > WARN_THRESHOLD) {
    return { status: 'warn', count: newCount };
  }

  return { status: 'ok' };
}

/**
 * Reset all tracking (for testing).
 */
export function resetLoopGuard(): void {
  try {
    getDb().prepare("DELETE FROM guard_state WHERE type = 'loop_guard'").run();
  } catch {}
}

function normalizeValue(val: unknown): any {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") {
    // Trim, convert to lowercase, normalize slashes
    return val.trim().toLowerCase().replace(/\\/g, "/");
  }
  if (Array.isArray(val)) {
    return val.map(normalizeValue);
  }
  if (typeof val === "object") {
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(val as Record<string, unknown>).sort();
    for (const key of keys) {
      sortedObj[key] = normalizeValue((val as Record<string, unknown>)[key]);
    }
    return sortedObj;
  }
  return val;
}

function hashArgs(args: unknown): string {
  const normalized = normalizeValue(args);
  const str = JSON.stringify(normalized ?? {});
  return createHash("md5").update(str).digest("hex").slice(0, 12);
}