#!/usr/bin/env node
import { cmdInit } from "./commands/init.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdStatus } from "./commands/status.js";
import { cmdVerify } from "./commands/verify.js";
import { cmdQuickStart } from "./commands/quick-start.js";
import { cmdSkills } from "./commands/skills.js";
import { cmdTasks } from "./commands/tasks.js";
import { cmdInstincts } from "./commands/instincts.js";
import { cmdProposals } from "./commands/proposals.js";
import { cmdVariants } from "./commands/variants.js";
import { cmdInstallMcp } from "./commands/install-mcp.js";
import { cmdTree } from "./commands/tree.js";
import { cmdSummary } from "./commands/summary.js";
import { cmdReindex } from "./commands/reindex.js";
import { cmdExport } from "./commands/export.js";
import { cmdImport } from "./commands/import.js";
import { cmdWorkers } from "./commands/workers.js";
import { cmdHooks } from "./commands/hooks.js";
import { cmdReport } from "./commands/report.js";
import { cmdKnowledge } from "./commands/knowledge.js";
import { cmdOrchestrate } from "./commands/orchestrate.js";
import { runDashboard } from "./dashboard.js";
import { args, getFlag } from "./commands/utils.js";

async function main() {
  const command = args[0];

  switch (command) {
    case "orchestrate":
      await cmdOrchestrate();
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
      await cmdVerify();
      break;
    case "quick-start":
      cmdQuickStart();
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
      await cmdHooks();
      break;
    case "report":
      cmdReport();
      break;
    case "knowledge":
      cmdKnowledge();
      break;
    case "proposals":
      await cmdProposals();
      break;
    case "variants":
      cmdVariants();
      break;
    case "dashboard":
      runDashboard(getFlag("repo"));
      break;
    default:
      console.log(`
harness-os — Local harness operator system for agentic coding

Usage:
  harness init [path] [--stack auto|node|dotnet|python|go|rust|php] [--force]
  harness doctor
  harness status [--repo path] [--format json|table]
  harness verify [--repo path] [--skip-install] [--force-install]
  harness quick-start [--repo path] [--title "Task Title"]
  harness skills [--list] [--show <name>] [--stack <filter>]
  harness tasks [--repo path] [--status pending|in-progress|done]
  harness instincts [--list] [--export] [--format jsonl]
  harness proposals [--list] [--approve <id>] [--reject <id>] [--details <id>] [--apply <id>]
  harness variants [--benchmark]
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
  harness knowledge [--type lesson|pattern|decision|...] [--tags "tag1,tag2"] [--list]
  harness knowledge --add --type decision <description> [--tags "tag1,tag2"]
  harness dashboard [--repo path]
`);
      break;
  }
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
