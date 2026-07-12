import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';

export async function runTask(description: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    if (!options.quiet && !options.json) {
      console.log('[PLANNING] Building execution plan...');
      console.log('[RUNNING] Executing steps...');
    }

    const result = await service.run({
      description,
      workingDirectory: options.cwd || '.'
    });

    const formatted = formatter.format(result, 'run', options);
    if (formatted) {
      console.log(formatted);
    }

    if (result.status === 'COMPLETED') {
      process.exit(0);
    } else {
      if (result.error?.code === 'EXEC_006') {
        process.exit(3); // verification-failed
      }
      process.exit(2); // failed
    }
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    if (err.code === 'EXEC_006') {
      process.exit(3);
    }
    process.exit(2);
  }
}
