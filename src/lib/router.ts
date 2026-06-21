import { getChangedFiles } from "./git-diff.js";

const SENSITIVE_PATHS = [
  "auth",
  "login",
  "password",
  "security",
  "db",
  "migration",
  "infra",
  "deploy",
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  ".github",
  ".gitlab",
];

export function classifyWorkflow(
  repoPath: string,
  taskTitle?: string,
  taskScope?: string
): "Quick" | "Full" {
  // If scope is '*', it's potentially huge, so Full
  if (!taskScope || taskScope === "*" || taskScope === ".") {
    return "Full";
  }

  // Count files in scope if it's a comma separated list
  const scopeFiles = taskScope.split(",").map(f => f.trim()).filter(Boolean);
  if (scopeFiles.length > 2) {
    return "Full";
  }

  // Check sensitive paths
  for (const file of scopeFiles) {
    const lowerFile = file.toLowerCase();
    for (const sensitive of SENSITIVE_PATHS) {
      if (lowerFile.includes(sensitive)) {
        return "Full";
      }
    }
  }

  // Check if title mentions dependency, auth, etc
  if (taskTitle) {
    const lowerTitle = taskTitle.toLowerCase();
    if (
      lowerTitle.includes("auth") ||
      lowerTitle.includes("security") ||
      lowerTitle.includes("dependency") ||
      lowerTitle.includes("database") ||
      lowerTitle.includes("migration")
    ) {
      return "Full";
    }
  }

  return "Quick";
}
