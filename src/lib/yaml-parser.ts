import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { z } from "zod";

// Zod schemas for validation
export const verifyConfigSchema = z.object({
  runtime: z.string().optional(),
  commands: z.object({
    install: z.string().nullable().optional(),
    build: z.string().nullable().optional(),
    test: z.string().nullable().optional(),
    lint: z.string().nullable().optional(),
    typecheck: z.string().nullable().optional(),
    security_audit: z.string().nullable().optional(),
    simplify: z.string().nullable().optional(),
  }).optional(),
  timeouts: z.object({
    build: z.number().optional(),
    test: z.number().optional(),
    lint: z.number().optional(),
  }).optional(),
  optional: z.object({
    install: z.boolean().optional(),
    build: z.boolean().optional(),
    test: z.boolean().optional(),
    lint: z.boolean().optional(),
    typecheck: z.boolean().optional(),
    security_audit: z.boolean().optional(),
    simplify: z.boolean().optional(),
  }).optional(),
});

export const scopeYamlSchema = z.object({
  forbidden_paths: z.array(z.string()).optional(),
  allowed_per_task: z.record(
    z.string(),
    z.union([
      z.array(z.string()),
      z.object({
        paths: z.array(z.string()).optional(),
        definition_of_done: z.array(z.string()).optional(),
      }),
    ])
  ).optional(),
});

export const hookBlockRuleSchema = z.object({
  tool: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});

export const hooksConfigSchema = z.object({
  pre_tool_block: z.array(hookBlockRuleSchema).optional(),
  stop_validation: z.object({
    required_steps: z.array(z.string()).optional(),
    fail_on_warning: z.boolean().optional(),
  }).optional(),
});

/**
 * Pre-processes YAML string to escape unescaped backslashes in double quotes.
 */
export function sanitizeYamlString(content: string): string {
  // Replace double-quoted substrings to double-escape backslashes if not valid escape sequence
  return content.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    return match.replace(/\\(?![0abtnvfr"\\xNuU_LP])/g, "\\\\");
  });
}

/**
 * Parses a YAML string into a JS object.
 */
export function parseYamlString(content: string): any {
  const sanitized = sanitizeYamlString(content);
  return yaml.load(sanitized);
}

/**
 * Reads a YAML file and parses it.
 */
export function parseYamlFile(filePath: string): any {
  const content = readFileSync(filePath, "utf-8");
  return parseYamlString(content);
}

/**
 * Validates and normalizes verify.yaml config.
 */
export function validateVerifyYaml(content: string): any {
  const raw = parseYamlString(content) || {};
  
  // Sanitization: clean up non-numeric timeouts so Zod doesn't fail the whole block
  if (raw.timeouts && typeof raw.timeouts === "object") {
    for (const [key, val] of Object.entries(raw.timeouts)) {
      if (typeof val !== "number") {
        delete raw.timeouts[key];
      }
    }
  }

  const parsed = verifyConfigSchema.parse(raw);
  
  // Convert timeouts from seconds to milliseconds
  if (parsed.timeouts) {
    const timeouts: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed.timeouts)) {
      if (typeof val === "number") {
        timeouts[key] = val * 1000;
      }
    }
    parsed.timeouts = timeouts;
  }
  
  return parsed;
}

/**
 * Validates scope.yaml config.
 */
export function validateScopeYaml(content: string): any {
  const raw = parseYamlString(content) || {};
  return scopeYamlSchema.parse(raw);
}

/**
 * Validates hooks.yaml config.
 */
export function validateHooksYaml(content: string): any {
  const raw = parseYamlString(content) || {};
  return hooksConfigSchema.parse(raw);
}
