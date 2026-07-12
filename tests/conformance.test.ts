import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runConformance } from '../src/adapters/cli/commands/conformance';

describe('M10 Conformance Suite CLI Runner', () => {
  it('should run all 30 conformance checks and generate a Level 3 compliance report', async () => {
    const reportPath = path.join(process.cwd(), 'conformance-report.json');

    // Remove existing report if any
    if (fs.existsSync(reportPath)) {
      fs.rmSync(reportPath);
    }

    // Run the conformance command
    await runConformance({ quiet: true });

    // Verify report was written
    expect(fs.existsSync(reportPath)).toBe(true);

    const reportContent = fs.readFileSync(reportPath, 'utf8');
    const report = JSON.parse(reportContent);

    process.stderr.write('FAILED CASES: ' + JSON.stringify(report.results.filter((r: any) => r.status === 'fail')) + '\n');

    // Validate schema
    expect(report.conformance_version).toBe('4.0');
    expect(report.implementation.name).toBe('Harness Platform');
    expect(report.compliance_level).toBe('Level 3');
    expect(report.summary.total_rules).toBe(30);
    expect(report.summary.passed).toBe(30);
    expect(report.summary.failed).toBe(0);
    expect(report.results).toHaveLength(30);

    // Verify list of test cases
    const ids = report.results.map((r: any) => r.test_id);
    for (let i = 1; i <= 30; i++) {
      const padId = `TC-${String(i).padStart(2, '0')}`;
      expect(ids).toContain(padId);
      const resultObj = report.results.find((r: any) => r.test_id === padId);
      expect(resultObj.status).toBe('pass');
    }

    // Cleanup report file
    fs.rmSync(reportPath);
  });
});
