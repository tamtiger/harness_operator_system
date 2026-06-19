import { describe, it, expect, vi, beforeEach } from "vitest";
import { aegisAnalyze, aegisPropose } from "./aegis-lite.js";
import { getDb } from "../db/client.js";
import { runTraceAnalysis } from "../lib/trace-analyzer.js";
import { checkRegressionGate } from "./instinct.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../lib/trace-analyzer.js", () => ({
  runTraceAnalysis: vi.fn(),
}));

vi.mock("./instinct.js", () => ({
  checkRegressionGate: vi.fn(),
}));

describe("AEGIS-lite Tools tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aegisAnalyze triggers trace analysis and queries analysis events", () => {
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("analysis_events")) {
        return {
          all: () => [
            { type: "repeated_failures", session_id: "s-1", task_id: "t-1", instinct_id: "i-1", payload: '{"consecutive_failures":3}' }
          ]
        };
      }
      if (query.includes("COUNT(*) as count FROM scorecards")) {
        return {
          get: () => ({ count: 15 })
        };
      }
      return {
        get: () => null,
        all: () => []
      };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = aegisAnalyze(".");
    expect(runTraceAnalysis).toHaveBeenCalled();
    expect(result.summary.total_scorecards).toBe(15);
    expect(result.signals.length).toBe(1);
    expect(result.signals[0].type).toBe("repeated_failures");
  });

  it("aegisPropose inserts a proposal and returns early validation regression check results", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation(() => ({
      run: mockRun
    }));

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);
    (checkRegressionGate as any).mockReturnValue({ passed: true, failed_checks: [] });

    const result = aegisPropose(".", "merge", ["inst-1", "inst-2"], "Merge similar rules");
    expect(checkRegressionGate).toHaveBeenCalledWith("inst-1");
    expect(checkRegressionGate).toHaveBeenCalledWith("inst-2");
    expect(result.status).toBe("pending_review");
    expect(result.gate_pre_check.passed).toBe(true);
    expect(mockRun).toHaveBeenCalled();
  });
});
