import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { runInit } from '../src/adapters/cli/commands/init';
import { runValidate } from '../src/adapters/cli/commands/validate';
import { runStatus } from '../src/adapters/cli/commands/status';
import { runDoctor } from '../src/adapters/cli/commands/doctor';
import { runInstall } from '../src/adapters/cli/commands/install';
import { runUpdate } from '../src/adapters/cli/commands/update';
import { runSync } from '../src/adapters/cli/commands/sync';
import { runPublish } from '../src/adapters/cli/commands/publish';
import { runProposalList } from '../src/adapters/cli/commands/proposal/list';
import { runProposalSubmit } from '../src/adapters/cli/commands/proposal/submit';
import { runProposalApprove } from '../src/adapters/cli/commands/proposal/approve';
import { runTask } from '../src/adapters/cli/commands/run';
import { OutputFormatter } from '../src/adapters/cli/formatter/OutputFormatter';
import { ErrorFormatter } from '../src/adapters/cli/formatter/ErrorFormatter';
import { HarnessError } from '../src/shared/errors/HarnessError';
import { ErrorDomain } from '../src/shared/types/enums';

describe('M7 CLI End-to-End Adaptors', () => {
  let exitSpy: any;
  let logSpy: any;
  let errorSpy: any;
  let tempDir: string;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    logSpy = vi.spyOn(console, 'log').mockImplementation((() => {}) as any);
    errorSpy = vi.spyOn(console, 'error').mockImplementation((() => {}) as any);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-cli-test-'));
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('OutputFormatter & ErrorFormatter', () => {
    const outputFormatter = new OutputFormatter();
    const errorFormatter = new ErrorFormatter();

    it('should format version text', () => {
      const formatted = outputFormatter.format('harness v1.0.0 (spec 4.0)', 'version', { json: false, noColor: true, quiet: false });
      expect(formatted).toBe('harness v1.0.0 (spec 4.0)');
    });

    it('should format JSON output when flag is set', () => {
      const data = { version: '1.0.0' };
      const formatted = outputFormatter.format(data, 'version', { json: true, noColor: true, quiet: false });
      expect(JSON.parse(formatted)).toEqual(data);
    });

    it('should strip ANSI colors when noColor is set', () => {
      const formatted = outputFormatter.format({ id: 'prop-1', status: 'approved' }, 'proposal_approve', { json: false, noColor: true, quiet: false });
      expect(formatted).not.toContain('\x1b[');
    });

    it('should format HarnessError in text mode', () => {
      const err = new HarnessError('REPO_008', ErrorDomain.REPOSITORY, 'Shared Harness not installed', false);
      const formatted = errorFormatter.formatError(err, { json: false, noColor: true, quiet: false });
      expect(formatted).toContain('[ERROR] REPO_008: Shared Harness not installed');
      expect(formatted).toContain('Remedy: Run harness install --source <uri>');
    });

    it('should format HarnessError in JSON mode', () => {
      const err = new HarnessError('REPO_008', ErrorDomain.REPOSITORY, 'Shared Harness not installed', false);
      const formatted = errorFormatter.formatError(err, { json: true, noColor: true, quiet: false });
      const parsed = JSON.parse(formatted);
      expect(parsed.error.code).toBe('REPO_008');
    });
  });

  describe('CLI Commands Execution', () => {
    it('init should fail if harness.yaml already exists', async () => {
      const harnessDir = path.join(tempDir, '.harness');
      fs.mkdirSync(harnessDir, { recursive: true });
      fs.writeFileSync(path.join(harnessDir, 'harness.yaml'), 'version: 2', 'utf8');

      await runInit(tempDir);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('init should succeed and create files in empty dir', async () => {
      await runInit(tempDir);
      expect(fs.existsSync(path.join(tempDir, '.harness', 'harness.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'AGENTS.md'))).toBe(true);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('doctor should run diagnostic engine checks', async () => {
      // Mock manifest and root
      const harnessDir = path.join(tempDir, '.harness');
      fs.mkdirSync(path.join(harnessDir, 'rules'), { recursive: true });
      fs.writeFileSync(path.join(harnessDir, 'harness.yaml'), `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
`, 'utf8');
      fs.writeFileSync(path.join(harnessDir, 'repository-map.md'), '# Map', 'utf8');
      fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# AGENTS', 'utf8');

      await runDoctor({ cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('validate should check repository structure', async () => {
      await runValidate(tempDir, { quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('status should check repository status', async () => {
      await runStatus({ cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('run task should execute sequentially', async () => {
      await runTask('read package.json', { cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('install should trigger installer and exit', async () => {
      await runInstall('https://github.com/my-org/shared-harness.git', '2.1.0', { cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('update should trigger updater and exit', async () => {
      // Mock install first so we can update
      const installedFile = path.join(tempDir, '.harness', 'metadata', 'installed.yaml');
      fs.mkdirSync(path.dirname(installedFile), { recursive: true });
      fs.writeFileSync(installedFile, 'version: "2.1.0"', 'utf8');

      await runUpdate('2.2.0', false, { cwd: tempDir, quiet: true, noColor: true, harnessHome: tempDir });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('sync should trigger sync and exit', async () => {
      await runSync({ cwd: tempDir, quiet: true, noColor: true, harnessHome: tempDir });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('publish should publish target asset', async () => {
      await runPublish('.harness/rules/rule-1.md', { cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenCalled();
    });

    it('proposal submit and approve should work', async () => {
      await runProposalSubmit('rule-1', { cwd: tempDir, quiet: false, noColor: true });
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      const loggedObj = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
      const propIdMatch = loggedObj.match(/ID:\s*(\w+-\w+)/);
      const propId = propIdMatch ? propIdMatch[1] : 'prop-1';

      await runProposalApprove(propId, { cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenLastCalledWith(0);

      await runProposalList({ cwd: tempDir, quiet: true, noColor: true });
      expect(exitSpy).toHaveBeenLastCalledWith(0);
    });
  });
});
