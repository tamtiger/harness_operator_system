/**
 * Parse and validate YAML frontmatter from SKILL.md files.
 * Compliant with agentskills.io specification.
 */
import { parseYamlString } from "./yaml-parser.js";

export type SkillStepType = "action_mappable" | "narrative_gated" | "unenforceable";

export interface SkillStep {
  id: string;
  type: SkillStepType;
  required_tool?: string;
  order?: string;
  gate_field?: string;
  blocks?: string;
  note?: string;
}

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
  action_map?: Record<string, { tool: string; required?: boolean }>; // kept for backwards compatibility during transition
  steps?: SkillStep[];
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
    const meta = parseYamlString(yamlBlock) as SkillFrontmatter;
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

  // Validate steps
  const steps = fm.steps || fm.metadata?.steps;
  if (steps != null) {
    if (!Array.isArray(steps)) {
      errors.push("steps must be an array");
    } else {
      for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx];
        if (typeof step !== "object" || step === null) {
          errors.push(`steps[${idx}] must be an object`);
          continue;
        }

        if (typeof step.id !== "string") {
          errors.push(`steps[${idx}].id must be a string`);
        }

        if (!["action_mappable", "narrative_gated", "unenforceable"].includes(step.type)) {
          errors.push(`steps[${idx}].type must be 'action_mappable', 'narrative_gated', or 'unenforceable'`);
        }

        if (step.type === "action_mappable") {
          if (typeof step.required_tool !== "string") {
            errors.push(`steps[${idx}].required_tool is required for action_mappable steps`);
          }
          if (step.order !== undefined && typeof step.order !== "string") {
            errors.push(`steps[${idx}].order must be a string`);
          }
        }

        if (step.type === "narrative_gated") {
          if (typeof step.gate_field !== "string") {
            errors.push(`steps[${idx}].gate_field is required for narrative_gated steps`);
          }
          if (step.blocks !== undefined && typeof step.blocks !== "string") {
            errors.push(`steps[${idx}].blocks must be a string`);
          }
        }
      }
    }
  }

  return errors;
}


