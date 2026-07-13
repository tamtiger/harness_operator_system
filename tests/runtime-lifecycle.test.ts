import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ExecutionRuntime } from '../src/execution/runtime/ExecutionRuntime';
import { RuntimeContext, WorkflowSession } from '../src/shared/types/repository';

describe('M5 Runtime - Execution Lifecycle', () => {
  let tempDir: string;
  let runtime: ExecutionRuntime;
  let mockRegistry: any;
  let mockContext: RuntimeContext;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-runtime-lifecycle-'));

    mockRegistry = {
      invoke: vi.fn().mockResolvedValue({ success: true, results: [] })
    };

    runtime = new ExecutionRuntime(mockRegistry);

    mockContext = {
      metadata: {
        root: { path: tempDir, hasGit: false, discoveredAt: '' },
        manifest: { version: 2, specification: '4.0', repository: { root: '.' }, agent: { entry_point: 'AGENTS.md' }, artifacts: [] }
      },
      assets: { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [], skills: [] },
      buildTimestamp: '',
      taskContext: {},
      budget: { totalTokens: 10000, allocated: { rules: 0, knowledge: 0, prompts: 0, workflows: 0, metadata: 0 }, remaining: 10000 },
      rankedRules: [],
      injectedSkills: [],
      availableCapabilities: []
    } as any;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should transition session phases to completed upon successful task execution', async () => {
    // 1. Setup mock session directory
    const sessionDir = path.join(tempDir, '.harness', 'run', 'run-123456');
    fs.mkdirSync(sessionDir, { recursive: true });

    const initialSession: WorkflowSession = {
      id: 'run-123456',
      workflowId: 'feature-dev',
      taskDescription: 'Test task description',
      status: 'active',
      currentPhase: 'execute',
      phases: [
        { name: 'brainstorm', skills: [], optional: false, human_gate: false, completed: true },
        { name: 'plan', skills: [], optional: false, human_gate: false, completed: true },
        { name: 'execute', skills: [], optional: false, human_gate: false, completed: false },
        { name: 'validate', skills: [], optional: false, human_gate: false, completed: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planPath: '.harness/run/run-123456/plan.md'
    };

    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(initialSession, null, 2), 'utf8');

    // 2. Run execution
    const result = await runtime.execute(mockContext, {
      taskId: 'test-task',
      description: 'view page content' // Maps to harness.file.list or read capability in buildPlan fallback
    });

    expect(result.status).toBe('COMPLETED');

    // 3. Assert phase transitions in session.json
    const finalSession: WorkflowSession = JSON.parse(
      fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf8')
    );

    expect(finalSession.status).toBe('completed');
    expect(finalSession.phases.find(p => p.name === 'execute')?.completed).toBe(true);
    expect(finalSession.phases.find(p => p.name === 'validate')?.completed).toBe(true);
  });

  it('should load plan steps from session planPath when available', async () => {
    const sessionDir = path.join(tempDir, '.harness', 'run', 'run-plan-session');
    fs.mkdirSync(sessionDir, { recursive: true });

    const planContent = `# Execution Plan
- [ ] **Task 1: Run lint**
- [ ] **Task 2: Run build**
- [ ] **Task 3: Update documentation**
`;
    fs.writeFileSync(path.join(sessionDir, 'plan.md'), planContent, 'utf8');

    const session: WorkflowSession = {
      id: 'run-plan-session',
      workflowId: 'feature-dev',
      taskDescription: 'Plan-based execution',
      status: 'active',
      currentPhase: 'execute',
      phases: [
        { name: 'execute', skills: [], optional: false, human_gate: false, completed: false },
        { name: 'validate', skills: [], optional: false, human_gate: false, completed: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planPath: `.harness/run/run-plan-session/plan.md`
    };

    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(session, null, 2), 'utf8');

    const result = await runtime.execute(mockContext, {
      taskId: 'plan-task',
      description: 'execute plan'
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('should mark session as failed when execution throws an error', async () => {
    // 1. Setup mock session directory
    const sessionDir = path.join(tempDir, '.harness', 'run', 'run-999');
    fs.mkdirSync(sessionDir, { recursive: true });

    const initialSession: WorkflowSession = {
      id: 'run-999',
      workflowId: 'feature-dev',
      taskDescription: 'Faulty task description',
      status: 'active',
      currentPhase: 'execute',
      phases: [
        { name: 'execute', skills: [], optional: false, human_gate: false, completed: false },
        { name: 'validate', skills: [], optional: false, human_gate: false, completed: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(initialSession, null, 2), 'utf8');

    // Make registry throw error
    mockRegistry.invoke.mockRejectedValue(new Error('Invoker failure'));

    // 2. Run execution
    const result = await runtime.execute(mockContext, {
      taskId: 'test-task-faulty',
      description: 'view package.json'
    });

    expect(result.status).toBe('FAILED');

    // 3. Assert session status is failed
    const finalSession: WorkflowSession = JSON.parse(
      fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf8')
    );
    expect(finalSession.status).toBe('failed');
  });
});
