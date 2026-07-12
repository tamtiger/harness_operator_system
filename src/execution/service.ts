import { CapabilityRegistry, ExecutionService } from '../shared/contracts/services';
import { TaskRequest, ExecutionResult, CancelResult, TaskState } from '../shared/types/execution';
import { RuntimeContext } from '../shared/types/repository';
import { TaskStatus } from '../shared/types/enums';
import { ExecutionRuntime } from './runtime/ExecutionRuntime';

export class ExecutionServiceImpl implements ExecutionService {
  private abortControllers = new Map<string, AbortController>();
  private statusMap = new Map<string, TaskState>();
  private runtime: ExecutionRuntime;

  constructor(registry: CapabilityRegistry) {
    this.runtime = new ExecutionRuntime(registry);
  }

  async execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult> {
    const taskId = request.taskId || 'task-' + Math.random().toString(36).substring(2, 9);
    request.taskId = taskId;

    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);
    const signal = abortController.signal;

    const onStatus = (status: TaskStatus) => {
      const existing = this.statusMap.get(taskId);
      if (existing) {
        existing.status = status;
        if (status === TaskStatus.RUNNING && !existing.startedAt) {
          existing.startedAt = new Date().toISOString();
        }
        if ((status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) && !existing.completedAt) {
          existing.completedAt = new Date().toISOString();
        }
      }
    };

    // Track task creation state
    const initialStatus: TaskState = {
      taskId,
      status: TaskStatus.CREATED,
      createdAt: new Date().toISOString(),
      currentStep: 0,
      totalSteps: 0,
      retryCount: 0
    };
    this.statusMap.set(taskId, initialStatus);

    const result = await this.runtime.execute(context, request, signal, onStatus);

    // Update status map with completion results
    const current = this.statusMap.get(taskId)!;
    current.status = result.status;
    current.completedAt = current.completedAt || result.completedAt;
    if (result.error) {
      current.lastError = result.error;
    }
    this.abortControllers.delete(taskId);

    return result;
  }

  async cancel(taskId: string): Promise<CancelResult> {
    const abortController = this.abortControllers.get(taskId);
    if (abortController) {
      abortController.abort();
    }
    
    const current = this.statusMap.get(taskId);
    if (current) {
      current.status = TaskStatus.CANCELLED;
      current.completedAt = new Date().toISOString();
    }

    return {
      taskId,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString()
    };
  }

  getStatus(taskId: string): TaskState {
    const state = this.statusMap.get(taskId);
    if (!state) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return state;
  }
}
