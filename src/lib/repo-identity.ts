import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { resolveGlobalHome, ensureDir } from "./repo.js";

export interface RepoConfig {
  repo_name: string;
  repo_id: string;
  harness_home: string;
  registered_at: string;
  remote_url: string;
}

/**
 * Parse simple YAML (flat key: value per line) into a record.
 */
function parseSimpleYaml(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Serialize a RepoConfig to simple YAML format.
 */
function serializeSimpleYaml(config: RepoConfig): string {
  return [
    `repo_name: ${config.repo_name}`,
    `repo_id: ${config.repo_id}`,
    `harness_home: ${config.harness_home}`,
    `registered_at: ${config.registered_at}`,
    `remote_url: ${config.remote_url}`,
    "",
  ].join("\n");
}

/**
 * Read `.harness/config.yaml` for a repo. Returns null if not found or invalid.
 */
export function readRepoConfig(repoPath: string): RepoConfig | null {
  const configPath = join(repoPath, ".harness", "config.yaml");
  if (!existsSync(configPath)) return null;

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parseSimpleYaml(content);

    if (!parsed.repo_name || !parsed.repo_id) return null;

    return {
      repo_name: parsed.repo_name,
      repo_id: parsed.repo_id,
      harness_home: parsed.harness_home || "",
      registered_at: parsed.registered_at || "",
      remote_url: parsed.remote_url || "",
    };
  } catch {
    return null;
  }
}

/**
 * Create a new `.harness/config.yaml` for a repo.
 * Generates a UUID, detects repo name from directory basename, and writes the config.
 */
export function createRepoConfig(repoPath: string): RepoConfig {
  const repoName = basename(repoPath);
  const repoId = generateRepoId();
  const harnessHome = resolveGlobalHome();
  const registeredAt = new Date().toISOString();
  const remoteUrl = detectRemoteUrl(repoPath);

  const config: RepoConfig = {
    repo_name: repoName,
    repo_id: repoId,
    harness_home: harnessHome,
    registered_at: registeredAt,
    remote_url: remoteUrl,
  };

  const harnessDir = join(repoPath, ".harness");
  ensureDir(harnessDir);

  const configPath = join(harnessDir, "config.yaml");
  writeFileSync(configPath, serializeSimpleYaml(config), "utf-8");

  return config;
}

/**
 * Resolve the global repo path: `~/.harness/repos/{repoId}/`.
 * Creates the directory if it does not exist.
 */
export function resolveGlobalRepoPath(repoId: string): string {
  const globalHome = resolveGlobalHome();
  const repoDir = join(globalHome, "repos", repoId);
  ensureDir(repoDir);
  return repoDir;
}

/**
 * Generate a new UUID for repo identification.
 */
export function generateRepoId(): string {
  return randomUUID();
}

/**
 * Detect git remote URL. Returns empty string on failure.
 */
function detectRemoteUrl(repoPath: string): string {
  try {
    const url = execSync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return url;
  } catch {
    return "";
  }
}
