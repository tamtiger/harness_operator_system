/**
 * Structured stderr logger.
 * Only emits when HARNESS_DEBUG=1. Never writes to stdout (would break MCP transport).
 */

type LogLevel = "info" | "warn" | "error";

const DEBUG = process.env.HARNESS_DEBUG === "1";

export function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  if (!DEBUG && level !== "error") return;

  const entry = {
    ts: Date.now(),
    lvl: level,
    msg,
    ...(meta ? { meta } : {}),
  };

  process.stderr.write(JSON.stringify(entry) + "\n");
}
