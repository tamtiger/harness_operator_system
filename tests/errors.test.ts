import { describe, it, expect } from 'vitest';
import { HarnessError } from '../src/shared/errors/HarnessError';
import { repoError, capError } from '../src/shared/errors/factories';
import { ErrorDomain } from '../src/shared/types/enums';

describe('Error Model', () => {
  it('HarnessError fields should be set correctly', () => {
    const error = new HarnessError('TEST_001', ErrorDomain.REPOSITORY, 'Test message', true, { foo: 'bar' });
    expect(error.code).toBe('TEST_001');
    expect(error.domain).toBe(ErrorDomain.REPOSITORY);
    expect(error.message).toBe('Test message');
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.timestamp).toBeDefined();
    expect(error.name).toBe('HarnessError');
  });

  it('repoError("REPO_001") should return correct error', () => {
    const error = repoError('REPO_001');
    expect(error.code).toBe('REPO_001');
    expect(error.domain).toBe(ErrorDomain.REPOSITORY);
    expect(error.retryable).toBe(false);
  });

  it('repoError("REPO_015") should be retryable', () => {
    const error = repoError('REPO_015');
    expect(error.code).toBe('REPO_015');
    expect(error.domain).toBe(ErrorDomain.REPOSITORY);
    expect(error.retryable).toBe(true);
  });

  it('capError("CAP_005") should be retryable', () => {
    const error = capError('CAP_005');
    expect(error.code).toBe('CAP_005');
    expect(error.domain).toBe(ErrorDomain.CAPABILITY);
    expect(error.retryable).toBe(true);
  });
});
