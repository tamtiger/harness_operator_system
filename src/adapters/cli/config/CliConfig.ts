import * as path from 'path';
import * as os from 'os';

export function getDefaultSharedPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? os.homedir(), 'harness', 'shared');
  }
  return path.join(os.homedir(), '.harness', 'shared');
}

export function getSharedPath(): string {
  return process.env.HARNESS_HOME ?? getDefaultSharedPath();
}

export function getLogLevel(): string {
  return process.env.HARNESS_LOG_LEVEL ?? 'info';
}

export function isColorDisabled(): boolean {
  return !!process.env.HARNESS_NO_COLOR || !!process.env.NO_COLOR;
}
