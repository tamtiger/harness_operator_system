import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerWorker, updateWorkerPid, finishWorker, listWorkers, getWorker, killWorker, cleanupExpiredWorkers } from "./worker-registry.js";
import { getDb } from "../db/client.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("./logger.js", () => ({
  log: vi.fn(),
}));

describe("worker-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a worker in the database", () => {
    const mockRun = vi.fn();
    const mockDb = {
      prepare: vi.fn().mockReturnValue({ run: mockRun }),
    };
    (getDb as any).mockReturnValue(mockDb);

    registerWorker({
      worker_id: "worker-123",
      pid: null,
      command: "echo 'hello'",
      repo_path: "/repo",
      session_id: "session-456",
      timeout_seconds: 300,
    });

    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO workers"));
    expect(mockRun).toHaveBeenCalledWith(
      "worker-123",
      null,
      expect.any(String),
      expect.any(String),
      "echo 'hello'",
      "/repo",
      "session-456"
    );
  });

  it("updates worker pid", () => {
    const mockRun = vi.fn();
    const mockDb = {
      prepare: vi.fn().mockReturnValue({ run: mockRun }),
    };
    (getDb as any).mockReturnValue(mockDb);

    updateWorkerPid("worker-123", 9999);
    expect(mockDb.prepare).toHaveBeenCalledWith("UPDATE workers SET pid = ? WHERE worker_id = ?");
    expect(mockRun).toHaveBeenCalledWith(9999, "worker-123");
  });

  it("finishes a worker", () => {
    const mockRun = vi.fn();
    const mockDb = {
      prepare: vi.fn().mockReturnValue({ run: mockRun }),
    };
    (getDb as any).mockReturnValue(mockDb);

    finishWorker("worker-123", "finished");
    expect(mockDb.prepare).toHaveBeenCalledWith("UPDATE workers SET status = ?, ended_at = ? WHERE worker_id = ?");
    expect(mockRun).toHaveBeenCalledWith("finished", expect.any(String), "worker-123");
  });
});
