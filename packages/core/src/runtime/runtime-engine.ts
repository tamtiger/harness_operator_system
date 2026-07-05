import { 
  IRuntimeEngine, 
  RuntimeState, 
  StepState, 
  StepStatus, 
  ExecutionPlan, 
  IWorkspaceManager, 
  IEventBus, 
  ILogger 
} from '@harness/contracts';
import { Result, HarnessError } from '@harness/shared';
import Database from 'better-sqlite3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export class RuntimeEngine implements IRuntimeEngine {
  public readonly serviceName = 'RuntimeEngine';
  private db?: Database.Database;

  constructor(
    private readonly workspace: IWorkspaceManager,
    private readonly eventBus?: IEventBus,
    private readonly logger?: ILogger
  ) {}

  public async initialize(): Promise<void> {
    let dbPath = this.workspace.getDatabaseDir();
    if (dbPath !== ':memory:') {
      dbPath = path.join(dbPath, 'harness.db');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_states (
        project_id TEXT,
        task_id TEXT,
        plan_id TEXT,
        current_step_id TEXT,
        status TEXT,
        git_branch TEXT,
        git_checkpoint_commit TEXT,
        PRIMARY KEY (project_id, task_id)
      );

      CREATE TABLE IF NOT EXISTS step_states (
        project_id TEXT,
        task_id TEXT,
        step_id TEXT,
        status TEXT,
        started_at TEXT,
        finished_at TEXT,
        PRIMARY KEY (project_id, task_id, step_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        task_id TEXT,
        event TEXT,
        payload TEXT,
        timestamp TEXT
      );
    `);
  }

  public async initializeTask(taskId: string, plan: ExecutionPlan): Promise<RuntimeState> {
    if (!this.db) throw new Error('Database not initialized');

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    this.logger?.info(`Initializing task ${taskId} with plan version ${plan.version} in project ${projectPath} (ID: ${projectId})`);

    let currentCommit = '';
    const branchName = `harness/task-${taskId}`;

    try {
      // 1. Get current commit hash (HEAD)
      currentCommit = await this.runGitCmd('rev-parse HEAD');
      currentCommit = currentCommit.trim();

      // 2. Create and switch to isolated branch
      await this.runGitCmd(`checkout -b ${branchName}`);
      this.logger?.info(`Created and checked out git branch: ${branchName}`);
    } catch (err: any) {
      this.logger?.warn(`Git operation failed during task initialization. Proceeding in dry mode.`, { error: err.message });
      currentCommit = 'dry-run-commit-hash';
    }

    const state: RuntimeState = {
      taskId,
      planId: `${plan.taskId}_v${plan.version}`,
      currentStepId: plan.steps[0]?.id || '',
      status: 'EXECUTING',
      gitBranch: branchName,
      gitCheckpointCommit: currentCommit
    };

    // Save state to database
    const insertState = this.db.prepare(`
      INSERT OR REPLACE INTO runtime_states (project_id, task_id, plan_id, current_step_id, status, git_branch, git_checkpoint_commit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertStep = this.db.prepare(`
      INSERT OR REPLACE INTO step_states (project_id, task_id, step_id, status, started_at, finished_at)
      VALUES (?, ?, ?, ?, NULL, NULL)
    `);

    const tx = this.db.transaction(() => {
      insertState.run(
        projectId,
        state.taskId,
        state.planId,
        state.currentStepId,
        state.status,
        state.gitBranch,
        state.gitCheckpointCommit
      );

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        insertStep.run(projectId, taskId, step.id, i === 0 ? 'READY' : 'PENDING');
      }
    });

    tx();

    this.logAudit(taskId, 'TASK_INITIALIZED', { state, plan });
    this.eventBus?.publish('TASK_STARTED', { taskId, state }, taskId);

    return state;
  }

  public async startStep(taskId: string, stepId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const step = this.getStepStateSync(taskId, stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found for task ${taskId}`);
    }

    if (step.status !== 'READY' && step.status !== 'PENDING') {
      throw new Error(`Cannot start step in status: ${step.status}`);
    }

    const startedAt = new Date().toISOString();

    const updateStep = this.db.prepare(`
      UPDATE step_states SET status = 'IN_PROGRESS', started_at = ? WHERE project_id = ? AND task_id = ? AND step_id = ?
    `);
    const updateRuntime = this.db.prepare(`
      UPDATE runtime_states SET current_step_id = ?, status = 'EXECUTING' WHERE project_id = ? AND task_id = ?
    `);

    const tx = this.db.transaction(() => {
      updateStep.run(startedAt, projectId, taskId, stepId);
      updateRuntime.run(stepId, projectId, taskId);
    });
    tx();

    this.logAudit(taskId, 'STEP_STARTED', { stepId, startedAt });
    this.eventBus?.publish('STEP_STARTED', { taskId, stepId }, taskId);
  }

  public async completeStep(taskId: string, stepId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const step = this.getStepStateSync(taskId, stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);

    if (step.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot complete step that is in status: ${step.status}`);
    }

    // 1. Run Scope & Protected Region Enforcement
    const scopeCheck = await this.enforceScope(taskId, stepId);
    if (!scopeCheck.isSuccess) {
      this.logger?.error(`Scope validation failed for step ${stepId}: ${scopeCheck.error?.message}`);
      await this.failStep(taskId, stepId, scopeCheck.error?.message || 'Scope validation failed');
      return;
    }

    const finishedAt = new Date().toISOString();

    // 2. Find next step to mark as READY
    const steps = await this.getStepStates(taskId);
    const currentIndex = steps.findIndex(s => s.stepId === stepId);
    const nextStep = steps[currentIndex + 1];

    const updateStep = this.db.prepare(`
      UPDATE step_states SET status = 'DONE', finished_at = ? WHERE project_id = ? AND task_id = ? AND step_id = ?
    `);

    const tx = this.db.transaction(() => {
      updateStep.run(finishedAt, projectId, taskId, stepId);
      if (nextStep) {
        this.db!.prepare(`
          UPDATE step_states SET status = 'READY' WHERE project_id = ? AND task_id = ? AND step_id = ?
        `).run(projectId, taskId, nextStep.stepId);
      } else {
        this.db!.prepare(`
          UPDATE runtime_states SET status = 'DONE' WHERE project_id = ? AND task_id = ?
        `).run(projectId, taskId);
      }
    });
    tx();

    this.logAudit(taskId, 'STEP_COMPLETED', { stepId, finishedAt });
    this.eventBus?.publish('STEP_COMPLETED', { taskId, stepId }, taskId);
  }

  public async failStep(taskId: string, stepId: string, reason: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    this.logger?.warn(`Step ${stepId} failed: ${reason}`);

    const finishedAt = new Date().toISOString();

    const updateStep = this.db.prepare(`
      UPDATE step_states SET status = 'FAILED', finished_at = ? WHERE project_id = ? AND task_id = ? AND step_id = ?
    `);
    const updateRuntime = this.db.prepare(`
      UPDATE runtime_states SET status = 'FAILED' WHERE project_id = ? AND task_id = ?
    `);

    const tx = this.db.transaction(() => {
      updateStep.run(finishedAt, projectId, taskId, stepId);
      updateRuntime.run(projectId, taskId);
    });
    tx();

    this.logAudit(taskId, 'STEP_FAILED', { stepId, reason, finishedAt });
    this.eventBus?.publish('STEP_FAILED', { taskId, stepId, reason }, taskId);

    // Auto-trigger rollback on failure
    await this.rollbackTask(taskId);
  }

  public async rollbackTask(taskId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const state = await this.getRuntimeState(taskId);
    if (!state) throw new Error(`Runtime state for task ${taskId} not found`);

    this.logger?.info(`Rolling back task ${taskId} to checkpoint commit ${state.gitCheckpointCommit}`);

    try {
      // 1. Reset files to checkout checkpoint commit
      if (state.gitCheckpointCommit && state.gitCheckpointCommit !== 'dry-run-commit-hash') {
        await this.runGitCmd(`reset --hard ${state.gitCheckpointCommit}`);
        await this.runGitCmd('clean -fd');
      }
    } catch (err: any) {
      this.logger?.error(`Failed to rollback git state: ${err.message}`, err);
    }

    // 2. Reset step statuses in DB
    const updateSteps = this.db.prepare(`
      UPDATE step_states SET status = 'ROLLED_BACK' WHERE project_id = ? AND task_id = ? AND status IN ('IN_PROGRESS', 'DONE', 'FAILED')
    `);
    const updateRuntime = this.db.prepare(`
      UPDATE runtime_states SET status = 'ROLLED_BACK' WHERE project_id = ? AND task_id = ?
    `);

    const tx = this.db.transaction(() => {
      updateSteps.run(projectId, taskId);
      updateRuntime.run(projectId, taskId);
    });
    tx();

    this.logAudit(taskId, 'ROLLBACK_EXECUTED', { gitCheckpointCommit: state.gitCheckpointCommit });
    this.eventBus?.publish('ROLLBACK_EXECUTED', { taskId }, taskId);
  }

  public async getRuntimeState(taskId: string): Promise<RuntimeState | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare('SELECT * FROM runtime_states WHERE project_id = ? AND task_id = ?');
    const row = stmt.get(projectId, taskId) as any;
    if (!row) return undefined;
    return {
      taskId: row.task_id,
      planId: row.plan_id,
      currentStepId: row.current_step_id,
      status: row.status,
      gitBranch: row.git_branch,
      gitCheckpointCommit: row.git_checkpoint_commit
    };
  }

  public async getStepState(taskId: string, stepId: string): Promise<StepState | undefined> {
    return this.getStepStateSync(taskId, stepId);
  }

  private getStepStateSync(taskId: string, stepId: string): StepState | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare('SELECT * FROM step_states WHERE project_id = ? AND task_id = ? AND step_id = ?');
    const row = stmt.get(projectId, taskId, stepId) as any;
    if (!row) return undefined;
    return {
      taskId: row.task_id,
      stepId: row.step_id,
      status: row.status as StepStatus,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined
    };
  }

  public async getStepStates(taskId: string): Promise<StepState[]> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare('SELECT * FROM step_states WHERE project_id = ? AND task_id = ?');
    const rows = stmt.all(projectId, taskId) as any[];
    return rows.map(row => ({
      taskId: row.task_id,
      stepId: row.step_id,
      status: row.status as StepStatus,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined
    }));
  }

  public async resumeSession(taskId: string): Promise<RuntimeState | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const state = await this.getRuntimeState(taskId);
    if (!state) return undefined;

    this.logger?.info(`Resuming task session ${taskId}`);

    try {
      if (state.gitBranch && state.status === 'EXECUTING') {
        await this.runGitCmd(`checkout ${state.gitBranch}`);
      }
    } catch (err: any) {
      this.logger?.warn(`Could not checkout branch ${state.gitBranch} on resume: ${err.message}`);
    }

    return state;
  }

  public async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  // Helper methods
  private async runGitCmd(args: string): Promise<string> {
    const cwd = this.workspace.getProjectRoot();
    try {
      const { stdout } = await execAsync(`git ${args}`, { cwd });
      return stdout;
    } catch (err: any) {
      throw new Error(`Git error (git ${args}): ${err.message}`);
    }
  }

  private logAudit(taskId: string, event: string, payload: Record<string, any>): void {
    if (!this.db) return;
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (project_id, task_id, event, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(projectId, taskId, event, JSON.stringify(payload), new Date().toISOString());
  }

  private async enforceScope(taskId: string, stepId: string): Promise<Result<void>> {
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    // 1. Get allowed files from plan (query harness.db)
    let allowedFiles: string[] = [];
    try {
      const state = await this.getRuntimeState(taskId);
      if (state) {
        const parts = state.planId.split('_v');
        const planTaskId = parts[0];
        const version = parts[1] ? parseInt(parts[1], 10) : 1;
        const row = this.db!.prepare('SELECT files FROM plans WHERE project_id = ? AND task_id = ? AND version = ?').get(projectId, planTaskId, version) as any;
        if (row && row.files) {
          allowedFiles = row.files.split(',').map((f: string) => f.trim().replace(/\\/g, '/')).filter((f: string) => f.length > 0);
        }
      }
    } catch (err) {
      this.logger?.warn(`Could not read allowed files from harness.db: ${err}`);
    }

    // 2. Read git status to find files modified
    let modifiedFiles: string[] = [];
    try {
      const statusOutput = await this.runGitCmd('status --porcelain');
      modifiedFiles = statusOutput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const parts = line.split(/\s+/);
          return parts[parts.length - 1].replace(/\\/g, '/');
        });
    } catch (err: any) {
      this.logger?.warn(`Could not determine modified files via Git: ${err.message}`);
      return Result.ok(undefined);
    }

    // 3. Compare modified vs allowed
    const violations: string[] = [];
    for (const file of modifiedFiles) {
      const isAllowed = allowedFiles.some(allowed => file === allowed || file.endsWith(allowed));
      if (!isAllowed && allowedFiles.length > 0) {
        violations.push(file);
      }
    }

    if (violations.length > 0) {
      this.logAudit(taskId, 'SCOPE_VIOLATION', { stepId, violations });
      this.eventBus?.publish('SCOPE_VIOLATION', { taskId, stepId, violations }, taskId);
      return Result.fail(new HarnessError('SCOPE_VIOLATION', `Modified files outside plan scope: ${violations.join(', ')}`));
    }

    return Result.ok(undefined);
  }
}
