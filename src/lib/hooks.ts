import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyRun } from "../tools/verify.js";
import { log } from "./logger.js";
import { getDb } from "../db/client.js";
import { skillLoad } from "../tools/skill.js";

import { validateHooksYaml } from "./yaml-parser.js";

export interface HookBlockRule {
  tool: string;
  pattern?: string; // string or regex pattern to search inside args
  message?: string;
}

export interface HooksConfig {
  pre_tool_block?: HookBlockRule[];
  stop_validation?: {
    required_steps?: string[];
    fail_on_warning?: boolean;
  };
}

/**
 * Parses hooks.yaml using the consolidated yaml parser.
 */
export function parseHooksYaml(content: string): HooksConfig {
  try {
    const parsed = validateHooksYaml(content);
    return {
      pre_tool_block: parsed.pre_tool_block || [],
      stop_validation: parsed.stop_validation || { required_steps: [] },
    };
  } catch (err: any) {
    // Return empty configuration on failure to match legacy parser behavior
    return { pre_tool_block: [] };
  }
}

const cachedHooks = new Map<string, { config: HooksConfig | null; mtimeMs: number }>();

/**
 * Load hooks configuration from .harness/hooks.yaml
 */
export function loadHooksConfig(repoPath: string): HooksConfig | null {
  const configFile = join(resolve(repoPath), ".harness", "hooks.yaml");
  if (!existsSync(configFile)) {
    cachedHooks.delete(configFile);
    return null;
  }

  try {
    const stats = statSync(configFile);
    const cached = cachedHooks.get(configFile);
    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.config;
    }

    const content = readFileSync(configFile, "utf-8");
    const config = parseHooksYaml(content);
    cachedHooks.set(configFile, { config, mtimeMs: stats.mtimeMs });
    return config;
  } catch (err: any) {
    log("error", `Failed to read hooks configuration: ${err.message}`);
    return null;
  }
}

/**
 * Check if the tool execution is allowed by pre-tool block hooks
 */
export function checkPreToolHooks(
  repoPath: string,
  toolName: string,
  args: Record<string, unknown>
): { allowed: boolean; reason?: string } {
  const config = loadHooksConfig(repoPath);
  const argsStr = JSON.stringify(args);

  if (config && config.pre_tool_block) {
    for (const rule of config.pre_tool_block) {
      if (rule.tool === toolName || rule.tool === "*") {
        if (rule.pattern) {
          const regex = new RegExp(rule.pattern, "i");
          if (regex.test(argsStr)) {
            return {
              allowed: false,
              reason: rule.message || `Tool '${toolName}' call blocked by hook rule matching pattern '${rule.pattern}'`,
            };
          }
        } else {
          // Block always
          return {
            allowed: false,
            reason: rule.message || `Tool '${toolName}' call blocked by hook rule`,
          };
        }
      }
    }
  }

  // Dynamic Narrative-Gated Blocking
  try {
    const sessionId = (args.session_id as string) || getActiveSessionId(repoPath);
    if (sessionId) {
      const db = getDb();
      const skillEvents = db.prepare(`
        SELECT DISTINCT json_extract(payload, '$.args.name') as skill_name
        FROM audit_events
        WHERE json_extract(payload, '$.session_id') = ?
          AND event_type = 'tool_success'
          AND json_extract(payload, '$.tool') = 'skill_load'
      `).all(sessionId) as Array<{ skill_name: string | null }>;
      
      const skillsLoaded = Array.from(new Set(skillEvents.map(e => e.skill_name).filter((n): n is string => typeof n === "string")));
      
      for (const skillName of skillsLoaded) {
        const loaded = skillLoad(skillName, repoPath);
        if (!loaded || "error" in loaded) continue;
        
        const steps = loaded.meta?.steps || loaded.meta?.metadata?.steps;
        if (Array.isArray(steps)) {
          for (const step of steps) {
            if (step.type === "narrative_gated" && step.blocks === toolName && step.gate_field) {
              const narrativeRow = db.prepare(`
                SELECT COUNT(*) as count FROM audit_events
                WHERE json_extract(payload, '$.session_id') = ?
                  AND event_type = 'tool_success'
                  AND json_extract(payload, '$.tool') = 'skill_narrative_submit'
                  AND json_extract(payload, '$.args.field') = ?
              `).get(sessionId, step.gate_field) as { count: number };
              
              if (narrativeRow.count === 0) {
                return {
                  allowed: false,
                  reason: `Action '${toolName}' is blocked by skill '${skillName}'. You must call 'skill_narrative_submit' with gate_field '${step.gate_field}' before proceeding.`,
                };
              }
            }
          }
        }
      }
    }
  } catch (err) {
    // Ignore DB errors during evaluation
  }

  return { allowed: true };
}

function getActiveSessionId(repoPath: string): string | null {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT id FROM sessions
      WHERE repo_path = ? AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `).get(repoPath) as { id: string } | undefined;
    return row?.id || null;
  } catch {
    return null;
  }
}

/**
 * Execute stop validation check, confirming that required verify steps pass before closing session.
 */
export async function checkStopValidation(
  repoPath: string,
  lastVerifyStatus?: { passed: boolean; steps_run: string[]; failed_step?: string; output?: string }
): Promise<{ passed: boolean; error?: string }> {
  const config = loadHooksConfig(repoPath);
  if (!config || !config.stop_validation) return { passed: true };

  const { required_steps = [], fail_on_warning = false } = config.stop_validation;
  if (required_steps.length === 0 && !fail_on_warning) return { passed: true };

  // If no verify run yet, run one automatically or fail
  let verify = lastVerifyStatus;
  if (!verify) {
    log("info", "No recent verify status found. Running automatic verify for validation.");
    try {
      const res = await verifyRun(repoPath);
      verify = {
        passed: res.passed,
        steps_run: res.steps_run,
        failed_step: res.step_results.find(r => !r.passed)?.name,
        output: res.output,
      };
    } catch (err: any) {
      return {
        passed: false,
        error: `Stop validation failed: Unable to run automatic verification: ${err.message}`,
      };
    }
  }

  // Check required steps are present and passed
  const stepsRan = new Set(verify.steps_run);
  for (const step of required_steps) {
    if (!stepsRan.has(step)) {
      return {
        passed: false,
        error: `Stop validation failed: Required verify step '${step}' was not run.`,
      };
    }
  }

  if (!verify.passed) {
    return {
      passed: false,
      error: `Stop validation failed: Verify failed at step '${verify.failed_step || "unknown"}'. Please fix the errors before ending the session.`,
    };
  }

  // Handle fail_on_warning
  if (fail_on_warning && verify.output) {
    const hasWarnings = /warning/i.test(verify.output) && !/0 warnings/i.test(verify.output);
    if (hasWarnings) {
      return {
        passed: false,
        error: `Stop validation failed: Warnings were detected in verify output and fail_on_warning is enabled.`,
      };
    }
  }

  return { passed: true };
}

/**
 * Validate hooks config file syntax and regex validity.
 */
export function validateHooksConfig(repoPath: string): { valid: boolean; errors: string[] } {
  const configFile = join(resolve(repoPath), ".harness", "hooks.yaml");
  if (!existsSync(configFile)) {
    return { valid: false, errors: ["hooks.yaml does not exist in .harness/"] };
  }

  const errors: string[] = [];
  try {
    const content = readFileSync(configFile, "utf-8");
    const config = parseHooksYaml(content);

    if (config.pre_tool_block) {
      config.pre_tool_block.forEach((rule, idx) => {
        if (!rule.tool) {
          errors.push(`Rule #${idx + 1} under pre_tool_block: missing 'tool' field.`);
        }
        if (rule.pattern) {
          try {
            new RegExp(rule.pattern);
          } catch (err: any) {
            errors.push(`Rule #${idx + 1} under pre_tool_block: invalid pattern regex '${rule.pattern}': ${err.message}`);
          }
        }
      });
    }
  } catch (err: any) {
    errors.push(`Failed to parse hooks.yaml: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface HookDryRunResult {
  allowed: boolean;
  preToolBlock: {
    matched: boolean;
    rule?: HookBlockRule;
    reason?: string;
  };
  stopValidation?: {
    wouldBlock: boolean;
    reason?: string;
  };
}

/**
 * Perform dry-run evaluation of hooks for a given tool call.
 */
export async function dryRunHooks(
  repoPath: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<HookDryRunResult> {
  const result: HookDryRunResult = {
    allowed: true,
    preToolBlock: { matched: false },
  };

  // Evaluate pre-tool block + dynamic gates
  const preCheck = checkPreToolHooks(repoPath, toolName, args);
  if (!preCheck.allowed) {
    result.allowed = false;
    result.preToolBlock = {
      matched: true,
      reason: preCheck.reason,
    };
  }

  // Evaluate stop validation if the tool is session_end or session_handoff
  if (toolName === "session_end" || toolName === "session_handoff") {
    const stopVal = await checkStopValidation(repoPath);
    if (!stopVal.passed) {
      result.allowed = false;
      result.stopValidation = {
        wouldBlock: true,
        reason: stopVal.error,
      };
    } else {
      result.stopValidation = {
        wouldBlock: false,
      };
    }
  }

  return result;
}
