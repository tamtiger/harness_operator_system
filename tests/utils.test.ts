import { describe, it, expect } from 'vitest';
import { isWithinBoundary } from '../src/shared/utils/path';
import { validateCapabilityId, generateProposalId } from '../src/shared/utils/id';

describe('Utils', () => {
  describe('path', () => {
    it('isWithinBoundary("/p", "/p/../etc") should be false', () => {
      expect(isWithinBoundary('/p', '/p/../etc')).toBe(false);
    });

    it('isWithinBoundary("/p", "/p/sub/file") should be true', () => {
      expect(isWithinBoundary('/p', '/p/sub/file')).toBe(true);
    });
  });

  describe('id', () => {
    it('validateCapabilityId("harness.file.read") should be true', () => {
      expect(validateCapabilityId('harness.file.read')).toBe(true);
    });
    
    it('validateCapabilityId("noDot") should be false', () => {
      expect(validateCapabilityId('noDot')).toBe(false);
    });

    it('validateCapabilityId(".leading") should be false', () => {
      expect(validateCapabilityId('.leading')).toBe(false);
    });

    it('generateProposalId() should match format', () => {
      const id = generateProposalId();
      expect(id).toMatch(/^PROP-\d{4}-\d{2}-\d{2}-\d{3}$/);
    });
  });
});
