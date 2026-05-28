import { mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { readRepoConfig, resolveGlobalRepoPath } from "./repo-identity.js";

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Resolve the `.harness/` directory for a given repo path.
 * Creates the directory if it doesn't exist.
 */
export function resolveHarnessDir(repoPath: string): string {
  const absPath = resolve(repoPath);
  const harnessDir = join(absPath, ".harness");
  ensureDir(harnessDir);
  return harnessDir;
}

/**
 * Compute a deterministic hash of the repo's absolute path.
 * Used as a key for evidence storage.
 */
export function repoHash(repoPath: string): string {
  const absPath = resolve(repoPath);
  return createHash("sha256").update(absPath).digest("hex").slice(0, 16);
}

/**
 * Resolve the global harness home directory (~/.harness/).
 * Creates the directory if it doesn't exist.
 */
export function resolveGlobalHome(): string {
  const home = process.env.HARNESS_HOME || join(homedir(), ".harness");
  ensureDir(home);
  return home;
}

/**
 * Resolve the local `.harness/` directory for a given repo path.
 * Alias for resolveHarnessDir — explicit naming for v1.0 dual-path model.
 */
export function resolveLocalHarnessDir(repoPath: string): string {
  return resolveHarnessDir(repoPath);
}

/**
 * Resolve the state directory for a repo.
 * If the repo has a v1.0 config (`.harness/config.yaml`), returns the global path
 * (`~/.harness/repos/{repoId}/`). Otherwise falls back to the local `.harness/` dir.
 */
export function resolveStateDir(repoPath: string): string {
  const config = readRepoConfig(repoPath);
  if (config) {
    return resolveGlobalRepoPath(config.repo_id);
  }
  return resolveHarnessDir(repoPath);
}
