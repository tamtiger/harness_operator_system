/**
 * Generic test output parser — tries to extract pass/fail counts from text output.
 */

import type { ParsedTestResult } from "./vitest.js";

export function parseGenericOutput(output: string): ParsedTestResult | null {
  // Try common patterns

  // Pattern: "X passed, Y failed, Z skipped"
  const pattern1 = /(\d+)\s+passed.*?(\d+)\s+failed/i;
  const match1 = output.match(pattern1);
  if (match1) {
    const skippedMatch = output.match(/(\d+)\s+skipped/i);
    return {
      passed: parseInt(match1[1], 10),
      failed: parseInt(match1[2], 10),
      skipped: skippedMatch ? parseInt(skippedMatch[1], 10) : 0,
      duration_ms: 0,
      failures: [],
    };
  }

  // Pattern: "Tests: X passed, Y total"
  const pattern2 = /Tests:\s*(\d+)\s+passed.*?(\d+)\s+total/i;
  const match2 = output.match(pattern2);
  if (match2) {
    const total = parseInt(match2[2], 10);
    const passed = parseInt(match2[1], 10);
    return {
      passed,
      failed: total - passed,
      skipped: 0,
      duration_ms: 0,
      failures: [],
    };
  }

  // Pattern: "ok X" / "FAIL Y" (go test)
  const goOk = (output.match(/^ok\s/gm) || []).length;
  const goFail = (output.match(/^FAIL\s/gm) || []).length;
  if (goOk + goFail > 0) {
    return {
      passed: goOk,
      failed: goFail,
      skipped: 0,
      duration_ms: 0,
      failures: [],
    };
  }

  return null;
}
