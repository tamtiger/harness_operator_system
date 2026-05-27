import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkLoop, resetLoopGuard } from "./loop-guard.js";

describe("loop-guard", () => {
  beforeEach(() => {
    resetLoopGuard();
  });

  it("returns null for first 5 calls", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkLoop("test_tool", { a: 1 })).toBeNull();
    }
  });

  it("returns warning on 6th identical call", () => {
    for (let i = 0; i < 5; i++) {
      checkLoop("test_tool", { a: 1 });
    }
    const result = checkLoop("test_tool", { a: 1 });
    expect(result).toContain("potential loop detected");
    expect(result).toContain("test_tool");
  });

  it("different args don't trigger loop", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkLoop("test_tool", { a: i })).toBeNull();
    }
  });

  it("different tools don't trigger loop", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkLoop(`tool_${i}`, { a: 1 })).toBeNull();
    }
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      checkLoop("test_tool", { a: 1 });
    }

    // Advance past 60s window
    vi.advanceTimersByTime(61_000);

    // Should reset — no warning
    expect(checkLoop("test_tool", { a: 1 })).toBeNull();

    vi.useRealTimers();
  });
});
