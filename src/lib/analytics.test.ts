import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReport } from "./analytics.js";
import { getDb } from "../db/client.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("./tool-context.js", () => ({
  resolveToolContext: vi.fn(() => ({ repo_id: "repo-123" })),
}));

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates reports correctly", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("FROM audit_events")) {
          return {
            all: vi.fn().mockReturnValue([
              {
                event_type: "tool_success",
                payload: JSON.stringify({ tool: "verify_run", duration_ms: 5000, repo_id: "repo-123" }),
                created_at: new Date().toISOString(),
              },
              {
                event_type: "tool_error",
                payload: JSON.stringify({ tool: "verify_run", duration_ms: 10000, error: "fail", repo_id: "repo-123" }),
                created_at: new Date().toISOString(),
              },
              {
                event_type: "loop_blocked",
                payload: JSON.stringify({ tool: "verify_run", duration_ms: 100, repo_id: "repo-123" }),
                created_at: new Date().toISOString(),
              },
            ]),
          };
        }
        if (query.includes("FROM sessions")) {
          return {
            all: vi.fn().mockReturnValue([
              { id: "session-1", status: "closed", repo_path: ".", started_at: new Date().toISOString() },
            ]),
          };
        }
        if (query.includes("FROM workers")) {
          return {
            all: vi.fn().mockReturnValue([]),
          };
        }
        return { all: vi.fn().mockReturnValue([]) };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const report = generateReport({ period: "7d", repoPath: "." });

    expect(report.period).toBe("7d");
    expect(report.total_tool_calls).toBe(2);
    expect(report.tool_usage).toHaveLength(1);
    expect(report.tool_usage[0].calls).toBe(2);
    expect(report.tool_usage[0].success).toBe(1);
    expect(report.tool_usage[0].error).toBe(1);
    expect(report.tool_usage[0].blocked).toBe(1);
    expect(report.tool_latency[0].p50).toBe(10);
    expect(report.tool_latency[0].p95).toBe(10);
  });
});
