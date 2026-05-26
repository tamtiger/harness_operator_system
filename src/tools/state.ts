import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { resolveHarnessDir, ensureDir } from "../lib/repo.js";

// === progress_log ===

export interface ProgressEntry {
  task_id?: string;
  summary: string;
  status: string;
  evidence_ref?: string;
}

export function progressLog(
  repoPath: string,
  entry: ProgressEntry
): { ok: true } {
  const harnessDir = resolveHarnessDir(repoPath);
  const progressFile = join(harnessDir, "progress.md");

  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const taskRef = entry.task_id ? ` — task ${entry.task_id}` : "";
  const evidenceRef = entry.evidence_ref
    ? `\n- **Evidence:** \`${entry.evidence_ref}\``
    : "";

  const block = `
## ${now}${taskRef}
- **Status:** ${entry.status}
- **Summary:** ${entry.summary}${evidenceRef}
`;

  if (!existsSync(progressFile)) {
    writeFileSync(progressFile, `# Progress Log\n${block}`, "utf-8");
  } else {
    appendFileSync(progressFile, block, "utf-8");
  }

  return { ok: true };
}

// === feature_list ===

export interface Feature {
  id: string;
  name: string;
  status?: string;
  [key: string]: unknown;
}

export function featureListRead(
  repoPath: string
): { features: Feature[] } {
  const harnessDir = resolveHarnessDir(repoPath);
  const filePath = join(harnessDir, "feature_list.json");

  if (!existsSync(filePath)) {
    return { features: [] };
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return { features: Array.isArray(data.features) ? data.features : [] };
  } catch {
    return { features: [] };
  }
}

export function featureListUpdate(
  repoPath: string,
  featureId: string,
  patch: Record<string, unknown>
): { feature: Feature } {
  const harnessDir = resolveHarnessDir(repoPath);
  const filePath = join(harnessDir, "feature_list.json");

  let data: { features: Feature[] } = { features: [] };

  if (existsSync(filePath)) {
    try {
      data = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      data = { features: [] };
    }
  }

  const idx = data.features.findIndex((f) => f.id === featureId);
  if (idx >= 0) {
    data.features[idx] = { ...data.features[idx], ...patch } as Feature;
  } else {
    data.features.push({ id: featureId, name: featureId, ...patch } as Feature);
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  const feature = data.features.find((f) => f.id === featureId)!;
  return { feature };
}

// === handoff ===

export interface HandoffData {
  session_id: string;
  next_steps: string[];
  unfinished: string[];
  last_known_good: string;
  written_at: string;
}

export function handoffWrite(
  repoPath: string,
  sessionId: string,
  nextSteps: string[],
  unfinished: string[],
  lastKnownGood: string
): { path: string } {
  const harnessDir = resolveHarnessDir(repoPath);
  const handoffDir = join(harnessDir, "handoff");
  ensureDir(handoffDir);

  const filePath = join(handoffDir, "last.json");
  const data: HandoffData = {
    session_id: sessionId,
    next_steps: nextSteps,
    unfinished,
    last_known_good: lastKnownGood,
    written_at: new Date().toISOString(),
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return { path: filePath };
}

export function handoffRead(
  repoPath: string
): { handoff: HandoffData | null } {
  const harnessDir = resolveHarnessDir(repoPath);
  const filePath = join(harnessDir, "handoff", "last.json");

  if (!existsSync(filePath)) {
    return { handoff: null };
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    return { handoff: JSON.parse(raw) };
  } catch {
    return { handoff: null };
  }
}
