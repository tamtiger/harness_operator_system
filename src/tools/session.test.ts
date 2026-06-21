import { describe, it, expect, vi, beforeEach } from "vitest";
import { sessionStart } from "./session.js";
import { getDb } from "../db/client.js";
import { readRepoConfig, createRepoConfig } from "../lib/repo-identity.js";
import { handoffRead, progressLog } from "./state.js";
import { taskList } from "./task.js";
import { skillList } from "./skill.js";
import { instinctGet } from "./instinct.js";


vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
  registerRepo: vi.fn(),
  updateRepoLastActive: vi.fn(),
  backupDatabase: vi.fn(),
}));

vi.mock("../lib/runtime.js", () => ({
  detectRuntime: vi.fn(() => ({ runtime: "node" })),
}));

vi.mock("../lib/repo-identity.js", () => ({
  readRepoConfig: vi.fn(),
  createRepoConfig: vi.fn(),
  resolveGlobalRepoPath: vi.fn(() => "/global/repo/path"),
}));

vi.mock("../lib/state-migration.js", () => ({
  migrateRepoState: vi.fn(),
}));

vi.mock("../lib/repo.js", () => ({
  ensureDir: vi.fn(),
}));

vi.mock("./state.js", () => ({
  handoffRead: vi.fn(() => ({ handoff: null })),
  progressLog: vi.fn(),
}));

vi.mock("./task.js", () => ({
  taskList: vi.fn(() => ({ tasks: [] })),
}));

vi.mock("./skill.js", () => ({
  skillList: vi.fn(() => ({ skills: [] })),
  skillSuggest: vi.fn(() => ({ suggested_skills: [], total_available: 0 })),
  skillLoad: vi.fn((name) => {
    if (name === "harness-workflow") {
      return { name: "harness-workflow", content: "# Harness Workflow content", meta: null };
    }
    return { error: "not found" };
  }),
}));

vi.mock("./instinct.js", () => ({
  instinctGet: vi.fn(() => ({ instincts: [], available_tags: [] })),
  instinctAdd: vi.fn(),
}));

describe("session start and orphan recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recovers orphaned sessions and warns user", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);

    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("ORDER BY started_at DESC")) {
        return {
          get: vi.fn().mockReturnValue(undefined),
        };
      }
      if (query.includes("SELECT") && query.includes("sessions")) {
        return {
          all: vi.fn().mockReturnValue([{ id: "orphan-session-123", started_at: "2026-06-01T00:00:00Z", pid: null, machine_id: null }]),
          get: vi.fn().mockReturnValue(undefined),
        };
      }
      return { run: mockRun, get: vi.fn().mockReturnValue(undefined) };
    });

    const mockDb = {
      prepare: mockPrepare,
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo");

    // Expect the orphaned session to be updated in DB
    expect(mockPrepare).toHaveBeenCalledWith(
      "UPDATE sessions SET status = 'orphaned', ended_at = ? WHERE id = ?"
    );
    expect(mockRun).toHaveBeenCalled();

    // Expect warning in result
    expect(result._warn).toContain("orphaned session(s) found and auto-closed");
    // Expect session progress log
    expect(progressLog).toHaveBeenCalledWith("/mock/repo", {
      summary: "1 orphaned session(s) auto-closed (IDE likely crashed)",
      status: "orphaned",
    });
  });

  it("does not warn when there are no active sessions", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);

    const mockRun = vi.fn();
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("ORDER BY started_at DESC")) {
        return {
          get: vi.fn().mockReturnValue(undefined),
        };
      }
      if (query.includes("SELECT") && query.includes("sessions")) {
        return {
          all: vi.fn().mockReturnValue([]),
          get: vi.fn().mockReturnValue(undefined),
        };
      }
      return { run: mockRun, get: vi.fn().mockReturnValue(undefined) };
    });

    const mockDb = {
      prepare: mockPrepare,
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo");

    expect(result._warn).toBeUndefined();
    expect(progressLog).not.toHaveBeenCalled();
  });

  it("includes never_again and relevant_knowledge in output", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => ({
        all: vi.fn().mockReturnValue([]),
        run: vi.fn(),
        get: vi.fn().mockReturnValue(undefined),
      })),
    };
    (getDb as any).mockReturnValue(mockDb);

    (handoffRead as any).mockReturnValue({
      handoff: { next_steps: ["fix windows paths"] }
    });

    vi.mocked(instinctGet).mockReturnValue({
      instincts: [{ id: "inst-1", description: "test lesson", type: "lesson", tags: [] } as any],
      available_tags: []
    });

    const result = sessionStart("/mock/repo");
    expect(result.never_again).toEqual([]);
    expect(result.relevant_knowledge).toEqual([
      { id: "inst-1", description: "test lesson" }
    ]);
  });

  it("handles quick start options by auto-creating task", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);
    const mockRun = vi.fn();
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => ({
        all: vi.fn().mockReturnValue([]),
        run: mockRun,
        get: vi.fn().mockReturnValue(undefined),
      })),
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo", { quick: true, quick_task_title: "My Quick Task" });
    expect(result.quick_task_id).toBeDefined();
    expect(progressLog).toHaveBeenCalledWith("/mock/repo", {
      task_id: result.quick_task_id,
      summary: "Started quick modification: My Quick Task",
      status: "in-progress",
    });
  });

  it("returns harness-workflow content and checklist by default", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("sessions") && query.includes("SELECT")) {
          // Mock lastSession query returning undefined (no previous session)
          return {
            get: vi.fn().mockReturnValue(undefined),
            all: vi.fn().mockReturnValue([]),
          };
        }
        return {
          all: vi.fn().mockReturnValue([]),
          run: vi.fn(),
          get: vi.fn().mockReturnValue({ id: "task-1", title: "fix compilation issue", scope: "*" }),
        };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo");
    expect(result.workflow_content).toBe("# Harness Workflow content");
    expect(result.workflow_state.action_queue).toBeDefined();
    // Since task is "fix compilation issue", it should be a bugfix checklist
    expect(result.workflow_state.action_queue?.[0]).toContain("systematic-diagnosis");
  });

  it("skips harness-workflow content when skip_workflow_content is true explicitly", () => {
    const mockConfig = { repo_id: "repo-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => ({
        all: vi.fn().mockReturnValue([]),
        run: vi.fn(),
        get: vi.fn().mockReturnValue(undefined),
      })),
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo", { skip_workflow_content: true });
    expect(result.workflow_content).toBeNull();
    expect(result.workflow_state.action_queue).toBeDefined();
    // Default checklist
    expect(result.workflow_state.action_queue?.[0]).toContain("Verify requirements");
  });
});

