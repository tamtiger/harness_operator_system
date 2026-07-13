import { describe, it, expect, vi } from 'vitest';
import { ExecutionRuntime } from '../src/execution/runtime/ExecutionRuntime';
import { RuntimeContext } from '../src/shared/types/repository';

describe('M8 Runtime - Concurrency Engine', () => {
  it('should run independent steps in parallel and dependent steps sequentially', async () => {
    const executionTimes: Record<string, { start: number; end: number }> = {};

    const mockRegistry = {
      invoke: vi.fn().mockImplementation(async (id: string) => {
        const start = Date.now();
        executionTimes[id] = { start, end: 0 };
        // Wait 100ms to simulate work and allow overlap detection
        await new Promise(resolve => setTimeout(resolve, 100));
        executionTimes[id].end = Date.now();
        return { success: true };
      })
    };

    const runtime = new ExecutionRuntime(mockRegistry as any);

    const mockContext: RuntimeContext = {
      metadata: {
        root: { path: '.', hasGit: false, discoveredAt: '' },
        manifest: { version: 2, specification: '4.0', repository: { root: '.' }, agent: { entry_point: 'AGENTS.md' }, artifacts: [] }
      },
      assets: { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [], skills: [] },
      buildTimestamp: '',
      taskContext: {},
      budget: { totalTokens: 10000, allocated: { rules: 0, knowledge: 0, prompts: 0, workflows: 0, metadata: 0 }, remaining: 10000 },
      rankedRules: [],
      injectedSkills: [],
      availableCapabilities: []
    } as any;

    // Custom buildPlan override using a spy or structured mock input
    // We can inject activeWorkflow to simulate multiple steps
    const activeWorkflowContext: RuntimeContext = {
      ...mockContext,
      activeWorkflow: {
        metadata: { id: 'test-wf', type: 'workflow', version: '1.0.0', name: 'Test' },
        content: '',
        steps: [
          { id: 'step-1', capabilityId: 'cap-1' as any, input: {} },
          { id: 'step-2', capabilityId: 'cap-2' as any, input: {} },
          { id: 'step-3', capabilityId: 'cap-3' as any, input: {}, dependsOn: ['step-1', 'step-2'] }
        ]
      }
    } as any;

    const result = await runtime.execute(activeWorkflowContext, {
      taskId: 'test-concurrency-task',
      description: 'Run concurrent execution'
    });

    expect(result.status).toBe('COMPLETED');

    const cap1 = executionTimes['cap-1'];
    const cap2 = executionTimes['cap-2'];
    const cap3 = executionTimes['cap-3'];

    expect(cap1).toBeDefined();
    expect(cap2).toBeDefined();
    expect(cap3).toBeDefined();

    // cap-1 and cap-2 should run in parallel (their execution times overlap)
    // We check if cap-2 starts before cap-1 ends, meaning they ran concurrently.
    const ranInParallel = (cap2.start < cap1.end && cap2.start >= cap1.start) ||
                          (cap1.start < cap2.end && cap1.start >= cap2.start);
    expect(ranInParallel).toBe(true);

    // cap-3 should start strictly after both cap-1 and cap-2 end
    expect(cap3.start).toBeGreaterThanOrEqual(cap1.end);
    expect(cap3.start).toBeGreaterThanOrEqual(cap2.end);
  });
});
