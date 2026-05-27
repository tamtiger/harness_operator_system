import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, type SkillMeta } from "../lib/frontmatter.js";
import { resolveHarnessDir, resolveGlobalHome } from "../lib/repo.js";

export interface SkillLoadResult {
  name: string;
  content: string;
  meta: SkillMeta | null;
}

export interface SkillLoadError {
  error: string;
}

export interface SkillListEntry {
  name: string;
  version: string | null;
  description: string | null;
  applies_to: string[];
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

export function skillLoad(
  name: string,
  repoPath?: string
): SkillLoadResult | SkillLoadError {
  const searchDirs = getSearchDirs(repoPath);
  const filePath = findSkillFile(name, searchDirs);

  if (!filePath) {
    return { error: `skill not found: ${name}` };
  }

  const raw = readFileSync(filePath, "utf-8");
  const { meta, content } = parseFrontmatter(raw);

  return { name, content: raw, meta };
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

      const appliesTo = (meta?.applies_to as string[]) || ["*"];

      // Filter by stack if requested
      if (stackFilter && !appliesTo.includes("*") && !appliesTo.includes(stackFilter)) {
        continue;
      }

      skills.push({
        name: skillName,
        version: (meta?.version as string) ?? null,
        description: (meta?.description as string) ?? null,
        applies_to: appliesTo,
      });
    }
  }

  return { skills };
}

export interface SkillCreateFromSessionResult {
  draft: string;
  event_count: number;
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
version: "1.0"
updated: ${date}
applies_to: ["${runtime.runtime}"]
triggers: ["session_start"]
description: Patterns extracted from session ${sessionId.slice(0, 8)} — theme: ${theme}.
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

