import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import picomatch from "picomatch";
import { resolveHarnessDir } from "../lib/repo.js";
import { validateScopeYaml } from "../lib/yaml-parser.js";

let cachedScope: { config: ScopeYaml, mtimeMs: number } | null = null;
const matcherCache = new Map<string, (str: string) => boolean>();

function getMatcher(pattern: string) {
  let matcher = matcherCache.get(pattern);
  if (!matcher) {
    matcher = picomatch(pattern);
    matcherCache.set(pattern, matcher);
  }
  return matcher;
}

export interface ScopeConfig {
  forbidden_paths: string[];
  allowed_paths: string[];
  definition_of_done: string[];
}

export interface ScopeCheckResult {
  in_scope: boolean;
  reason: string;
}

interface ScopeYaml {
  forbidden_paths?: string[];
  allowed_per_task?: Record<
    string,
    { paths?: string[]; definition_of_done?: string[] } | string[]
  >;
}

function parseScopeYaml(content: string): ScopeYaml {
  try {
    return validateScopeYaml(content);
  } catch (err: any) {
    return {};
  }
}

function loadScopeConfig(repoPath: string): ScopeYaml | null {
  const harnessDir = resolveHarnessDir(repoPath);
  const scopeFile = join(harnessDir, "scope.yaml");

  if (!existsSync(scopeFile)) return null;

  try {
    const stats = statSync(scopeFile);
    if (cachedScope && cachedScope.mtimeMs === stats.mtimeMs) {
      return cachedScope.config;
    }

    const content = readFileSync(scopeFile, "utf-8");
    const config = parseScopeYaml(content);
    cachedScope = { config, mtimeMs: stats.mtimeMs };
    return config;
  } catch {
    return null;
  }
}

export function scopeGet(
  repoPath: string,
  taskId?: string
): ScopeConfig {
  const config = loadScopeConfig(repoPath);

  if (!config) {
    // Permissive mode
    return {
      forbidden_paths: [],
      allowed_paths: ["**"],
      definition_of_done: [],
    };
  }

  const forbidden = config.forbidden_paths || [];
  let allowed: string[] = ["**"];
  let dod: string[] = [];

  if (taskId && config.allowed_per_task?.[taskId]) {
    const taskConfig = config.allowed_per_task[taskId];
    if (Array.isArray(taskConfig)) {
      allowed = taskConfig;
    } else {
      allowed = taskConfig.paths || ["**"];
      dod = taskConfig.definition_of_done || [];
    }
  }

  return {
    forbidden_paths: forbidden,
    allowed_paths: allowed,
    definition_of_done: dod,
  };
}

export function scopeCheck(
  repoPath: string,
  taskId: string | undefined,
  filePath: string
): ScopeCheckResult {
  const config = scopeGet(repoPath, taskId);

  // Normalize file path to be relative to repo
  const absRepo = resolve(repoPath);
  const absFile = resolve(absRepo, filePath);
  const relFile = relative(absRepo, absFile).replace(/\\/g, "/");

  // Prevent path traversal outside the repository root
  if (relFile.startsWith("../") || relFile === "..") {
    return {
      in_scope: false,
      reason: `Access denied: File is outside repository root: ${relFile}`,
    };
  }

  // Check forbidden paths first
  for (const pattern of config.forbidden_paths) {
    if (getMatcher(pattern)(relFile)) {
      return {
        in_scope: false,
        reason: `File matches forbidden pattern: ${pattern}`,
      };
    }
  }

  // Check allowed paths
  if (config.allowed_paths.includes("**")) {
    return { in_scope: true, reason: "All paths allowed (no task-specific scope)" };
  }

  for (const pattern of config.allowed_paths) {
    if (getMatcher(pattern)(relFile)) {
      return { in_scope: true, reason: `File matches allowed pattern: ${pattern}` };
    }
  }

  return {
    in_scope: false,
    reason: `File does not match any allowed pattern for task ${taskId}`,
  };
}

import { z } from "zod";

export const mcpTools = [
  {
    name: "scope_get",
    description: "Get scope configuration for a task.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
      task_id: z.string().optional().describe("Task ID"),
    },
    handler: async (args: any) => scopeGet(args.repo_path, args.task_id),
  },
  {
    name: "scope_check",
    description: "Check if a file path is within scope for a task.",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo"),
      task_id: z.string().optional().describe("Task ID"),
      file_path: z.string().describe("File path to check"),
    },
    handler: async (args: any) => scopeCheck(args.repo_path, args.task_id, args.file_path),
  },
];
