import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';

export async function runSync(options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const res = await service.sync({});

    const formatted = formatter.format(res, 'sync', options);
    if (formatted) {
      console.log(formatted);
    }

    if (res.success) {
      const changes = res.syncedAssets || 0;
      if (changes === 0) {
        process.exit(1); // no-changes
      }
      process.exit(0); // synced
    } else {
      process.exit(2);
    }
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
