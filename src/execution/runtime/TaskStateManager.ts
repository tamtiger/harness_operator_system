import { TaskStatus } from '../../shared/types/enums';
import { TaskState } from '../../shared/types/execution';
import { execError } from '../../shared/errors/factories';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.CREATED]:    [TaskStatus.PLANNING],
  [TaskStatus.PLANNING]:   [TaskStatus.RUNNING, TaskStatus.FAILED],
  [TaskStatus.RUNNING]:    [TaskStatus.VERIFYING, TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskStatus.VERIFYING]:  [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.RUNNING],
  [TaskStatus.COMPLETED]:  [],
  [TaskStatus.FAILED]:     [],
  [TaskStatus.CANCELLED]:  [],
};

export class TaskStateManager {
  private state: TaskState;

  constructor(taskId: string) {
    this.state = {
      taskId,
      status: TaskStatus.CREATED,
      createdAt: new Date().toISOString(),
      currentStep: 0,
      totalSteps: 0,
      retryCount: 0
    };
  }

  transition(to: TaskStatus): void {
    const from = this.state.status;
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw execError('EXEC_010', { from, to });
    }
    this.state.status = to;
    if (to === TaskStatus.RUNNING && !this.state.startedAt) {
      this.state.startedAt = new Date().toISOString();
    }
    if ((to === TaskStatus.COMPLETED || to === TaskStatus.FAILED || to === TaskStatus.CANCELLED) && !this.state.completedAt) {
      this.state.completedAt = new Date().toISOString();
    }
  }

  getState(): TaskState {
    return { ...this.state };
  }

  updateProgress(currentStep: number, totalSteps: number): void {
    this.state.currentStep = currentStep;
    this.state.totalSteps = totalSteps;
  }

  incrementRetry(): void {
    this.state.retryCount++;
  }

  setError(err: any): void {
    this.state.lastError = err;
  }
}
