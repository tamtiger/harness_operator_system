import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskCreate, taskUpdate } from "./task.js";
import { getDb } from "../db/client.js";
import { skillSuggest } from "./skill.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../lib/runtime.js", () => ({
  detectRuntime: vi.fn(() => ({ runtime: "node" })),
}));

vi.mock("./skill.js", () => ({
  skillSuggest: vi.fn(() => ({
    suggested_skills: [
      { name: "tdd-workflow", tier: 2, score: 2.5 },
      { name: "code-review-workflow", tier: 2, score: 1.2 }
    ],
    total_available: 2
  })),
}));

describe("task tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("taskCreate saves task, sets phase to SELECT and returns suggestions", () => {
    const mockRun = vi.fn();
    const mockGet = vi.fn().mockReturnValue({ repo_path: "/mock/repo" });
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("SELECT repo_path")) {
        return { get: mockGet };
      }
      return { run: mockRun };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = taskCreate("Implement payment gateway", "*", "session-123");

    expect(result.task_id).toBeDefined();
    expect(result.suggested_skills).toEqual([
      { name: "tdd-workflow", score: 2.5 },
      { name: "code-review-workflow", score: 1.2 }
    ]);
    expect(result.workflow_guidance.current_phase).toBe("SELECT");
    expect(mockPrepare).toHaveBeenCalledWith(
      "UPDATE sessions SET current_phase = 'SELECT' WHERE id = ?"
    );
    expect(mockRun).toHaveBeenCalled();
  });

  it("taskUpdate updates task status and transitions session phase to EXECUTE", () => {
    const mockRun = vi.fn();
    const mockGet = vi.fn().mockReturnValue({ session_id: "session-123" });
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("SELECT session_id")) {
        return { get: mockGet };
      }
      return { run: mockRun };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = taskUpdate("task-123", "in-progress");

    expect(result.status).toBe("in-progress");
    expect(result.workflow_guidance?.current_phase).toBe("EXECUTE");
    expect(mockPrepare).toHaveBeenCalledWith(
      "UPDATE sessions SET current_phase = 'EXECUTE' WHERE id = ?"
    );
  });

  it("taskUpdate to done recommends verify_run step", () => {
    const mockRun = vi.fn();
    const mockGet = vi.fn().mockReturnValue({ session_id: "session-123" });
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("SELECT session_id")) {
        return { get: mockGet };
      }
      return { run: mockRun };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = taskUpdate("task-123", "done");

    expect(result.status).toBe("done");
    expect(result.workflow_guidance?.current_phase).toBe("EXECUTE");
    expect(result.workflow_guidance?.next_action).toContain("verify_run()");
  });
});
