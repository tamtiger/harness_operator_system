import { resolve, join, basename, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { detectRuntime } from "../../lib/runtime.js";
import { ensureDir, resolveHarnessDir } from "../../lib/repo.js";
import { createRepoConfig, resolveGlobalRepoPath, readRepoConfig } from "../../lib/repo-identity.js";
import { registerRepo } from "../../db/client.js";
import { generateSummary, writeSummary } from "../../lib/repo-summary.js";
import { args, getFlag, hasFlag, getProjectRoot } from "./utils.js";

function renderTemplate(
  content: string,
  vars: Record<string, string>
): string {
  // Remove template metadata comments (<!-- ... -->)
  content = content.replace(/<!--[\s\S]*?-->/g, "");

  // Replace {{VAR}} placeholders
  for (const [key, val] of Object.entries(vars)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }

  // Handle conditional blocks: {{#if_<stack>}}...{{/if_<stack>}}
  const stack = vars.STACK;
  const stacks = ["node", "dotnet", "python", "go", "rust", "php"];

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

export function cmdInit() {
  // Find the first argument after 'init' that is not a flag/option value
  let rawPath = ".";
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      // If it has a value, skip next element too
      if (arg === "--stack" || arg === "--pm") {
        i++;
      }
      continue;
    }
    rawPath = arg;
    break;
  }

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

  // Detect package manager
  let packageManager: string = "npm";
  if (stack === "php") {
    packageManager = "composer";
  } else if (stack === "node" || stack === "auto") {
    if (pmArg !== "auto") {
      packageManager = pmArg; // npm, or pnpm
    } else if ("packageManager" in runtime) {
      packageManager = (runtime as { packageManager: string }).packageManager;
    }
  }

  const repoName = basename(repoPath);
  const date = new Date().toISOString().slice(0, 10);

  const projectRoot = getProjectRoot();
  const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));
  const templatesDir = join(projectRoot, "templates");

  // Get PM commands for template rendering
  let pmInstall = "npm ci";
  let pmRun = "npm run";
  let pmName = "npm";

  if (packageManager === "pnpm") {
    pmInstall = "pnpm install --frozen-lockfile";
    pmRun = "pnpm run";
    pmName = "pnpm";
  } else if (packageManager === "composer") {
    pmInstall = existsSync(join(repoPath, "composer.lock")) ? "composer install --no-dev" : "composer install";
    pmRun = "composer";
    pmName = "composer";
  } else {
    // npm (default)
    pmInstall = existsSync(join(repoPath, "package-lock.json")) ? "npm ci" : "npm install";
    pmRun = "npm run";
    pmName = "npm";
  }

  const files: Array<{ path: string; template: string }> = [
    { path: "AGENTS.md", template: "AGENTS.md.tpl" },
    { path: ".harness/scope.yaml", template: "scope.yaml.tpl" },
    { path: ".harness/verify.yaml", template: "verify.yaml.tpl" },
  ];

  // Rename existing AGENTS.md unless --force
  let oldAgentsNote = "";
  if (!force) {
    const agentsPath = join(repoPath, "AGENTS.md");
    if (existsSync(agentsPath)) {
      const backupName = "AGENTS_OLD.md";
      renameSync(agentsPath, join(repoPath, backupName));
      oldAgentsNote =
        `> **Note:** Original AGENTS.md preserved as \`${backupName}\`. ` +
        `Refer to it for project-specific instructions that may need to be merged.\n`;
    }
  }

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
      OLD_AGENTS_NOTE: oldAgentsNote,
    });

    const dir = dirname(targetPath);
    ensureDir(dir);
    writeFileSync(targetPath, content, "utf-8");
    created.push(file.path);
  }

  // v1.0: Create config.yaml and register repo globally
  let repoConfig = readRepoConfig(repoPath);
  if (!repoConfig || force) {
    repoConfig = createRepoConfig(repoPath);
    if (!created.includes(".harness/config.yaml")) {
      created.push(".harness/config.yaml");
    }
  } else {
    skipped.push(".harness/config.yaml");
  }
  registerRepo(repoConfig);
  const globalRepoDir = resolveGlobalRepoPath(repoConfig.repo_id);
  ensureDir(join(globalRepoDir, "artifacts", "plans"));
  ensureDir(join(globalRepoDir, "artifacts", "research"));
  ensureDir(join(globalRepoDir, "artifacts", "reviews"));

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
