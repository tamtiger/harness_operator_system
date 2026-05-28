import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { detectRuntime } from "./runtime.js";
import { generateTree } from "./tree.js";
import { computeTreeHashCached } from "./stale-cache.js";
import { ensureDir } from "./repo.js";

export interface SummaryOptions {
  repoPath: string;
  force?: boolean;
}

export interface SummaryData {
  summary: string;
  tree_hash: string;
  stack: string;
  repo_id: string;
}

/**
 * Generate a repo summary including tree, stack info, and metadata.
 */
export function generateSummary(opts: SummaryOptions): SummaryData {
  const { repoPath } = opts;
  const repoName = basename(repoPath) || "repo";
  const runtime = detectRuntime(repoPath);
  const stack = runtime.runtime;
  const treeHash = computeTreeHashCached(repoPath);

  const tree = generateTree({ path: repoPath, depth: 3 });

  const lines: string[] = [
    `# ${repoName}`,
    "",
    `**Stack:** ${stack}`,
    `**Tree Hash:** ${treeHash}`,
    "",
    "## Directory Structure",
    "",
    "```",
    tree,
    "```",
    "",
  ];

  // Add build commands if detected
  if (runtime.commands.build || runtime.commands.test) {
    lines.push("## Build Commands", "");
    if (runtime.commands.install) lines.push(`- Install: \`${runtime.commands.install}\``);
    if (runtime.commands.build) lines.push(`- Build: \`${runtime.commands.build}\``);
    if (runtime.commands.test) lines.push(`- Test: \`${runtime.commands.test}\``);
    if (runtime.commands.lint) lines.push(`- Lint: \`${runtime.commands.lint}\``);
    lines.push("");
  }

  const summary = lines.join("\n");

  return {
    summary,
    tree_hash: treeHash,
    stack,
    repo_id: repoName,
  };
}

/**
 * Write summary files to the output directory.
 * Creates `repo-summary.md` and `repo-summary.meta.json`.
 */
export function writeSummary(data: SummaryData, outputDir: string): void {
  ensureDir(outputDir);

  const mdPath = join(outputDir, "repo-summary.md");
  writeFileSync(mdPath, data.summary, "utf-8");

  const metaPath = join(outputDir, "repo-summary.meta.json");
  const meta = {
    tree_hash: data.tree_hash,
    stack: data.stack,
    repo_id: data.repo_id,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
}

/**
 * Read existing summary metadata from a directory.
 * Returns null if not found.
 */
export function readSummaryMeta(dir: string): { tree_hash: string; stack: string; repo_id: string } | null {
  const metaPath = join(dir, "repo-summary.meta.json");
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Read existing summary markdown from a directory.
 * Returns null if not found.
 */
export function readSummaryContent(dir: string): string | null {
  const mdPath = join(dir, "repo-summary.md");
  if (!existsSync(mdPath)) return null;
  try {
    return readFileSync(mdPath, "utf-8");
  } catch {
    return null;
  }
}
