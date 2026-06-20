import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, type SkillFrontmatter } from "../lib/frontmatter.js";
import { resolveHarnessDir, resolveGlobalHome } from "../lib/repo.js";
import { log } from "../lib/logger.js";
import { matchSkills, type SkillWithMetadata, type MatchContext } from "../lib/skill-matcher.js";
import { auditLog } from "./observe.js";
import { resolveToolContext } from "../lib/tool-context.js";
import { getDb } from "../db/client.js";
import { detectRuntime } from "../lib/runtime.js";

export interface SkillLoadResult {
  name: string;
  content: string;
  meta: SkillFrontmatter | null;
  metadata?: Record<string, unknown>;
}

export interface SkillLoadError {
  error: string;
}

export interface SkillListEntry {
  name: string;
  version: string | null;
  description: string | null;
  applies_to: string[];
  metadata?: Record<string, unknown>;
}

function getBuiltinSkillsDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile);
  // From src/tools/ or dist/tools/ → go up 2 levels to project root
  const projectRoot = join(thisDir, "..", "..");
  return join(projectRoot, "skills");
}

function findSkillFile(name: string, searchDirs: string[]): string | null {
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    // Try: dir/<name>/SKILL.md
    const dirPath = join(dir, name, "SKILL.md");
    if (existsSync(dirPath)) return dirPath;

    // Try: dir/<name>.md
    const filePath = join(dir, `${name}.md`);
    if (existsSync(filePath)) return filePath;
  }
  return null;
}

function getSearchDirs(repoPath?: string): string[] {
  // Priority: repo-specific > global > built-in
  const dirs: string[] = [];

  if (repoPath) {
    const repoSkills = join(resolveHarnessDir(repoPath), "skills");
    dirs.push(repoSkills);
  }

  const globalSkills = join(resolveGlobalHome(), "skills");
  dirs.push(globalSkills);

  dirs.push(getBuiltinSkillsDir());

  return dirs;
}

/** Deprecated top-level fields that should be moved into `metadata` */
const DEPRECATED_TOP_LEVEL_FIELDS = ["version", "updated", "applies_to", "triggers"];

function emitDeprecationWarning(skillName: string, meta: SkillFrontmatter | null): void {
  if (!meta || meta.metadata) return;

  const hasOldFields = DEPRECATED_TOP_LEVEL_FIELDS.some(
    (f) => f in meta && meta[f] !== undefined
  );

  if (hasOldFields) {
    log("warn", `skill "${skillName}" uses deprecated top-level fields (version, updated, applies_to, triggers). Migrate to metadata object. See agentskills.io spec.`, { skill: skillName });
  }
}

export function skillLoad(
  name: string,
  repoPath?: string
): SkillLoadResult | SkillLoadError {
  if (!/^[a-zA-Z0-9\-_]+$/.test(name)) {
    return { error: `invalid skill name: ${name}` };
  }

  const searchDirs = getSearchDirs(repoPath);
  const filePath = findSkillFile(name, searchDirs);

  if (!filePath) {
    return { error: `skill not found: ${name}` };
  }

  const raw = readFileSync(filePath, "utf-8");
  const { meta, content } = parseFrontmatter(raw);

  emitDeprecationWarning(name, meta);

  const metadata = (meta?.metadata as Record<string, unknown>) ?? undefined;

  // Log skill loaded event
  try {
    const ctx = resolveToolContext({ repo_path: repoPath });
    auditLog("skill_loaded", {
      skill: name,
      repo_id: ctx.repo_id,
      session_id: ctx.session_id,
    });
  } catch {
    // ignore
  }

  return { name, content: raw, meta, metadata };
}

export function skillList(
  stackFilter?: string,
  repoPath?: string
): { skills: SkillListEntry[] } {
  const searchDirs = getSearchDirs(repoPath);
  const seen = new Set<string>();
  const skills: SkillListEntry[] = [];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      let skillName: string;
      let filePath: string;

      if (entry.isDirectory()) {
        skillName = entry.name;
        filePath = join(dir, entry.name, "SKILL.md");
        if (!existsSync(filePath)) continue;
      } else if (entry.name.endsWith(".md") && entry.name !== "README.md") {
        skillName = entry.name.replace(/\.md$/, "");
        filePath = join(dir, entry.name);
      } else {
        continue;
      }

      // First found wins (repo > global > built-in)
      if (seen.has(skillName)) continue;
      seen.add(skillName);

      const raw = readFileSync(filePath, "utf-8");
      const { meta } = parseFrontmatter(raw);

      emitDeprecationWarning(skillName, meta);

      // New schema: metadata.applies_to; fallback: top-level applies_to
      const metadataObj = meta?.metadata as Record<string, unknown> | undefined;
      const appliesTo =
        (metadataObj?.applies_to as string[]) ||
        (meta?.applies_to as string[]) ||
        ["*"];

      // Filter by stack if requested
      if (stackFilter && !appliesTo.includes("*") && !appliesTo.includes(stackFilter)) {
        continue;
      }

      // New schema: metadata.version; fallback: top-level version
      const version =
        (metadataObj?.version as string) ||
        (meta?.version as string) ||
        null;

      skills.push({
        name: skillName,
        version: version,
        description: (meta?.description as string) ?? null,
        applies_to: appliesTo,
        metadata: metadataObj,
      });
    }
  }

  return { skills };
}

export interface SkillCreateFromSessionResult {
  draft: string;
  event_count: number;
}

export interface SkillSuggestResult {
  suggested_skills: Array<{
    name: string;
    tier: number;
    score: number;
  }>;
  total_available: number;
}

export function skillSuggest(
  taskTitle?: string,
  taskScope?: string,
  stack?: string,
  maxResults?: number,
  repoPath?: string
): SkillSuggestResult {
  const { skills } = skillList(stack, repoPath);

  // Convert to SkillWithMetadata format for matching
  const skillsWithMeta: SkillWithMetadata[] = skills.map((s) => ({
    name: s.name,
    description: s.description ?? undefined,
    metadata: s.metadata,
  }));

  // Match skills based on context
  const context: MatchContext = {
    taskTitle,
    taskScope,
    stack,
  };

  const suggested = matchSkills(skillsWithMeta, context, maxResults ?? 8);

  return {
    suggested_skills: suggested,
    total_available: skills.length,
  };
}

export function skillCreateFromSession(
  sessionId: string,
  theme: string,
  db: unknown,
  runtimeDetector: (path: string) => { runtime: string }
): SkillCreateFromSessionResult {
  const database = db as { prepare: (sql: string) => { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] } };

  // Get session info
  const session = database
    .prepare(`SELECT repo_path FROM sessions WHERE id = ?`)
    .get(sessionId) as { repo_path: string } | undefined;

  if (!session) {
    return {
      draft: `# Error\n\nSession not found: ${sessionId}`,
      event_count: 0,
    };
  }

  // Get audit events for this session
  const events = database
    .prepare(
      `SELECT event_type, payload, created_at FROM audit_events WHERE payload LIKE ? ORDER BY created_at ASC`
    )
    .all(`%${sessionId}%`) as Array<{
    event_type: string;
    payload: string;
    created_at: string;
  }>;

  if (events.length < 5) {
    return {
      draft: `# Not enough data\n\nSession ${sessionId} has only ${events.length} audit events. Need at least 5 to extract meaningful patterns.`,
      event_count: events.length,
    };
  }

  // Extract patterns from events
  const toolCalls = events
    .filter((e) => e.event_type === "tool_call" || e.event_type === "tool_success")
    .map((e) => {
      try {
        return JSON.parse(e.payload);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const toolNames = toolCalls
    .map((c: Record<string, unknown>) => c.tool as string)
    .filter(Boolean);
  const uniqueTools = [...new Set(toolNames)];

  // Detect stack from repo
  const runtime = runtimeDetector(session.repo_path);
  const date = new Date().toISOString().slice(0, 10);

  const draft = `---
name: ${theme.replace(/\s+/g, "-").toLowerCase()}
description: Patterns extracted from session ${sessionId.slice(0, 8)} — theme: ${theme}.
metadata:
  version: "1.0"
  updated: ${date}
  applies_to: ["${runtime.runtime}"]
  triggers: ["task_create"]
---

# ${theme}

Patterns extracted from a coding session.

## Context

- **Session:** ${sessionId.slice(0, 8)}
- **Repo:** ${session.repo_path}
- **Stack:** ${runtime.runtime}
- **Events analyzed:** ${events.length}

## Tools Used

${uniqueTools.length > 0 ? uniqueTools.map((t) => `- \`${t}\``).join("\n") : "- (no tool calls recorded)"}

## Patterns Observed

Based on ${events.length} events in this session, the following workflow emerged:

${uniqueTools.length > 0 ? uniqueTools.slice(0, 10).map((t, i) => `${i + 1}. Used \`${t}\``).join("\n") : "- Review audit log for patterns"}

## Recommendations

Review and refine this skill draft. Add specific rules and anti-patterns
based on what worked and what didn't in the session.

## Notes

- This is an auto-generated draft — do NOT save without review
- Add concrete examples from the session
- Remove generic advice, keep only session-specific insights
`;

  return { draft, event_count: events.length };
}

import { z } from "zod";

export const mcpTools = [
  {
    name: "skill_load",
    description: "Load a skill by name. Returns skill content and metadata.",
    inputSchema: {
      name: z.string().describe("Skill name (e.g. 'karpathy-guidelines')"),
      repo_path: z.string().optional().describe("Repo path for repo-specific skill lookup"),
    },
    handler: async (args: any) => skillLoad(args.name, args.repo_path),
  },
  {
    name: "skill_list",
    description: "List all available skills with metadata. Optionally filter by stack.",
    inputSchema: {
      stack_filter: z.string().optional().describe("Filter by stack (e.g. 'node', 'dotnet')"),
      repo_path: z.string().optional().describe("Include repo-specific skills"),
    },
    handler: async (args: any) => skillList(args.stack_filter, args.repo_path),
  },
  {
    name: "skill_create_from_session",
    description: "Generate a SKILL.md draft from a session's audit log. Returns draft only (does NOT auto-save).",
    inputSchema: {
      session_id: z.string().describe("Session ID to extract patterns from"),
      theme: z.string().describe("Theme/name for the skill (e.g. 'refactoring-workflow')"),
    },
    handler: async (args: any) => skillCreateFromSession(args.session_id, args.theme, getDb(), detectRuntime),
  },
  {
    name: "skill_suggest",
    description: "Suggest relevant skills for a task based on title and context.",
    inputSchema: {
      task_title: z.string().optional().describe("Task title to match against"),
      task_scope: z.string().optional().describe("Task scope for additional context"),
      stack: z.string().optional().describe("Stack filter (node, dotnet, etc.)"),
      max_results: z.number().optional().describe("Max skills to return (default 8)"),
      repo_path: z.string().optional().describe("Repo path for repo-specific skills"),
    },
    handler: async (args: any) => skillSuggest(
      args.task_title,
      args.task_scope,
      args.stack,
      args.max_results,
      args.repo_path
    ),
  },
];

