import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { getDb, checkDatabaseIntegrity } from "../../db/client.js";
import { resolveGlobalHome } from "../../lib/repo.js";
import { skillList } from "../../tools/skill.js";
import { hasFlag } from "./utils.js";

function hasAnyDoctorFlag(): boolean {
  return hasFlag("check-skills-frontmatter") || hasFlag("check-routing") || hasFlag("check-orphans");
}

export function cmdDoctor() {
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

    const integrity = checkDatabaseIntegrity();
    if (integrity.passed) {
      console.log("  ✓ Database integrity check passed");
    } else {
      console.log(`  ✗ Database integrity check failed: ${integrity.errors.join(", ")}`);
      allPass = false;
    }
  } catch (err: any) {
    console.log(`  ✗ better-sqlite3 failed: ${err.message}`);
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
          const isOptionalHarnessFile = [".harness/progress.md", ".harness/handoff_last.json", ".harness/never_again.md"].includes(cleanRef);
          const isKnownDir = cleanRef.startsWith("src/") || cleanRef.startsWith("scripts/") || cleanRef.startsWith("skills/") || cleanRef.startsWith("templates/") || cleanRef.startsWith("ide-adapters/") || cleanRef.startsWith(".harness/");
          if ((isRootFile || isKnownDir) && !isOptionalHarnessFile) {
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
