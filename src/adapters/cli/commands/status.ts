import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';
import * as path from 'path';

export async function runStatus(options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const targetDir = path.resolve(options.cwd || '.');
  const platform = createPlatformService(targetDir, options.harnessHome);

  try {
    const statusData = await platform.status();
    const formatted = formatter.format(statusData, 'status', options);
    if (formatted) {
      console.log(formatted);
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
