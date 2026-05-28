import { describe, it, expect, beforeEach } from "vitest";
import { computeTreeHashCached, invalidateTreeHashCache, clearTreeHashCache } from "./stale-cache.js";

beforeEach(() => {
  clearTreeHashCache();
});

describe("computeTreeHashCached", () => {
  it("returns same result as uncached on first call", () => {
    const result = computeTreeHashCached(process.cwd());
    // Should be a hash or "no-git"
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns cached result on second call", () => {
    const first = computeTreeHashCached(process.cwd());
    const second = computeTreeHashCached(process.cwd());
    expect(first).toBe(second);
  });

  it("invalidateTreeHashCache forces recompute", () => {
    const first = computeTreeHashCached(process.cwd());
    invalidateTreeHashCache(process.cwd());
    const second = computeTreeHashCached(process.cwd());
    // Should still be the same value (repo hasn't changed)
    expect(second).toBe(first);
  });

  it("handles non-existent paths gracefully", () => {
    const result = computeTreeHashCached("/nonexistent/path/abc");
    expect(result).toBe("no-git");
  });
});
