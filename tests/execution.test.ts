import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ExecutionServiceImpl } from '../src/execution/service';
import { TaskStateManager } from '../src/execution/runtime/TaskStateManager';
import { StepScheduler } from '../src/execution/scheduler/StepScheduler';
import { RetryManager, calcBackoff } from '../src/execution/retry/RetryManager';
import { TaskStatus } from '../src/shared/types/enums';
import { RuntimeContext } from '../src/shared/types/repository';
import { Permission } from '../src/shared/types/enums';
import { execError, capError } from '../src/shared/errors/factories';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('M5 Execution Runtime', () => {
  let execService: ExecutionServiceImpl;
  let mockContext: RuntimeContext;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-m5-test-'));
    
    // Write package.json so the file read test passes
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'mock-pkg' }), 'utf8');

    execService = new ExecutionServiceImpl();
    mockContext = {
      metadata: {
        root: { path: tempDir, hasGit: false, discoveredAt: '' },
        name: 'test',
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

    // Register a mock slow capability for cancellation tests
    const registry = (execService as any).runtime.registry;
    registry.register({
      metadata: {
        id: 'mock.slow',
        type: 'capability' as any,
        version: '1.0.0',
        name: 'Slow',
        scope: 'local' as any,
        source: 'local',
        createdAt: '',
        updatedAt: ''
      },
      capabilityId: 'mock.slow',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' }
    }, {
      async execute(): Promise<any> {
        return new Promise(resolve => setTimeout(() => resolve({}), 100));
      }
    });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('TaskStateManager', () => {
    it('should transition correctly along a valid path', () => {
      const state = new TaskStateManager('task-1');
      expect(state.getState().status).toBe(TaskStatus.CREATED);

      state.transition(TaskStatus.PLANNING);
      expect(state.getState().status).toBe(TaskStatus.PLANNING);

      state.transition(TaskStatus.RUNNING);
      expect(state.getState().status).toBe(TaskStatus.RUNNING);

      state.transition(TaskStatus.VERIFYING);
      expect(state.getState().status).toBe(TaskStatus.VERIFYING);

      state.transition(TaskStatus.COMPLETED);
      expect(state.getState().status).toBe(TaskStatus.COMPLETED);
    });

    it('should throw EXEC_010 on invalid state transitions', () => {
      const state = new TaskStateManager('task-2');
      expect(() => state.transition(TaskStatus.COMPLETED)).toThrow();
    });
  });

  describe('StepScheduler (Topological Sort)', () => {
    const scheduler = new StepScheduler();

    it('should schedule steps in dependencies order', () => {
      const plan = {
        planId: 'plan-1',
        taskId: 'task-1',
        steps: [
          { stepId: 'B', order: 0, capabilityId: 'harness.file.read', input: {}, dependsOn: ['A'] },
          { stepId: 'A', order: 0, capabilityId: 'harness.file.read', input: {} },
          { stepId: 'C', order: 0, capabilityId: 'harness.file.read', input: {}, dependsOn: ['B'] }
        ]
      };
      const scheduled = scheduler.schedule(plan);
      expect(scheduled.map(s => s.stepId)).toEqual(['A', 'B', 'C']);
    });

    it('should throw dependency cycle error', () => {
      const plan = {
        planId: 'plan-cycle',
        taskId: 'task-1',
        steps: [
          { stepId: 'A', order: 0, capabilityId: 'harness.file.read', input: {}, dependsOn: ['B'] },
          { stepId: 'B', order: 0, capabilityId: 'harness.file.read', input: {}, dependsOn: ['A'] }
        ]
      };
      expect(() => scheduler.schedule(plan)).toThrow();
    });
  });

  describe('RetryManager', () => {
    const retrier = new RetryManager();

    it('should calculate exponential backoff successfully', () => {
      expect(calcBackoff(1, 'exponential', 1000)).toBe(1000);
      expect(calcBackoff(2, 'exponential', 1000)).toBe(2000);
      expect(calcBackoff(3, 'exponential', 1000)).toBe(4000);
    });

    it('should determine whether or not to retry based on policy rules', () => {
      const policy = {
        maxAttempts: 3,
        backoffStrategy: 'linear' as const,
        backoffBaseMs: 500,
        retryOn: ['CAP_006'],
        noRetryOn: ['CAP_004']
      };

      const transientErr = capError('CAP_006', { details: 'Mock transient' });
      const fatalErr = capError('CAP_004', { details: 'Permission error' });

      expect(retrier.shouldRetry(transientErr, policy, 1)).toBe(true);
      expect(retrier.shouldRetry(fatalErr, policy, 1)).toBe(false);
      expect(retrier.shouldRetry(transientErr, policy, 3)).toBe(false);
    });
  });

  describe('ExecutionServiceImpl (Stateless Orchestrator)', () => {
    it('should execute package.json read task request smoothly', async () => {
      const res = await execService.execute(mockContext, {
        description: 'read package.json'
      });

      expect(res.status).toBe(TaskStatus.COMPLETED);
      expect(res.results.length).toBe(1);
    });

    it('should abort execution when cancellation is triggered', async () => {
      const longRequest = {
        description: 'run slow'
      };

      const execPromise = execService.execute(mockContext, longRequest);
      // Immediately cancel the task
      await execService.cancel(longRequest.taskId!);

      const result = await execPromise;
      expect(result.status).toBe(TaskStatus.CANCELLED);
    });
  });
});
