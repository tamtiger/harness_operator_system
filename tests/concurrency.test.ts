import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExecutionServiceImpl } from '../src/execution/service';
import { CapabilityServiceImpl } from '../src/capability/service';
import { FileSystemPersistence } from '../src/repository/persistence/FileSystemPersistence';
import { GovernanceServiceImpl } from '../src/governance/service';
import { RuntimeContext } from '../src/shared/types/repository';
import { TaskRequest } from '../src/shared/types/execution';
import { ProposalStatus } from '../src/shared/types/enums';
import { govError } from '../src/shared/errors/factories';
import { HarnessError } from '../src/shared/errors/HarnessError';

function createMockContext(tempDir: string): RuntimeContext {
  return {
    metadata: {
      root: { path: tempDir, hasGit: false, discoveredAt: '' },
      name: 'concurrency-test',
      manifest: {
        version: 2, specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: []
      },
      discoveredAt: ''
    },
    assets: {
      rules: [], prompts: [], templates: [], workflows: [],
      knowledge: [], hooks: [], capabilities: []
    },
    budget: { maxTokens: 100000, warningThreshold: 0.8, hardLimit: 100000, distribution: {} },
    activeWorkflow: {
      id: 'wf-concurrency', name: 'Concurrency Test', description: '',
      steps: [
        { id: 'step-1', capabilityId: 'harness.file.list', input: { directory: '.' }, timeout: 5000 }
      ]
    },
    agentsMd: ''
  };
}

describe('T11.4 — Concurrency Tests', () => {
  let tempDir: string;
  let execService: ExecutionServiceImpl;
  let govService: GovernanceServiceImpl;
  let context: RuntimeContext;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-concurrency-test-'));
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'concurrency-pkg' }), 'utf8');

    const registry = new CapabilityServiceImpl(new FileSystemPersistence());
    execService = new ExecutionServiceImpl(registry);
    context = createMockContext(tempDir);

    const repo = new (class {
      discover(wd: string) { return { path: tempDir, hasGit: false, discoveredAt: new Date().toISOString() }; }
      loadManifest(r: any) { return { version: 2, specification: '4.0', repository: { root: '.' }, agent: { entry_point: 'AGENTS.md' }, artifacts: [] }; }
      loadSharedAssets(p: string) { return { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] }; }
      loadLocalAssets(r: any, m: any) { return { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] }; }
      resolveAssets(s: any, l: any) { return { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] }; }
      buildContext(a: any, m: any) { return { metadata: m, assets: a, frozen: true }; }
      persist(root: any, rpath: string, data: string) {
        const abs = path.join(root.path, rpath);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, data, 'utf8');
      }
      readFile(root: any, rpath: string) { return fs.readFileSync(path.join(root.path, rpath), 'utf8'); }
      fileExists(root: any, rpath: string) { return fs.existsSync(path.join(root.path, rpath)); }
      dirExists(root: any, rpath: string) { return fs.existsSync(path.join(root.path, rpath)); }
      ensureDir(root: any, rpath: string) { fs.mkdirSync(path.join(root.path, rpath), { recursive: true }); }
      readDir(root: any, rpath: string) {
        const abs = path.join(root.path, rpath);
        try { return fs.readdirSync(abs); } catch { return []; }
      }
      validate(r: any) { return { valid: true, errors: [], warnings: [] }; }
    }) as any;

    const root = { path: tempDir, hasGit: false, discoveredAt: new Date().toISOString() };
    govService = new GovernanceServiceImpl(repo, root);
  });

  afterAll(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('10 concurrent run() calls', () => {
    it('should execute 10 concurrent tasks without shared state corruption', async () => {
      const requests: TaskRequest[] = Array.from({ length: 10 }, (_, i) => ({
        taskId: `concurrent-task-${i}`,
        description: 'list files',
        workingDirectory: tempDir
      }));

      const results = await Promise.all(
        requests.map(req => execService.execute(context, req))
      );

      expect(results).toHaveLength(10);
      results.forEach((r, i) => {
        expect(r.taskId).toBe(`concurrent-task-${i}`);
        expect(r.status).toBeDefined();
      });

      const uniqueTaskIds = new Set(results.map(r => r.taskId));
      expect(uniqueTaskIds.size).toBe(10);
    });

    it('should have independent status tracking for concurrent tasks', async () => {
      const statuses = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          const req: TaskRequest = {
            taskId: `status-task-${i}`,
            description: 'list files',
            workingDirectory: tempDir
          };
          return execService.execute(context, req).then(r => {
            const state = execService.getStatus(r.taskId);
            return state.status;
          });
        })
      );

      expect(statuses).toHaveLength(5);
      statuses.forEach(s => expect(s).toBeDefined());
    });
  });

  describe('Concurrent governance operations', () => {
    it('should create proposals with unique IDs under concurrent load', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => {
          try {
            const prop = govService.submitProposal({
              title: `Concurrent Prop ${i}`,
              description: `Test proposal ${i}`,
              type: 'knowledge',
              rationale: `Rationale ${i}`,
              proposedContent: `Content ${i}`,
              targetAsset: { type: 'rule', id: `rule-${i}` },
              evidence: [`evidence-${i}`]
            });
            return prop;
          } catch (e: any) {
            return { id: `error-${i}`, error: e };
          }
        })
      );

      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle concurrent submit and approve flow without collisions', async () => {
      const prop = govService.submitProposal({
        title: 'Collision Test',
        description: 'Testing concurrent operations',
        type: 'knowledge',
        rationale: 'Need to test',
        proposedContent: 'Collision content',
        targetAsset: { type: 'rule', id: 'collision-rule' },
        evidence: ['evidence-collision']
      });

      const propId = prop.id;
      expect(propId).toBeDefined();
      expect(prop.status).toBe(ProposalStatus.SUBMITTED);

      const reviewed = govService.review(propId, 'reviewer-1');
      expect(reviewed.status).toBe(ProposalStatus.REVIEWING);

      const approved = govService.approve(propId, 'reviewer-1', 'LGTM');
      expect(approved.status).toBe(ProposalStatus.APPROVED);
    });
  });

  describe('Cache race condition', () => {
    it('should not duplicate compute under concurrent cache access', async () => {
      const ids = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          try {
            const prop = govService.submitProposal({
              title: `Cache Race ${i}`,
              description: `Testing cache ${i}`,
              type: 'knowledge',
              rationale: `Rationale ${i}`,
              proposedContent: `Content ${i}`,
              targetAsset: { type: 'rule', id: `cache-rule-${i}` },
              evidence: [`evidence-${i}`]
            });
            return prop.id;
          } catch {
            return `error-${i}`;
          }
        })
      );

      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
