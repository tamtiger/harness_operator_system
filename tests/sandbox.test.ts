import { describe, it, expect, beforeEach } from 'vitest';
import { FileReadCapability, FileWriteCapability } from '../src/capability/builtin/fileOps';
import { RuntimeContext } from '../src/shared/types/repository';

describe('M6 Capability - Context Sandbox & Gateway', () => {
  let mockPersistence: any;
  let mockContext: RuntimeContext;

  beforeEach(() => {
    mockPersistence = {
      read: () => 'file content',
      write: () => {}
    };

    mockContext = {
      metadata: {
        root: { path: 'd:/MyProject/harness_operator_system', hasGit: false, discoveredAt: '' },
        manifest: { version: 2, specification: '4.0', repository: { root: '.' }, agent: { entry_point: 'AGENTS.md' }, artifacts: [] }
      }
    } as any;
  });

  it('should throw CAP_002 when attempting to read outside workspace boundary', async () => {
    const capability = new FileReadCapability(mockPersistence);
    
    await expect(
      capability.execute(mockContext, { path: '../outside.txt' })
    ).rejects.toSatisfy((err: any) => err.code === 'CAP_002');
  });

  it('should throw CAP_002 when attempting to write outside workspace boundary', async () => {
    const capability = new FileWriteCapability(mockPersistence);
    
    await expect(
      capability.execute(mockContext, { path: '../../escaped.ts', content: 'hack' })
    ).rejects.toSatisfy((err: any) => err.code === 'CAP_002');
  });

  it('should succeed when path lies inside workspace boundary', async () => {
    const capability = new FileReadCapability(mockPersistence);
    
    const result = await capability.execute(mockContext, { path: 'src/index.ts' });
    expect(result).toEqual({ content: 'file content' });
  });
});
