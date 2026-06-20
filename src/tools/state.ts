import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { resolveStateDir } from "../lib/repo.js";
import { z } from "zod";

// === progress_log ===

export interface ProgressEntry {
  task_id?: string;
  summary: string;
  status: string;
  evidence_ref?: string;
  files_changed?: string[];
}

export function progressLog(
  repoPath: string,
  entry: ProgressEntry
): { ok: true } {
  const stateDir = resolveStateDir(repoPath);

  const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }).slice(0, 16).replace("T", " ");
  const taskRef = entry.task_id ? ` — task ${entry.task_id}` : "";
  const evidenceRef = entry.evidence_ref
    ? `\n- **Evidence:** \`${entry.evidence_ref}\``
    : "";
  const filesRef = entry.files_changed?.length
    ? `\n- **Files:** ${entry.files_changed.map(f => `\`${f}\``).join(", ")}`
    : "";

  const block = `
## ${now}${taskRef}
- **Status:** ${entry.status}
- **Summary:** ${entry.summary}${evidenceRef}${filesRef}
`;

  // Write to state directory (global or local fallback)
  const progressFile = join(stateDir, "progress.md");
  if (!existsSync(progressFile)) {
    writeFileSync(progressFile, `# Progress Log\n${block}`, "utf-8");
  } else {
    appendFileSync(progressFile, block, "utf-8");
  }

  return { ok: true };
}


// === handoff ===

export interface HandoffData {
  session_id: string;
  next_steps: string[];
  unfinished: string[];
  last_known_good: string;
  written_at: string;
  verify_status?: {
    passed: boolean;
    steps_run: string[];
    failed_step?: string;
    output?: string;
  };
  duration_seconds?: number;
  suggested_skills?: string[];
}

export function handoffWrite(
  repoPath: string,
  sessionId: string,
  nextSteps: string[],
  unfinished: string[],
  lastKnownGood: string,
  verifyStatus?: { passed: boolean; steps_run: string[]; failed_step?: string },
  durationSeconds?: number,
  suggestedSkills?: string[]
): { path: string } {
  const stateDir = resolveStateDir(repoPath);
  const fileName = "handoff_last.json";

  const filePath = join(stateDir, fileName);
  const data: HandoffData = {
    session_id: sessionId,
    next_steps: nextSteps,
    unfinished,
    last_known_good: lastKnownGood,
    written_at: new Date().toISOString(),
    ...(verifyStatus !== undefined && { verify_status: verifyStatus }),
    ...(durationSeconds !== undefined && { duration_seconds: durationSeconds }),
    ...(suggestedSkills !== undefined && { suggested_skills: suggestedSkills }),
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  return { path: filePath };
}

export function handoffRead(
  repoPath: string
): { handoff: HandoffData | null } {
  const stateDir = resolveStateDir(repoPath);
  const filePath = join(stateDir, "handoff_last.json");

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

export const mcpTools = [
  {
    name: "progress_log",
    description: "Append a progress entry to .harness/progress.md.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
      entry: z.object({
        task_id: z.string().optional(),
        summary: z.string(),
        status: z.string(),
        evidence_ref: z.string().optional(),
        files_changed: z.array(z.string()).optional().describe("List of files modified"),
      }),
    },
    handler: async (args: any) => progressLog(args.repo_path, args.entry),
  },
  {
    name: "handoff_read",
    description: "Read the last handoff file from .harness/handoff_last.json.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
    },
    handler: async (args: any) => handoffRead(args.repo_path),
  },
];
