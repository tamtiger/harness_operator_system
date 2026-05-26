import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { detectRuntime } from "../lib/runtime.js";
import { resolveHarnessDir } from "../lib/repo.js";

export interface VerifyResult {
  passed: boolean;
  output: string;
  steps_run: string[];
}

interface VerifyConfig {
  runtime?: string;
  commands?: {
    install?: string | null;
    build?: string | null;
    test?: string | null;
    lint?: string | null;
    typecheck?: string | null;
  };
  timeouts?: {
    build?: number;
    test?: number;
  };
}

const MAX_OUTPUT = 8 * 1024; // 8KB
const DEFAULT_TIMEOUT = 120_000;

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

function loadVerifyConfig(repoPath: string): VerifyConfig | null {
  const harnessDir = join(repoPath, ".harness");
  const configFile = join(harnessDir, "verify.yaml");

  if (!existsSync(configFile)) return null;

  try {
    const content = readFileSync(configFile, "utf-8");
    return parseVerifyYaml(content);
  } catch {
    return null;
  }
}

function parseVerifyYaml(content: string): VerifyConfig {
  const config: VerifyConfig = { commands: {}, timeouts: {} };
  const lines = content.split("\n");
  let section = "";

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = trimmed.length - trimmed.trimStart().length;
    const stripped = trimmed.trim();

    if (indent === 0 && stripped.endsWith(":")) {
      section = stripped.slice(0, -1);
      continue;
    }

    if (indent === 0 && stripped.includes(":")) {
      const [key, ...rest] = stripped.split(":");
      const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
      if (key.trim() === "runtime") config.runtime = val;
      continue;
    }

    if (section === "commands" && stripped.includes(":")) {
      const [key, ...rest] = stripped.split(":");
      const val = rest.join(":").trim();
      const cleanVal = val.replace(/^["']|["']$/g, "");
      const cmdKey = key.trim() as keyof NonNullable<VerifyConfig["commands"]>;
      if (val === "null" || val === "~" || val === "") {
        config.commands![cmdKey] = null;
      } else {
        config.commands![cmdKey] = cleanVal;
      }
      continue;
    }

    if (section === "timeouts" && stripped.includes(":")) {
      const [key, ...rest] = stripped.split(":");
      const val = rest.join(":").trim();
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        const timeoutKey = key.trim() as keyof NonNullable<VerifyConfig["timeouts"]>;
        config.timeouts![timeoutKey] = num * 1000; // seconds → ms
      }
      continue;
    }
  }

  return config;
}

export function verifyRun(
  repoPath: string,
  steps?: string[]
): VerifyResult {
  const absPath = resolve(repoPath);
  const verifyConfig = loadVerifyConfig(absPath);
  const runtime = detectRuntime(absPath);

  const stepsToRun: { name: string; cmd: string; timeout: number }[] = [];

  if (steps && steps.length > 0) {
    // Explicit steps provided
    for (const step of steps) {
      stepsToRun.push({ name: step, cmd: step, timeout: DEFAULT_TIMEOUT });
    }
  } else if (verifyConfig?.commands) {
    // Use verify.yaml config
    const cmds = verifyConfig.commands;
    const timeouts = verifyConfig.timeouts || {};

    if (cmds.install !== null && cmds.install !== undefined) {
      stepsToRun.push({ name: "install", cmd: cmds.install, timeout: DEFAULT_TIMEOUT });
    }
    if (cmds.build !== null && cmds.build !== undefined) {
      stepsToRun.push({ name: "build", cmd: cmds.build, timeout: timeouts.build || DEFAULT_TIMEOUT });
    }
    if (cmds.test !== null && cmds.test !== undefined) {
      stepsToRun.push({ name: "test", cmd: cmds.test, timeout: timeouts.test || DEFAULT_TIMEOUT });
    }
    if (cmds.lint !== null && cmds.lint !== undefined) {
      stepsToRun.push({ name: "lint", cmd: cmds.lint, timeout: DEFAULT_TIMEOUT });
    }
    if (cmds.typecheck !== null && cmds.typecheck !== undefined) {
      stepsToRun.push({ name: "typecheck", cmd: cmds.typecheck, timeout: DEFAULT_TIMEOUT });
    }
  } else {
    // Fallback to auto-detected runtime commands
    const cmds = runtime.commands;
    if (cmds.install) stepsToRun.push({ name: "install", cmd: cmds.install, timeout: DEFAULT_TIMEOUT });
    if (cmds.build) stepsToRun.push({ name: "build", cmd: cmds.build, timeout: DEFAULT_TIMEOUT });
    if (cmds.test) stepsToRun.push({ name: "test", cmd: cmds.test, timeout: DEFAULT_TIMEOUT });
    if (cmds.lint) stepsToRun.push({ name: "lint", cmd: cmds.lint, timeout: DEFAULT_TIMEOUT });
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
    const { ok, output } = runCommand(step.cmd, absPath, step.timeout);
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
