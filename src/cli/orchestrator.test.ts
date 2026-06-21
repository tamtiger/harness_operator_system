import { describe, it, expect, vi, beforeEach } from "vitest";
import { runOrchestrate } from "./orchestrator.js";
import * as verifyTool from "../tools/verify.js";
import * as fs from "node:fs";

vi.mock("../tools/verify.js", () => ({
  verifyRun: vi.fn(),
  STEP_ORDER: ["install", "build", "test", "lint", "typecheck", "security_audit", "simplify"],
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    writeFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false),
  };
});

describe("Ralph Loop Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes successfully on first iteration if verify passes", async () => {
    vi.mocked(verifyTool.verifyRun).mockImplementation(async () => {
      try {
        const { getDb } = await import("../db/client.js");
        const db = getDb();
        db.prepare("UPDATE sessions SET verify_passed = 1, verify_called = 1").run();
      } catch {}
      return {
        passed: true,
        output: "Verify passed",
        steps_run: ["build", "test"],
        step_results: [
          { name: "build", passed: true, output: "", duration_ms: 10 },
          { name: "test", passed: true, output: "", duration_ms: 20 }
        ]
      };
    });

    const result = await runOrchestrate("Build main binary", {
      repoPath: ".",
      maxLoops: 3,
      steps: ["build", "test"]
    });

    expect(result.success).toBe(true);
    expect(result.loops_run).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("retries up to maxLoops and fails if verify always fails", async () => {
    vi.mocked(verifyTool.verifyRun).mockResolvedValue({
      passed: false,
      output: "Verify failed",
      steps_run: ["build"],
      step_results: [
        { name: "build", passed: false, output: "Error", duration_ms: 10 }
      ]
    });

    const result = await runOrchestrate("Broken build task", {
      repoPath: ".",
      maxLoops: 3,
      steps: ["build"]
    });

    expect(result.success).toBe(false);
    expect(result.loops_run).toBe(3);
    expect(result.error).toContain("Verification failed at step: build");
  });
});
