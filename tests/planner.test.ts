import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Planner } from '../src/execution/planner/Planner';
import { RuntimeContext } from '../src/shared/types/repository';

describe('M4 Planner Component', () => {
  let tempDir: string;
  let planner: Planner;
  let mockContext: RuntimeContext;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-planner-test-'));
    planner = new Planner();
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

  it('brainstorm should return default summary in non-interactive mode', async () => {
    const task = 'Implement user session store';
    const result = await planner.brainstorm(task, mockContext, false);
    expect(result).toContain('Brainstorming Session Answers (Non-interactive)');
    expect(result).toContain(task);
  });

  it('generatePlan should output valid structured markdown plan', () => {
    const task = 'Implement user session store';
    const brainstormAns = 'Some brainstorm answers';
    const plan = planner.generatePlan(task, mockContext, brainstormAns);

    expect(plan).toContain('# Execution Plan for:');
    expect(plan).toContain('Some brainstorm answers');
    expect(plan).toContain('Checklist');
    expect(plan).toContain('Task 2: Test-Driven Development (TDD) Implementation');
  });

  it('createSession should successfully write session metadata, plan, and brainstorm files', async () => {
    const task = 'Implement user session store';
    const planContent = 'My Plan';
    const brainstormContent = 'My Brainstorm';

    const session = await planner.createSession(task, tempDir, planContent, brainstormContent);

    expect(session.id).toMatch(/^run-\d+$/);
    expect(session.taskDescription).toBe(task);
    expect(session.status).toBe('active');
    expect(session.currentPhase).toBe('execute');

    const sessionDir = path.join(tempDir, '.harness', 'run', session.id);
    expect(fs.existsSync(sessionDir)).toBe(true);

    const sessionJson = JSON.parse(fs.readFileSync(path.join(sessionDir, 'session.json'), 'utf8'));
    expect(sessionJson.id).toBe(session.id);
    expect(sessionJson.planPath).toBe(`.harness/run/${session.id}/plan.md`);

    const writtenPlan = fs.readFileSync(path.join(sessionDir, 'plan.md'), 'utf8');
    expect(writtenPlan).toBe(planContent);

    const writtenBrainstorm = fs.readFileSync(path.join(sessionDir, 'brainstorm.md'), 'utf8');
    expect(writtenBrainstorm).toBe(brainstormContent);
  });
});
