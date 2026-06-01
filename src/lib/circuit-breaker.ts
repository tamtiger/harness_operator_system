interface CircuitState {
  failures: number;
  last_failed_at: number;
  is_open: boolean;
}

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// Key: `${repo_id}:${tool_name}`
const circuitMap = new Map<string, CircuitState>();

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
  const state = circuitMap.get(key);

  if (!state || !state.is_open) return { open: false };

  const elapsed = Date.now() - state.last_failed_at;
  if (elapsed >= COOLDOWN_MS) {
    // Half-open: allow one attempt, reset state
    state.is_open = false;
    state.failures = 0;
    return { open: false };
  }

  return {
    open: true,
    failures: state.failures,
    cooldown_remaining_ms: COOLDOWN_MS - elapsed,
  };
}

/**
 * Record a successful tool execution, resetting failure counter.
 */
export function recordSuccess(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  const state = circuitMap.get(key);
  if (state) {
    state.failures = 0;
    state.is_open = false;
  }
}

/**
 * Record a failed tool execution, potentially opening circuit.
 */
export function recordFailure(repoId: string, toolName: string): void {
  const key = `${repoId}:${toolName}`;
  let state = circuitMap.get(key);

  if (!state) {
    state = { failures: 0, last_failed_at: 0, is_open: false };
    circuitMap.set(key, state);
  }

  state.failures++;
  state.last_failed_at = Date.now();

  if (state.failures >= FAILURE_THRESHOLD) {
    state.is_open = true;
  }
}

/**
 * Reset all circuit breaker state (for testing).
 */
export function resetCircuitBreaker(): void {
  circuitMap.clear();
}

/**
 * Get circuit state for debugging.
 */
export function getCircuitState(repoId: string, toolName: string): CircuitState | undefined {
  return circuitMap.get(`${repoId}:${toolName}`);
}