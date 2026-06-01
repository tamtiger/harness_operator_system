import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;
const WARN_THRESHOLD = 5;
const BLOCK_THRESHOLD = 10;

interface CallRecord {
  count: number;
  firstCall: number;
}

export type LoopCheckResult =
  | { status: 'ok' }
  | { status: 'warn'; count: number }
  | { status: 'blocked'; count: number };

// Key: `${session_id}:${tool_name}:${args_hash}`
const callMap = new Map<string, CallRecord>();

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

  const record = callMap.get(key);

  if (!record) {
    callMap.set(key, { count: 1, firstCall: now });
    return { status: 'ok' };
  }

  // Reset if window expired
  if (now - record.firstCall > WINDOW_MS) {
    callMap.set(key, { count: 1, firstCall: now });
    return { status: 'ok' };
  }

  record.count++;

  if (record.count >= BLOCK_THRESHOLD) {
    return { status: 'blocked', count: record.count };
  }

  if (record.count > WARN_THRESHOLD) {
    return { status: 'warn', count: record.count };
  }

  return { status: 'ok' };
}

/**
 * Reset all tracking (for testing).
 */
export function resetLoopGuard(): void {
  callMap.clear();
}

function hashArgs(args: unknown): string {
  const str = JSON.stringify(args ?? {});
  return createHash("md5").update(str).digest("hex").slice(0, 12);
}