import { ISO8601 } from '../types/primitives';
import { ErrorDomain } from '../types/enums';

export class HarnessError extends Error {
  readonly timestamp: ISO8601;

  constructor(
    public readonly code: string,
    public readonly domain: ErrorDomain,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HarnessError';
    this.timestamp = new Date().toISOString();
  }
}
