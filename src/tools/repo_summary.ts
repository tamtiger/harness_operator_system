import { resolve } from "node:path";
import { resolveHarnessDir } from "../lib/repo.js";
import { computeTreeHashCached } from "../lib/stale-cache.js";
import {
  generateSummary,
  writeSummary,
  readSummaryMeta,
  readSummaryContent,
} from "../lib/repo-summary.js";

const MAX_OUTPUT = 8192;

export interface RepoSummaryResult {
  summary: string;
  stale: false;
  repo_id: string;
}

/**
 * Read (or auto-generate) a repo summary.
 * - Auto-generates if no summary exists
 * - Auto-reindexes if tree-hash differs from stored
 * - Returns cached if tree-hash matches
 * - Truncates to 8192 bytes max
 */
export function repoSummaryRead(input: { repo_path: string }): RepoSummaryResult | { error: string } {
  try {
    const repoPath = resolve(input.repo_path);
    const harnessDir = resolveHarnessDir(repoPath);
    const currentHash = computeTreeHashCached(repoPath);

    // Check existing meta
    const meta = readSummaryMeta(harnessDir);

    if (meta && meta.tree_hash === currentHash) {
      // Cache hit — return stored summary
      const content = readSummaryContent(harnessDir);
      if (content) {
        return {
          summary: truncate(content),
          stale: false,
          repo_id: meta.repo_id,
        };
      }
    }

    // Generate fresh summary
    const data = generateSummary({ repoPath });
    writeSummary(data, harnessDir);

    return {
      summary: truncate(data.summary),
      stale: false,
      repo_id: data.repo_id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `repo_summary_read failed: ${msg}` };
  }
}

function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT) return s;
  return s.slice(0, MAX_OUTPUT) + "\n...[truncated]";
}
