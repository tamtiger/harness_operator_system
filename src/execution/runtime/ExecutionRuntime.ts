import * as fs from 'fs';
import * as path from 'path';
import { RuntimeContext } from '../../shared/types/repository';
import { TaskRequest, ExecutionResult, ExecutionPlan, ExecutionStep, WorkflowSession, WorkflowPhase } from '../../shared/types/execution';
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

    // Try to find the latest active session to track lifecycle
    let sessionPath: string | undefined;
    let session: WorkflowSession | undefined;
    const runDir = path.join(context.metadata?.root?.path || '.', '.harness', 'run');
    if (fs.existsSync(runDir)) {
      const runFolders = fs.readdirSync(runDir)
        .filter(f => f.startsWith('run-'))
        .sort((a, b) => b.localeCompare(a));
      if (runFolders.length > 0) {
        const latestSessionPath = path.join(runDir, runFolders[0], 'session.json');
        if (fs.existsSync(latestSessionPath)) {
          sessionPath = latestSessionPath;
          try {
            session = JSON.parse(fs.readFileSync(latestSessionPath, 'utf8'));
          } catch { /* ignore */ }
        }
      }
    }

    const updateSessionPhase = (phaseName: string, statusUpdate: Partial<WorkflowPhase> = {}, sessionStatus?: 'active' | 'completed' | 'failed') => {
      if (!session || !sessionPath) return;
      session.updatedAt = new Date().toISOString();
      if (sessionStatus) session.status = sessionStatus;
      
      const phase = session.phases.find(p => p.name === phaseName);
      if (phase) {
        Object.assign(phase, statusUpdate);
        if (statusUpdate.completed) {
          phase.completedAt = new Date().toISOString();
        }
      }

      if (phaseName === 'execute' && !statusUpdate.completed) {
        session.currentPhase = 'execute';
      } else if (phaseName === 'execute' && statusUpdate.completed) {
        session.currentPhase = 'validate';
      } else if (phaseName === 'validate' && statusUpdate.completed) {
        session.currentPhase = 'validate';
      }

      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
    };

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
      updateSessionPhase('execute', { completed: false });

      // 3. Build layers of execution based on dependency trees
      const layers: ExecutionStep[][] = [];
      const remainingSteps = new Set<string>(orderedSteps.map(s => s.stepId));
      const completedSteps = new Set<string>();

      while (remainingSteps.size > 0) {
        const currentLayer: ExecutionStep[] = [];
        for (const stepId of remainingSteps) {
          const step = orderedSteps.find(s => s.stepId === stepId)!;
          const deps = step.dependsOn || [];
          const allDepsMet = deps.every(d => completedSteps.has(d));
          if (allDepsMet) {
            currentLayer.push(step);
          }
        }

        if (currentLayer.length === 0) {
          throw execError('EXEC_009', { stepId: Array.from(remainingSteps).join(','), dep: 'dependency-cycle' });
        }

        layers.push(currentLayer);
        currentLayer.forEach(s => {
          remainingSteps.delete(s.stepId);
          completedSteps.add(s.stepId);
        });
      }

      // 4. Execute layers concurrently
      let processedSteps = 0;
      for (const layer of layers) {
        await Promise.all(layer.map(async (step) => {
          currentCapId = step.capabilityId;
          
          if (signal?.aborted) {
            throw execError('EXEC_005');
          }

          const policy = step.retryPolicy || DEFAULT_RETRY_POLICY;
          let attempt = 0;
          let success = false;
          let lastStepErr: any = null;

          while (attempt < policy.maxAttempts && !success) {
            attempt++;
            if (signal?.aborted) {
              throw execError('EXEC_005');
            }

            try {
              const timeout = step.timeout || 30000;
              const res = await invokeWithTimeout(
                () => this.registry.invoke(step.capabilityId, context, step.input),
                timeout,
                signal
              );
              
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

          processedSteps++;
          stateManager.updateProgress(processedSteps, orderedSteps.length);
        }));
      }

      // 4. Verification
      updateSessionPhase('execute', { completed: true });
      stateManager.transition(TaskStatus.VERIFYING);
      onStatus?.(TaskStatus.VERIFYING);
      updateSessionPhase('validate', { completed: false });
      this.verifier.verify(results, context);

      // 5. Completion
      stateManager.transition(TaskStatus.COMPLETED);
      onStatus?.(TaskStatus.COMPLETED);
      updateSessionPhase('validate', { completed: true }, 'completed');
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

        if (session && sessionPath) {
          session.status = 'failed';
          session.updatedAt = new Date().toISOString();
          fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');
        }

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
