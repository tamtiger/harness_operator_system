import { PlatformServiceImpl } from '../../../platform/service';
import * as path from 'path';

export async function runValidate(targetPathArg?: string, options: { strict?: boolean } = {}) {
  const targetDir = path.resolve(targetPathArg || '.');
  const platform = new PlatformServiceImpl();

  const result = await platform.validate(targetDir);

  if (result.valid) {
    console.log('✓ Repository structure is valid.');
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
      process.exit(1);
    }
    process.exit(0);
  } else {
    console.error('✗ Repository validation failed:');
    result.errors.forEach(e => {
      console.error(`  [ERROR] ${e.code}: ${e.message}`);
      if (e.details) {
        console.error(`    Details: ${JSON.stringify(e.details)}`);
      }
    });
    result.warnings.forEach(w => {
      console.warn(`  [WARNING] ${w}`);
    });
    process.exit(2);
  }
}
