import { describe, it, expect } from 'vitest';
import { HarnessError } from '../src/shared/errors/HarnessError';
import { repoError, capError, mftError, ctxError, execError, govError, pltError } from '../src/shared/errors/factories';
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

  describe('repoError', () => {
    it('REPO_001 should return correct error', () => {
      const error = repoError('REPO_001');
      expect(error.code).toBe('REPO_001');
      expect(error.domain).toBe(ErrorDomain.REPOSITORY);
      expect(error.retryable).toBe(false);
    });

    it('REPO_015 should be retryable', () => {
      const error = repoError('REPO_015');
      expect(error.code).toBe('REPO_015');
      expect(error.domain).toBe(ErrorDomain.REPOSITORY);
      expect(error.retryable).toBe(true);
    });

    it('should interpolate {field} placeholders', () => {
      const error = repoError('REPO_004', { field: 'version' });
      expect(error.message).toContain('version');
      expect(error.message).not.toContain('{field}');
    });

    it('should interpolate {path} placeholders', () => {
      const error = repoError('REPO_005', { path: 'rules/my-rule.md' });
      expect(error.message).toContain('rules/my-rule.md');
    });
  });

  describe('mftError', () => {
    it('MFT_003 should return correct error', () => {
      const error = mftError('MFT_003', { field: 'agent.entry_point' });
      expect(error.code).toBe('MFT_003');
      expect(error.domain).toBe(ErrorDomain.MANIFEST);
      expect(error.message).toContain('agent.entry_point');
    });

    it('MFT_004 should be not retryable', () => {
      const error = mftError('MFT_004', { version: '99' });
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('99');
    });
  });

  describe('ctxError', () => {
    it('CTX_001 should return correct error', () => {
      const error = ctxError('CTX_001', { reason: 'Invalid scope' });
      expect(error.code).toBe('CTX_001');
      expect(error.domain).toBe(ErrorDomain.CONTEXT);
      expect(error.message).toContain('Invalid scope');
    });

    it('CTX_003 should interpolate tokens and limit', () => {
      const error = ctxError('CTX_003', { tokens: 5000, limit: 3000 });
      expect(error.message).toContain('5000');
      expect(error.message).toContain('3000');
    });
  });

  describe('execError', () => {
    it('EXEC_001 should return correct error', () => {
      const error = execError('EXEC_001', { id: 'workflow-1' });
      expect(error.code).toBe('EXEC_001');
      expect(error.domain).toBe(ErrorDomain.EXECUTION);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('workflow-1');
    });

    it('EXEC_004 should be retryable', () => {
      const error = execError('EXEC_004', { stepId: 'step-1', timeout: 5000 });
      expect(error.retryable).toBe(true);
    });

    it('should allow retryable override', () => {
      const error = execError('EXEC_001', { id: 'test' }, true);
      expect(error.retryable).toBe(true);
    });
  });

  describe('capError', () => {
    it('CAP_001 should return correct error', () => {
      const error = capError('CAP_001', { id: 'harness.nonexistent' });
      expect(error.code).toBe('CAP_001');
      expect(error.domain).toBe(ErrorDomain.CAPABILITY);
      expect(error.message).toContain('harness.nonexistent');
    });

    it('CAP_005 should be retryable', () => {
      const error = capError('CAP_005', { id: 'harness.file.read', ms: 30000 });
      expect(error.code).toBe('CAP_005');
      expect(error.domain).toBe(ErrorDomain.CAPABILITY);
      expect(error.retryable).toBe(true);
    });
  });

  describe('govError', () => {
    it('GOV_001 should return correct error', () => {
      const error = govError('GOV_001', { id: 'PROP-2026-01-01-001' });
      expect(error.code).toBe('GOV_001');
      expect(error.domain).toBe(ErrorDomain.GOVERNANCE);
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('PROP-2026-01-01-001');
    });

    it('GOV_006 should be retryable', () => {
      const error = govError('GOV_006');
      expect(error.retryable).toBe(true);
    });
  });

  describe('pltError', () => {
    it('PLT_001 should return correct error', () => {
      const error = pltError('PLT_001', { uri: 'https://example.com/harness' });
      expect(error.code).toBe('PLT_001');
      expect(error.domain).toBe(ErrorDomain.PLATFORM);
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('example.com');
    });

    it('PLT_003 should be not retryable', () => {
      const error = pltError('PLT_003', { path: '/etc/harness' });
      expect(error.retryable).toBe(false);
    });
  });
});
