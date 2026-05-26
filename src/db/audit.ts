import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { resolveGlobalHome, ensureDir } from "../lib/repo.js";

/**
 * Append a JSON line to ~/.harness/audit.jsonl.
 * Atomic: each write is a single line with newline.
 */
export function appendAuditJsonl(event: {
  event_type: string;
  payload: unknown;
  timestamp: string;
}): void {
  const home = resolveGlobalHome();
  const filePath = join(home, "audit.jsonl");

  const line = JSON.stringify(event) + "\n";
  appendFileSync(filePath, line, "utf-8");
}
