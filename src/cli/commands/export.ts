import { resolve, join, dirname } from "node:path";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDir } from "../../lib/repo.js";
import { getFlag, hasFlag } from "./utils.js";

export function cmdExport() {
  const repoPath = resolve(getFlag("repo") || ".");
  const outputFile = getFlag("output") || `harness-export-${Date.now()}.json`;
  const exportAll = hasFlag("all");

  const exportData: Record<string, unknown> = {
    manifest: {
      version: "1.0",
      exported_at: new Date().toISOString(),
      source: exportAll ? "all" : repoPath,
    },
    state: {} as Record<string, unknown>,
  };

  const state = exportData.state as Record<string, unknown>;

  // Export .harness directory contents
  const harnessDir = join(repoPath, ".harness");
  if (existsSync(harnessDir)) {
    const files = readdirSync(harnessDir).filter((f) => f.endsWith(".json") || f.endsWith(".md") || f.endsWith(".yaml"));
    for (const file of files) {
      const filePath = join(harnessDir, file);
      try {
        state[file] = readFileSync(filePath, "utf-8");
      } catch {
        // skip unreadable files
      }
    }

    // Export handoff
    const handoffPath = join(harnessDir, "handoff_last.json");
    if (existsSync(handoffPath)) {
      state["handoff_last.json"] = readFileSync(handoffPath, "utf-8");
    }
  }

  const outputPath = resolve(outputFile);
  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8");
  console.log(`\n✓ Exported to: ${outputPath}\n`);
}
