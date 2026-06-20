import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { log } from "./lib/logger.js";

interface TaskInput {
  role: string;
  prompt: string;
  context_files: string[];
  commands: string[];
  cwd: string;
  timeout_seconds?: number;
}

interface CommandResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
}

interface TaskResult {
  status: "success" | "failure";
  started_at: string;
  completed_at: string;
  command_results: CommandResult[];
  error: string | null;
}

const MAX_OUTPUT = 8192;

function truncateOutput(output: string): string {
  if (output.length > MAX_OUTPUT) {
    return output.slice(0, MAX_OUTPUT) + "\n...[truncated]";
  }
  return output;
}

async function main() {
  const taskFilePath = process.argv[2];
  if (!taskFilePath) {
    process.stderr.write("Usage: node subagent-worker.js <task_json_path>\n");
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  let taskInput: TaskInput;
  try {
    const rawData = readFileSync(taskFilePath, "utf-8");
    taskInput = JSON.parse(rawData);
  } catch (err: any) {
    process.stderr.write(`Failed to read/parse task JSON: ${err.message}\n`);
    process.exit(1);
  }

  const resultFilePath = taskFilePath.replace(".json", "_result.json");
  const commandResults: CommandResult[] = [];
  let status: "success" | "failure" = "success";
  let globalError: string | null = null;

  const timeoutMs = (taskInput.timeout_seconds || 300) * 1000;

  for (const cmd of taskInput.commands) {
    try {
      log("info", `Executing command: ${cmd}`, { cwd: taskInput.cwd });
      const parsed = parseCommand(cmd);
      let actualCmd = parsed.command;
      let actualArgs = parsed.args;

      if (actualCmd.toLowerCase() === "echo") {
        actualCmd = process.execPath;
        actualArgs = ["-e", "console.log(process.argv.slice(1).join(' '))", ...parsed.args];
      } else {
        actualCmd = resolveCommand(actualCmd);
      }

      log("info", `Spawning: ${actualCmd} ${actualArgs.join(" ")}`, { cwd: taskInput.cwd });
      const spawnResult = spawnSync(actualCmd, actualArgs, {
        cwd: taskInput.cwd,
        timeout: timeoutMs,
        stdio: "pipe",
      });

      const stdout = truncateOutput(spawnResult.stdout ? spawnResult.stdout.toString("utf-8") : "");
      const stderr = truncateOutput(spawnResult.stderr ? spawnResult.stderr.toString("utf-8") : "");

      if (spawnResult.status !== 0 || spawnResult.error) {
        status = "failure";
        const exitCode = spawnResult.status !== null ? spawnResult.status : 1;
        const errMessage = spawnResult.error ? spawnResult.error.message : "Command exited with non-zero status";
        commandResults.push({
          command: cmd,
          exit_code: exitCode,
          stdout,
          stderr: stderr || errMessage,
        });
        globalError = `Command failed: ${cmd}. Error: ${stderr || errMessage}`;
        break;
      }

      commandResults.push({
        command: cmd,
        exit_code: 0,
        stdout,
        stderr: "",
      });
    } catch (err: any) {
      status = "failure";
      commandResults.push({
        command: cmd,
        exit_code: 1,
        stdout: "",
        stderr: err.message || "Unknown error during spawnSync execution",
      });
      globalError = `Command execution failed: ${cmd}. Error: ${err.message}`;
      break;
    }
  }

  const completedAt = new Date().toISOString();
  const taskResult: TaskResult = {
    status,
    started_at: startedAt,
    completed_at: completedAt,
    command_results: commandResults,
    error: globalError,
  };

  try {
    writeFileSync(resultFilePath, JSON.stringify(taskResult, null, 2), "utf-8");
    log("info", `Subagent worker completed. Status: ${status}, results saved to ${resultFilePath}`);
  } catch (err: any) {
    process.stderr.write(`Failed to write result JSON: ${err.message}\n`);
    process.exit(1);
  }

  // Update worker registry state
  const workerId = (taskInput as any).worker_id;
  if (workerId) {
    try {
      const { finishWorker } = await import("./lib/worker-registry.js");
      finishWorker(workerId, status === "success" ? "finished" : "failed");
    } catch (err: any) {
      log("warn", `Worker registry update failed: ${err.message}`);
    }
  }

  process.exit(status === "success" ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`Fatal worker exception: ${err.message || err}\n`);
  process.exit(1);
});

function parseCommand(cmd: string): { command: string; args: string[] } {
  const args: string[] = [];
  let current = "";
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) {
    args.push(current);
  }

  if (args.length === 0) {
    throw new Error("Empty command");
  }

  return {
    command: args[0],
    args: args.slice(1),
  };
}

import { existsSync as fsExistsSync } from "node:fs";
import { join as pathJoin } from "node:path";

function resolveCommand(cmd: string): string {
  if (process.platform !== "win32") {
    return cmd;
  }
  const pathEnv = process.env.PATH || "";
  const paths = pathEnv.split(";");
  const extensions = [".exe", ".cmd", ".bat", ".com"];

  const hasExt = extensions.some(ext => cmd.toLowerCase().endsWith(ext));
  
  const findInDir = (dir: string, base: string) => {
    if (hasExt) {
      const fullPath = pathJoin(dir, base);
      if (fsExistsSync(fullPath)) return fullPath;
    } else {
      for (const ext of extensions) {
        const fullPath = pathJoin(dir, base + ext);
        if (fsExistsSync(fullPath)) return fullPath;
      }
    }
    return null;
  };

  if (cmd.includes("/") || cmd.includes("\\")) {
    const found = findInDir("", cmd);
    if (found) return found;
    return cmd;
  }

  for (const p of paths) {
    const found = findInDir(p, cmd);
    if (found) return found;
  }

  return cmd;
}
