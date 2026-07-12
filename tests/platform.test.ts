import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPlatformService } from '../src/adapters/cli/factory';
import { PlatformServiceImpl } from '../src/platform/service';
import { TaskStatus } from '../src/shared/types/enums';
import { ProposalStatus } from '../src/shared/types/enums';
import { ProposalType } from '../src/shared/types/enums';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('M6 Platform Orchestration', () => {
  let platformService: PlatformServiceImpl;
  let tempDir: string;
  let tempShared: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-m6-test-'));
    tempShared = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-m6-shared-'));

    // Write a dummy harness.yaml manifest in tempDir
    const manifestYaml = `version: 2
specification: "4.0"
repository:
  name: test-repo
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
`;
    fs.mkdirSync(path.join(tempDir, '.harness', 'rules'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.harness', 'harness.yaml'), manifestYaml, 'utf8');
    fs.writeFileSync(path.join(tempDir, '.harness', 'repository-map.md'), `---
id: "test-map"
type: "repository-map"
name: "Test Map"
version: "1.0.0"
scope: "local"
---
# Map`, 'utf8');

    // Write AGENTS.md in tempDir
    fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# AGENTS CONTRACTS', 'utf8');

    // Create a mock package.json so capabilities can execute file reads
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'mock-pkg' }), 'utf8');

    platformService = createPlatformService(tempDir, tempShared);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(tempShared, { recursive: true, force: true });
  });

  describe('SharedHarnessInstaller', () => {
    it('should install successfully and pass integrity check', async () => {
      const res = await platformService.install({
        source: 'https://github.com/my-org/shared-harness.git',
        version: '2.1.0'
      });

      expect(res.success).toBe(true);
      expect(res.installedVersion).toBe('2.1.0');

      // Verify installed files
      const installedFile = path.join(tempShared, 'metadata', 'installed.yaml');
      expect(fs.existsSync(installedFile)).toBe(true);
    });

    it('should throw PLT_001 if source is unreachable', async () => {
      await expect(platformService.install({
        source: 'http://unreachable-source.git'
      })).rejects.toThrow();
    });

    it('should throw PLT_002 if checksum verification fails', async () => {
      await expect(platformService.install({
        source: 'http://checksum-fail.git',
        version: '2.0.0'
      })).rejects.toThrow();
    });
  });

  describe('DiagnosticsEngine (doctor)', () => {
    it('should report healthy when all checks pass', async () => {
      // Re-run installer to ensure healthy shared state
      await platformService.install({
        source: 'https://github.com/my-org/shared-harness.git',
        version: '2.1.0'
      });

      const report = await platformService.doctor();
      expect(report.overall).toBe('healthy');
      const names = report.checks.map(c => c.name);
      expect(names).toContain('shared_installed');
      expect(names).toContain('shared_checksum');
      expect(names).toContain('local_manifest');
      expect(names).toContain('agents_md');
    });

    it('should report critical when shared harness directory is missing', async () => {
      // Move shared directory out of the way
      const sharedDir = path.join(tempShared, 'shared');
      const backupPath = path.join(tempShared, 'shared_temp_bak');
      if (fs.existsSync(sharedDir)) {
        fs.renameSync(sharedDir, backupPath);
      }

      const report = await platformService.doctor();
      expect(report.overall).toBe('critical');

      // Restore it
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, sharedDir);
      }
    });
  });

  describe('SharedHarnessUpdater', () => {
    it('should skip update and return up_to_date if target version matches current', async () => {
      const res = await platformService.update({
        targetVersion: '2.1.0'
      });
      expect(res.success).toBe(true);
      expect(res.fromVersion).toBe('2.1.0');
      expect(res.toVersion).toBe('2.1.0');
    });

    it('should update successfully to new version', async () => {
      const res = await platformService.update({
        targetVersion: '2.2.0'
      });
      expect(res.success).toBe(true);
      expect(res.fromVersion).toBe('2.1.0');
      expect(res.toVersion).toBe('2.2.0');
    });

    it('should rollback to backup if update installer fails', async () => {
      // Trigger a failed update (using unreachable or bad checksum mock target version)
      await expect(platformService.update({
        targetVersion: '2.3.0-checksum-fail'
      })).rejects.toThrow();

      // Check version remained 2.2.0
      const content = fs.readFileSync(path.join(tempShared, 'metadata', 'installed.yaml'), 'utf8');
      expect(content).toContain('version: "2.2.0"');
    });
  });

  describe('AssetPublisher', () => {
    it('should handle publisher routines successfully', async () => {
      // Setup governance proposal mock
      const request = {
        title: 'New Prompt',
        description: 'Mock prompt',
        type: ProposalType.PROMPT,
        rationale: 'Needed',
        evidence: [],
        proposedContent: 'package.json'
      };

      const proposal = await platformService.submitProposal(request);
      
      // Approve proposal
      await platformService.approveProposal(proposal.id, 'reviewer-1', 'Approve');

      // Promote mock
      const govService = (platformService as any).orchestrator.gov;
      govService.promote(proposal.id);

      const pubRes = await platformService.publish({
        assetIds: [proposal.targetAsset || 'test-prompt'],
        commitMessage: 'Publish changes'
      });

      expect(pubRes.success).toBe(true);
    });
  });

  describe('PlatformOrchestrator Run', () => {
    it('should run execution pipeline sequentially', async () => {
      // Temporarily overwrite process.cwd() for orchestrator directory discovery
      const originalCwd = process.cwd;
      process.cwd = () => tempDir;

      try {
        const res = await platformService.run({
          description: 'read package.json'
        });

        expect(res.status).toBe(TaskStatus.COMPLETED);
        expect(res.results.length).toBe(1);
      } finally {
        process.cwd = originalCwd;
      }
    });
  });
});
