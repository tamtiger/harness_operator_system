import { resolve, join, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { ensureDir } from "../../lib/repo.js";
import { getFlag, getProjectRoot } from "./utils.js";

export function cmdInstallMcp() {
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
              "skill_load",
              "skill_list",
              "instinct_get",
              "harness_status",
              "scope_get",
              "scope_check",
              "handoff_read",
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
