/**
 * Parse and validate YAML frontmatter from SKILL.md files.
 * Compliant with agentskills.io specification.
 * Simple implementation — no heavy deps.
 */

export interface SkillFrontmatter {
  // Required (spec)
  name: string;
  description: string;

  // Optional (spec)
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  "allowed-tools"?: string;

  // Sprint 2 (v1.7) fields
  action_map?: Record<string, { tool: string; required?: boolean }>;
  narrative_fields?: string[];
  compliance_weight?: number;

  // Validation result (attached by validateFrontmatter)
  _errors?: string[];

  // Index signature for backward compatibility — allows arbitrary fields
  // (v0.7 skills may have `version`, `updated`, `applies_to`, `triggers`, etc.)
  [key: string]: unknown;
}

export interface ParsedSkill {
  meta: SkillFrontmatter | null;
  content: string;
}

/** @deprecated Use SkillFrontmatter instead. Kept for backward compatibility. */
export type SkillMeta = SkillFrontmatter;

/** Name must be 2-64 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen */
const NAME_REGEX = /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/;

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
    const meta = parseSimpleYaml(yamlBlock) as SkillFrontmatter;
    return { meta, content };
  } catch {
    return { meta: null, content: raw };
  }
}

/**
 * Validate frontmatter against agentskills.io spec.
 * Returns array of error strings (empty = valid).
 */
export function validateFrontmatter(
  fm: SkillFrontmatter,
  parentDirName?: string
): string[] {
  const errors: string[] = [];

  // name: required, must match regex
  if (fm.name == null || typeof fm.name !== "string") {
    errors.push("name is required");
  } else {
    if (!NAME_REGEX.test(fm.name)) {
      errors.push(
        `name "${fm.name}" does not match pattern ^[a-z][a-z0-9-]{0,62}[a-z0-9]$`
      );
    }
    if (parentDirName != null && fm.name !== parentDirName) {
      errors.push(
        `name "${fm.name}" does not match parent directory "${parentDirName}"`
      );
    }
  }

  // description: required, 1-1024 chars after trim
  if (fm.description == null || typeof fm.description !== "string") {
    errors.push("description is required");
  } else {
    const trimmed = fm.description.trim();
    if (trimmed.length === 0) {
      errors.push("description must not be empty");
    } else if (trimmed.length > 1024) {
      errors.push(
        `description exceeds 1024 characters (got ${trimmed.length})`
      );
    }
  }

  // compatibility: optional, max 500 chars
  if (fm.compatibility != null) {
    if (typeof fm.compatibility !== "string") {
      errors.push("compatibility must be a string");
    } else if (fm.compatibility.length > 500) {
      errors.push(
        `compatibility exceeds 500 characters (got ${fm.compatibility.length})`
      );
    }
  }

  // metadata: optional, must be object
  if (fm.metadata != null) {
    if (typeof fm.metadata !== "object" || Array.isArray(fm.metadata)) {
      errors.push("metadata must be an object");
    }
  }

  // allowed-tools: optional, must be string
  if (fm["allowed-tools"] != null) {
    if (typeof fm["allowed-tools"] !== "string") {
      errors.push("allowed-tools must be a string");
    }
  }

  // Validate action_map (top-level or in metadata)
  const actionMap = fm.action_map || fm.metadata?.action_map;
  if (actionMap != null) {
    if (typeof actionMap !== "object" || Array.isArray(actionMap)) {
      errors.push("action_map must be an object");
    } else {
      for (const [key, value] of Object.entries(actionMap)) {
        if (typeof value !== "object" || value === null) {
          errors.push(`action_map.${key} must be an object`);
        } else {
          const val = value as any;
          if (typeof val.tool !== "string") {
            errors.push(`action_map.${key}.tool must be a string`);
          }
          if (val.required !== undefined && typeof val.required !== "boolean") {
            errors.push(`action_map.${key}.required must be a boolean`);
          }
        }
      }
    }
  }

  // Validate narrative_fields (top-level or in metadata)
  const narrativeFields = fm.narrative_fields || fm.metadata?.narrative_fields;
  if (narrativeFields != null) {
    if (!Array.isArray(narrativeFields)) {
      errors.push("narrative_fields must be an array");
    } else {
      for (let idx = 0; idx < narrativeFields.length; idx++) {
        if (typeof narrativeFields[idx] !== "string") {
          errors.push(`narrative_fields[${idx}] must be a string`);
        }
      }
    }
  }

  // Validate compliance_weight (top-level or in metadata)
  const complianceWeight = fm.compliance_weight || fm.metadata?.compliance_weight;
  if (complianceWeight != null) {
    if (typeof complianceWeight !== "number") {
      errors.push("compliance_weight must be a number");
    }
  }

  return errors;
}

/**
 * Minimal YAML parser for flat key-value + arrays + nested objects.
 * Handles: strings, quoted strings, inline arrays ["a", "b"], numbers, null,
 * and indented nested objects (for `metadata` field).
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      i++;
      continue;
    }

    const colonIdx = trimmedLine.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmedLine.slice(0, colonIdx).trim();
    const rawValue = trimmedLine.slice(colonIdx + 1).trim();

    // Check if this is a nested object (value is empty and next lines are indented)
    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      // Look ahead for indented lines (nested object)
      const nested = collectNestedBlock(lines, i + 1);
      if (nested.lines.length > 0 && nested.isObject) {
        result[key] = parseSimpleYaml(
          nested.lines.map((l) => l.replace(/^ {2}/, "")).join("\n")
        );
        i = nested.endIndex;
        continue;
      }
      // No nested content — treat as null
      result[key] = null;
      i++;
      continue;
    }

    // Inline array: ["a", "b"]
    if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      result[key] = parseInlineArray(rawValue);
      i++;
      continue;
    }

    // Parse scalar value
    result[key] = parseScalar(rawValue);
    i++;
  }

  return result;
}

/**
 * Collect indented lines that form a nested block.
 * Returns the lines and the index after the block ends.
 */
function collectNestedBlock(
  lines: string[],
  startIndex: number
): { lines: string[]; endIndex: number; isObject: boolean } {
  const collected: string[] = [];
  let i = startIndex;
  let isObject = false;

  while (i < lines.length) {
    const line = lines[i];
    // A nested line must start with at least 2 spaces
    if (line.startsWith("  ") || line.trim() === "") {
      if (line.trim() !== "" && line.trim().includes(":")) {
        isObject = true;
      }
      collected.push(line);
      i++;
    } else {
      break;
    }
  }

  return { lines: collected, endIndex: i, isObject };
}

/**
 * Parse an inline YAML array like ["a", "b", "c"]
 */
function parseInlineArray(value: string): unknown[] {
  const inner = value.slice(1, -1);
  if (inner.trim() === "") return [];

  return inner
    .split(",")
    .map((s) => s.trim())
    .map((s) => parseScalar(s))
    .filter((s) => s !== "");
}

/**
 * Parse a scalar YAML value: string, number, boolean, null.
 */
function parseScalar(value: string): unknown {
  // null
  if (value === "null" || value === "~" || value === "") {
    return null;
  }

  // boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Quoted string
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Number (only if purely numeric, not quoted)
  if (/^\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  return value;
}
