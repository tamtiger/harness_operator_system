import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CapabilityServiceImpl } from '../src/capability/service';
import { RuntimeContext } from '../src/shared/types/repository';
import { AssetType, AssetScope, Permission } from '../src/shared/types/enums';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('M4 Capability Registry & Invocation', () => {
  let service: CapabilityServiceImpl;
  let mockContext: RuntimeContext;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-m4-test-'));
    service = new CapabilityServiceImpl();

    mockContext = {
      metadata: {
        root: { path: tempDir, hasGit: false, discoveredAt: '' },
        name: 'test-project',
        manifest: {
          version: 2,
          specification: '4.0',
          repository: { root: '.' },
          agent: { entry_point: 'AGENTS.md' },
          artifacts: []
        },
        discoveredAt: ''
      },
      assets: {
        rules: [],
        prompts: [],
        templates: [],
        workflows: [],
        knowledge: [],
        hooks: [],
        capabilities: []
      },
      taskContext: {},
      budget: {
        totalTokens: 10000,
        allocated: { rules: 0, knowledge: 0, prompts: 0, workflows: 0, metadata: 0 },
        remaining: 10000
      },
      rankedRules: [],
      relevantKnowledge: [],
      availableCapabilities: [],
      permissions: [Permission.READ_FILE, Permission.WRITE_FILE],
      buildTimestamp: ''
    };
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list all 27 built-in capabilities', () => {
    const list = service.list();
    expect(list.length).toBe(27);
  });

  it('should invoke harness.file.write and harness.file.read correctly', async () => {
    const writeRes = await service.invoke('harness.file.write', mockContext, {
      path: 'sample.txt',
      content: 'Hello Capability World!'
    });

    expect(writeRes.success).toBe(true);

    const readRes = await service.invoke('harness.file.read', mockContext, {
      path: 'sample.txt'
    });

    expect(readRes.success).toBe(true);
    expect((readRes.output as any).content).toBe('Hello Capability World!');
  });

  it('should throw CAP_002 on input validation mismatch', async () => {
    const res = await service.invoke('harness.file.read', mockContext, {
      wrongKey: 'sample.txt'
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CAP_002');
  });

  it('should throw CAP_004 on unauthorized permission access', async () => {
    const restrictedContext = {
      ...mockContext,
      permissions: [] // No permissions granted
    };

    const res = await service.invoke('harness.file.read', restrictedContext, {
      path: 'sample.txt'
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CAP_004');
  });

  it('should throw CAP_005 on execution timeout', async () => {
    // Register mock slow capability
    const slowDef = {
      metadata: {
        id: 'mock.slow',
        type: AssetType.CAPABILITY,
        version: '1.0.0',
        name: 'Slow Capability',
        scope: AssetScope.LOCAL,
        source: 'local',
        createdAt: '',
        updatedAt: ''
      },
      content: '',
      capabilityId: 'mock.slow',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      timeout: 50 // 50ms timeout
    };

    const slowImpl = {
      async execute(): Promise<any> {
        return new Promise(resolve => setTimeout(() => resolve({}), 200));
      }
    };

    service.register(slowDef as any, slowImpl);

    const res = await service.invoke('mock.slow', mockContext, {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CAP_005');
  });
});
