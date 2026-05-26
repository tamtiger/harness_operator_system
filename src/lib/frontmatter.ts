/**
 * Parse YAML frontmatter from SKILL.md files.
 * Simple implementation — no heavy deps.
 */

export interface SkillMeta {
  name?: string;
  version?: string;
  updated?: string;
  applies_to?: string[];
  triggers?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface ParsedSkill {
  meta: SkillMeta | null;
  content: string;
}

/**
 * Parse YAML frontmatter delimited by `---` at the start of a file.
 * Returns { meta, content } where meta is null if no frontmatter found.
 */
export function parseFrontmatter(raw: string): ParsedSkill {
  const trimmed = raw.trimStart();

  if (!trimmed.startsWith("---")) {
    return { meta: null, content: raw };
  }

  const endIndex = trimmed.indexOf("---", 3);
  if (endIndex === -1) {
    return { meta: null, content: raw };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3).trim();

  try {
    const meta = parseSimpleYaml(yamlBlock);
    return { meta, content };
  } catch {
    return { meta: null, content: raw };
  }
}

/**
 * Minimal YAML parser for flat key-value + arrays.
 * Handles: strings, quoted strings, inline arrays ["a", "b"], number, null.
 */
function parseSimpleYaml(yaml: string): SkillMeta {
  const result: SkillMeta = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const colonIdx = trimmedLine.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmedLine.slice(0, colonIdx).trim();
    let value = trimmedLine.slice(colonIdx + 1).trim();

    // Inline array: ["a", "b"]
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      const items = inner
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (
            (s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))
          ) {
            return s.slice(1, -1);
          }
          return s;
        })
        .filter((s) => s.length > 0);
      result[key] = items;
      continue;
    }

    // Number (only if not quoted)
    if (/^\d+(\.\d+)?$/.test(value)) {
      result[key] = parseFloat(value);
      continue;
    }

    // null
    if (value === "null" || value === "~" || value === "") {
      result[key] = null;
      continue;
    }

    // Remove surrounding quotes for string values
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}
