import { describe, it, expect, vi, beforeEach } from "vitest";
import { instinctAdd, instinctGet } from "./instinct.js";
import { getDb } from "../db/client.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

describe("instinct tool modifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves type, context, resolution, and review_trigger via instinctAdd", () => {
    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockReturnValue({ run: mockRun });
    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    instinctAdd(
      "use vitest instead of jest",
      ["testing", "vitest"],
      0.8,
      30,
      "decision",
      JSON.stringify({ task_id: "123" }),
      "agreed to migrate",
      "when framework changes"
    );

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO instincts"));
    expect(mockRun).toHaveBeenCalledWith(
      expect.any(String),
      "use vitest instead of jest",
      JSON.stringify(["testing", "vitest"]),
      0.8,
      30,
      expect.any(String),
      "decision",
      JSON.stringify({ task_id: "123" }),
      "agreed to migrate",
      "when framework changes"
    );
  });

  it("filters by type and query in instinctGet", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT * FROM instincts")) {
          return {
            all: vi.fn().mockReturnValue([
              {
                id: "1",
                description: "use vitest for test files",
                tags: JSON.stringify(["test", "vitest"]),
                confidence: 0.9,
                ttl_days: null,
                created_at: "2026-06-07T12:00:00Z",
                success_count: 1,
                failure_count: 0,
                reference_count: 1,
                last_outcome: "success",
                last_referenced_at: "2026-06-07T12:00:00Z",
                type: "decision",
                context: null,
                resolution: null,
                review_trigger: null
              },
              {
                id: "2",
                description: "podman volume mounts fail on windows path with spaces",
                tags: JSON.stringify(["windows", "podman"]),
                confidence: 0.8,
                ttl_days: null,
                created_at: "2026-06-07T12:01:00Z",
                success_count: 0,
                failure_count: 0,
                reference_count: 0,
                last_outcome: null,
                last_referenced_at: null,
                type: "lesson",
                context: null,
                resolution: null,
                review_trigger: null
              }
            ])
          };
        }
        if (query.includes("SELECT tags FROM instincts")) {
          return {
            all: vi.fn().mockReturnValue([])
          };
        }
        return { run: vi.fn() };
      })
    };
    (getDb as any).mockReturnValue(mockDb);

    // 1. Get with type filter
    const resType = instinctGet(undefined, undefined, undefined, ["lesson"]);
    expect(resType.instincts).toHaveLength(1);
    expect(resType.instincts[0].id).toBe("2");

    // 2. Get with fuzzy query matching
    const resQuery = instinctGet(undefined, undefined, undefined, undefined, "windows volume mount");
    expect(resQuery.instincts).toHaveLength(1);
    expect(resQuery.instincts[0].id).toBe("2");
  });
});
