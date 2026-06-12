import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { detectRuntime } from "../lib/runtime.js";
import { parseVitestJson, type ParsedTestResult } from "../lib/parsers/vitest.js";
import { parseGenericOutput } from "../lib/parsers/generic.js";
import { getChangedFiles } from "../lib/git-diff.js";
import { saveEvidence } from "../lib/evidence.js";
import { getDb } from "../db/client.js";

export const STEP_ORDER = [
  "install",
  "build",
  "test",
  "lint",
  "typecheck",
  "security_audit",
  "simplify",
] as const;

export interface StepResult {
  name: string;
  passed: boolean;
  output: string;       // per-step output, capped at 2KB
  duration_ms: number;
}

export interface VerifyOptions {
  steps?: string[];
  fail_fast?: boolean;       // default true
  changed_only?: boolean;    // default false — lint only changed files
  task_id?: string;          // if provided, auto-save evidence
  force_install?: boolean;
  skip_steps?: string[];
}

export interface VerifyResult {
  passed: boolean;
  output: string;
  steps_run: string[];
  step_results: StepResult[];
  test_results?: ParsedTestResult | null;
  evidence_path?: string;
  changed_files?: string[];
  workflow_guidance?: { current_phase: string; next_action: string };
}

interface VerifyConfig {
  runtime?: string;
  commands?: {
    install?: string | null;
    build?: string | null;
    test?: string | null;
    lint?: string | null;
    typecheck?: string | null;
    security_audit?: string | null;
    simplify?: string | null;
  };
  timeouts?: {
    build?: number;
    test?: number;
    lint?: number;
  };
  optional?: {
    install?: boolean;
    build?: boolean;
    test?: boolean;
    lint?: boolean;
    typecheck?: boolean;
    security_audit?: boolean;
    simplify?: boolean;
  };
}

const MAX_OUTPUT = 8 * 1024; // 8KB
const MAX_STEP_OUTPUT = 2 * 1024; // 2KB per step
const DEFAULT_TIMEOUT = 120_000;

const LINTABLE_EXTENSIONS: Record<string, string[]> = {
  node: [".ts", ".tsx", ".js", ".jsx"],
  dotnet: [".cs"],
  python: [".py"],
  go: [".go"],
  rust: [".rs"],
  php: [".php", ".phtml"],
};

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

export function parseVerifyYaml(content: string): VerifyConfig {
  const config: VerifyConfig = { commands: {}, timeouts: {}, optional: {} };
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

    if (section === "optional" && stripped.includes(":")) {
      const [key, ...rest] = stripped.split(":");
      const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
      const optKey = key.trim() as keyof NonNullable<VerifyConfig["optional"]>;
      config.optional![optKey] = val === "true";
      continue;
    }
  }

  return config;
}

export function filterLintableFiles(files: string[], runtimeName: string): string[] {
  const exts = LINTABLE_EXTENSIONS[runtimeName];
  const filtered = exts ? files.filter((f) => exts.some((ext) => f.endsWith(ext))) : files;
  // Sanitize: only allow files with safe characters to prevent shell injection
  return filtered.filter((f) => /^[a-zA-Z0-9_\-\.\/\\]+$/.test(f));
}

export function buildChangedOnlyLintCmd(
  originalCmd: string,
  runtimeName: string,
  changedFiles: string[]
): string | null {
  if (changedFiles.length === 0) return null; // skip lint

  const fileList = changedFiles.join(" ");

  if (runtimeName === "dotnet") {
    return `dotnet format --verify-no-changes --include ${fileList}`;
  }
  if (runtimeName === "node") {
    return `${originalCmd} ${fileList}`;
  }
  if (runtimeName === "php") {
    return `${originalCmd} ${fileList}`;
  }
  // Fallback: run original command for other runtimes
  return originalCmd;
}

function getLockfilePath(repoPath: string, runtime: string): string | null {
  const possibleFiles: Record<string, string[]> = {
    node: ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb"],
    dotnet: ["packages.lock.json"],
    python: ["poetry.lock", "Pipfile.lock", "requirements.txt", "pyproject.toml"],
    go: ["go.sum", "go.mod"],
    rust: ["Cargo.lock"],
    php: ["composer.lock"],
  };

  const files = possibleFiles[runtime] || [];
  for (const file of files) {
    const p = join(repoPath, file);
    if (existsSync(p)) return p;
  }
  const allCommon = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb", "composer.lock", "go.sum", "Cargo.lock", "poetry.lock", "requirements.txt"];
  for (const file of allCommon) {
    const p = join(repoPath, file);
    if (existsSync(p)) return p;
  }
  return null;
}

function computeFileHash(filePath: string): string {
  try {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return "";
  }
}

function checkDepsDirExists(repoPath: string, runtime: string): boolean {
  if (runtime === "node") return existsSync(join(repoPath, "node_modules"));
  if (runtime === "php") return existsSync(join(repoPath, "vendor"));
  if (runtime === "python") return existsSync(join(repoPath, ".venv")) || existsSync(join(repoPath, "venv"));
  return true;
}

export function verifyRun(
  repoPath: string,
  options: VerifyOptions = {}
): VerifyResult {
  const { steps, fail_fast = true, changed_only = false, task_id, force_install = false, skip_steps = [] } = options;
  const absPath = resolve(repoPath);
  const verifyConfig = loadVerifyConfig(absPath);
  const runtime = detectRuntime(absPath);
  const skipStepsSet = new Set(skip_steps);

  const stepsToRun: { name: string; cmd: string; timeout: number }[] = [];

  const addStep = (name: string, cmd: string, timeout: number) => {
    if (skipStepsSet.has(name)) return;
    stepsToRun.push({ name, cmd, timeout });
  };

  if (steps && steps.length > 0) {
    // Explicit steps provided
    for (const step of steps) {
      addStep(step, step, DEFAULT_TIMEOUT);
    }
  } else if (verifyConfig?.commands) {
    // Use verify.yaml config — iterate over STEP_ORDER for canonical ordering
    const cmds = verifyConfig.commands;
    const timeouts = verifyConfig.timeouts || {};

    for (const step of STEP_ORDER) {
      const cmd = cmds[step as keyof typeof cmds];
      if (cmd !== null && cmd !== undefined) {
        const timeout = (timeouts[step as keyof typeof timeouts] || DEFAULT_TIMEOUT);
        addStep(step, cmd, timeout);
      }
    }
  } else {
    // Fallback to auto-detected runtime commands
    const cmds = runtime.commands;
    if (cmds.install) addStep("install", cmds.install, DEFAULT_TIMEOUT);
    if (cmds.build) addStep("build", cmds.build, DEFAULT_TIMEOUT);
    if (cmds.test) addStep("test", cmds.test, DEFAULT_TIMEOUT);
    if (cmds.lint) addStep("lint", cmds.lint, DEFAULT_TIMEOUT);
  }

  if (stepsToRun.length === 0) {
    return {
      passed: false,
      output: `No verify steps found for runtime: ${runtime.runtime}`,
      steps_run: [],
      step_results: [],
    };
  }

  const outputs: string[] = [];
  const stepsRan: string[] = [];
  const stepResults: StepResult[] = [];
  let allPassed = true;
  let testResults: ParsedTestResult | null = null;
  let changedFiles: string[] | undefined;

  for (const step of stepsToRun) {
    stepsRan.push(step.name);

    // Handle changed_only for lint step
    if (changed_only && step.name === "lint") {
      const allChanged = getChangedFiles(absPath);
      const runtimeName = verifyConfig?.runtime || runtime.runtime;
      const lintable = filterLintableFiles(allChanged, runtimeName);
      changedFiles = lintable;

      if (lintable.length === 0) {
        // No lintable files changed — skip with pass
        const skipResult: StepResult = {
          name: step.name,
          passed: true,
          output: "No lintable changed files — skipped.",
          duration_ms: 0,
        };
        stepResults.push(skipResult);
        outputs.push(`=== ${step.name} (SKIP — no changed files) ===`);
        continue;
      }

      const modifiedCmd = buildChangedOnlyLintCmd(step.cmd, runtimeName, lintable);
      if (modifiedCmd) {
        step.cmd = modifiedCmd;
      }
    }

    const isOptional = verifyConfig?.optional?.[step.name as keyof typeof verifyConfig.optional] === true;
    const runtimeName = verifyConfig?.runtime || runtime.runtime;

    let ok = true;
    let output = "";
    let duration_ms = 0;

    // Lockfile cache check for install step
    let skippedByCache = false;
    if (step.name === "install" && !force_install) {
      const lockfile = getLockfilePath(absPath, runtimeName);
      if (lockfile) {
        const currentHash = computeFileHash(lockfile);
        const hashFile = join(absPath, ".harness", "lockfile_hash.txt");
        let cachedHash = "";
        if (existsSync(hashFile)) {
          try {
            cachedHash = readFileSync(hashFile, "utf-8").trim();
          } catch {}
        }
        const depsExists = checkDepsDirExists(absPath, runtimeName);
        if (currentHash && currentHash === cachedHash && depsExists) {
          skippedByCache = true;
          ok = true;
          output = "Lockfile unchanged and dependencies directory exists — skipping install.";
        }
      }
    }

    if (skippedByCache) {
      const stepResult: StepResult = {
        name: step.name,
        passed: ok,
        output,
        duration_ms: 0,
      };
      stepResults.push(stepResult);
      outputs.push(`=== ${step.name} (SKIP — cached) ===\n${output}`);
    } else {
      const startTime = Date.now();
      const runRes = runCommand(step.cmd, absPath, step.timeout);
      duration_ms = Date.now() - startTime;
      ok = runRes.ok;
      output = runRes.output;

      // Update lockfile hash cache on successful install
      if (step.name === "install" && ok) {
        const lockfile = getLockfilePath(absPath, runtimeName);
        if (lockfile) {
          const currentHash = computeFileHash(lockfile);
          if (currentHash) {
            try {
              const harnessDir = join(absPath, ".harness");
              writeFileSync(join(harnessDir, "lockfile_hash.txt"), currentHash, "utf-8");
            } catch {}
          }
        }
      }

      const stepResult: StepResult = {
        name: step.name,
        passed: ok,
        output: truncate(output, MAX_STEP_OUTPUT),
        duration_ms,
      };
      stepResults.push(stepResult);
      outputs.push(`=== ${step.name} (${ok ? "PASS" : "FAIL"}${isOptional ? " [OPTIONAL]" : ""}) ===\n${output}`);
    }

    // Parse test output if this is the test step
    if (step.name === "test") {
      testResults = parseVitestJson(output) || parseGenericOutput(output);
    }

    if (!ok && !isOptional) {
      allPassed = false;
      if (fail_fast) {
        break; // Stop on first failure
      }
    }
  }

  // Auto-save evidence if task_id provided
  let evidencePath: string | undefined;
  if (task_id) {
    const evidenceData = {
      passed: allPassed,
      step_results: stepResults,
      test_results: testResults,
      ran_at: new Date().toISOString(),
    };
    const saveResult = saveEvidence(absPath, task_id, evidenceData);
    if (saveResult.saved) {
      evidencePath = saveResult.path;
    }
  }

  let workflow_guidance: { current_phase: string; next_action: string } | undefined;

  if (task_id) {
    try {
      const db = getDb();
      const row = db.prepare("SELECT session_id FROM tasks WHERE id = ?").get(task_id) as { session_id: string | null } | undefined;
      if (row && row.session_id) {
        db.prepare("UPDATE sessions SET current_phase = 'VERIFY', verify_called = 1 WHERE id = ?")
          .run(row.session_id);
        
        workflow_guidance = {
          current_phase: "VERIFY",
          next_action: allPassed
            ? "All checks passed. Proceed to session_handoff() to save progress"
            : "Verification failed. Fix issues and run verify_run() again",
        };
      }
    } catch {
      // ignore db errors in case verify_run is run standalone without tables
    }
  }

  const result: VerifyResult = {
    passed: allPassed,
    output: truncate(outputs.join("\n\n"), MAX_OUTPUT),
    steps_run: stepsRan,
    step_results: stepResults,
    test_results: testResults,
    ...(workflow_guidance ? { workflow_guidance } : {}),
  };

  if (evidencePath) {
    result.evidence_path = evidencePath;
  }

  if (changed_only && changedFiles !== undefined) {
    result.changed_files = changedFiles;
  }

  return result;
}
