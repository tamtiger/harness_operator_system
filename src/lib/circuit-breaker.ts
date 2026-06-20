import { getDb } from "../db/client.js";

interface CircuitState {
  failures: number;
  last_failed_at: number;
  is_open: boolean;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export interface CircuitCheckResult {
  open: boolean;
  failures?: number;
  cooldown_remaining_ms?: number;
}

/**
 * Check if a tool circuit is open for a given repo.
 * Returns circuit state and cooldown remaining if open.
 */
export function checkCircuit(repoId: string, toolName: string): CircuitCheckResult {
  const key = `${repoId}:${toolName}`;
  const db = getDb();
  let record: { count: number; last_triggered_at: number } | undefined;
  
  try {
    record = db.prepare("SELECT count, last_triggered_at FROM guard_state WHERE key = ? AND type = 'circuit_breaker'").get(key) as any;
  } catch {}

  // If no failures recorded yet, circuit is closed
  if (!record) return { open: false };

  const failures = record.count;
  const is_open = failures >= FAILURE_THRESHOLD;
  if (!is_open) return { open: false };

  const elapsed = Date.now() - record.last_triggered_at;
  if (elapsed >= COOLDOWN_MS) {
    // Half-open: allow one attempt, reset state
    try {
      db.prepare("DELETE FROM guard_state WHERE key = ? AND type = 'circuit_breaker'").run(key);
    } catch {}
    return { open: false };
  }

  return {
    open: true,
    failures: failures,
    cooldown_remaining_ms: COOLDOWN_MS - elapsed,
  };
}

/**
 * Record a successful tool execution, resetting failure counter.
 */
export function recordSuccess(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  try {
    getDb().prepare("DELETE FROM guard_state WHERE key = ? AND type = 'circuit_breaker'").run(key);
  } catch {}
}

/**
 * Record a failed tool execution, potentially opening circuit.
 */
export function recordFailure(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  const db = getDb();
  const now = Date.now();
  
  let record: { count: number } | undefined;
  try {
    record = db.prepare("SELECT count FROM guard_state WHERE key = ? AND type = 'circuit_breaker'").get(key) as any;
  } catch {}

  const newFailures = record ? record.count + 1 : 1;
  try {
    db.prepare("INSERT OR REPLACE INTO guard_state (key, count, last_triggered_at, type) VALUES (?, ?, ?, 'circuit_breaker')").run(key, newFailures, now);
  } catch {}
}

/**
 * Reset all circuit breaker state (for testing).
 */
export function resetCircuitBreaker(): void {
  try {
    getDb().prepare("DELETE FROM guard_state WHERE type = 'circuit_breaker'").run();
  } catch {}
}

/**
 * Get circuit state for debugging.
 */
export function getCircuitState(repoId: string, toolName: string): CircuitState | undefined {
  const key = `${repoId}:${toolName}`;
  try {
    const record = getDb().prepare("SELECT count, last_triggered_at FROM guard_state WHERE key = ? AND type = 'circuit_breaker'").get(key) as any;
    if (!record) return undefined;
    return {
      failures: record.count,
      last_failed_at: record.last_triggered_at,
      is_open: record.count >= FAILURE_THRESHOLD,
    };
  } catch {
    return undefined;
  }
}