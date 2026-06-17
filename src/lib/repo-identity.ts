import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { resolveGlobalHome, ensureDir } from "./repo.js";

export interface RepoConfig {
  repo_name: string;
  repo_id: string;
  harness_home: string;
  registered_at: string;
  remote_url: string;
  gitlab_project_id?: string;
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
  const lines = [
    `repo_name: ${config.repo_name}`,
    `repo_id: ${config.repo_id}`,
    `harness_home: ${config.harness_home}`,
    `registered_at: ${config.registered_at}`,
    `remote_url: ${config.remote_url}`,
  ];
  if (config.gitlab_project_id) {
    lines.push(`gitlab_project_id: ${config.gitlab_project_id}`);
  }
  lines.push("");
  return lines.join("\n");
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
      gitlab_project_id: parsed.gitlab_project_id || undefined,
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
  const repoId = generateRepoId(repoName);
  const harnessHome = resolveGlobalHome();
  const remoteUrl = detectRemoteUrl(repoPath);
  const gitlabProjectId = detectGitLabProjectId(remoteUrl);
  const registeredAt = new Date().toISOString();

  const config: RepoConfig = {
    repo_name: repoName,
    repo_id: repoId,
    harness_home: harnessHome,
    registered_at: registeredAt,
    remote_url: remoteUrl,
    gitlab_project_id: gitlabProjectId,
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
 * Generate a new ID for repo identification.
 * Prefixes with sanitized repo name if provided for easier discovery.
 */
export function generateRepoId(repoName?: string): string {
  const uuid = randomUUID();
  if (repoName) {
    const safeName = repoName.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
    return `${safeName}-${uuid.slice(0, 8)}`;
  }
  return uuid;
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

/**
 * Detect GitLab Project ID using curl and gitlab token from global mcp_config.json
 */
function detectGitLabProjectId(remoteUrl: string): string | undefined {
  if (!remoteUrl) return undefined;
  
  // Extract project path (e.g. retail-platform/paymenthub/transaction-store-service)
  // Support ssh: git@domain:path.git or https: https://domain/path.git
  let projectPath = "";
  let domain = "";
  
  try {
    if (remoteUrl.startsWith("git@")) {
      const parts = remoteUrl.slice(4).split(":");
      domain = parts[0];
      projectPath = parts[1].replace(/\.git$/, "");
    } else if (remoteUrl.startsWith("http")) {
      const urlObj = new URL(remoteUrl);
      domain = urlObj.hostname;
      projectPath = urlObj.pathname.slice(1).replace(/\.git$/, "");
    }
  } catch {
    return undefined;
  }
  
  if (!projectPath || !domain) return undefined;
  
  // Try to find the GitLab token from ~/.gemini/config/mcp_config.json
  let token = "";
  try {
    const mcpConfigPath = join(homedir(), ".gemini", "config", "mcp_config.json");
    if (existsSync(mcpConfigPath)) {
      const configText = readFileSync(mcpConfigPath, "utf-8");
      const config = JSON.parse(configText);
      const headers = config.mcpServers?.rai?.headers;
      if (headers && headers["X-GitLab-Token"]) {
        token = headers["X-GitLab-Token"];
      } else if (config.mcpServers?.gitlab?.args) {
        // Fallback to gitlab MCP config args
        const tokenArg = config.mcpServers.gitlab.args.find((a: string) => a.startsWith("--token="));
        if (tokenArg) {
          token = tokenArg.split("=")[1];
        }
      }
    }
  } catch {
    // Ignore error
  }
  
  if (!token) return undefined;
  
  try {
    const encodedPath = encodeURIComponent(projectPath);
    const apiUrl = `https://${domain}/api/v4/projects/${encodedPath}`;
    
    // Call curl synchronously to get project details
    const responseText = execSync(
      `curl -s --header "PRIVATE-TOKEN: ${token}" "${apiUrl}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const response = JSON.parse(responseText);
    if (response && response.id) {
      return String(response.id);
    }
  } catch {
    // Ignore error
  }
  
  return undefined;
}
