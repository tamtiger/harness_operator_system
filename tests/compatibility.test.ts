import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { isWithinBoundary } from '../src/shared/utils/path';

describe('T11.7 — Compatibility Tests', () => {
  describe('Node.js version compatibility', () => {
    it('should run on Node >= 20', () => {
      const major = parseInt(process.version.slice(1).split('.')[0], 10);
      expect(major).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Cross-platform path handling', () => {
    it('should handle POSIX-style paths', () => {
      const base = '/home/user/project';
      expect(isWithinBoundary(base, 'file.txt')).toBe(true);
      expect(isWithinBoundary(base, '../outside')).toBe(false);
      expect(isWithinBoundary(base, '/etc/passwd')).toBe(false);
    });

    it('should handle Windows-style paths', () => {
      const winBase = 'C:\\Users\\test\\project';
      expect(isWithinBoundary(winBase, 'file.txt')).toBe(true);
      expect(isWithinBoundary(winBase, '..\\outside')).toBe(false);
    });

    it('should handle mixed path separators', () => {
      const base = '/home/user/project';
      expect(isWithinBoundary(base, 'subdir/file.txt')).toBe(true);
    });

    it('should normalize path.resolve correctly on all platforms', () => {
      const resolved1 = path.resolve('/a', 'b');
      expect(resolved1.endsWith(path.join('a', 'b')) || resolved1.endsWith('/a/b')).toBe(true);

      const resolved2 = path.resolve('/a/b', '../c');
      expect(resolved2.endsWith(path.join('a', 'c')) || resolved2.endsWith('/a/c')).toBe(true);

      const resolved3 = path.resolve('/a/b/c', '../../../d');
      expect(resolved3.endsWith('d') || resolved3.endsWith('/d')).toBe(true);
    });
  });

  describe('Line ending handling', () => {
    it('should handle LF line endings', () => {
      const lfContent = 'line1\nline2\nline3\n';
      const lines = lfContent.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2');
    });

    it('should handle CRLF line endings', () => {
      const crlfContent = 'line1\r\nline2\r\nline3\r\n';
      const lines = crlfContent.split('\r\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2');
    });

    it('should handle mixed line endings', () => {
      const mixedContent = 'line1\nline2\r\nline3\n';
      const normalized = mixedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalized.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2');
      expect(lines[2]).toBe('line3');
    });

    it('should handle files with no trailing newline', () => {
      const noNewline = 'line1\nline2';
      const lines = noNewline.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('line1');
      expect(lines[1]).toBe('line2');
    });
  });

  describe('Encoding compatibility', () => {
    it('should handle UTF-8 content with special characters', () => {
      const utf8Content = 'dự án hồ sơ\ncafé résumé\n日本語\n';
      const lines = utf8Content.split('\n');
      expect(lines[0]).toBe('dự án hồ sơ');
      expect(lines[1]).toBe('café résumé');
      expect(lines[2]).toBe('日本語');
    });

    it('should handle empty strings', () => {
      const emptyLines = ''.split('\n');
      expect(emptyLines).toHaveLength(1);
      expect(emptyLines[0]).toBe('');
    });
  });
});
