import * as path from 'path';

export function isWithinBoundary(base: string, target: string): boolean {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(base, target);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}
