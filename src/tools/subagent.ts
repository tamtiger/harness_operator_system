import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execSync } from "node:child_process";
import { log } from "../lib/logger.js";
import { scopeCheck } from "./scope.js";

export interface SubagentInvokeResult {
  status: "success" | "failure" | "spawned";
  message?: string;
  run_file?: string;
  result_file?: string;
  pid?: number;
  error?: string;
  result?: any;
}

/**
 * Invoke a specialized subagent for a task with a specific role and prompt.
 * Verifies that all context files are within the task's allowed scope,
 * and launches a worker process to execute specified commands.
 */
export function subagentInvoke(
  role: string,
  prompt: string,
  context_files: string[],
  commands: string[],
  repoPath: string = ".",
  timeout_seconds: number = 300,
  wait: boolean = false
): SubagentInvokeResult {
  try {
    const resolvedRepoPath = resolve(repoPath);

    // 1. Verify all context files are within scope using scopeCheck helper
    const outOfScopeFiles: string[] = [];
    for (const file of context_files) {
      const scopeCheckResult = scopeCheck(resolvedRepoPath, "SUBAGENT", file);
      if (!scopeCheckResult.in_scope) {
        outOfScopeFiles.push(`${file} (${scopeCheckResult.reason})`);
      }
    }

    if (outOfScopeFiles.length > 0) {
      return {
        status: "failure",
        error: `Scope violation: The following context files are out of scope: ${outOfScopeFiles.join(", ")}`
      };
    }

    // 2. Format a subagent run request file and write it to the .harness/subagent_runs/ directory
    const runDir = join(resolvedRepoPath, ".harness", "subagent_runs");
    mkdirSync(runDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `run_${timestamp}_${role.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const runFilePath = join(runDir, `${baseName}.json`).replace(/\\/g, "/");
    const resultFilePath = join(runDir, `${baseName}_result.json`).replace(/\\/g, "/");

    const runData = {
      timestamp: new Date().toISOString(),
      role,
      prompt,
      context_files,
      commands,
      cwd: resolvedRepoPath,
      timeout_seconds,
    };

    writeFileSync(runFilePath, JSON.stringify(runData, null, 2), "utf-8");
    log("info", `Subagent run logged to ${runFilePath}`, { role, context_files, commands });

    // Determine the path to subagent-worker
    const thisFile = fileURLToPath(import.meta.url);
    const isTs = thisFile.endsWith(".ts");
    const workerPath = resolve(dirname(thisFile), "..", isTs ? "subagent-worker.ts" : "subagent-worker.js");
    const runner = isTs ? "npx tsx" : "node";

    if (wait) {
      // Synchronous/blocking execution
      try {
        execSync(`${runner} "${workerPath}" "${runFilePath}"`, {
          cwd: resolvedRepoPath,
          stdio: "inherit",
        });
      } catch (err) {
        // execSync throws if the process exits with a non-zero code. We can still read the result file.
      }

      try {
        const resultData = JSON.parse(readFileSync(resultFilePath, "utf-8"));
        return {
          status: resultData.status,
          run_file: runFilePath,
          result_file: resultFilePath,
          result: resultData,
        };
      } catch (err: any) {
        return {
          status: "failure",
          error: `Worker finished but failed to read result: ${err.message}`,
          run_file: runFilePath,
          result_file: resultFilePath,
        };
      }
    } else {
      // Asynchronous/detached execution
      const spawnArgs = isTs ? ["tsx", workerPath, runFilePath] : [workerPath, runFilePath];
      const spawnCmd = isTs ? "npx" : "node";
      const child = spawn(spawnCmd, spawnArgs, {
        cwd: resolvedRepoPath,
        detached: true,
        stdio: "ignore",
        shell: true,
      });

      child.unref();

      return {
        status: "spawned",
        pid: child.pid,
        run_file: runFilePath,
        result_file: resultFilePath,
        message: `Subagent worker spawned successfully with PID ${child.pid}. Results will be written to ${resultFilePath}`,
      };
    }
  } catch (err: any) {
    return {
      status: "failure",
      error: `Failed to invoke subagent: ${err.message || err}`,
    };
  }
}
