import { RetryPolicy } from '../../shared/types/execution';
import { HarnessError } from '../../shared/errors/HarnessError';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  backoffBaseMs: 1000,
  retryOn: ['CAP_005', 'CAP_006', 'CAP_007', 'EXEC_004'],
  noRetryOn: ['CAP_001', 'CAP_002', 'CAP_004']
};

export class RetryManager {
  shouldRetry(error: HarnessError, policy: RetryPolicy, attempt: number): boolean {
    if (attempt >= policy.maxAttempts) {
      return false;
    }
    const noRetry = policy.noRetryOn || [];
    if (noRetry.includes(error.code)) {
      return false;
    }
    const retry = policy.retryOn || [];
    if (retry.includes(error.code)) {
      return true;
    }
    return !!error.retryable;
  }
}

export function calcBackoff(attempt: number, strategy: 'none' | 'linear' | 'exponential', baseMs: number): number {
  if (strategy === 'none') return 0;
  if (strategy === 'linear') return attempt * baseMs;
  return Math.pow(2, attempt - 1) * baseMs; // attempt 1->1x, 2->2x, 3->4x
}
