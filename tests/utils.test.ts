import { describe, it, expect } from 'vitest';
import { isWithinBoundary } from '../src/shared/utils/path';
import { validateCapabilityId, validateAssetId, generateProposalId } from '../src/shared/utils/id';
import { compareSemVer, isCompatible } from '../src/shared/utils/semver';
import { nowISO8601, diffMs } from '../src/shared/utils/date';

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

    it('validateAssetId("local.rule.my-rule") should be true', () => {
      expect(validateAssetId('local.rule.my-rule')).toBe(true);
    });

    it('validateAssetId("shared.prompt.greeting") should be true', () => {
      expect(validateAssetId('shared.prompt.greeting')).toBe(true);
    });

    it('validateAssetId("invalid") should be false', () => {
      expect(validateAssetId('invalid')).toBe(false);
    });

    it('generateProposalId() should match format with 5-digit random', () => {
      const id = generateProposalId();
      expect(id).toMatch(/^PROP-\d{4}-\d{2}-\d{2}-\d{5}$/);
    });
  });

  describe('semver', () => {
    it('compareSemVer should return 0 for equal versions', () => {
      expect(compareSemVer('1.2.3', '1.2.3')).toBe(0);
    });

    it('compareSemVer should return 1 when a > b', () => {
      expect(compareSemVer('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemVer('1.3.0', '1.2.9')).toBe(1);
      expect(compareSemVer('1.2.4', '1.2.3')).toBe(1);
    });

    it('compareSemVer should return -1 when a < b', () => {
      expect(compareSemVer('1.0.0', '2.0.0')).toBe(-1);
      expect(compareSemVer('1.1.0', '1.2.0')).toBe(-1);
      expect(compareSemVer('1.2.2', '1.2.3')).toBe(-1);
    });

    it('compareSemVer should throw on invalid format', () => {
      expect(() => compareSemVer('abc', '1.0.0')).toThrow('Invalid semver format');
      expect(() => compareSemVer('1.0', '1.0.0')).toThrow('Invalid semver format');
    });

    it('isCompatible should return true when major matches and actual minor >= required', () => {
      expect(isCompatible('1.2.0', '1.3.0')).toBe(true);
      expect(isCompatible('1.2.0', '1.2.5')).toBe(true);
    });

    it('isCompatible should return false when major differs', () => {
      expect(isCompatible('1.0.0', '2.0.0')).toBe(false);
    });

    it('isCompatible should return false when actual minor < required', () => {
      expect(isCompatible('1.5.0', '1.2.0')).toBe(false);
    });

    it('isCompatible should throw on invalid format', () => {
      expect(() => isCompatible('abc', '1.0.0')).toThrow('Invalid semver format');
    });
  });

  describe('date', () => {
    it('nowISO8601 should return valid ISO string', () => {
      const result = nowISO8601();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('diffMs should return difference between two dates', () => {
      const a = '2026-01-01T00:00:00.000Z';
      const b = '2026-01-01T00:01:00.000Z';
      expect(diffMs(a, b)).toBe(60000);
    });

    it('diffMs should return 0 for same date', () => {
      const date = '2026-06-15T12:00:00.000Z';
      expect(diffMs(date, date)).toBe(0);
    });

    it('diffMs should return absolute value', () => {
      const a = '2026-01-01T00:02:00.000Z';
      const b = '2026-01-01T00:01:00.000Z';
      expect(diffMs(a, b)).toBe(60000);
    });
  });
});
