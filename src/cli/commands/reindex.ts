import { resolve } from "node:path";
import { generateSummary, writeSummary } from "../../lib/repo-summary.js";
import { resolveHarnessDir } from "../../lib/repo.js";
import { invalidateTreeHashCache } from "../../lib/stale-cache.js";
import { getFlag } from "./utils.js";

export function cmdReindex() {
  const repoPath = resolve(getFlag("path") || ".");
  invalidateTreeHashCache(repoPath);

  console.log(`\nReindexing: ${repoPath}\n`);
  const data = generateSummary({ repoPath, force: true });
  const harnessDir = resolveHarnessDir(repoPath);
  writeSummary(data, harnessDir);

  console.log(`  Stack: ${data.stack}`);
  console.log(`  Tree hash: ${data.tree_hash}`);
  console.log(`\n✓ Reindex complete\n`);
}
