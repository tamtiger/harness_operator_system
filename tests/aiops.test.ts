import { describe, it, expect } from 'vitest';
import { AISubagentCapability } from '../src/capability/builtin/aiOps';
import { RuntimeContext } from '../src/shared/types/repository';

describe('M7 AIOps Capability - Subagent Dispatcher', () => {
  it('should successfully dispatch a subagent and return simulated conversation metrics', async () => {
    const mockContext: RuntimeContext = {
      metadata: {
        root: { path: 'd:/MyProject/harness_operator_system', hasGit: false, discoveredAt: '' }
      }
    } as any;

    const capability = new AISubagentCapability();
    const result = await capability.execute(mockContext, {
      role: 'coder',
      prompt: 'Write hello world in python'
    });

    expect(result.success).toBe(true);
    expect(result.conversationId).toMatch(/^sub-[\w]+$/);
    expect(result.result).toContain('Task completed successfully by subagent [coder]');
  });
});
