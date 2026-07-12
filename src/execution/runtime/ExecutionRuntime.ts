import { RuntimeContext } from '../../shared/types/repository';
import { TaskRequest, ExecutionResult, ExecutionPlan, ExecutionStep } from '../../shared/types/execution';
import { TaskStatus } from '../../shared/types/enums';
import { CapabilityRegistry } from '../../shared/contracts/services';
import { TaskStateManager } from './TaskStateManager';
import { StepScheduler } from '../scheduler/StepScheduler';
import { ResultVerifier } from '../verifier/ResultVerifier';
import { RetryManager, calcBackoff, DEFAULT_RETRY_POLICY } from '../retry/RetryManager';
import { execError } from '../../shared/errors/factories';
import { HarnessError } from '../../shared/errors/HarnessError';
import { CapabilityId } from '../../shared/types/primitives';

function invokeWithTimeout<T>(
  invoke: () => Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Step timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(execError('EXEC_005'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    invoke().then(
      (val) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}

export class ExecutionRuntime {
  private scheduler = new StepScheduler();
  private verifier = new ResultVerifier();
  private retryManager = new RetryManager();

  constructor(private registry: CapabilityRegistry) {}

  async execute(
    context: RuntimeContext,
    request: TaskRequest,
    signal?: AbortSignal,
    onStatus?: (status: TaskStatus) => void
  ): Promise<ExecutionResult> {
    const start = Date.now();
    const taskId = request.taskId || 'task-' + Math.random().toString(36).substring(2, 9);
    
    if (!request.description) {
      throw execError('EXEC_002', { reason: 'Missing task description' });
    }

    const stateManager = new TaskStateManager(taskId);
    const results: any[] = [];
    let currentCapId: string = 'unknown';

    try {
      // 1. Build execution plan
      stateManager.transition(TaskStatus.PLANNING);
      onStatus?.(TaskStatus.PLANNING);
      const plan = this.buildPlan(taskId, context, request);

      // 2. Schedule steps
      stateManager.transition(TaskStatus.RUNNING);
      onStatus?.(TaskStatus.RUNNING);
      const orderedSteps = this.scheduler.schedule(plan);
      stateManager.updateProgress(0, orderedSteps.length);

      // 3. Loop through steps
      for (let i = 0; i < orderedSteps.length; i++) {
        const step = orderedSteps[i];
        currentCapId = step.capabilityId;
        
        // Check cancellation
        if (signal?.aborted) {
          throw execError('EXEC_005');
        }

        stateManager.updateProgress(i + 1, orderedSteps.length);

        const policy = step.retryPolicy || DEFAULT_RETRY_POLICY;
        let attempt = 0;
        let success = false;
        let lastStepErr: any = null;

        while (attempt < policy.maxAttempts && !success) {
          attempt++;
          // Check cancellation
          if (signal?.aborted) {
            throw execError('EXEC_005');
          }

          try {
            // Setup timeout abort
            const timeout = step.timeout || 30000;
            const res = await invokeWithTimeout(
              () => this.registry.invoke(step.capabilityId, context, step.input),
              timeout,
              signal
            );
            
            // Check cancellation
            if (signal?.aborted) {
              throw execError('EXEC_005');
            }

            if (res.success) {
              results.push(res);
              success = true;
            } else {
              throw res.error || new Error('Step execution failed');
            }
          } catch (err: any) {
            lastStepErr = err;
            const harnessErr = err instanceof HarnessError ? err : execError('EXEC_003', { capId: step.capabilityId, reason: err.message });
            stateManager.setError(harnessErr);

            const willRetry = this.retryManager.shouldRetry(harnessErr, policy, attempt);
            if (willRetry) {
              stateManager.incrementRetry();
              const delay = calcBackoff(attempt, policy.backoffStrategy || 'exponential', policy.backoffBaseMs || 1000);
              if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } else {
              break;
            }
          }
        }

        if (!success) {
          throw lastStepErr instanceof HarnessError ? lastStepErr : execError('EXEC_007', { capId: step.capabilityId, attempts: attempt });
        }
      }

      // 4. Verification
      stateManager.transition(TaskStatus.VERIFYING);
      onStatus?.(TaskStatus.VERIFYING);
      this.verifier.verify(results, context);

      // 5. Completion
      stateManager.transition(TaskStatus.COMPLETED);
      onStatus?.(TaskStatus.COMPLETED);
      return {
        taskId,
        status: TaskStatus.COMPLETED,
        results,
        startedAt: stateManager.getState().startedAt || new Date().toISOString(),
        completedAt: stateManager.getState().completedAt || new Date().toISOString(),
        durationMs: Date.now() - start
      };

      } catch (err: any) {
        let status = TaskStatus.FAILED;
        if (err.code === 'EXEC_005' || signal?.aborted) {
          status = TaskStatus.CANCELLED;
        }
        try {
          stateManager.transition(status);
        } catch (e) { /* ignore */ }
        onStatus?.(status);

        const harnessErr = err instanceof HarnessError ? err : execError('EXEC_003', { capId: currentCapId, reason: err.message });
        return {
          taskId,
          status,
          results,
          startedAt: stateManager.getState().startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - start,
          error: harnessErr
        };
      }
    }

    private buildPlan(taskId: string, context: RuntimeContext, request: TaskRequest): ExecutionPlan {
      const steps: ExecutionStep[] = [];

      // Check active workflow
      if (context.activeWorkflow) {
        context.activeWorkflow.steps.forEach((step, idx) => {
          steps.push({
            stepId: step.id,
            order: idx + 1,
            capabilityId: step.capabilityId,
            input: step.input,
            dependsOn: step.dependsOn
          });
        });
        return {
          planId: 'plan-' + Math.random().toString(36).substring(2, 9),
          taskId,
          steps,
          workflow: context.activeWorkflow
        };
      }

      // Default plan: single-step based on description mapping
      let capabilityId: CapabilityId = 'harness.file.list';
      let input: any = { directory: '.' };
      const desc = request.description.toLowerCase();

      if (desc.includes('read') || desc.includes('view')) {
        capabilityId = 'harness.file.read';
        input = { path: 'package.json' }; // sample mapping fallback
      } else if (desc.includes('write') || desc.includes('create')) {
        capabilityId = 'harness.file.write';
        input = { path: 'dummy.txt', content: 'Fallback' };
      }

    steps.push({
      stepId: 'default-step-1',
      order: 1,
      capabilityId,
      input
    });

    return {
      planId: 'plan-default',
      taskId,
      steps
    };
  }
}
