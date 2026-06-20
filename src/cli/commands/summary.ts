import { resolve } from "node:path";
import { generateSummary, writeSummary } from "../../lib/repo-summary.js";
import { resolveHarnessDir } from "../../lib/repo.js";
import { invalidateTreeHashCache } from "../../lib/stale-cache.js";
import { getFlag, hasFlag } from "./utils.js";

export function cmdSummary() {
  const repoPath = resolve(getFlag("path") || ".");
  const force = hasFlag("force");

  if (force) {
    invalidateTreeHashCache(repoPath);
  }

  console.log(`\nGenerating summary for: ${repoPath}\n`);
  const data = generateSummary({ repoPath, force });
  const harnessDir = resolveHarnessDir(repoPath);
  writeSummary(data, harnessDir);

  console.log(`  Stack: ${data.stack}`);
  console.log(`  Tree hash: ${data.tree_hash}`);
  console.log(`  Written to: ${harnessDir}/repo-summary.md`);
  console.log(`\n✓ Summary generated\n`);
}
