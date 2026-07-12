import { createPlatformService } from '../factory';
import * as path from 'path';

export async function runInstall(source: string, version?: string) {
  const rootPath = path.resolve('.');
  const service = createPlatformService(rootPath);

  try {
    console.log(`Installing Harness from ${source}...`);
    const res = await service.install({
      source,
      version
    });

    if (res.success) {
      console.log(`✓ Shared Harness v${res.installedVersion} successfully installed at ${res.path}`);
      process.exit(0);
    } else {
      console.error(`✗ Installation failed`);
      if (res.error) {
        console.error(`  [ERROR] ${res.error.code}: ${res.error.message}`);
      }
      process.exit(2);
    }
  } catch (err: any) {
    console.error(`✗ Installation command failed: ${err.message}`);
    process.exit(2);
  }
}
