#!/usr/bin/env node
import { resolve, join, basename, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { detectRuntime } from "../lib/runtime.js";
import { resolveGlobalHome, ensureDir, resolveHarnessDir } from "../lib/repo.js";
import { createRepoConfig, resolveGlobalRepoPath } from "../lib/repo-identity.js";
import { registerRepo } from "../db/client.js";
import { skillLoad, skillList } from "../tools/skill.js";
import { verifyRun } from "../tools/verify.js";
import { harnessStatus } from "../tools/observe.js";
import { taskList } from "../tools/task.js";
import { instinctGet } from "../tools/instinct.js";
import { getDb } from "../db/client.js";
import { generateTree } from "../lib/tree.js";
import { generateSummary, writeSummary } from "../lib/repo-summary.js";
import { invalidateTreeHashCache } from "../lib/stale-cache.js";
import { runOrchestrate } from "./orchestrator.js";
import { listWorkers, killWorker, cleanupExpiredWorkers } from "../lib/worker-registry.js";
import { loadHooksConfig, validateHooksConfig, dryRunHooks } from "../lib/hooks.js";
import { generateReport } from "../lib/analytics.js";

const args = process.argv.slice(2);
const command = args[0];

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..", "..");
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getProjectRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "..");
}

// === harness init ===

function cmdInit() {
  let rawPath = args[1] || ".";
  // Expand ~ to home directory (not done automatically on Windows CMD)
  if (rawPath === "~" || rawPath.startsWith("~/") || rawPath.startsWith("~\\")) {
    rawPath = join(homedir(), rawPath.slice(2));
  }
  const repoPath = resolve(rawPath);
  const stackArg = getFlag("stack") || "auto";
  const pmArg = getFlag("pm") || "auto";
  const force = hasFlag("force");

  if (!existsSync(repoPath)) {
    console.error(`\n  ✗ Directory does not exist: ${repoPath}`);
    console.error(`    Create it first, then run harness init again.\n`);
    process.exit(1);
  }

  // Detect stack
  const runtime = stackArg === "auto" ? detectRuntime(repoPath) : { runtime: stackArg };
  const stack = runtime.runtime;

  // Detect package manager (only relevant for Node.js repos)
  let packageManager: string = "npm";
  if (stack === "node" || stack === "auto") {
    if (pmArg !== "auto") {
      packageManager = pmArg; // npm, or pnpm
    } else if ("packageManager" in runtime) {
      packageManager = (runtime as { packageManager: string }).packageManager;
    }
  }

  const repoName = basename(repoPath);
  const date = new Date().toISOString().slice(0, 10);

  const projectRoot = getProjectRoot();
  const templatesDir = join(projectRoot, "templates");

  // Get PM commands for template rendering
  let pmInstall = "npm ci";
  let pmRun = "npm run";
  let pmName = "npm";

  if (packageManager === "pnpm") {
    pmInstall = "pnpm install --frozen-lockfile";
    pmRun = "pnpm run";
    pmName = "pnpm";
  } else {
    // npm (default)
    pmInstall = existsSync(join(repoPath, "package-lock.json")) ? "npm ci" : "npm install";
    pmRun = "npm run";
    pmName = "npm";
  }

  const files: Array<{ path: string; template: string }> = [
    { path: "AGENTS.md", template: "AGENTS.md.tpl" },
    { path: ".harness/scope.yaml", template: "scope.yaml.tpl" },
    { path: ".harness/feature_list.json", template: "feature_list.json.tpl" },
    { path: ".harness/verify.yaml", template: "verify.yaml.tpl" },
    { path: "init.sh", template: "init.sh.tpl" },
  ];

  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const targetPath = join(repoPath, file.path);
    if (existsSync(targetPath) && !force) {
      skipped.push(file.path);
      continue;
    }

    const tplPath = join(templatesDir, file.template);
    if (!existsSync(tplPath)) {
      console.error(`  ✗ Template not found: ${file.template}`);
      continue;
    }

    let content = readFileSync(tplPath, "utf-8");
    // Pass all template variables
    content = renderTemplate(content, {
      REPO_NAME: repoName,
      STACK: stack,
      DATE: date,
      PM_NAME: pmName,
      PM_INSTALL: pmInstall,
      PM_RUN: pmRun,
      VERSION: packageJson.version,
    });

    const dir = dirname(targetPath);
    ensureDir(dir);
    writeFileSync(targetPath, content, "utf-8");
    created.push(file.path);
  }

  // Create progress.md if not exists
  const progressPath = join(repoPath, ".harness", "progress.md");
  if (!existsSync(progressPath) || force) {
    ensureDir(dirname(progressPath));
    writeFileSync(progressPath, "# Progress Log\n", "utf-8");
    created.push(".harness/progress.md");
  }

  // v1.0: Create config.yaml and register repo globally
  const repoConfig = createRepoConfig(repoPath);
  registerRepo(repoConfig);
  const globalRepoDir = resolveGlobalRepoPath(repoConfig.repo_id);
  ensureDir(join(globalRepoDir, "artifacts", "plans"));
  ensureDir(join(globalRepoDir, "artifacts", "research"));
  ensureDir(join(globalRepoDir, "artifacts", "reviews"));
  created.push(".harness/config.yaml");

  // Auto-generate initial repo summary (code map)
  try {
    const summaryData = generateSummary({ repoPath, force: true });
    const harnessDir = resolveHarnessDir(repoPath);
    writeSummary(summaryData, harnessDir);
    created.push(".harness/repo-summary.md");
    created.push(".harness/repo-summary.meta.json");
  } catch (err) {
    console.warn(`  ⚠ Warning: Failed to generate initial repo summary: ${err}`);
  }

  console.log(`\n✓ harness init — ${repoName} (${stack})\n`);
  if (created.length > 0) {
    console.log("  Created:");
    for (const f of created) console.log(`    + ${f}`);
  }
  if (skipped.length > 0) {
    console.log("  Skipped (already exists, use --force to overwrite):");
    for (const f of skipped) console.log(`    ~ ${f}`);
  }
  console.log(`\n  Next: harness install-mcp --ide cursor`);
}

function renderTemplate(
  content: string,
  vars: Record<string, string>
): string {
  // Replace {{VAR}} placeholders
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }

  // Handle conditional blocks: {{#if_<stack>}}...{{/if_<stack>}}
  const stack = vars.STACK;
  const stacks = ["node", "dotnet", "python", "go", "rust"];

  for (const s of stacks) {
    const regex = new RegExp(`\\{\\{#if_${s}\\}\\}([\\s\\S]*?)\\{\\{/if_${s}\\}\\}`, "g");
    if (s === stack) {
      content = content.replace(regex, "$1");
    } else {
      content = content.replace(regex, "");
    }
  }

  return content.trim() + "\n";
}

// === harness doctor ===

function cmdDoctor() {
  console.log("\n=== harness doctor ===\n");
  let allPass = true;
  const checkSkillsFrontmatter = hasFlag("check-skills-frontmatter") || !hasAnyDoctorFlag();
  const checkRouting = hasFlag("check-routing") || !hasAnyDoctorFlag();
  const checkOrphans = hasFlag("check-orphans") || !hasAnyDoctorFlag();
  const fix = hasFlag("fix");

  // Node version
  const nodeVersion = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeVersion >= 20) {
    console.log(`  ✓ Node.js v${process.versions.node}`);
  } else {
    console.log(`  ✗ Node.js v${process.versions.node} (need ≥ 20)`);
    allPass = false;
  }

  // better-sqlite3
  try {
    const db = getDb();
    console.log("  ✓ better-sqlite3 loadable");
  } catch (err) {
    console.log(`  ✗ better-sqlite3 failed: ${err}`);
    allPass = false;
  }

  // ~/.harness/ writable
  try {
    const home = resolveGlobalHome();
    console.log(`  ✓ ${home} writable`);
  } catch (err) {
    console.log(`  ✗ ~/.harness/ not writable: ${err}`);
    allPass = false;
  }

  // Skills parseable
  try {
    const { skills } = skillList();
    console.log(`  ✓ ${skills.length} skills parseable`);
  } catch (err) {
    console.log(`  ✗ Skills parse error: ${err}`);
    allPass = false;
  }

  // Check skills frontmatter (validate against spec)
  if (checkSkillsFrontmatter) {
    try {
      const { skills } = skillList();
      let frontmatterIssues = 0;
      for (const skill of skills) {
        const missing: string[] = [];
        if (!skill.name) missing.push("name");
        if (!skill.version) missing.push("version");
        if (!skill.applies_to || skill.applies_to.length === 0) missing.push("applies_to");
        if (!skill.description) missing.push("description");
        if (missing.length > 0) {
          console.log(`  ⚠ Skill "${skill.name || "unknown"}": missing ${missing.join(", ")}`);
          frontmatterIssues++;
        }
      }
      if (frontmatterIssues === 0) {
        console.log("  ✓ All skills have valid frontmatter");
      } else {
        allPass = false;
      }
    } catch (err) {
      console.log(`  ✗ Skills frontmatter check failed: ${err}`);
      allPass = false;
    }
  }

  // Check routing (AGENTS.md references)
  if (checkRouting) {
    const repoPath = resolve(".");
    const agentsPath = join(repoPath, "AGENTS.md");
    if (existsSync(agentsPath)) {
      const content = readFileSync(agentsPath, "utf-8");
      // Extract file references from markdown links and backtick paths
      const refs = content.match(/`([^`]+\.(ts|js|md|yaml|json))`/g) || [];
      let missingRefs = 0;
      for (const ref of refs) {
        const cleanRef = ref.replace(/`/g, "");
        const refPath = join(repoPath, cleanRef);
        if (!existsSync(refPath) && !cleanRef.includes("{") && !cleanRef.includes("*") && !cleanRef.startsWith("~")) {
          // Only warn for paths starting with known directories, or specific root files
          const isRootFile = ["package.json", "tsconfig.json", "vitest.config.ts", "agents.md", "readme.md", "changelog.md", "task_implement.md"].includes(cleanRef.toLowerCase());
          const isKnownDir = cleanRef.startsWith("src/") || cleanRef.startsWith("scripts/") || cleanRef.startsWith("skills/") || cleanRef.startsWith("templates/") || cleanRef.startsWith("ide-adapters/") || cleanRef.startsWith(".harness/");
          if (isRootFile || isKnownDir) {
            missingRefs++;
          }
        }
      }
      if (missingRefs === 0) {
        console.log("  ✓ AGENTS.md routing references valid");
      } else {
        console.log(`  ⚠ AGENTS.md has ${missingRefs} potentially broken reference(s)`);
      }
    } else {
      console.log("  ~ AGENTS.md not found (skipping routing check)");
    }
  }

  // Check orphans (active sessions in DB)
  if (checkOrphans) {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT id, repo_path FROM sessions WHERE status = 'active'").all() as Array<{ id: string; repo_path: string }>;
      let orphans = 0;
      for (const row of rows) {
        orphans++;
        if (fix) {
          db.prepare("UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?").run(
            new Date().toISOString(),
            row.id
          );
          console.log(`  🔧 Fixed orphan session: ${row.id} (${row.repo_path})`);
        } else {
          console.log(`  ⚠ Orphan session: ${row.id} → ${row.repo_path}`);
        }
      }
      if (orphans === 0) {
        console.log("  ✓ No orphan sessions");
      } else if (!fix) {
        console.log(`    Use --fix to remove ${orphans} orphan(s)`);
        allPass = false;
      }
    } catch (err) {
      console.log(`  ✗ Orphan check failed: ${err}`);
      allPass = false;
    }
  }

  console.log("");
  if (allPass) {
    console.log("  ✅ All checks passed\n");
    process.exit(0);
  } else {
    console.log("  ❌ Some checks failed\n");
    process.exit(1);
  }
}

function hasAnyDoctorFlag(): boolean {
  return hasFlag("check-skills-frontmatter") || hasFlag("check-routing") || hasFlag("check-orphans");
}

// === harness status ===

function cmdStatus() {
  const repoPath = getFlag("repo") || ".";
  const format = getFlag("format") || "table";

  const status = harnessStatus(resolve(repoPath));

  if (format === "json") {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log("\n=== harness status ===\n");

  if (status.active_session) {
    console.log(`  Session: ${status.active_session.id}`);
    console.log(`  Repo:    ${status.active_session.repo_path}`);
    console.log(`  Started: ${status.active_session.started_at}`);
  } else {
    console.log("  Session: (none active)");
  }

  console.log(`  Pending tasks: ${status.pending_tasks}`);
  console.log(`  Last verify:   ${status.last_verify || "(never)"}`);

  if (status.recent_instincts.length > 0) {
    console.log(`  Recent instincts:`);
    for (const inst of status.recent_instincts.slice(0, 3)) {
      console.log(`    - ${inst.description}`);
    }
  }
  console.log("");
}

// === harness verify ===

function cmdVerify() {
  const repoPath = resolve(getFlag("repo") || ".");
  console.log(`\n=== harness verify: ${repoPath} ===\n`);

  const result = verifyRun(repoPath);

  console.log(`  Steps run: ${result.steps_run.join(", ")}`);
  console.log(`  Result: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);

  if (!result.passed) {
    console.log(`\n  Output:\n${result.output}`);
    process.exit(1);
  }
}

// === harness skills ===

function cmdSkills() {
  if (hasFlag("list") || args.length === 1) {
    const stackFilter = getFlag("stack");
    const { skills } = skillList(stackFilter);

    console.log("\n=== Available Skills ===\n");
    for (const skill of skills) {
      console.log(`  ${skill.name} (v${skill.version || "?"})`);
      if (skill.description) console.log(`    ${skill.description}`);
      console.log(`    applies_to: ${skill.applies_to.join(", ")}`);
      console.log("");
    }
    return;
  }

  const showName = getFlag("show");
  if (showName) {
    const result = skillLoad(showName);
    if ("error" in result) {
      console.error(`  ✗ ${result.error}`);
      process.exit(1);
    }
    console.log(result.content);
    return;
  }
}

// === harness tasks ===

function cmdTasks() {
  const repoPath = getFlag("repo");
  const status = getFlag("status");

  const { tasks } = taskList(repoPath ? resolve(repoPath) : undefined, status);

  console.log("\n=== Tasks ===\n");
  if (tasks.length === 0) {
    console.log("  (no tasks found)");
    return;
  }

  for (const task of tasks) {
    const statusIcon = task.status === "done" ? "✓" : task.status === "in-progress" ? "→" : "○";
    console.log(`  ${statusIcon} [${task.status}] ${task.title} (${task.id.slice(0, 8)})`);
  }
  console.log("");
}

// === harness instincts ===

function cmdInstincts() {
  if (hasFlag("list") || args.length === 1) {
    const { instincts } = instinctGet();
    console.log("\n=== Instincts ===\n");
    if (instincts.length === 0) {
      console.log("  (no instincts)");
      return;
    }
    for (const inst of instincts) {
      console.log(`  [${inst.confidence.toFixed(1)}] ${inst.description}`);
      console.log(`    tags: ${inst.tags.join(", ")}`);
      console.log("");
    }
    return;
  }

  if (hasFlag("export")) {
    const { instincts } = instinctGet();
    console.log(JSON.stringify(instincts, null, 2));
    return;
  }
}

// === harness workers ===

function cmdWorkers() {
  const killFlag = getFlag("kill");
  const cleanupFlag = hasFlag("cleanup");

  if (killFlag) {
    console.log(`\nKilling worker: ${killFlag}`);
    const success = killWorker(killFlag);
    if (success) {
      console.log(`  ✓ Worker ${killFlag} killed successfully.\n`);
      process.exit(0);
    } else {
      console.error(`  ✗ Worker ${killFlag} not found or not running.\n`);
      process.exit(1);
    }
  }

  if (cleanupFlag) {
    console.log(`\nCleaning up expired workers...`);
    const count = cleanupExpiredWorkers();
    console.log(`  ✓ Cleaned up ${count} expired worker(s).\n`);
    process.exit(0);
  }

  // Default: list workers
  const repoPath = getFlag("repo");
  const status = getFlag("status") || "running";

  const workers = listWorkers({
    repoPath: repoPath ? resolve(repoPath) : undefined,
    status: status === "all" ? undefined : status,
  });

  console.log("\n=== Subagent Workers ===\n");
  if (workers.length === 0) {
    console.log("  (no workers found)\n");
    return;
  }

  for (const w of workers) {
    console.log(`  Worker ID:  ${w.worker_id}`);
    console.log(`  PID:        ${w.pid || "N/A"}`);
    console.log(`  Status:     ${w.status}`);
    console.log(`  Command:    ${w.command}`);
    console.log(`  Timeout At: ${w.timeout_at}`);
    console.log("");
  }
}

// === harness hooks ===

function cmdHooks() {
  const repoPath = resolve(getFlag("repo") || ".");
  const validateFlag = hasFlag("validate");
  const dryRunFlag = hasFlag("dry-run");

  if (validateFlag) {
    console.log(`\nValidating hooks config for: ${repoPath}`);
    const result = validateHooksConfig(repoPath);
    if (result.valid) {
      console.log(`  ✓ hooks.yaml is valid.\n`);
      process.exit(0);
    } else {
      console.error(`  ✗ hooks.yaml validation failed:`);
      for (const err of result.errors) {
        console.error(`    - ${err}`);
      }
      console.error("");
      process.exit(1);
    }
  }

  if (dryRunFlag) {
    const tool = getFlag("tool");
    const toolArgsStr = getFlag("args") || "{}";
    if (!tool) {
      console.error(`  ✗ Usage: harness hooks --dry-run --tool <tool_name> [--args 'JSON_STRING']\n`);
      process.exit(1);
    }
    let toolArgs: Record<string, unknown> = {};
    try {
      toolArgs = JSON.parse(toolArgsStr);
    } catch (err: any) {
      console.error(`  ✗ Failed to parse JSON args: ${err.message}\n`);
      process.exit(1);
    }

    console.log(`\nEvaluating hooks (dry-run) for tool '${tool}' with args: ${JSON.stringify(toolArgs)}`);
    const result = dryRunHooks(repoPath, tool, toolArgs);

    if (result.preToolBlock.matched) {
      console.log(`\nHook: pre-tool-block`);
      console.log(`  Rule matched: tool=${result.preToolBlock.rule?.tool}, pattern=${result.preToolBlock.rule?.pattern || "(always)"}`);
      console.log(`  Match against args: YES`);
    } else {
      console.log(`\nHook: pre-tool-block`);
      console.log(`  Match against args: NO`);
    }

    if (result.stopValidation !== undefined) {
      console.log(`\nHook: stop-validation`);
      console.log(`  Would block session_end: ${result.stopValidation.wouldBlock ? "YES" : "NO"}`);
      if (result.stopValidation.wouldBlock) {
        console.log(`  Reason: ${result.stopValidation.reason}`);
      }
    }

    console.log(`\nResult: ${result.allowed ? "WOULD ALLOW" : "WOULD BLOCK"} tool execution\n`);
    process.exit(result.allowed ? 0 : 1);
  }

  // Default: list hooks
  console.log(`\n=== Active Hooks Rules for ${repoPath} ===\n`);
  const config = loadHooksConfig(repoPath);
  if (!config) {
    console.log("  (no hooks configuration found or file missing)\n");
    return;
  }

  if (config.pre_tool_block && config.pre_tool_block.length > 0) {
    console.log("  [Pre-Tool Block Rules]");
    for (const rule of config.pre_tool_block) {
      console.log(`    - Tool:    ${rule.tool}`);
      if (rule.pattern) console.log(`      Pattern: ${rule.pattern}`);
      if (rule.message) console.log(`      Message: ${rule.message}`);
    }
    console.log("");
  }

  if (config.stop_validation) {
    console.log("  [Stop Validation Config]");
    if (config.stop_validation.required_steps) {
      console.log(`    Required verify steps: [${config.stop_validation.required_steps.join(", ")}]`);
    }
    if (config.stop_validation.fail_on_warning !== undefined) {
      console.log(`    Fail on warning:       ${config.stop_validation.fail_on_warning}`);
    }
    console.log("");
  }
}

// === harness report ===

function cmdReport() {
  const period = (getFlag("period") || "7d") as "7d" | "30d" | "all";
  const repoPath = getFlag("repo");
  const format = getFlag("format") || "table";

  const report = generateReport({ period, repoPath });

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n=== Reliability Report (Period: ${report.period}) ===\n`);
  console.log(`Reliability Score: ${report.reliability_score.toFixed(3)}\n`);

  console.log("A. Tool Usage");
  console.log("-----------------------------------------------------------------");
  console.log("Tool                           Calls     Success    Error  Blocked");
  console.log("-----------------------------------------------------------------");
  if (report.tool_usage.length === 0) {
    console.log("  (no data)");
  } else {
    for (const tu of report.tool_usage) {
      console.log(
        `${tu.tool.padEnd(28)}  ${tu.calls.toString().padStart(6)}  ${tu.success.toString().padStart(10)}  ${tu.error.toString().padStart(7)}  ${tu.blocked.toString().padStart(7)}`
      );
    }
  }
  console.log("-----------------------------------------------------------------\n");

  console.log("B. Tool Latency");
  console.log("----------------------------------");
  console.log("Tool                           P50    P95");
  console.log("----------------------------------");
  if (report.tool_latency.length === 0) {
    console.log("  (no data)");
  } else {
    for (const tl of report.tool_latency) {
      console.log(`${tl.tool.padEnd(28)}  ${tl.p50.toFixed(2).padStart(4)}s  ${tl.p95.toFixed(2).padStart(4)}s`);
    }
  }
  console.log("----------------------------------\n");

  console.log("C. Skill Effectiveness");
  console.log("-------------------------------------------------------------");
  console.log("Skill                           Loaded   Sessions Passed  Rate");
  console.log("-------------------------------------------------------------");
  if (report.skill_effectiveness.length === 0) {
    console.log("  (no data)");
  } else {
    for (const se of report.skill_effectiveness) {
      console.log(
        `${se.skill.padEnd(30)}  ${se.loaded.toString().padStart(6)}  ${se.sessions_passed.toString().padStart(15)}  ${se.rate.toString().padStart(3)}%`
      );
    }
  }
  console.log("-------------------------------------------------------------\n");
}

// === harness install-mcp ===

function cmdInstallMcp() {
  const ide = getFlag("ide");
  if (!ide) {
    console.error("  ✗ Usage: harness install-mcp --ide <cursor|claude-code|kiro|vscode|antigravity|opencode>");
    process.exit(1);
  }

  const projectRoot = getProjectRoot();
  const serverPath = join(projectRoot, "dist", "index.js");
  const home = homedir();

  const configs: Record<string, { path: string; content: object }> = {
    cursor: {
      path: join(home, ".cursor", "mcp.json"),
      content: {
        mcpServers: {
          harness: {
            command: "node",
            args: [serverPath],
            env: { HARNESS_HOME: join(home, ".harness") },
          },
        },
      },
    },
    kiro: {
      path: join(home, ".kiro", "settings", "mcp.json"),
      content: {
        mcpServers: {
          harness: {
            command: "node",
            args: [serverPath],
            disabled: false,
            autoApprove: [
              "session_start",
              "session_resume",
              "skill_load",
              "skill_list",
              "instinct_get",
              "harness_status",
              "scope_get",
              "scope_check",
              "handoff_read",
              "feature_list_read",
              "task_list",
            ],
          },
        },
      },
    },
    vscode: {
      path: join(home, ".vscode", "mcp.json"),
      content: {
        mcpServers: {
          harness: {
            command: "node",
            args: [serverPath],
            env: { HARNESS_HOME: join(home, ".harness") },
          },
        },
      },
    },
    antigravity: {
      path: join(home, ".antigravity", "mcp.json"),
      content: {
        mcpServers: {
          harness: {
            command: "node",
            args: [serverPath],
            env: { HARNESS_HOME: join(home, ".harness") },
          },
        },
      },
    },
    opencode: {
      path: join(home, ".config", "opencode", "opencode.json"),
      content: {
        mcpServers: {
          harness: {
            command: "node",
            args: [serverPath],
          },
        },
      },
    },
  };

  if (ide === "claude-code") {
    console.log(`\n  Run this command to add harness to Claude Code:\n`);
    console.log(`  claude mcp add harness node ${serverPath}\n`);
    return;
  }

  const config = configs[ide];
  if (!config) {
    console.error(`  ✗ Unknown IDE: ${ide}. Supported: cursor, claude-code, kiro, vscode, antigravity, opencode`);
    process.exit(1);
  }

  // Merge with existing config
  let existing: Record<string, unknown> = {};
  if (existsSync(config.path)) {
    try {
      existing = JSON.parse(readFileSync(config.path, "utf-8"));
    } catch {
      existing = {};
    }
  }

  const merged = {
    ...existing,
    mcpServers: {
      ...((existing.mcpServers as Record<string, unknown>) || {}),
      ...((config.content as { mcpServers: Record<string, unknown> }).mcpServers),
    },
  };

  ensureDir(dirname(config.path));
  writeFileSync(config.path, JSON.stringify(merged, null, 2), "utf-8");

  console.log(`\n  ✓ MCP config written to: ${config.path}`);
  console.log(`  ✓ Server path: ${serverPath}`);
  console.log(`\n  Restart ${ide} to activate harness.\n`);
}

// === harness tree ===

function cmdTree() {
  const path = resolve(getFlag("path") || ".");
  const depth = parseInt(getFlag("depth") || "4", 10);
  const excludeArg = getFlag("exclude");
  const output = getFlag("output");

  const exclude = excludeArg ? excludeArg.split(",").map((s) => s.trim()) : undefined;

  const tree = generateTree({ path, depth, exclude });

  if (output) {
    ensureDir(dirname(resolve(output)));
    writeFileSync(resolve(output), tree, "utf-8");
    console.log(`✓ Tree written to ${output}`);
  } else {
    console.log(tree);
  }
}

// === harness summary ===

function cmdSummary() {
  const repoPath = resolve(getFlag("path") || ".");
  const force = hasFlag("force");

  if (force) {
    invalidateTreeHashCache(repoPath);
  }

  console.log(`\nGenerating summary for: ${repoPath}\n`);
  const data = generateSummary({ repoPath, force });
  const harnessDir = resolveHarnessDir(repoPath);
  writeSummary(data, harnessDir);

  console.log(`  Stack: ${data.stack}`);
  console.log(`  Tree hash: ${data.tree_hash}`);
  console.log(`  Written to: ${harnessDir}/repo-summary.md`);
  console.log(`\n✓ Summary generated\n`);
}

// === harness reindex ===

function cmdReindex() {
  const repoPath = resolve(getFlag("path") || ".");
  invalidateTreeHashCache(repoPath);

  console.log(`\nReindexing: ${repoPath}\n`);
  const data = generateSummary({ repoPath, force: true });
  const harnessDir = resolveHarnessDir(repoPath);
  writeSummary(data, harnessDir);

  console.log(`  Stack: ${data.stack}`);
  console.log(`  Tree hash: ${data.tree_hash}`);
  console.log(`\n✓ Reindex complete\n`);
}

// === harness export ===

function cmdExport() {
  const repoPath = resolve(getFlag("repo") || ".");
  const outputFile = getFlag("output") || `harness-export-${Date.now()}.json`;
  const exportAll = hasFlag("all");

  const exportData: Record<string, unknown> = {
    manifest: {
      version: "1.0",
      exported_at: new Date().toISOString(),
      source: exportAll ? "all" : repoPath,
    },
    state: {} as Record<string, unknown>,
  };

  const state = exportData.state as Record<string, unknown>;

  // Export .harness directory contents
  const harnessDir = join(repoPath, ".harness");
  if (existsSync(harnessDir)) {
    const files = readdirSync(harnessDir).filter((f) => f.endsWith(".json") || f.endsWith(".md") || f.endsWith(".yaml"));
    for (const file of files) {
      const filePath = join(harnessDir, file);
      try {
        state[file] = readFileSync(filePath, "utf-8");
      } catch {
        // skip unreadable files
      }
    }

    // Export handoff
    const handoffPath = join(harnessDir, "handoff_last.json");
    if (existsSync(handoffPath)) {
      state["handoff_last.json"] = readFileSync(handoffPath, "utf-8");
    }
  }

  const outputPath = resolve(outputFile);
  ensureDir(dirname(outputPath));
  writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8");
  console.log(`\n✓ Exported to: ${outputPath}\n`);
}

// === harness import ===

function cmdImport() {
  const inputFile = args[1];
  if (!inputFile || !existsSync(inputFile)) {
    console.error("  ✗ Usage: harness import <file.json>");
    console.error("    File must exist.");
    process.exit(1);
  }

  let data: { manifest: { version: string; source: string; exported_at?: string }; state: Record<string, string> };
  try {
    data = JSON.parse(readFileSync(resolve(inputFile), "utf-8"));
  } catch (err) {
    console.error(`  ✗ Failed to parse import file: ${err}`);
    process.exit(1);
  }

  if (!data.manifest || !data.state) {
    console.error("  ✗ Invalid export file format (missing manifest or state)");
    process.exit(1);
  }

  // Determine target directory
  const targetRepo = resolve(".");
  const harnessDir = join(targetRepo, ".harness");
  ensureDir(harnessDir);

  let restored = 0;
  for (const [filename, content] of Object.entries(data.state)) {
    const targetPath = join(harnessDir, filename);
    ensureDir(dirname(targetPath));
    writeFileSync(targetPath, content, "utf-8");
    restored++;
  }

  console.log(`\n✓ Imported ${restored} files from ${inputFile}`);
  console.log(`  Source: ${data.manifest.source}`);
  console.log(`  Exported at: ${data.manifest.exported_at || "unknown"}\n`);
}

// === harness orchestrate ===

async function cmdOrchestrate() {
  const title = args[1] || "Automated Orchestrated Task";
  const repo = getFlag("repo") || ".";
  const maxLoops = parseInt(getFlag("max-loops") || "3", 10);
  const stepsFlag = getFlag("steps");
  const steps = stepsFlag ? stepsFlag.split(",").map(s => s.trim()) : undefined;
  const timeoutPerLoop = parseInt(getFlag("timeout-per-loop") || "300", 10);
  const failFastOnFlag = getFlag("fail-fast-on");
  const failFastPatterns = failFastOnFlag ? failFastOnFlag.split(",").map(s => s.trim()) : undefined;

  const result = await runOrchestrate(title, {
    repoPath: repo,
    maxLoops,
    steps,
    timeoutPerLoop,
    failFastPatterns
  });

  // Map exit codes to messages
  const exitMessages: Record<number, string> = {
    0: "Success",
    1: "Max loops reached",
    2: "Timeout per loop exceeded",
    3: "Fail-fast pattern matched"
  };

  if (result.success) {
    process.stdout.write(`Success: ${result.message}\n`);
    process.exit(0);
  } else {
    const exitMsg = exitMessages[result.exit_code] || "Unknown error";
    process.stderr.write(`Failure (${exitMsg}): ${result.message} (Error: ${result.error})\n`);
    process.exit(result.exit_code);
  }
}

// === Main dispatch ===

switch (command) {
  case "orchestrate":
    cmdOrchestrate();
    break;
  case "init":
    cmdInit();
    break;
  case "doctor":
    cmdDoctor();
    break;
  case "status":
    cmdStatus();
    break;
  case "verify":
    cmdVerify();
    break;
  case "skills":
    cmdSkills();
    break;
  case "tasks":
    cmdTasks();
    break;
  case "instincts":
    cmdInstincts();
    break;
  case "install-mcp":
    cmdInstallMcp();
    break;
  case "tree":
    cmdTree();
    break;
  case "summary":
    cmdSummary();
    break;
  case "reindex":
    cmdReindex();
    break;
  case "export":
    cmdExport();
    break;
  case "import":
    cmdImport();
    break;
  case "workers":
    cmdWorkers();
    break;
  case "hooks":
    cmdHooks();
    break;
  case "report":
    cmdReport();
    break;
  default:
    console.log(`
harness-os — Local harness operator system for agentic coding

Usage:
  harness init [path] [--stack auto|node|dotnet|python|go] [--force]
  harness doctor
  harness status [--repo path] [--format json|table]
  harness verify [--repo path]
  harness skills [--list] [--show <name>] [--stack <filter>]
  harness tasks [--repo path] [--status pending|in-progress|done]
  harness instincts [--list] [--export]
  harness install-mcp --ide <cursor|claude-code|kiro|vscode|antigravity|opencode>
  harness orchestrate <title> [--repo path] [--max-loops n] [--steps build,test] [--timeout-per-loop 300] [--fail-fast-on "ENOSPC,EACCES,Cannot find module"]
  harness tree [--path .] [--depth 4] [--exclude PATTERN] [--output FILE]
  harness summary [--path .] [--force]
  harness reindex [--path .]
  harness export [--repo .] [--output FILE]
  harness import <file.json>
  harness workers [--list] [--kill <id>] [--cleanup] [--repo path] [--status running|finished|failed|all]
  harness hooks [--list] [--validate] [--dry-run --tool <tool> [--args <json>]] [--repo path]
  harness report [--period 7d|30d|all] [--repo path] [--format json|table]
`);
    break;
}
