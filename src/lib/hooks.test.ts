import { describe, it, expect, vi } from "vitest";
import { parseHooksYaml, checkPreToolHooks, checkStopValidation, validateHooksConfig, dryRunHooks } from "./hooks.js";
import * as fs from "node:fs";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe("Hooks Parser and Enforcement", () => {
  it("parses hooks YAML correctly", () => {
    const yaml = `
pre_tool_block:
  - tool: subagent_invoke
    pattern: "rm\\s+-rf"
    message: "Destroying commands are forbidden"
  - tool: shell_run
    pattern: "\\.env"
    message: "Reading environment file is forbidden"

stop_validation:
  required_steps: [build, test, lint]
  fail_on_warning: true
`;
    const config = parseHooksYaml(yaml);
    expect(config.pre_tool_block).toHaveLength(2);
    expect(config.pre_tool_block![0].tool).toBe("subagent_invoke");
    expect(config.pre_tool_block![0].pattern).toBe("rm\\s+-rf");
    expect(config.pre_tool_block![0].message).toBe("Destroying commands are forbidden");
    expect(config.stop_validation?.required_steps).toEqual(["build", "test", "lint"]);
    expect(config.stop_validation?.fail_on_warning).toBe(true);
  });

  it("enforces pre-tool blocking rules", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
pre_tool_block:
  - tool: subagent_invoke
    pattern: "rm\\s+-rf"
    message: "Destroying commands are forbidden"
`);

    const badCheck = checkPreToolHooks(".", "subagent_invoke", { commands: ["rm -rf dist"] });
    expect(badCheck.allowed).toBe(false);
    expect(badCheck.reason).toBe("Destroying commands are forbidden");

    const goodCheck = checkPreToolHooks(".", "subagent_invoke", { commands: ["pnpm build"] });
    expect(goodCheck.allowed).toBe(true);
  });

  it("enforces stop validation checks", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
stop_validation:
  required_steps: [build, test]
`);

    const badCheck = checkStopValidation(".", {
      passed: false,
      steps_run: ["build", "test"],
      failed_step: "test",
    });
    expect(badCheck.passed).toBe(false);
    expect(badCheck.error).toContain("failed at step 'test'");

    const incompleteCheck = checkStopValidation(".", {
      passed: true,
      steps_run: ["build"],
    });
    expect(incompleteCheck.passed).toBe(false);
    expect(incompleteCheck.error).toContain("Required verify step 'test' was not run");

    const goodCheck = checkStopValidation(".", {
      passed: true,
      steps_run: ["build", "test"],
    });
    expect(goodCheck.passed).toBe(true);
  });

  it("validates hooks configuration correctly", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
pre_tool_block:
  - tool:
    pattern: "*invalid(regex"
`);

    const result = validateHooksConfig(".");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("evaluates hooks dry run correctly", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
pre_tool_block:
  - tool: subagent_invoke
    pattern: "rm\\s+-rf"
    message: "Destroying commands are forbidden"
`);

    const resultBlock = dryRunHooks(".", "subagent_invoke", { commands: ["rm -rf dist"] });
    expect(resultBlock.allowed).toBe(false);
    expect(resultBlock.preToolBlock.matched).toBe(true);
    expect(resultBlock.preToolBlock.reason).toBe("Destroying commands are forbidden");

    const resultAllow = dryRunHooks(".", "subagent_invoke", { commands: ["pnpm build"] });
    expect(resultAllow.allowed).toBe(true);
    expect(resultAllow.preToolBlock.matched).toBe(false);
  });
});
