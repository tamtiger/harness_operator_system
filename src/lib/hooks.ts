import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyRun } from "../tools/verify.js";
import { log } from "./logger.js";

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
 * Super simple YAML parser to parse .harness/hooks.yaml without adding external dependencies.
 */
export function parseHooksYaml(content: string): HooksConfig {
  const config: HooksConfig = { pre_tool_block: [] };
  const lines = content.split("\n");
  let currentSection = "";
  let currentBlockItem: HookBlockRule | null = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = trimmed.length - trimmed.trimStart().length;
    const stripped = trimmed.trim();

    if (indent === 0 && stripped.endsWith(":")) {
      currentSection = stripped.slice(0, -1);
      if (currentSection === "stop_validation") {
        config.stop_validation = { required_steps: [] };
      }
      continue;
    }

    if (currentSection === "pre_tool_block") {
      if (stripped.startsWith("-")) {
        if (currentBlockItem) {
          config.pre_tool_block!.push(currentBlockItem);
        }
        currentBlockItem = { tool: "" };
        const contentAfterDash = stripped.slice(1).trim();
        if (contentAfterDash.includes(":")) {
          const [key, ...rest] = contentAfterDash.split(":");
          const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
          const cleanKey = key.trim();
          if (cleanKey === "tool") currentBlockItem.tool = val;
          if (cleanKey === "pattern") currentBlockItem.pattern = val;
          if (cleanKey === "message") currentBlockItem.message = val;
        }
      } else if (stripped.includes(":") && currentBlockItem) {
        const [key, ...rest] = stripped.split(":");
        const val = rest.join(":").trim().replace(/^["']|["']$/g, "");
        const cleanKey = key.trim();
        if (cleanKey === "tool") currentBlockItem.tool = val;
        if (cleanKey === "pattern") currentBlockItem.pattern = val;
        if (cleanKey === "message") currentBlockItem.message = val;
      }
    }

    if (currentSection === "stop_validation" && config.stop_validation) {
      if (stripped.startsWith("required_steps:")) {
        // inline list like [test, lint]
        const val = stripped.split("required_steps:")[1].trim().replace(/^\[|\]$/g, "");
        config.stop_validation.required_steps = val ? val.split(",").map(s => s.trim()) : [];
      } else if (stripped.startsWith("fail_on_warning:")) {
        const val = stripped.split("fail_on_warning:")[1].trim();
        config.stop_validation.fail_on_warning = val === "true";
      }
    }
  }

  if (currentBlockItem) {
    config.pre_tool_block!.push(currentBlockItem);
  }

  return config;
}

/**
 * Load hooks configuration from .harness/hooks.yaml
 */
export function loadHooksConfig(repoPath: string): HooksConfig | null {
  const configFile = join(resolve(repoPath), ".harness", "hooks.yaml");
  if (!existsSync(configFile)) return null;

  try {
    const content = readFileSync(configFile, "utf-8");
    return parseHooksYaml(content);
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
  if (!config || !config.pre_tool_block) return { allowed: true };

  const argsStr = JSON.stringify(args);

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

  return { allowed: true };
}

/**
 * Execute stop validation check, confirming that required verify steps pass before closing session.
 */
export function checkStopValidation(
  repoPath: string,
  lastVerifyStatus?: { passed: boolean; steps_run: string[]; failed_step?: string; output?: string }
): { passed: boolean; error?: string } {
  const config = loadHooksConfig(repoPath);
  if (!config || !config.stop_validation) return { passed: true };

  const { required_steps = [], fail_on_warning = false } = config.stop_validation;
  if (required_steps.length === 0 && !fail_on_warning) return { passed: true };

  // If no verify run yet, run one automatically or fail
  let verify = lastVerifyStatus;
  if (!verify) {
    log("info", "No recent verify status found. Running automatic verify for validation.");
    try {
      const res = verifyRun(repoPath);
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
