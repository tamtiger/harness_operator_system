import * as path from 'path';
import * as os from 'os';

export function isWithinBoundary(base: string, target: string): boolean {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(base, target);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

export function getDefaultHarnessPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? os.homedir(), 'harness');
  }
  return path.join(os.homedir(), '.harness');
}
