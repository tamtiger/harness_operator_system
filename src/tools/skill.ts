import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface SkillLoadResult {
  name: string;
  content: string;
}

export interface SkillLoadError {
  error: string;
}

function getSkillsDir(): string {
  // Resolve skills/ directory relative to project root
  // Works from both src/ (dev via tsx) and dist/ (prod)
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = dirname(thisFile);

  // From src/tools/ or dist/tools/ → go up 2 levels to project root
  const projectRoot = join(thisDir, "..", "..");
  return join(projectRoot, "skills");
}

function findSkillFile(name: string): string | null {
  const skillsDir = getSkillsDir();

  // Try: skills/<name>/SKILL.md
  const dirPath = join(skillsDir, name, "SKILL.md");
  if (existsSync(dirPath)) return dirPath;

  // Try: skills/<name>.md
  const filePath = join(skillsDir, `${name}.md`);
  if (existsSync(filePath)) return filePath;

  return null;
}

export function skillLoad(name: string): SkillLoadResult | SkillLoadError {
  const filePath = findSkillFile(name);

  if (!filePath) {
    return { error: `skill not found: ${name}` };
  }

  const content = readFileSync(filePath, "utf-8");
  return { name, content };
}
