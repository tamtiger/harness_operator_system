import { createPlatformService } from '../factory';
import * as path from 'path';

export async function runDoctor() {
  const rootPath = path.resolve('.');
  const service = createPlatformService(rootPath);

  try {
    const report = await service.doctor();
    
    console.log(`Diagnostic Report (${report.timestamp}):`);
    report.checks.forEach(check => {
      const statusSymbol = check.status === 'pass' ? '✓' : '✗';
      console.log(`  ${statusSymbol} ${check.name.padEnd(20)} — ${check.message}`);
      if (check.remediation) {
        console.log(`      Remediation: ${check.remediation}`);
      }
    });

    console.log(`\nOverall Status: ${report.overall}`);
    if (report.overall === 'critical') {
      process.exit(2);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error(`Diagnostics engine error: ${err.message}`);
    process.exit(2);
  }
}
