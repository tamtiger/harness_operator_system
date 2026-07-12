import { SemVer } from '../types/primitives';

function parseSemVer(v: string): number[] {
  if (!/^\d+\.\d+\.\d+$/.test(v)) {
    throw new Error(`Invalid semver format: ${v}`);
  }
  return v.split('.').map(Number);
}

export function compareSemVer(a: SemVer, b: SemVer): -1 | 0 | 1 {
  const [majorA, minorA, patchA] = parseSemVer(a);
  const [majorB, minorB, patchB] = parseSemVer(b);

  if (majorA > majorB) return 1;
  if (majorA < majorB) return -1;
  if (minorA > minorB) return 1;
  if (minorA < minorB) return -1;
  if (patchA > patchB) return 1;
  if (patchA < patchB) return -1;
  return 0;
}

export function isCompatible(required: SemVer, actual: SemVer): boolean {
  const [reqMajor, reqMinor] = parseSemVer(required);
  const [actMajor, actMinor] = parseSemVer(actual);

  if (reqMajor !== actMajor) {
    return false;
  }
  return actMinor >= reqMinor;
}
