import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { detectRuntime } from "../lib/runtime.js";

export interface VerifyResult {
  passed: boolean;
  output: string;
  steps_run: string[];
}

const MAX_OUTPUT = 8 * 1024; // 8KB

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\n... [truncated to 8KB]";
}

function runCommand(
  cmd: string,
  cwd: string,
  timeoutMs: number
): { ok: boolean; output: string } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { ok: true, output: stdout };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n");
    return { ok: false, output };
  }
}

export function verifyRun(
  repoPath: string,
  steps?: string[]
): VerifyResult {
  const absPath = resolve(repoPath);
  const runtime = detectRuntime(absPath);
  const timeoutMs = 120_000;

  const stepsToRun: { name: string; cmd: string }[] = [];

  if (steps && steps.length > 0) {
    // Explicit steps provided
    for (const step of steps) {
      stepsToRun.push({ name: step, cmd: step });
    }
  } else {
    // Use detected runtime commands
    const cmds = runtime.commands;
    if (cmds.install) stepsToRun.push({ name: "install", cmd: cmds.install });
    if (cmds.build) stepsToRun.push({ name: "build", cmd: cmds.build });
    if (cmds.test) stepsToRun.push({ name: "test", cmd: cmds.test });
    if (cmds.lint) stepsToRun.push({ name: "lint", cmd: cmds.lint });
  }

  if (stepsToRun.length === 0) {
    return {
      passed: false,
      output: `No verify steps found for runtime: ${runtime.runtime}`,
      steps_run: [],
    };
  }

  const outputs: string[] = [];
  const stepsRan: string[] = [];
  let allPassed = true;

  for (const step of stepsToRun) {
    stepsRan.push(step.name);
    const { ok, output } = runCommand(step.cmd, absPath, timeoutMs);
    outputs.push(`=== ${step.name} (${ok ? "PASS" : "FAIL"}) ===\n${output}`);
    if (!ok) {
      allPassed = false;
      break; // Stop on first failure
    }
  }

  return {
    passed: allPassed,
    output: truncate(outputs.join("\n\n"), MAX_OUTPUT),
    steps_run: stepsRan,
  };
}
