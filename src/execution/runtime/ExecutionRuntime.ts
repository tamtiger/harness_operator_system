import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
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
import { ProgressLedger, LEDGER_FILENAME } from '../ledger/ProgressLedger';
import { logger } from '../../shared/utils/logger';

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

  private ledger: ProgressLedger | null = null;
  private session: WorkflowSession | null = null;

  constructor(private registry: CapabilityRegistry) {}

  private loadSession(context: RuntimeContext): { session: WorkflowSession | null; sessionPath: string | null } {
    const runDir = path.join(context.metadata?.root?.path || '.', '.harness', 'run');
    if (!fs.existsSync(runDir)) return { session: null, sessionPath: null };

    const runFolders = fs.readdirSync(runDir)
      .filter(f => f.startsWith('run-'))
      .sort((a, b) => b.localeCompare(a));
    if (runFolders.length === 0) return { session: null, sessionPath: null };

    const latestSessionPath = path.join(runDir, runFolders[0], 'session.json');
    if (!fs.existsSync(latestSessionPath)) return { session: null, sessionPath: null };

    try {
      const session: WorkflowSession = JSON.parse(fs.readFileSync(latestSessionPath, 'utf8'));
      return { session, sessionPath: latestSessionPath };
    } catch {
      return { session: null, sessionPath: null };
    }
  }

  private loadPlanFromSession(session: WorkflowSession, rootPath: string): ExecutionStep[] {
    if (!session.planPath) return [];

    const planFullPath = path.join(rootPath, session.planPath.replace(/\//g, path.sep));
    if (!fs.existsSync(planFullPath)) return [];

    const planContent = fs.readFileSync(planFullPath, 'utf8');

    const steps: ExecutionStep[] = [];
    const taskRegex = /-\s*\[\s*\]\s*\*\*Task\s+(\d+)[*:]*\s*(.*)/g;
    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = taskRegex.exec(planContent)) !== null) {
      index++;
      const taskNum = match[1];
      const taskDesc = match[2].trim();
      const capId: CapabilityId = taskDesc.toLowerCase().includes('lint') ? 'harness.term.execute' :
        taskDesc.toLowerCase().includes('build') || taskDesc.toLowerCase().includes('test') ? 'harness.term.execute' :
        taskDesc.toLowerCase().includes('document') || taskDesc.toLowerCase().includes('changelog') ? 'harness.file.write' :
        'harness.file.read';

      steps.push({
        stepId: `plan-task-${taskNum}`,
        order: index,
        capabilityId: capId,
        input: { description: taskDesc },
        dependsOn: index > 1 ? [`plan-task-${index - 1}`] : undefined
      });
    }

    return steps;
  }

  private enforceHumanGate(phase: WorkflowPhase): Promise<boolean> {
    if (!phase.human_gate) return Promise.resolve(true);
    if (phase.completed) return Promise.resolve(true);
    if (process.env.HARNESS_AUTO_GATE === '1') return Promise.resolve(true);

    if (!process.stdin.isTTY) return Promise.resolve(true);

    return new Promise(resolve => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`\n[Human Gate] Phase "${phase.name}" requires approval. Proceed? (Y/n) `, answer => {
        rl.close();
        resolve(answer.trim().toLowerCase() !== 'n');
      });
    });
  }

  private checkPreActionSkills(context: RuntimeContext, request: TaskRequest): void {
    const skills = context.injectedSkills || [];
    if (skills.length === 0) return;

    const desc = request.description.toLowerCase();
    const matchingSkills = skills.filter(s => {
      const triggers = (s as any).triggers || [];
      return triggers.some((t: string) =>
        t === 'any' || desc.includes(t.toLowerCase())
      );
    });

    if (matchingSkills.length > 0) {
      logger.info(`[using-superpowers] ${matchingSkills.length} skill(s) match task "${request.description}": ${matchingSkills.map(s => s.metadata.id).join(', ')}`);
    }
  }

  private tryResumeFromLedger(context: RuntimeContext, taskId: string): ProgressLedger | null {
    const rootPath = context.metadata?.root?.path || '.';
    const runDir = path.join(rootPath, '.harness', 'run');
    if (!fs.existsSync(runDir)) return null;

    const runFolders = fs.readdirSync(runDir)
      .filter(f => f.startsWith('run-'))
      .sort((a, b) => b.localeCompare(a));
    if (runFolders.length === 0) return null;

    const sessionId = runFolders[0];
    const sessionJsonPath = path.join(runDir, sessionId, 'session.json');
    const ledgerPath = path.join(runDir, sessionId, LEDGER_FILENAME);

    if (fs.existsSync(sessionJsonPath)) return null;
    if (!fs.existsSync(ledgerPath)) return null;

    const recovered = ProgressLedger.fromLedgerFile(rootPath, sessionId);
    if (recovered) {
      logger.info(`[resume] Recovered progress from ledger: ${recovered.getPendingCount()} pending, ${recovered.getFailedCount()} failed`);
    }
    return recovered;
  }

  async execute(
    context: RuntimeContext,
    request: TaskRequest,
    signal?: AbortSignal,
    onStatus?: (status: TaskStatus) => void
  ): Promise<ExecutionResult> {
    const start = Date.now();
    const taskId = request.taskId || 'task-' + Math.random().toString(36).substring(2, 9);
    const rootPath = context.metadata?.root?.path || '.';

    if (!request.description) {
      throw execError('EXEC_002', { reason: 'Missing task description' });
    }

    // Pre-action skill check
    this.checkPreActionSkills(context, request);

    // Load session and set up ProgressLedger
    const loaded = this.loadSession(context);
    this.session = loaded.session;
    const sessionPath = loaded.sessionPath;

    if (this.session) {
      this.ledger = new ProgressLedger(rootPath, this.session.id);
      this.ledger.init();
    } else {
      // Try recovery from ledger if session.json is missing (compaction)
      this.ledger = this.tryResumeFromLedger(context, taskId);
    }

    const updateSessionPhase = (phaseName: string, statusUpdate: Partial<WorkflowPhase> = {}, sessionStatus?: 'active' | 'completed' | 'failed') => {
      if (!this.session || !sessionPath) return;
      this.session.updatedAt = new Date().toISOString();
      if (sessionStatus) this.session.status = sessionStatus;

      const phase = this.session.phases.find(p => p.name === phaseName);
      if (phase) {
        Object.assign(phase, statusUpdate);
        if (statusUpdate.completed) {
          phase.completedAt = new Date().toISOString();
        }
      }

      if (phaseName === 'execute' && !statusUpdate.completed) {
        this.session.currentPhase = 'execute';
      } else if (phaseName === 'execute' && statusUpdate.completed) {
        this.session.currentPhase = 'validate';
      } else if (phaseName === 'validate' && statusUpdate.completed) {
        this.session.currentPhase = 'validate';
      }

      fs.writeFileSync(sessionPath, JSON.stringify(this.session, null, 2), 'utf8');
    };

    const stateManager = new TaskStateManager(taskId);
    const results: any[] = [];
    let currentCapId: string = 'unknown';

    // Enforce human gates for pending phases
    if (this.session) {
      for (const phase of this.session.phases) {
        if (!phase.completed && phase.human_gate) {
          const approved = await this.enforceHumanGate(phase);
          if (!approved) {
            throw execError('EXEC_002', { reason: `Human gate denied for phase: ${phase.name}` });
          }
        }
      }
    }

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

      // Initialize ledger with plan steps
      if (this.ledger) {
        for (const step of orderedSteps) {
          this.ledger.startTask(taskId, step.stepId, step.capabilityId);
        }
      }

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
            if (this.ledger) this.ledger.failTask(taskId, step.stepId, 'Cancelled');
            throw execError('EXEC_005');
          }

          const policy = step.retryPolicy || DEFAULT_RETRY_POLICY;
          let attempt = 0;
          let success = false;
          let lastStepErr: any = null;

          while (attempt < policy.maxAttempts && !success) {
            attempt++;
            if (signal?.aborted) {
              if (this.ledger) this.ledger.failTask(taskId, step.stepId, 'Cancelled');
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
                if (this.ledger) this.ledger.failTask(taskId, step.stepId, 'Cancelled');
                throw execError('EXEC_005');
              }

              if (res.success) {
                results.push(res);
                success = true;
                if (this.ledger) this.ledger.completeTask(taskId, step.stepId);
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
            if (this.ledger) this.ledger.failTask(taskId, step.stepId, lastStepErr?.message || 'Unknown error');
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

      if (this.session && sessionPath) {
        this.session.status = 'failed';
        this.session.updatedAt = new Date().toISOString();
        fs.writeFileSync(sessionPath, JSON.stringify(this.session, null, 2), 'utf8');
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

    // Try to load steps from Planner session
    if (this.session) {
      const rootPath = context.metadata?.root?.path || '.';
      const sessionSteps = this.loadPlanFromSession(this.session, rootPath);
      if (sessionSteps.length > 0) {
        return {
          planId: 'plan-' + this.session.id,
          taskId,
          steps: sessionSteps,
          workflow: context.activeWorkflow
        };
      }
    }

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
      input = { path: 'package.json' };
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
