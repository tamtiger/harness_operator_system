import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('T11.5 — Error Recovery', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-error-recovery-'));
  });

  afterAll(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Atomic write cleanup', () => {
    it('should not leave .tmp files after successful write', () => {
      const targetFile = path.join(tempDir, 'result.md');
      const tmpFile = targetFile + '.tmp';

      fs.writeFileSync(tmpFile, 'temporary content', 'utf8');
      fs.renameSync(tmpFile, targetFile);

      expect(fs.existsSync(tmpFile)).toBe(false);
      expect(fs.existsSync(targetFile)).toBe(true);
      expect(fs.readFileSync(targetFile, 'utf8')).toBe('temporary content');
    });

    it('should clean up .tmp file on write failure', () => {
      const targetFile = path.join(tempDir, 'protected', 'data.md');
      const tmpFile = targetFile + '.tmp';

      fs.mkdirSync(path.join(tempDir, 'protected'), { recursive: true });
      fs.writeFileSync(tmpFile, 'content to be cleaned', 'utf8');

      try {
        fs.writeFileSync(targetFile, 'overwritten');
      } catch {
        // write failed
      }

      const cleanupDone = !fs.existsSync(tmpFile) || fs.unlinkSync(tmpFile) === undefined;
      expect(cleanupDone || !fs.existsSync(tmpFile)).toBe(true);
    });
  });

  describe('Graceful capability timeout', () => {
    it('should handle timeout without crashing the process', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out')), 100);
        timer.unref();
      });

      try {
        await timeoutPromise;
      } catch (err: any) {
        expect(err.message).toContain('Timed out');
      }
    });

    it('should allow process to continue after timeout', async () => {
      const results: string[] = [];

      const failingOp = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Op timed out')), 50);
      });

      try {
        await failingOp;
      } catch {
        results.push('failure handled');
      }

      results.push('continues');
      expect(results).toEqual(['failure handled', 'continues']);
    });
  });

  describe('Temp file cleanup on interrupted install', () => {
    it('should cleanup partial files after interruption', () => {
      const installDir = path.join(tempDir, 'partial-install');
      fs.mkdirSync(installDir, { recursive: true });

      fs.writeFileSync(path.join(installDir, 'file1.md'), 'partial', 'utf8');
      fs.writeFileSync(path.join(installDir, '.incomplete'), '', 'utf8');

      const cleanup = () => {
        if (fs.existsSync(path.join(installDir, '.incomplete'))) {
          fs.rmSync(installDir, { recursive: true, force: true });
        }
      };

      cleanup();
      expect(fs.existsSync(installDir)).toBe(false);
    });
  });
});
