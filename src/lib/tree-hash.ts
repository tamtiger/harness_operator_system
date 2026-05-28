import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".cs", ".py", ".go", ".rs",
  ".java", ".kt",
]);

/**
 * Compute a SHA-256 hash of the repo's tracked code files.
 * Returns hex digest or "no-git" on failure.
 */
export function computeTreeHash(repoPath: string): string {
  try {
    const output = execSync("git ls-tree -r HEAD --name-only", {
      cwd: repoPath,
      timeout: 10_000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const files = output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => {
        if (!f) return false;
        const dotIdx = f.lastIndexOf(".");
        if (dotIdx === -1) return false;
        return CODE_EXTENSIONS.has(f.slice(dotIdx));
      })
      .sort();

    if (files.length === 0) return "no-git";

    const joined = files.join("\n");
    return createHash("sha256").update(joined).digest("hex");
  } catch {
    return "no-git";
  }
}
