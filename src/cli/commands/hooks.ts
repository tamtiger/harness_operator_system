import { resolve } from "node:path";
import { loadHooksConfig, validateHooksConfig, dryRunHooks } from "../../lib/hooks.js";
import { getFlag, hasFlag } from "./utils.js";

export async function cmdHooks() {
  const repoPath = resolve(getFlag("repo") || ".");
  const validateFlag = hasFlag("validate");
  const dryRunFlag = hasFlag("dry-run");

  if (validateFlag) {
    console.log(`\nValidating hooks config for: ${repoPath}`);
    const result = validateHooksConfig(repoPath);
    if (result.valid) {
      console.log(`  ✓ hooks.yaml is valid.\n`);
      process.exit(0);
    } else {
      console.error(`  ✗ hooks.yaml validation failed:`);
      for (const err of result.errors) {
        console.error(`    - ${err}`);
      }
      console.error("");
      process.exit(1);
    }
  }

  if (dryRunFlag) {
    const tool = getFlag("tool");
    const toolArgsStr = getFlag("args") || "{}";
    if (!tool) {
      console.error(`  ✗ Usage: harness hooks --dry-run --tool <tool_name> [--args 'JSON_STRING']\n`);
      process.exit(1);
    }
    let toolArgs: Record<string, unknown> = {};
    try {
      toolArgs = JSON.parse(toolArgsStr);
    } catch (err: any) {
      console.error(`  ✗ Failed to parse JSON args: ${err.message}\n`);
      process.exit(1);
    }

    console.log(`\nEvaluating hooks (dry-run) for tool '${tool}' with args: ${JSON.stringify(toolArgs)}`);
    const result = await dryRunHooks(repoPath, tool, toolArgs);

    if (result.preToolBlock.matched) {
      console.log(`\nHook: pre-tool-block`);
      console.log(`  Rule matched: tool=${result.preToolBlock.rule?.tool}, pattern=${result.preToolBlock.rule?.pattern || "(always)"}`);
      console.log(`  Match against args: YES`);
    } else {
      console.log(`\nHook: pre-tool-block`);
      console.log(`  Match against args: NO`);
    }

    if (result.stopValidation !== undefined) {
      console.log(`\nHook: stop-validation`);
      console.log(`  Would block session_end: ${result.stopValidation.wouldBlock ? "YES" : "NO"}`);
      if (result.stopValidation.wouldBlock) {
        console.log(`  Reason: ${result.stopValidation.reason}`);
      }
    }

    console.log(`\nResult: ${result.allowed ? "WOULD ALLOW" : "WOULD BLOCK"} tool execution\n`);
    process.exit(result.allowed ? 0 : 1);
  }

  // Default: list hooks
  console.log(`\n=== Active Hooks Rules for ${repoPath} ===\n`);
  const config = loadHooksConfig(repoPath);
  if (!config) {
    console.log("  (no hooks configuration found or file missing)\n");
    return;
  }

  if (config.pre_tool_block && config.pre_tool_block.length > 0) {
    console.log("  [Pre-Tool Block Rules]");
    for (const rule of config.pre_tool_block) {
      console.log(`    - Tool:    ${rule.tool}`);
      if (rule.pattern) console.log(`      Pattern: ${rule.pattern}`);
      if (rule.message) console.log(`      Message: ${rule.message}`);
    }
    console.log("");
  }

  if (config.stop_validation) {
    console.log("  [Stop Validation Config]");
    if (config.stop_validation.required_steps) {
      console.log(`    Required verify steps: [${config.stop_validation.required_steps.join(", ")}]`);
    }
    if (config.stop_validation.fail_on_warning !== undefined) {
      console.log(`    Fail on warning:       ${config.stop_validation.fail_on_warning}`);
    }
    console.log("");
  }
}
