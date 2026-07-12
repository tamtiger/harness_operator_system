import { SemVer } from '../types/primitives';

export function compareSemVer(a: SemVer, b: SemVer): -1 | 0 | 1 {
  const parse = (v: string) => v.split('.').map(Number);
  const [majorA, minorA, patchA] = parse(a);
  const [majorB, minorB, patchB] = parse(b);

  if (majorA > majorB) return 1;
  if (majorA < majorB) return -1;
  if (minorA > minorB) return 1;
  if (minorA < minorB) return -1;
  if (patchA > patchB) return 1;
  if (patchA < patchB) return -1;
  return 0;
}

export function isCompatible(required: SemVer, actual: SemVer): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [reqMajor, reqMinor] = parse(required);
  const [actMajor, actMinor] = parse(actual);

  if (reqMajor !== actMajor) {
    return false;
  }
  return actMinor >= reqMinor;
}
