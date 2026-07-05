import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RuntimeEngine, PlanningEngine } from '../../packages/core/src/index.js';
import { IWorkspaceManager, ExecutionPlan, IEventBus } from '../../packages/contracts/src/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

describe('Runtime Engine Tests', () => {
  const tempRepoDir = path.join(process.cwd(), 'temp-test-repo-' + Date.now());
  
  const mockWorkspace: IWorkspaceManager = {
    getWorkspaceRoot: () => tempRepoDir,
    getProjectRoot: () => tempRepoDir,
    getDatabaseDir: () => tempRepoDir, // Point to tempRepoDir so plans.db and runtime.db are written there
    ensureWorkspaceCreated: async () => {}
  } as any;

  const mockEventBus: IEventBus = {
    publish: () => {},
    subscribe: () => {},
    unsubscribe: () => {}
  } as any;

  beforeAll(async () => {
    // 1. Create temp directory
    fs.mkdirSync(tempRepoDir, { recursive: true });

    // 2. Initialize a git repository
    await execAsync('git init', { cwd: tempRepoDir });
    await execAsync('git config user.name "Test"', { cwd: tempRepoDir });
    await execAsync('git config user.email "test@example.com"', { cwd: tempRepoDir });

    // 3. Write and commit an initial file
    fs.writeFileSync(path.join(tempRepoDir, 'README.md'), '# Initial README');
    await execAsync('git add README.md', { cwd: tempRepoDir });
    await execAsync('git commit -m "initial commit"', { cwd: tempRepoDir });
  });

  afterAll(async () => {
    // Cleanup temp directory
    try {
      // Switch back to master/main first to avoid locking
      try {
        await execAsync('git checkout master', { cwd: tempRepoDir });
      } catch {
        try {
          await execAsync('git checkout main', { cwd: tempRepoDir });
        } catch {}
      }
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to clean up temp test repo:', e);
    }
  });

  it('should initialize task and create isolated git branch', async () => {
    const engine = new RuntimeEngine(mockWorkspace, mockEventBus);
    await engine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-1',
      summary: 'Modify README',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'README.md', parameters: {} }
      ],
      files: ['README.md'],
      rollback: 'Rollback README',
      testStrategy: 'None',
      version: 1,
      status: 'approved'
    };

    const state = await engine.initializeTask('task-1', plan);
    
    expect(state.taskId).toBe('task-1');
    expect(state.status).toBe('EXECUTING');
    expect(state.gitBranch).toBe('harness/task-task-1');
    expect(state.gitCheckpointCommit).toBeDefined();

    // Verify git branch exists and is current
    const { stdout: branchName } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: tempRepoDir });
    expect(branchName.trim()).toBe('harness/task-task-1');

    await engine.dispose();
  });

  it('should manage step lifecycle states correctly', async () => {
    const engine = new RuntimeEngine(mockWorkspace, mockEventBus);
    await engine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-2',
      summary: 'Sequential Steps',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'README.md', parameters: {} },
        { id: 'step-2', action: 'generate_file', target: 'TODO.md', parameters: {} }
      ],
      files: ['README.md', 'TODO.md'],
      rollback: 'None',
      testStrategy: 'None',
      version: 1,
      status: 'approved'
    };

    await engine.initializeTask('task-2', plan);

    let step1 = await engine.getStepState('task-2', 'step-1');
    let step2 = await engine.getStepState('task-2', 'step-2');
    expect(step1?.status).toBe('READY');
    expect(step2?.status).toBe('PENDING');

    // Start Step 1
    await engine.startStep('task-2', 'step-1');
    step1 = await engine.getStepState('task-2', 'step-1');
    expect(step1?.status).toBe('IN_PROGRESS');

    // Complete Step 1
    await engine.completeStep('task-2', 'step-1');
    step1 = await engine.getStepState('task-2', 'step-1');
    step2 = await engine.getStepState('task-2', 'step-2');
    expect(step1?.status).toBe('DONE');
    expect(step2?.status).toBe('READY');

    await engine.dispose();
  });

  it('should detect scope violations and trigger rollback', async () => {
    const engine = new RuntimeEngine(mockWorkspace, mockEventBus);
    await engine.initialize();

    // 1. Setup plan in database using PlanningEngine (creates plans.db automatically)
    const planningEngine = new PlanningEngine(mockWorkspace);
    await planningEngine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-3',
      summary: 'Allowed change README.md',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'README.md', parameters: {} }
      ],
      files: ['README.md'],
      rollback: 'Rollback README',
      testStrategy: 'None',
      version: 1,
      status: 'approved'
    };

    await planningEngine.validatePlan(plan);
    await planningEngine.dispose();

    await engine.initializeTask('task-3', plan);
    await engine.startStep('task-3', 'step-1');

    // 2. Perform a forbidden change (write UNPLANNED.md which is NOT allowed)
    fs.writeFileSync(path.join(tempRepoDir, 'UNPLANNED.md'), 'bad changes');

    // 3. Completing step should fail because of scope violation
    await engine.completeStep('task-3', 'step-1');

    const stepState = await engine.getStepState('task-3', 'step-1');
    expect(stepState?.status).toBe('ROLLED_BACK');

    const taskState = await engine.getRuntimeState('task-3');
    expect(taskState?.status).toBe('ROLLED_BACK');

    // Verify rollback actually deleted the unplanned file
    expect(fs.existsSync(path.join(tempRepoDir, 'UNPLANNED.md'))).toBe(false);

    await engine.dispose();
  });
});
