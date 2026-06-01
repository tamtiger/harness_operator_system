import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveToolContext } from "./tool-context.js";
import { readRepoConfig } from "./repo-identity.js";
import { getDb } from "../db/client.js";

// Mock dependencies
vi.mock("./repo-identity.js", () => ({
  readRepoConfig: vi.fn(),
}));

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("./repo.js", () => ({
  repoHash: vi.fn((path: string) => `hash_${path.replace(/[^a-z0-9]/gi, '_')}`),
}));

describe("tool-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves repo_id from config when available", () => {
    const mockConfig = { repo_id: "config-uuid-123" };
    (readRepoConfig as any).mockReturnValue(mockConfig);

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.repo_id).toBe("config-uuid-123");
    expect(ctx.repo_path).toBe("/some/path");
  });

  it("falls back to repoHash when config not found", () => {
    (readRepoConfig as any).mockReturnValue(null);

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.repo_id).toBe("hash__some_path");
  });

  it("falls back to repoHash when config read fails", () => {
    (readRepoConfig as any).mockImplementation(() => {
      throw new Error("Config read error");
    });

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.repo_id).toBe("hash__some_path");
  });

  it("uses default repo_path '.' when not provided", () => {
    (readRepoConfig as any).mockReturnValue(null);

    const ctx = resolveToolContext({});
    expect(ctx.repo_path).toBe(".");
  });

  it("resolves session_id from active session", () => {
    (readRepoConfig as any).mockReturnValue(null);
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ id: "session-uuid-456" }),
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.session_id).toBe("session-uuid-456");
  });

  it("falls back to 'global' when no active session", () => {
    (readRepoConfig as any).mockReturnValue(null);
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.session_id).toBe("global");
  });

  it("falls back to 'global' when DB query fails", () => {
    (readRepoConfig as any).mockReturnValue(null);
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        throw new Error("DB error");
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const ctx = resolveToolContext({ repo_path: "/some/path" });
    expect(ctx.session_id).toBe("global");
  });

  it("handles multiple repos independently", () => {
    const mockConfig1 = { repo_id: "repo-1-uuid" };
    const mockConfig2 = { repo_id: "repo-2-uuid" };
    
    (readRepoConfig as any)
      .mockReturnValueOnce(mockConfig1)
      .mockReturnValueOnce(mockConfig2);

    const ctx1 = resolveToolContext({ repo_path: "/repo1" });
    const ctx2 = resolveToolContext({ repo_path: "/repo2" });

    expect(ctx1.repo_id).toBe("repo-1-uuid");
    expect(ctx2.repo_id).toBe("repo-2-uuid");
    expect(ctx1.repo_path).toBe("/repo1");
    expect(ctx2.repo_path).toBe("/repo2");
  });
});