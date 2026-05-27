/**
 * Parse Vitest JSON reporter output into structured result.
 */

export interface ParsedTestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  failures: Array<{ test: string; message: string }>;
}

export function parseVitestJson(output: string): ParsedTestResult | null {
  try {
    const data = JSON.parse(output);

    if (!data.testResults && !data.numPassedTests && !data.results) {
      return null;
    }

    // Vitest JSON format
    if (data.testResults) {
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      const failures: Array<{ test: string; message: string }> = [];

      for (const file of data.testResults) {
        for (const test of file.assertionResults || []) {
          if (test.status === "passed") passed++;
          else if (test.status === "failed") {
            failed++;
            failures.push({
              test: test.fullName || test.title || "unknown",
              message: (test.failureMessages || []).join("\n").slice(0, 500),
            });
          } else skipped++;
        }
      }

      return {
        passed,
        failed,
        skipped,
        duration_ms: data.startTime ? Date.now() - data.startTime : 0,
        failures,
      };
    }

    return null;
  } catch {
    return null;
  }
}
