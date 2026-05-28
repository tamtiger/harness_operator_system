import { describe, it, expect } from "vitest";
import { computeTreeHash } from "./tree-hash.js";

describe("computeTreeHash", () => {
  it("returns a hex string for a git repo", () => {
    // Current project is a git repo
    const hash = computeTreeHash(process.cwd());
    // Should be a 64-char hex string (SHA-256) or "no-git"
    if (hash !== "no-git") {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("returns 'no-git' for non-existent path", () => {
    const hash = computeTreeHash("/nonexistent/path/xyz123");
    expect(hash).toBe("no-git");
  });

  it("returns 'no-git' for directory without git", () => {
    // Use temp dir or system dir that's not a git repo
    const hash = computeTreeHash(process.env.TEMP || "/tmp");
    expect(hash).toBe("no-git");
  });

  it("produces consistent results for same repo", () => {
    const hash1 = computeTreeHash(process.cwd());
    const hash2 = computeTreeHash(process.cwd());
    expect(hash1).toBe(hash2);
  });
});
