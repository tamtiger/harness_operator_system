import { describe, it, expect, vi, beforeEach } from "vitest";
import { reflectionRun } from "./reflection.js";
import { getDb } from "../db/client.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

describe("reflectionRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts raw metrics and error patterns from session events", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("SELECT event_type, payload, created_at")) {
        return {
          all: vi.fn().mockReturnValue([
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 100 }),
              created_at: "2026-06-07T12:00:00Z"
            },
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 150 }),
              created_at: "2026-06-07T12:01:00Z"
            },
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 100 }),
              created_at: "2026-06-07T12:02:00Z"
            },
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 100 }),
              created_at: "2026-06-07T12:03:00Z"
            },
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 100 }),
              created_at: "2026-06-07T12:04:00Z"
            },
            {
              event_type: "tool_success",
              payload: JSON.stringify({ session_id: "session-123", tool: "code_search_grep", duration_ms: 100 }),
              created_at: "2026-06-07T12:05:00Z"
            },
            {
              event_type: "tool_error",
              payload: JSON.stringify({ session_id: "session-123", tool: "verify_run", error: "compile error in main.ts", duration_ms: 2000 }),
              created_at: "2026-06-07T12:06:00Z"
            }
          ])
        };
      }
      return { run: mockRun };
    });

    const mockDb = {
      prepare: mockPrepare,
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = reflectionRun("session-123", "task-abc", "task_complete");

    expect(result.reflection_id).toBeDefined();
    expect(result.metrics.total_tool_calls).toBe(7);
    expect(result.metrics.errors_count).toBe(1);
    expect(result.metrics.duration_seconds).toBe(3); // 2700 ms / 1000 => 3s
    expect(result.metrics.repeated_tool_calls.code_search_grep).toBe(6);
    expect(result.metrics.failed_tools[0]).toEqual({
      tool: "verify_run",
      error: "compile error in main.ts",
      count: 1
    });
    expect(result.suggested_topics).toContain("verify_run failure: compile error in main.ts");
    expect(result.suggested_topics).toContain("high frequency of code_search_grep");

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO reflections"));
    expect(mockRun).toHaveBeenCalled();
  });
});
