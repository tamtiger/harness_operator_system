/**
 * Migrate v0.7 SKILL.md frontmatter to v1.0 agentskills.io format.
 *
 * v0.7 format (flat):
 *   name, version, updated, applies_to, triggers, description
 *
 * v1.0 format (nested metadata):
 *   name, description, metadata: { version, updated, applies_to, triggers }
 *
 * Usage:
 *   npx tsx scripts/migrate-frontmatter.ts skills/
 *   npx tsx scripts/migrate-frontmatter.ts --dry-run skills/
 */
import { readdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// --- CLI args ---
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const positional = args.filter((a) => !a.startsWith("--"));

if (positional.length === 0) {
  process.stderr.write("Usage: npx tsx scripts/migrate-frontmatter.ts [--dry-run] <skills-dir>\n");
  process.exit(1);
}

const skillsDir = resolve(positional[0]);

// --- Constants ---
const MAX_DESCRIPTION = 1024;
const METADATA_FIELDS = ["version", "updated", "applies_to", "triggers"];

// --- Counters ---
let migrated = 0;
let warnings = 0;
let errors = 0;

// --- Helpers ---

function parseOldFrontmatter(raw: string): { meta: Record<string, unknown> | null; content: string } {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) {
    return { meta: null, content: raw };
  }
  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { meta: null, content: raw };
  }
  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3);
  const meta = parseSimpleYaml(yamlBlock);
  return { meta, content };
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;
    const colonIdx = trimmedLine.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmedLine.slice(0, colonIdx).trim();
    const rawValue = trimmedLine.slice(colonIdx + 1).trim();
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      result[key] = parseInlineArray(rawValue);
    } else {
      result[key] = parseScalar(rawValue);
    }
  }
  return result;
}

function parseInlineArray(value: string): unknown[] {
  const inner = value.slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((s) => parseScalar(s.trim()));
}

function parseScalar(value: string): unknown {
  if (value === "null" || value === "~" || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^\d+(\.\d+)?$/.test(value)) return parseFloat(value);
  return value;
}

function serializeYamlValue(value: unknown, indent: string = ""): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    // Quote if contains special chars or is purely numeric
    if (/^\d+(\.\d+)?$/.test(value) || value.includes(":") || value.includes("#")) {
      return `"${value}"`;
    }
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => {
      if (typeof v === "string") return `"${v}"`;
      return String(v);
    });
    return `[${items.join(", ")}]`;
  }
  // Object — serialize as indented block (should not happen at this level)
  return String(value);
}

function serializeNewFrontmatter(meta: {
  name: string;
  description: string;
  metadata: Record<string, unknown>;
}): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${meta.name}`);
  lines.push(`description: ${serializeYamlValue(meta.description)}`);
  lines.push("metadata:");
  for (const [key, value] of Object.entries(meta.metadata)) {
    lines.push(`  ${key}: ${serializeYamlValue(value)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function isAlreadyMigrated(meta: Record<string, unknown>): boolean {
  return meta.metadata != null && typeof meta.metadata === "object";
}

function needsMigration(meta: Record<string, unknown>): boolean {
  // Has at least one of the fields that should move to metadata at top level
  return METADATA_FIELDS.some((f) => f in meta);
}

// --- Main ---

function main() {
  // Discover skill directories
  let entries: string[];
  try {
    entries = readdirSync(skillsDir);
  } catch (err: unknown) {
    process.stderr.write(`Error: cannot read directory "${skillsDir}": ${(err as Error).message}\n`);
    process.exit(1);
  }

  const skillDirs = entries.filter((entry) => {
    const fullPath = join(skillsDir, entry);
    try {
      return statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  });

  const skillFiles = skillDirs
    .map((dir) => join(skillsDir, dir, "SKILL.md"))
    .filter((filePath) => {
      try {
        statSync(filePath);
        return true;
      } catch {
        return false;
      }
    });

  if (skillFiles.length === 0) {
    process.stdout.write("No SKILL.md files found.\n");
    process.exit(0);
  }

  process.stdout.write(`Found ${skillFiles.length} SKILL.md file(s) in "${skillsDir}"\n`);
  if (dryRun) {
    process.stdout.write("[DRY RUN] No files will be modified.\n");
  }
  process.stdout.write("\n");

  for (const filePath of skillFiles) {
    processFile(filePath);
  }

  // Summary
  process.stdout.write("\n--- Summary ---\n");
  process.stdout.write(`Migrated: ${migrated}\n`);
  process.stdout.write(`Warnings: ${warnings}\n`);
  process.stdout.write(`Errors:   ${errors}\n`);
}

function processFile(filePath: string) {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err: unknown) {
    process.stderr.write(`ERROR: cannot read "${filePath}": ${(err as Error).message}\n`);
    errors++;
    return;
  }

  const { meta, content } = parseOldFrontmatter(raw);

  if (!meta) {
    process.stderr.write(`SKIP: "${filePath}" — no frontmatter found\n`);
    errors++;
    return;
  }

  if (isAlreadyMigrated(meta)) {
    process.stdout.write(`SKIP: "${filePath}" — already v1.0 format\n`);
    return;
  }

  if (!needsMigration(meta)) {
    process.stdout.write(`SKIP: "${filePath}" — no v0.7 fields to migrate\n`);
    return;
  }

  // Build new structure
  const name = String(meta.name ?? "unknown");
  let description = String(meta.description ?? "");

  // Truncate description if needed
  if (description.length > MAX_DESCRIPTION) {
    process.stderr.write(`WARN: "${filePath}" — description truncated from ${description.length} to ${MAX_DESCRIPTION} chars\n`);
    description = description.slice(0, MAX_DESCRIPTION);
    warnings++;
  }

  const metadata: Record<string, unknown> = {};
  for (const field of METADATA_FIELDS) {
    if (field in meta) {
      metadata[field] = meta[field];
    }
  }

  const newFrontmatter = serializeNewFrontmatter({ name, description, metadata });
  const newContent = newFrontmatter + content;

  if (dryRun) {
    process.stdout.write(`WOULD MIGRATE: "${filePath}"\n`);
    migrated++;
    return;
  }

  // Atomic write: temp file + rename
  const tmpPath = filePath + `.tmp.${randomUUID().slice(0, 8)}`;
  try {
    writeFileSync(tmpPath, newContent, "utf-8");
    renameSync(tmpPath, filePath);
    process.stdout.write(`MIGRATED: "${filePath}"\n`);
    migrated++;
  } catch (err: unknown) {
    process.stderr.write(`ERROR: failed to write "${filePath}": ${(err as Error).message}\n`);
    errors++;
    // Clean up temp file if it exists
    try {
      renameSync(tmpPath, tmpPath); // no-op to check existence
    } catch {
      // temp file doesn't exist, nothing to clean
    }
  }
}

main();
