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
