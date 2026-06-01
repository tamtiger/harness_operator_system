import { execSync } from "node:child_process";
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
      const stdoutBuffer = execSync(cmd, {
        cwd: taskInput.cwd,
        timeout: timeoutMs,
        stdio: "pipe",
      });
      const stdout = truncateOutput(stdoutBuffer.toString("utf-8"));
      commandResults.push({
        command: cmd,
        exit_code: 0,
        stdout,
        stderr: "",
      });
    } catch (err: any) {
      status = "failure";
      const exitCode = typeof err.status === "number" ? err.status : 1;
      const stdout = truncateOutput(err.stdout ? err.stdout.toString("utf-8") : "");
      const stderr = truncateOutput(err.stderr ? err.stderr.toString("utf-8") : (err.message || "Unknown error"));
      commandResults.push({
        command: cmd,
        exit_code: exitCode,
        stdout,
        stderr,
      });
      globalError = `Command failed: ${cmd}. Error: ${stderr || err.message}`;
      // Stop executing remaining commands on first failure
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
