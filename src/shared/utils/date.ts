import { ISO8601, Duration } from '../types/primitives';

export function nowISO8601(): ISO8601 {
  return new Date().toISOString();
}

export function diffMs(a: ISO8601, b: ISO8601): Duration {
  const timeA = new Date(a).getTime();
  const timeB = new Date(b).getTime();
  return Math.abs(timeA - timeB);
}
