import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';

export async function runUpdate(targetVersion: string | undefined, force: boolean, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const res = await service.update({
      targetVersion,
      force
    });

    const formatted = formatter.format(res, 'update', options);
    if (formatted) {
      console.log(formatted);
    }

    if (res.success) {
      if (res.fromVersion === res.toVersion) {
        process.exit(1); // up-to-date
      }
      process.exit(0); // updated
    } else {
      process.exit(2);
    }
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
