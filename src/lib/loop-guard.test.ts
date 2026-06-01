import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkLoop, resetLoopGuard, type LoopCheckResult } from "./loop-guard.js";

describe("loop-guard", () => {
  beforeEach(() => {
    resetLoopGuard();
  });

  it("returns ok for first 5 calls", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkLoop("session_1", "test_tool", { a: 1 })).toEqual({ status: 'ok' });
    }
  });

  it("returns warn on 6th identical call", () => {
    for (let i = 0; i < 5; i++) {
      checkLoop("session_1", "test_tool", { a: 1 });
    }
    const result = checkLoop("session_1", "test_tool", { a: 1 });
    expect(result.status).toBe('warn');
    if (result.status === 'warn') {
      expect(result.count).toBe(6);
    }
  });

  it("returns blocked on 10th identical call", () => {
    for (let i = 0; i < 9; i++) {
      checkLoop("session_1", "test_tool", { a: 1 });
    }
    const result = checkLoop("session_1", "test_tool", { a: 1 });
    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.count).toBe(10);
    }
  });

  it("different args don't trigger loop", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkLoop("session_1", "test_tool", { a: i })).toEqual({ status: 'ok' });
    }
  });

  it("different tools don't trigger loop", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkLoop("session_1", `tool_${i}`, { a: 1 })).toEqual({ status: 'ok' });
    }
  });

  it("different sessions don't trigger loop", () => {
    // 5 calls in session 1
    for (let i = 0; i < 5; i++) {
      checkLoop("session_1", "test_tool", { a: 1 });
    }
    // 5 calls in session 2 (same tool, same args)
    for (let i = 0; i < 5; i++) {
      expect(checkLoop("session_2", "test_tool", { a: 1 })).toEqual({ status: 'ok' });
    }
    // 6th call in session 1 should warn
    const result = checkLoop("session_1", "test_tool", { a: 1 });
    expect(result.status).toBe('warn');
    if (result.status === 'warn') {
      expect(result.count).toBe(6);
    }
  });

  it("resets after window expires", ({ onTestFinished }) => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });

    for (let i = 0; i < 5; i++) {
      checkLoop("session_1", "test_tool", { a: 1 });
    }
    // 6th call triggers warning
    const warnResult = checkLoop("session_1", "test_tool", { a: 1 });
    expect(warnResult.status).toBe('warn');
    if (warnResult.status === 'warn') {
      expect(warnResult.count).toBe(6);
    }

    // Fast-forward time by 61 seconds
    vi.advanceTimersByTime(61000);

    // Call after window expiration should be ok again
    expect(checkLoop("session_1", "test_tool", { a: 1 })).toEqual({ status: 'ok' });
  });
});