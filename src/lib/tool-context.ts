import { resolve, isAbsolute } from "node:path";
import { getDb } from "../db/client.js";
import { readRepoConfig } from "./repo-identity.js";
import { repoHash } from "./repo.js";

export interface ToolContext {
  session_id: string;   // active session hoặc "global"
  repo_id: string;      // UUID từ config.yaml hoặc hash
  repo_path: string;    // resolved path
}

/**
 * Resolve tool execution context from args.
 * 
 * This is used by wrapTool() to get consistent session_id and repo_id
 * for loop guard, circuit breaker, and analytics.
 */
export function resolveToolContext(args: Record<string, unknown>): ToolContext {
  const rawPath = (args.repo_path as string) || ".";
  const repoPath = isAbsolute(rawPath) ? rawPath : resolve(rawPath);

  // Resolve repo_id
  let repo_id: string;
  try {
    const config = readRepoConfig(repoPath);
    repo_id = config?.repo_id || repoHash(repoPath);
  } catch {
    repo_id = repoHash(repoPath);
  }

  // Resolve session_id
  let session_id = "global";
  try {
    const db = getDb();
    const row = db.prepare(
      "SELECT id FROM sessions WHERE repo_path = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).get(repoPath) as { id: string } | undefined;
    if (row) session_id = row.id;
  } catch {
    // fallback to global
  }

  return { session_id, repo_id, repo_path: repoPath };
}