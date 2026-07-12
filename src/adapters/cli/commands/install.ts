import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';

export async function runInstall(source: string, version: string | undefined, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const res = await service.install({
      source,
      version
    });

    const formatted = formatter.format(res, 'install', options);
    if (formatted) {
      console.log(formatted);
    }
    process.exit(res.success ? 0 : 2);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
