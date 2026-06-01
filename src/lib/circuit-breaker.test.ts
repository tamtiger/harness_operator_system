import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkCircuit, recordSuccess, recordFailure, resetCircuitBreaker, getCircuitState } from "./circuit-breaker.js";

describe("circuit-breaker", () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

  it("starts closed", () => {
    expect(checkCircuit("repo_1", "test_tool")).toEqual({ open: false });
  });

  it("opens after 3 consecutive failures", () => {
    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool")).toEqual({ open: false });

    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool")).toEqual({ open: false });

    recordFailure("repo_1", "test_tool");
    const result = checkCircuit("repo_1", "test_tool");
    expect(result.open).toBe(true);
    expect(result.failures).toBe(3);
  });

  it("success resets failure counter", () => {
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    recordSuccess("repo_1", "test_tool");
    
    // Should be back to 0 failures
    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool")).toEqual({ open: false });
  });

  it("different repos are independent", () => {
    // Open circuit in repo 1
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool").open).toBe(true);

    // Repo 2 should still be closed
    expect(checkCircuit("repo_2", "test_tool")).toEqual({ open: false });
  });

  it("different tools are independent", () => {
    // Open circuit for tool A
    recordFailure("repo_1", "tool_a");
    recordFailure("repo_1", "tool_a");
    recordFailure("repo_1", "tool_a");
    expect(checkCircuit("repo_1", "tool_a").open).toBe(true);

    // Tool B should still be closed
    expect(checkCircuit("repo_1", "tool_b")).toEqual({ open: false });
  });

  it("cooldown period works", ({ onTestFinished }) => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });

    // Open circuit
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool").open).toBe(true);

    // Fast-forward 4 minutes (still in cooldown)
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(checkCircuit("repo_1", "test_tool").open).toBe(true);

    // Fast-forward past 5 minutes cooldown
    vi.advanceTimersByTime(1.1 * 60 * 1000); // 1.1 minutes more
    const result = checkCircuit("repo_1", "test_tool");
    expect(result.open).toBe(false);
  });

  it("half-open state allows retry", ({ onTestFinished }) => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });

    // Open circuit
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");
    recordFailure("repo_1", "test_tool");

    // Fast-forward past cooldown
    vi.advanceTimersByTime(5.1 * 60 * 1000);

    // Circuit should be half-open (closed but with reset state)
    expect(checkCircuit("repo_1", "test_tool").open).toBe(false);
    
    // Success should keep it closed
    recordSuccess("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool").open).toBe(false);

    // New failure should start counting from 1
    recordFailure("repo_1", "test_tool");
    expect(checkCircuit("repo_1", "test_tool").open).toBe(false);
  });

  it("getCircuitState returns state", () => {
    recordFailure("repo_1", "test_tool");
    const state = getCircuitState("repo_1", "test_tool");
    expect(state).toBeDefined();
    expect(state!.failures).toBe(1);
    expect(state!.is_open).toBe(false);
  });
});