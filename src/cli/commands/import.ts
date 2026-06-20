import { resolve, join, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDir } from "../../lib/repo.js";
import { args } from "./utils.js";

export function cmdImport() {
  const inputFile = args[1];
  if (!inputFile || !existsSync(inputFile)) {
    console.error("  ✗ Usage: harness import <file.json>");
    console.error("    File must exist.");
    process.exit(1);
  }

  let data: { manifest: { version: string; source: string; exported_at?: string }; state: Record<string, string> };
  try {
    data = JSON.parse(readFileSync(resolve(inputFile), "utf-8"));
  } catch (err) {
    console.error(`  ✗ Failed to parse import file: ${err}`);
    process.exit(1);
  }

  if (!data.manifest || !data.state) {
    console.error("  ✗ Invalid export file format (missing manifest or state)");
    process.exit(1);
  }

  // Determine target directory
  const targetRepo = resolve(".");
  const harnessDir = join(targetRepo, ".harness");
  ensureDir(harnessDir);

  let restored = 0;
  for (const [filename, content] of Object.entries(data.state)) {
    const targetPath = join(harnessDir, filename);
    ensureDir(dirname(targetPath));
    writeFileSync(targetPath, content, "utf-8");
    restored++;
  }

  console.log(`\n✓ Imported ${restored} files from ${inputFile}`);
  console.log(`  Source: ${data.manifest.source}`);
  console.log(`  Exported at: ${data.manifest.exported_at || "unknown"}\n`);
}
