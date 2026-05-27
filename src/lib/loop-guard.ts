import { createHash } from "node:crypto";

interface CallRecord {
  count: number;
  firstCall: number;
}

const WINDOW_MS = 60_000; // 60 seconds
const MAX_CALLS = 5;

const callMap = new Map<string, CallRecord>();

/**
 * Check if a tool call is potentially looping.
 * Returns a warning string if loop detected, null otherwise.
 */
export function checkLoop(toolName: string, args: unknown): string | null {
  const key = toolName + ":" + hashArgs(args);
  const now = Date.now();

  const record = callMap.get(key);

  if (!record) {
    callMap.set(key, { count: 1, firstCall: now });
    return null;
  }

  // Reset if window expired
  if (now - record.firstCall > WINDOW_MS) {
    callMap.set(key, { count: 1, firstCall: now });
    return null;
  }

  record.count++;

  if (record.count > MAX_CALLS) {
    return `potential loop detected: ${toolName} called ${record.count} times in ${Math.round((now - record.firstCall) / 1000)}s with same args`;
  }

  return null;
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
