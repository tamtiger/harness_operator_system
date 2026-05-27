import { execSync } from "node:child_process";

const GIT_TIMEOUT = 10_000; // 10 seconds

/**
 * Parse `git diff --name-only` output into a deduplicated file list.
 * Handles empty output, Windows line endings (\r\n), and empty lines.
 */
export function parseGitDiffOutput(output: string): string[] {
  if (!output || !output.trim()) return [];

  return output
    .split("\n")
    .map((line) => line.replace(/\r$/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Run git to get changed files (staged + unstaged) relative to baseRef.
 * Returns deduplicated list of file paths. Never throws — returns [] on error.
 */
export function getChangedFiles(repoPath: string, baseRef = "HEAD"): string[] {
  try {
    const opts = {
      cwd: repoPath,
      timeout: GIT_TIMEOUT,
      encoding: "utf-8" as const,
      stdio: ["pipe", "pipe", "pipe"] as ["pipe", "pipe", "pipe"],
    };

    // Unstaged changes
    let unstaged = "";
    try {
      unstaged = execSync(`git diff --name-only ${baseRef}`, opts);
    } catch {
      // ignore — may fail if no commits yet
    }

    // Staged changes
    let staged = "";
    try {
      staged = execSync(`git diff --name-only --cached`, opts);
    } catch {
      // ignore
    }

    const combined = `${unstaged}\n${staged}`;
    const files = parseGitDiffOutput(combined);

    // Deduplicate
    return Array.from(new Set(files));
  } catch {
    return [];
  }
}
