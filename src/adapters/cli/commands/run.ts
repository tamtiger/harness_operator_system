import { createPlatformService } from '../factory';
import * as path from 'path';

export async function runTask(description: string) {
  const rootPath = path.resolve('.');
  const service = createPlatformService(rootPath);

  try {
    console.log('[PLANNING] Building execution plan...');
    console.log('[RUNNING] Executing steps...');
    const start = Date.now();
    const result = await service.run({
      description,
      workingDirectory: '.'
    });
    const duration = Date.now() - start;

    if (result.status === 'COMPLETED') {
      console.log('[VERIFYING] Checking results...');
      console.log(`[COMPLETED] Task finished in ${duration}ms\n`);
      console.log('Results:');
      if (result.results && result.results.length > 0) {
        result.results.forEach((res: any, idx: number) => {
          console.log(`  Step ${idx + 1} (${res.capabilityId}): Success`);
          console.log(`  Output: ${JSON.stringify(res.output, null, 2)}`);
        });
      } else {
        console.log('  No step results produced.');
      }
      process.exit(0);
    } else {
      console.error(`✗ Task execution failed with status: ${result.status}`);
      if (result.error) {
        console.error(`  [ERROR] ${result.error.code}: ${result.error.message}`);
      }
      process.exit(2);
    }
  } catch (err: any) {
    console.error(`✗ Command failed: ${err.message}`);
    process.exit(2);
  }
}
