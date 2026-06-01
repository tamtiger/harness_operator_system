import { describe, it, expect, vi, beforeEach } from "vitest";
import { sessionStart } from "./session.js";
import { getDb } from "../db/client.js";
import { readRepoConfig, createRepoConfig } from "../lib/repo-identity.js";
import { handoffRead, progressLog } from "./state.js";
import { taskList } from "./task.js";
import { skillList } from "./skill.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
  registerRepo: vi.fn(),
  updateRepoLastActive: vi.fn(),
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
      if (query.includes("SELECT id, started_at FROM sessions")) {
        return {
          all: vi.fn().mockReturnValue([{ id: "orphan-session-123", started_at: "2026-06-01T00:00:00Z" }]),
        };
      }
      return { run: mockRun };
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
      if (query.includes("SELECT id, started_at FROM sessions")) {
        return {
          all: vi.fn().mockReturnValue([]),
        };
      }
      return { run: mockRun };
    });

    const mockDb = {
      prepare: mockPrepare,
    };
    (getDb as any).mockReturnValue(mockDb);

    const result = sessionStart("/mock/repo");

    expect(result._warn).toBeUndefined();
    expect(progressLog).not.toHaveBeenCalled();
  });
});
