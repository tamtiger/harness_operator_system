import { ExecutionService } from '../shared/contracts/services';
import { TaskRequest, ExecutionResult, CancelResult, TaskState } from '../shared/types/execution';
import { RuntimeContext } from '../shared/types/repository';
import { TaskStatus } from '../shared/types/enums';
import { ExecutionRuntime } from './runtime/ExecutionRuntime';
import { CapabilityServiceImpl } from '../capability/service';

export class ExecutionServiceImpl implements ExecutionService {
  private activeTasks = new Map<string, boolean>();
  private statusMap = new Map<string, TaskState>();
  private runtime: ExecutionRuntime;

  constructor() {
    this.runtime = new ExecutionRuntime(new CapabilityServiceImpl());
  }

  async execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult> {
    const taskId = request.taskId || 'task-' + Math.random().toString(36).substring(2, 9);
    request.taskId = taskId;

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
    this.activeTasks.set(taskId, false);

    const result = await this.runtime.execute(context, request, this.activeTasks);

    // Update status map with completion results
    const current = this.statusMap.get(taskId)!;
    current.status = result.status;
    current.completedAt = result.completedAt;
    if (result.error) {
      current.lastError = result.error;
    }
    this.activeTasks.delete(taskId);

    return result;
  }

  async cancel(taskId: string): Promise<CancelResult> {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.set(taskId, true);
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
