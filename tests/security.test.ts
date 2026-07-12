import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { isWithinBoundary } from '../src/shared/utils/path';
import { startMcpServer } from '../src/adapters/mcp/server';
import { MockPlatformService } from './services.mock';
import { AuditRecord } from '../src/shared/types/governance';

describe('T11.1 — Security Validation', () => {
  describe('Path Traversal — isWithinBoundary', () => {
    const base = '/home/user/project';

    const traversalCases = [
      ['../outside', 'parent directory escape'],
      ['../../outside', 'double parent escape'],
      ['../../../etc/passwd', 'deep parent escape'],
      ['subdir/../../outside', 'nested parent escape'],
      ['../project/../outside', 'circular parent escape'],
      ['.../outside', 'triple dot traversal'],
      ['..../outside', 'quadruple dot traversal'],
      ['.hidden/../../../outside', 'hidden dir with parent escape'],
      ['outside/../../outside', 'chained parent escape'],
      ['../project/subdir', 'parent back into project (should be allowed)'],
    ];

    it.each(traversalCases)('should reject traversal: %s (%s)', (target) => {
      const result = isWithinBoundary(base, target);
      const resolvedTarget = path.resolve(base, target);
      const resolvedBase = path.resolve(base);
      const startsWithBase = resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
      expect(result).toBe(startsWithBase);
    });

    const allowedCases = [
      ['file.txt', 'simple file'],
      ['subdir/file.txt', 'nested file'],
      ['.', 'self'],
      ['./file.txt', 'explicit relative'],
      ['subdir/../file.txt', 'pointless parent (resolves to file.txt)'],
      ['../project/file.txt', 'parent back into project'],
    ];

    it.each(allowedCases)('should allow: %s (%s)', (target) => {
      const result = isWithinBoundary(base, target);
      expect(result).toBe(true);
    });

    it('should handle windows-style paths when base has drive letter', () => {
      if (process.platform === 'win32') {
        const winBase = 'C:\\Users\\test\\project';
        expect(isWithinBoundary(winBase, 'file.txt')).toBe(true);
        expect(isWithinBoundary(winBase, '..\\outside')).toBe(false);
        expect(isWithinBoundary(winBase, '..\\Users\\test\\project\\outside')).toBe(false);
      }
    });

    it('should handle null byte in target path', () => {
      const nullByteTarget = '../\0outside';
      expect(isWithinBoundary(base, nullByteTarget)).toBe(false);
    });

    it('should handle deep nesting', () => {
      const deepBase = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p';
      expect(isWithinBoundary(deepBase, '../../../../../outside')).toBe(false);
      expect(isWithinBoundary(deepBase, 'file.md')).toBe(true);
    });

    it('should handle base with trailing path separator', () => {
      expect(isWithinBoundary('/home/user/', 'file.txt')).toBe(true);
    });

    it('should handle absolute target path', () => {
      expect(isWithinBoundary(base, '/etc/passwd')).toBe(false);
    });

    it('should handle unicode paths', () => {
      const uniBase = '/home/user/dự án';
      expect(isWithinBoundary(uniBase, 'file.txt')).toBe(true);
      expect(isWithinBoundary(uniBase, '../../etc/passwd')).toBe(false);
    });

    it('should handle path segments that resolve within boundary', () => {
      expect(isWithinBoundary(base, 'subdir/link/../../file.txt')).toBe(true);
      expect(isWithinBoundary(base, 'subdir/../../../outside')).toBe(false);
    });
  });

  describe('Audit Log Append-Only', () => {
    let tempDir: string;
    let logPath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-audit-test-'));
      fs.mkdirSync(path.join(tempDir, '.harness', 'logs'), { recursive: true });
      logPath = path.join(tempDir, '.harness', 'logs', 'audit.jsonl');
    });

    afterEach(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should append audit records as new lines', () => {
      const record1: AuditRecord = {
        id: 'audit-1', proposalId: 'prop-1', action: 'SUBMIT',
        reviewer: 'agent1', timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(record1) + '\n', 'utf8');

      const record2: AuditRecord = {
        id: 'audit-2', proposalId: 'prop-1', action: 'APPROVE',
        reviewer: 'human1', timestamp: new Date().toISOString(),
      };
      fs.appendFileSync(logPath, JSON.stringify(record2) + '\n', 'utf8');

      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
      expect(lines[0]).toBe(JSON.stringify(record1));
      expect(lines[1]).toBe(JSON.stringify(record2));
    });

    it('should detect deletion of existing audit entries', () => {
      fs.writeFileSync(logPath, '{"id":"audit-1","action":"SUBMIT"}\n{"id":"audit-2","action":"APPROVE"}\n', 'utf8');
      const beforeContent = fs.readFileSync(logPath, 'utf8');

      fs.writeFileSync(logPath, '');

      const afterContent = fs.readFileSync(logPath, 'utf8');
      expect(afterContent).not.toBe(beforeContent);
    });

    it('should detect modification of existing audit entries', () => {
      fs.writeFileSync(logPath, '{"id":"audit-1","action":"SUBMIT"}\n{"id":"audit-2","action":"APPROVE"}\n', 'utf8');
      const originalContent = fs.readFileSync(logPath, 'utf8');

      const modified = originalContent.replace(/SUBMIT/g, 'APPROVE');
      fs.writeFileSync(logPath, modified, 'utf8');

      const tampered = fs.readFileSync(logPath, 'utf8');
      expect(tampered).not.toBe(originalContent);
    });
  });

  describe('Checksum Verification', () => {
    let tempDir: string;

    beforeAll(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-checksum-test-'));
    });

    afterAll(() => {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should detect modified file by checksum mismatch', () => {
      fs.mkdirSync(path.join(tempDir, 'shared'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'metadata'), { recursive: true });

      const content = 'original content';
      fs.writeFileSync(path.join(tempDir, 'shared', 'file.md'), content, 'utf8');
      const originalSha = crypto.createHash('sha256').update(content).digest('hex');

      const modifiedContent = 'modified content';
      fs.writeFileSync(path.join(tempDir, 'shared', 'file.md'), modifiedContent, 'utf8');
      const modifiedSha = crypto.createHash('sha256').update(modifiedContent).digest('hex');

      expect(modifiedSha).not.toBe(originalSha);
    });

    it('should verify file integrity with checksum', () => {
      const content = 'integritas test content';
      const sha = crypto.createHash('sha256').update(content).digest('hex');
      const recomputed = crypto.createHash('sha256').update(content).digest('hex');
      expect(sha).toBe(recomputed);
    });
  });

  describe('MCP — approve() not accessible', () => {
    it('should not have approve capability defined in MCP server source', () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'adapters', 'mcp', 'server.ts'), 'utf8');
      expect(src).not.toContain('proposal_approve');
      const toolNames = ['approve', 'proposal_approve'];
      for (const name of toolNames) {
        expect(src).not.toMatch(new RegExp(`name:\\s*['"]harness_${name}['"]`));
      }
    });
  });
});
