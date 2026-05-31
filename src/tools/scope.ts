import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import picomatch from "picomatch";
import { resolveHarnessDir } from "../lib/repo.js";

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
  // Simple YAML parser for scope.yaml structure
  const result: ScopeYaml = {};
  const lines = content.split("\n");
  let currentKey = "";
  let currentTask = "";
  let currentSubKey = "";

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (!trimmed || trimmed.startsWith("#")) continue;

    // Top-level key
    if (!trimmed.startsWith(" ") && !trimmed.startsWith("\t") && trimmed.endsWith(":")) {
      currentKey = trimmed.slice(0, -1).trim();
      currentTask = "";
      currentSubKey = "";
      if (currentKey === "forbidden_paths") {
        result.forbidden_paths = [];
      } else if (currentKey === "allowed_per_task") {
        result.allowed_per_task = {};
      }
      continue;
    }

    // Second-level (task ID under allowed_per_task)
    const indent = trimmed.length - trimmed.trimStart().length;
    const stripped = trimmed.trim();

    if (currentKey === "forbidden_paths" && stripped.startsWith("- ")) {
      const val = stripped.slice(2).trim().replace(/^["']|["']$/g, "");
      result.forbidden_paths!.push(val);
      continue;
    }

    if (currentKey === "allowed_per_task") {
      if (indent <= 4 && stripped.endsWith(":") && !stripped.startsWith("- ")) {
        currentTask = stripped.slice(0, -1).trim();
        result.allowed_per_task![currentTask] = { paths: [], definition_of_done: [] };
        currentSubKey = "";
        continue;
      }

      if (currentTask && stripped.endsWith(":") && !stripped.startsWith("- ")) {
        currentSubKey = stripped.slice(0, -1).trim();
        continue;
      }

      if (currentTask && stripped.startsWith("- ")) {
        const val = stripped.slice(2).trim().replace(/^["']|["']$/g, "");
        const taskEntry = result.allowed_per_task![currentTask];
        if (typeof taskEntry === "object" && !Array.isArray(taskEntry)) {
          if (currentSubKey === "definition_of_done") {
            taskEntry.definition_of_done!.push(val);
          } else {
            // Default to paths
            taskEntry.paths!.push(val);
          }
        }
        continue;
      }
    }
  }

  return result;
}

function loadScopeConfig(repoPath: string): ScopeYaml | null {
  const harnessDir = resolveHarnessDir(repoPath);
  const scopeFile = join(harnessDir, "scope.yaml");

  if (!existsSync(scopeFile)) return null;

  try {
    const content = readFileSync(scopeFile, "utf-8");
    return parseScopeYaml(content);
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
    if (picomatch.isMatch(relFile, pattern)) {
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
    if (picomatch.isMatch(relFile, pattern)) {
      return { in_scope: true, reason: `File matches allowed pattern: ${pattern}` };
    }
  }

  return {
    in_scope: false,
    reason: `File does not match any allowed pattern for task ${taskId}`,
  };
}
