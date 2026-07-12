import { bench, describe } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { isWithinBoundary, getDefaultHarnessPath } from '../../src/shared/utils/path';
import { validateSemver, compareSemver } from '../../src/shared/utils/semver';
import { generateId } from '../../src/shared/utils/id';

function makeTempAssets(count: number): string[] {
  const assets: string[] = [];
  for (let i = 0; i < count; i++) {
    assets.push(`asset-${i}`);
  }
  return assets;
}

describe('T11.2 — Performance Benchmarks', () => {
  bench('context build simulation (100 assets) - path validation', () => {
    const base = '/home/user/project';
    const assets = makeTempAssets(100);
    for (const asset of assets) {
      isWithinBoundary(base, path.join('assets', asset));
    }
  });

  bench('capability invocation overhead simulation - semver parse', () => {
    for (let i = 0; i < 100; i++) {
      validateSemver('1.2.3');
      compareSemver('1.2.3', '1.2.4');
    }
  });

  bench('harness doctor simulation - ID generation (100x)', () => {
    for (let i = 0; i < 100; i++) {
      generateId();
    }
  });

  bench('harness validate simulation - boundary checks (100x)', () => {
    const base = '/home/user/project';
    const targets = [
      'file.md', 'dir/file.md', 'dir/sub/file.md',
      '../outside', '../../outside',
      '.hidden/file.md', 'dir/../file.md'
    ];
    for (let i = 0; i < 100; i++) {
      for (const t of targets) {
        isWithinBoundary(base, t);
      }
    }
  });

  bench('harness doctor - default path resolution', () => {
    for (let i = 0; i < 50; i++) {
      getDefaultHarnessPath();
    }
  });
});
