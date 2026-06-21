import { execSync, exec } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { detectRuntime } from "../lib/runtime.js";
import { parseVitestJson, type ParsedTestResult } from "../lib/parsers/vitest.js";
import { parseGenericOutput } from "../lib/parsers/generic.js";
import { getChangedFiles } from "../lib/git-diff.js";
import { saveEvidence } from "../lib/evidence.js";
import { getDb } from "../db/client.js";
import { validateVerifyYaml } from "../lib/yaml-parser.js";
import { scopeCheck } from "./scope.js";
import { ErrorCode } from "../lib/errors.js";
import { z } from "zod";

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
  no_cache?: boolean;
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
  diff_captured?: string;
  verify_exit_code?: number;
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

function runCommandAsync(
  cmd: string,
  cwd: string,
  timeoutMs: number
): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    exec(
      cmd,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        encoding: "utf-8",
      },
      (error, stdout, stderr) => {
        if (error) {
          const output = [stdout, stderr, error.message].filter(Boolean).join("\n");
          resolve({ ok: false, output });
        } else {
          resolve({ ok: true, output: stdout });
        }
      }
    );
  });
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
  try {
    const parsed = validateVerifyYaml(content);
    return {
      runtime: parsed.runtime,
      commands: parsed.commands || {},
      timeouts: parsed.timeouts || {},
      optional: parsed.optional || {},
    };
  } catch {
    return { commands: {}, timeouts: {}, optional: {} };
  }
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

function getRepoStateHash(repoPath: string): string {
  try {
    const head = execSync("git rev-parse HEAD", { cwd: repoPath, encoding: "utf-8" }).trim();
    const status = execSync("git status -s", { cwd: repoPath, encoding: "utf-8" }).trim();
    return createHash("sha256").update(head + "\n" + status).digest("hex");
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

export async function verifyRun(
  repoPath: string,
  options: VerifyOptions = {}
): Promise<VerifyResult> {
  const { steps, fail_fast = true, changed_only = false, task_id, force_install = false, skip_steps = [], no_cache = false } = options;
  const absPath = resolve(repoPath);
  const verifyConfig = loadVerifyConfig(absPath);
  const runtime = detectRuntime(absPath);
  const skipStepsSet = new Set(skip_steps);

  // A5: Chặn ghi file ngoài scope bằng cách phân tích git diff trước khi chạy verify
  let taskId = task_id;
  if (!taskId) {
    try {
      const db = getDb();
      const activeSession = db.prepare("SELECT id FROM sessions WHERE repo_path = ? AND status = 'active'").get(absPath) as { id: string } | undefined;
      if (activeSession) {
        const activeTask = db.prepare("SELECT id FROM tasks WHERE session_id = ? AND status = 'in-progress'").get(activeSession.id) as { id: string } | undefined;
        if (activeTask) {
          taskId = activeTask.id;
        }
      }
    } catch {}
  }

  const changedFilesList = getChangedFiles(absPath);
  if (changedFilesList.length > 0) {
    const outOfScopeFiles: string[] = [];
    for (const file of changedFilesList) {
      const check = scopeCheck(absPath, taskId, file);
      if (!check.in_scope) {
        outOfScopeFiles.push(`${file} (${check.reason})`);
      }
    }

    if (outOfScopeFiles.length > 0) {
      const err = new Error(`ERR_OUT_OF_SCOPE: Cannot verify because modified files are out of scope: \n${outOfScopeFiles.join("\n")}`);
      (err as any).code = ErrorCode.ERR_OUT_OF_SCOPE;
      throw err;
    }
  }

  // Check cache (skip if no_cache is true)
  const repoStateHash = getRepoStateHash(absPath);
  const cacheFile = join(absPath, ".harness", "verify_cache.json");
  const optionsHash = createHash("sha256").update(JSON.stringify(options)).digest("hex");

  if (!no_cache && repoStateHash) {
    try {
      if (existsSync(cacheFile)) {
        const cacheContent = readFileSync(cacheFile, "utf-8");
        const cache = JSON.parse(cacheContent);
        if (cache.repo_state_hash === repoStateHash && cache.options_hash === optionsHash) {
          const cachedResult = cache.result as VerifyResult;
          // Prepend a note that this is cached
          cachedResult.output = `[CACHED] Verify passed in a previous run.\n` + cachedResult.output;
          return cachedResult;
        }
      }
    } catch {}
  }

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
      const runRes = await runCommandAsync(step.cmd, absPath, step.timeout);
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

      if (ok) {
        outputs.push(`=== ${step.name} (PASS) ===`);
      } else {
        outputs.push(`=== ${step.name} (FAIL${isOptional ? " [OPTIONAL]" : ""}) ===\n${output}`);
      }
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

  // Auto-set current_phase and verify_passed in the session
  try {
    const db = getDb();
    let sessionId: string | null = null;
    if (task_id) {
      const row = db.prepare("SELECT session_id FROM tasks WHERE id = ?").get(task_id) as { session_id: string | null } | undefined;
      if (row && row.session_id) {
        sessionId = row.session_id;
      }
    }
    if (!sessionId) {
      const sessionRow = db.prepare("SELECT id FROM sessions WHERE repo_path = ? AND status = 'active'").get(absPath) as { id: string } | undefined;
      if (sessionRow) {
        sessionId = sessionRow.id;
      }
    }

    if (sessionId) {
      const verifyPassedVal = allPassed ? 1 : 0;
      db.prepare(`
        UPDATE sessions 
        SET current_phase = 'VERIFY', 
            verify_called = 1, 
            verify_passed = CASE WHEN ? = 1 THEN 1 ELSE verify_passed END 
        WHERE id = ?
      `).run(verifyPassedVal, sessionId);
      
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

  // Capture Git Diff patch content
  let diffCaptured = "";
  try {
    const gitTimeout = 10000;
    const unstagedDiff = execSync("git diff", { cwd: absPath, timeout: gitTimeout, encoding: "utf-8" });
    const stagedDiff = execSync("git diff --cached", { cwd: absPath, timeout: gitTimeout, encoding: "utf-8" });
    diffCaptured = `${unstagedDiff}\n${stagedDiff}`.trim();
  } catch {}

  const verifyExitCode = allPassed ? 0 : 1;

  const result: VerifyResult = {
    passed: allPassed,
    output: truncate(outputs.join("\n\n"), MAX_OUTPUT),
    steps_run: stepsRan,
    step_results: stepResults,
    test_results: testResults,
    changed_files: changedFilesList,
    diff_captured: diffCaptured || undefined,
    verify_exit_code: verifyExitCode,
    ...(workflow_guidance ? { workflow_guidance } : {}),
  };

  if (evidencePath) {
    result.evidence_path = evidencePath;
  }

  // Save cache
  if (repoStateHash) {
    try {
      const cacheData = {
        repo_state_hash: repoStateHash,
        options_hash: optionsHash,
        result: result,
      };
      writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), "utf-8");
    } catch {}
  }

  return result;
}

export const mcpTools = [
  {
    name: "verify_run",
    description: "Run verification pipeline for a repo (install, build, test, lint).",
    inputSchema: {
      repo_path: z.string().describe("Path to the repo to verify"),
      steps: z.array(z.string()).optional().describe("Explicit commands to run (overrides auto-detect)"),
      fail_fast: z.boolean().optional().describe("Stop on first failure (default true)"),
      changed_only: z.boolean().optional().describe("Lint only changed files (default false)"),
      task_id: z.string().optional().describe("If provided, auto-save evidence for this task"),
      force_install: z.boolean().optional().describe("If true, bypass lockfile cache and force dependency installation (default false)"),
      skip_steps: z.array(z.string()).optional().describe("List of verification steps to skip"),
      no_cache: z.boolean().optional().describe("Bypass cache and force verify run"),
    },
    handler: async (args: any) => verifyRun(args.repo_path, args),
  },
];
