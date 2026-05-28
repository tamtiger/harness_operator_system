import { existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { resolveGlobalRepoPath } from "./repo-identity.js";
import { ensureDir } from "./repo.js";

export interface MigrationResult {
  migrated: boolean;
  files_copied: string[];
  skipped: string[];
  errors: string[];
}

const MIGRATE_FILES = [
  "progress.md",
  "feature_list.json",
  "handoff/last.json",
];

/**
 * Copy per-repo `.harness/` state files to the global `~/.harness/repos/{repoId}/`.
 *
 * Strategy: COPY (not move). Original files are preserved.
 * Idempotent: if target already exists, skip without overwriting.
 * Missing source files are silently skipped (not errors).
 */
export function migrateRepoState(repoPath: string, repoId: string): MigrationResult {
  const files_copied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const localHarness = join(repoPath, ".harness");
  const globalRepoDir = resolveGlobalRepoPath(repoId);

  for (const relPath of MIGRATE_FILES) {
    const srcPath = join(localHarness, relPath);
    const destPath = join(globalRepoDir, relPath);

    if (!existsSync(srcPath)) {
      continue;
    }

    if (existsSync(destPath)) {
      skipped.push(relPath);
      continue;
    }

    try {
      ensureDir(dirname(destPath));
      copyFileSync(srcPath, destPath);
      files_copied.push(relPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${relPath}: ${msg}`);
    }
  }

  return { migrated: true, files_copied, skipped, errors };
}
