import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordScorecard } from "./scorecard.js";
import { checkRegressionGate } from "../tools/instinct.js";
import { getDb } from "../db/client.js";
import { readEvidence } from "./evidence.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("./evidence.js", () => ({
  readEvidence: vi.fn(),
}));

vi.mock("../tools/instinct.js", () => ({
  checkRegressionGate: vi.fn().mockReturnValue({ passed: true, failed_checks: [] }),
  instinctPromote: vi.fn(),
}));

describe("scorecard recording and regression gate tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully records scorecard when task has evidence", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("sessions WHERE id = ?")) {
        return {
          get: () => ({
            repo_path: ".",
            started_at: "2026-06-07T12:00:00Z",
            ended_at: "2026-06-07T12:10:00Z",
            variant_id: "coding-strict",
            verify_called: 1,
          })
        };
      }
      if (query.includes("tasks WHERE session_id = ?")) {
        return {
          all: () => [{ id: "task-123", task_type: "feature", title: "Add auth screen", status: "done" }]
        };
      }
      if (query.includes("audit_events")) {
        return {
          get: () => ({ count: 5 }),
          all: () => []
        };
      }
      if (query.includes("session_instinct_refs WHERE session_id = ?")) {
        return {
          all: () => [{ instinct_id: "inst-456", outcome: null }]
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
    (readEvidence as any).mockReturnValue({ passed: true });

    recordScorecard("session-123");

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO scorecards"));
    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT OR REPLACE INTO instinct_outcomes"));
  });
});
