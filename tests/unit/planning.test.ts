import { describe, it, expect } from 'vitest';
import { PlanningEngine } from '../../packages/core/src/index.js';
import { ICodeIndex, IWorkspaceManager, ExecutionPlan } from '../../packages/contracts/src/index.js';

describe('Planning Engine Tests', () => {
  const mockWorkspace: IWorkspaceManager = {
    getWorkspaceRoot: () => process.cwd(),
    getDatabaseDir: () => ':memory:'
  } as any;

  it('should validate plan schema and reject invalid plans', async () => {
    const engine = new PlanningEngine(mockWorkspace);
    await engine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-1',
      summary: '', // Missing
      steps: [], // Missing
      files: [],
      rollback: '', // Missing
      testStrategy: '', // Missing
      version: 1,
      status: 'pending'
    };

    const res = await engine.validatePlan(plan);
    expect(res.status).toBe('REJECTED');
    expect(res.diagnostics.length).toBeGreaterThan(0);

    await engine.dispose();
  });

  it('should assess risk and approve low risk plans automatically', async () => {
    const engine = new PlanningEngine(mockWorkspace);
    await engine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-2',
      summary: 'Update configuration',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'appsettings.json', parameters: {} }
      ],
      files: ['appsettings.json'],
      rollback: 'Discard appsettings.json modifications',
      testStrategy: 'Run application locally',
      version: 1,
      status: 'pending'
    };

    const res = await engine.validatePlan(plan);
    expect(res.status).toBe('APPROVED');
    expect(res.riskScore).toBeLessThan(60);

    await engine.dispose();
  });

  it('should flag high risk plans for human approval based on files modified', async () => {
    const engine = new PlanningEngine(mockWorkspace);
    await engine.initialize();

    const plan: ExecutionPlan = {
      taskId: 'task-3',
      summary: 'Refactor components',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'f1.cs', parameters: {} }
      ],
      files: ['f1.cs', 'f2.cs', 'f3.cs', 'f4.cs', 'f5.cs', 'f6.cs'], // 6 files
      rollback: 'Git checkout',
      testStrategy: 'Run test suite',
      version: 1,
      status: 'pending'
    };

    const res = await engine.validatePlan(plan);
    expect(res.status).toBe('AWAITING_APPROVAL');
    expect(res.riskScore).toBeGreaterThanOrEqual(60);

    await engine.dispose();
  });

  it('should audit plan history and support manual approval/rejection', async () => {
    const engine = new PlanningEngine(mockWorkspace);
    await engine.initialize();

    const plan1: ExecutionPlan = {
      taskId: 'task-4',
      summary: 'Change interface',
      steps: [
        { id: 'step-1', action: 'generate_file', target: 'IService.cs', parameters: {} }
      ],
      files: ['IService.cs'],
      rollback: 'Rollback changes',
      testStrategy: 'Build solution',
      version: 1,
      status: 'pending'
    };

    // Low risk plan is auto-approved initially
    await engine.validatePlan(plan1);

    // Save version 2 of the same plan
    const plan2 = { ...plan1, version: 2, summary: 'Change interface and update callers' };
    await engine.validatePlan(plan2);

    const history = await engine.getPlanHistory('task-4');
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);

    // Manually reject v2
    await engine.rejectPlan('task-4', 2, 'Design changed');
    const updatedPlan = await engine.getPlan('task-4', 2);
    expect(updatedPlan?.status).toBe('rejected');

    await engine.dispose();
  });
});
