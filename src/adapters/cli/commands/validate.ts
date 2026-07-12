import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';
import * as path from 'path';

export async function runValidate(targetPathArg?: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const targetDir = path.resolve(targetPathArg || options.cwd || '.');
  const platform = createPlatformService(targetDir, options.harnessHome);

  try {
    const result = await platform.validate(targetDir);
    
    // Strict mode logic: treat warnings as failure
    const isStrict = !!options.strict;
    const hasWarnings = result.warnings && result.warnings.length > 0;

    const formatted = formatter.format(result, 'validate', options);
    if (formatted) {
      if (result.valid) {
        console.log(formatted);
      } else {
        console.error(formatted);
      }
    }

    if (!result.valid) {
      process.exit(2); // errors
    }
    if (isStrict && hasWarnings) {
      process.exit(1); // warnings in strict mode
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
