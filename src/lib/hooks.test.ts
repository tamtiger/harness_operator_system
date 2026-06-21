import { describe, it, expect, vi } from "vitest";
import { parseHooksYaml, checkPreToolHooks, checkStopValidation, validateHooksConfig, dryRunHooks } from "./hooks.js";
import * as fs from "node:fs";
import { getDb } from "../db/client.js";
import { skillLoad } from "../tools/skill.js";

vi.mock("../db/client.js", () => ({ getDb: vi.fn() }));
vi.mock("../tools/skill.js", () => ({ skillLoad: vi.fn() }));

let mockMtime = 0;
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn().mockImplementation(() => {
      mockMtime++;
      return { mtimeMs: mockMtime };
    }),
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

  it("enforces stop validation checks", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
stop_validation:
  required_steps: [build, test]
`);

    const badCheck = await checkStopValidation(".", {
      passed: false,
      steps_run: ["build", "test"],
      failed_step: "test",
    });
    expect(badCheck.passed).toBe(false);
    expect(badCheck.error).toContain("failed at step 'test'");

    const incompleteCheck = await checkStopValidation(".", {
      passed: true,
      steps_run: ["build"],
    });
    expect(incompleteCheck.passed).toBe(false);
    expect(incompleteCheck.error).toContain("Required verify step 'test' was not run");

    const goodCheck = await checkStopValidation(".", {
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

  it("evaluates hooks dry run correctly", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
pre_tool_block:
  - tool: subagent_invoke
    pattern: "rm\\s+-rf"
    message: "Destroying commands are forbidden"
`);

    const resultBlock = await dryRunHooks(".", "subagent_invoke", { commands: ["rm -rf dist"] });
    expect(resultBlock.allowed).toBe(false);
    expect(resultBlock.preToolBlock.matched).toBe(true);
    expect(resultBlock.preToolBlock.reason).toBe("Destroying commands are forbidden");

    const resultAllow = await dryRunHooks(".", "subagent_invoke", { commands: ["pnpm build"] });
    expect(resultAllow.allowed).toBe(true);
    expect(resultAllow.preToolBlock.matched).toBe(false);
  });

  it("enforces dynamic narrative-gated blocking", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false); // No config file
    
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT DISTINCT json_extract(payload, '$.args.name')")) {
           return { all: () => [{ skill_name: "test-skill" }] };
        }
        if (query.includes("SELECT COUNT(*) as count FROM audit_events")) {
           // narrative missing
           return { get: () => ({ count: 0 }) };
        }
        return { get: () => null, all: () => [] };
      })
    };
    (getDb as any).mockReturnValue(mockDb);

    (skillLoad as any).mockReturnValue({
      meta: {
        steps: [
          { type: "narrative_gated", blocks: "verify_run", gate_field: "cause" }
        ]
      }
    });

    const badCheck = checkPreToolHooks(".", "verify_run", { session_id: "sess-1" });
    expect(badCheck.allowed).toBe(false);
    expect(badCheck.reason).toContain("You must call 'skill_narrative_submit' with gate_field 'cause' before proceeding");

    const mockDbPass = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT DISTINCT json_extract(payload, '$.args.name')")) {
           return { all: () => [{ skill_name: "test-skill" }] };
        }
        if (query.includes("SELECT COUNT(*) as count FROM audit_events")) {
           return { get: () => ({ count: 1 }) }; // Narrative passed!
        }
        return { get: () => null, all: () => [] };
      })
    };
    (getDb as any).mockReturnValue(mockDbPass);
    
    const goodCheck = checkPreToolHooks(".", "verify_run", { session_id: "sess-1" });
    expect(goodCheck.allowed).toBe(true);
  });
});
