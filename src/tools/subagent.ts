import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { log } from "../lib/logger.js";
import { scopeCheck } from "./scope.js";
import { resolveToolContext } from "../lib/tool-context.js";
import { registerWorker, updateWorkerPid, finishWorker } from "../lib/worker-registry.js";
import { ErrorCode } from "../lib/errors.js";
import { z } from "zod";

export interface SubagentInvokeResult {
  status: "success" | "failure" | "spawned";
  message?: string;
  run_file?: string;
  result_file?: string;
  pid?: number;
  error?: string;
  result?: any;
}

function validateCommand(cmd: string): { valid: boolean; reason?: string } {
  const forbiddenChars = /[;&|`$()><\n\r]/;
  if (forbiddenChars.test(cmd)) {
    return {
      valid: false,
      reason: `Command contains forbidden shell metacharacters (;&|\\\`$()>< or newlines): "${cmd}"`,
    };
  }

  const trimmed = cmd.trim();
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  const blocklist = ["dd", "mkfs", "rmdir", "format", "wget", "curl", "rm"];
  if (blocklist.includes(firstWord)) {
    return {
      valid: false,
      reason: `Command "${firstWord}" is blocked for security reasons`,
    };
  }

  if (trimmed.includes("curl") || trimmed.includes("wget")) {
    return {
      valid: false,
      reason: `Commands containing curl/wget are blocked for security reasons`,
    };
  }

  return { valid: true };
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

    // Validate commands
    for (const cmd of commands) {
      const valResult = validateCommand(cmd);
      if (!valResult.valid) {
        const err = new Error(`Command validation error: ${valResult.reason}`);
        (err as any).code = ErrorCode.ERR_COMMAND_INJECTION;
        throw err;
      }
    }

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

    const ctx = resolveToolContext({ repo_path: repoPath });
    const workerId = randomUUID();

    const runData = {
      worker_id: workerId,
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

    // Register worker in SQLite
    registerWorker({
      worker_id: workerId,
      pid: null,
      command: commands.join(" && "),
      repo_path: resolvedRepoPath,
      session_id: ctx.session_id,
      timeout_seconds,
    });

    // Determine the path to subagent-worker
    const thisFile = fileURLToPath(import.meta.url);
    const isTs = thisFile.endsWith(".ts");
    const workerPath = resolve(dirname(thisFile), "..", isTs ? "subagent-worker.ts" : "subagent-worker.js");

    const projectRoot = resolve(dirname(thisFile), "..", "..");
    const tsxCliPath = resolve(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");

    const spawnCmd = process.execPath;
    const spawnArgs = isTs ? [tsxCliPath, workerPath, runFilePath] : [workerPath, runFilePath];

    if (wait) {
      // Synchronous/blocking execution
      try {
        spawnSync(spawnCmd, spawnArgs, {
          cwd: resolvedRepoPath,
          stdio: "inherit",
        });
      } catch (err) {
        // spawnSync error
      }

      try {
        const resultData = JSON.parse(readFileSync(resultFilePath, "utf-8"));
        finishWorker(workerId, resultData.status === "success" ? "finished" : "failed");
        return {
          status: resultData.status,
          run_file: runFilePath,
          result_file: resultFilePath,
          result: resultData,
        };
      } catch (err: any) {
        finishWorker(workerId, "failed");
        return {
          status: "failure",
          error: `Worker finished but failed to read result: ${err.message}`,
          run_file: runFilePath,
          result_file: resultFilePath,
        };
      }
    } else {
      // Asynchronous/detached execution
      const child = spawn(spawnCmd, spawnArgs, {
        cwd: resolvedRepoPath,
        detached: true,
        stdio: "ignore",
        shell: false,
      });

      if (child.pid) {
        updateWorkerPid(workerId, child.pid);
      }

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

export const mcpTools = [
  {
    name: "subagent_invoke",
    description: "Invoke a specialized subagent to execute a specific plan task. Performs scope verification on all context files.",
    inputSchema: {
      role: z.string().describe("The specialized role for the subagent (e.g., Coder, Tester, Reviewer)"),
      prompt: z.string().describe("Instructions, goals, and rules for the subagent to execute"),
      context_files: z.array(z.string()).describe("A list of files containing necessary context that the subagent needs to access"),
      commands: z.array(z.string()).describe("Shell commands for the worker to execute sequentially"),
      repo_path: z.string().optional().describe("Root path of the repository"),
      timeout_seconds: z.number().optional().describe("Timeout per command in seconds (default 300)"),
      wait: z.boolean().optional().describe("If true, block until worker completes (default false)"),
    },
    handler: async (args: any) => subagentInvoke(
      args.role,
      args.prompt,
      args.context_files,
      args.commands,
      args.repo_path || ".",
      args.timeout_seconds || 300,
      args.wait || false
    ),
  },
];
