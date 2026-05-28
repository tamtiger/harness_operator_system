import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveStateDir } from "./repo.js";

/**
 * Shape of evidence data stored per task.
 */
export interface EvidenceData {
  passed: boolean;
  saved_at?: string;
  [key: string]: unknown;
}

/**
 * Result of a saveEvidence call.
 */
export interface SaveResult {
  saved: boolean;
  path: string;
}

/**
 * Resolve the evidence file path for a given repo + task.
 */
function evidencePath(repoPath: string, taskId: string): string {
  const stateDir = resolveStateDir(repoPath);
  return join(stateDir, "evidence", taskId, "verify.json");
}

/**
 * Save verification evidence for a task.
 * Creates directories recursively if needed. Adds `saved_at` ISO timestamp.
 * Never throws — returns `{ saved: false, path }` on error.
 */
export function saveEvidence(
  repoPath: string,
  taskId: string,
  data: Record<string, unknown>
): SaveResult {
  const filePath = evidencePath(repoPath, taskId);
  try {
    const dir = join(filePath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const payload: EvidenceData = {
      ...data,
      passed: Boolean(data.passed),
      saved_at: new Date().toISOString(),
    };
    writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { saved: true, path: filePath };
  } catch {
    return { saved: false, path: filePath };
  }
}

/**
 * Read previously saved evidence for a task.
 * Returns null if file doesn't exist or cannot be parsed.
 * Never throws.
 */
export function readEvidence(
  repoPath: string,
  taskId: string
): EvidenceData | null {
  const filePath = evidencePath(repoPath, taskId);
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as EvidenceData;
  } catch {
    return null;
  }
}
