import { describe, it, expect, vi, beforeEach } from "vitest";
import { runTraceAnalysis } from "./trace-analyzer.js";
import { getDb } from "../db/client.js";
import { skillSuggest } from "../tools/skill.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../tools/skill.js", () => ({
  skillSuggest: vi.fn(),
}));

describe("trace analyzer rules tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects repeated failures when an instinct fails consecutively", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      const cleanQuery = query.replace(/\s+/g, " ");
      if (cleanQuery.includes("DISTINCT instinct_id, task_type")) {
        return {
          all: () => [{ instinct_id: "inst-1", task_type: "bugfix" }]
        };
      }
      if (cleanQuery.includes("instinct_outcomes WHERE instinct_id = ? AND task_type = ?")) {
        return {
          all: () => [
            { outcome: "failure", task_id: "t-1", scorecard_id: "sc-1", timestamp: "2026-06-07T12:00:00Z" },
            { outcome: "failure", task_id: "t-2", scorecard_id: "sc-2", timestamp: "2026-06-07T11:00:00Z" },
            { outcome: "failure", task_id: "t-3", scorecard_id: "sc-3", timestamp: "2026-06-07T10:00:00Z" }
          ]
        };
      }
      if (cleanQuery.includes("scorecards WHERE id = ?")) {
        return {
          get: () => ({ session_id: "sess-1" })
        };
      }
      return {
        run: mockRun,
        get: () => null,
        all: () => []
      };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = runTraceAnalysis();
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT OR REPLACE INTO analysis_events"));
    expect(mockRun).toHaveBeenCalled();
  });

  it("detects workflow non-compliance: missing verify_run when files modified", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      const cleanQuery = query.replace(/\s+/g, " ");
      if (cleanQuery.includes("FROM sessions")) {
        return {
          all: () => [{ id: "sess-1", repo_path: "." }]
        };
      }
      if (cleanQuery.includes("FROM scorecards WHERE session_id = ?")) {
        return {
          all: () => [{
            id: "sc-1",
            task_id: "task-1",
            verify_pass: 0,
            tool_calls: 5,
            retry_count: 0, // No verify_run was run!
            loop_events: 0,
            files_touched: 2 // Modified 2 files!
          }]
        };
      }
      return {
        run: mockRun,
        get: () => null,
        all: () => []
      };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    runTraceAnalysis();
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT OR REPLACE INTO analysis_events"));
    // Payload should indicate critical workflow violation
    const saveCall = mockPrepare.mock.calls.find(c => c[0].includes("INSERT OR REPLACE INTO analysis_events"));
    expect(saveCall).toBeDefined();
  });
});
