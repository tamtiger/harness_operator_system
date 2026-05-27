/**
 * Seed starter instincts for common patterns.
 * Idempotent: skips if same description already exists.
 */
import { getDb } from "../src/db/client.js";
import { randomUUID } from "node:crypto";

const SEED_INSTINCTS = [
  {
    description: "Always run the full test suite before claiming a task is done — partial runs miss regressions",
    tags: ["testing", "verification"],
  },
  {
    description: "Check .gitignore before committing — avoid leaking secrets or large binaries",
    tags: ["git", "scope"],
  },
  {
    description: "In Node.js repos, prefer npm ci over npm install in CI — deterministic installs prevent drift",
    tags: ["node", "testing"],
  },
  {
    description: "When fixing a bug, write the failing test FIRST — proves the bug exists and prevents regression",
    tags: ["testing", "node", "dotnet"],
  },
  {
    description: "Never edit migration files after they've been applied — create a new migration instead",
    tags: ["dotnet", "node", "scope"],
  },
  {
    description: "Search for existing utility functions before writing new ones — duplication is the enemy",
    tags: ["node", "dotnet", "python"],
  },
  {
    description: "Run lint/format check before committing — CI failures for style issues waste everyone's time",
    tags: ["git", "verification"],
  },
  {
    description: "When scope.yaml exists, always check scope_check before editing files outside your task's directory",
    tags: ["scope", "verification"],
  },
  {
    description: "After a session handoff, the next session should read progress.md first — context prevents duplicate work",
    tags: ["verification", "scope"],
  },
  {
    description: "If a command times out during verify, check if it's waiting for user input or a missing env variable",
    tags: ["verification", "node", "dotnet"],
  },
];

function main() {
  const db = getDb();
  const now = new Date().toISOString();
  let inserted = 0;
  let skipped = 0;

  for (const instinct of SEED_INSTINCTS) {
    // Check if already exists
    const existing = db
      .prepare(`SELECT id FROM instincts WHERE description = ?`)
      .get(instinct.description);

    if (existing) {
      skipped++;
      continue;
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO instincts (id, description, tags, confidence, ttl_days, created_at) VALUES (?, ?, ?, 0.5, NULL, ?)`
    ).run(id, instinct.description, JSON.stringify(instinct.tags), now);
    inserted++;
  }

  console.log(`\n✓ Seed instincts: ${inserted} inserted, ${skipped} skipped (already exist)\n`);
}

main();
