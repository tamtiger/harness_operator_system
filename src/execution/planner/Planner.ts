import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { RuntimeContext } from '../../shared/types/repository';
import { WorkflowSession, WorkflowPhase } from '../../shared/types/execution';

export class Planner {
  async brainstorm(taskDesc: string, context: RuntimeContext, interactive: boolean): Promise<string> {
    const isTTY = process.stdin.isTTY;

    if (interactive && isTTY) {
      console.log('\n--- Harness Planner Brainstorming Phase ---');
      console.log(`Task: "${taskDesc}"\n`);
      
      const q1 = await this.askQuestion('1. What are the key architectural components or files affected by this task? ');
      const q2 = await this.askQuestion('2. Are there any potential breaking changes or public API contracts affected? (y/n) ');
      const q3 = await this.askQuestion('3. How do you plan to verify these changes (automated tests command / manual steps)? ');

      return `## Brainstorming Session Answers
- **Affected Components/Files:** ${q1 || 'Not specified'}
- **Public API Alterations/Breaking Changes:** ${q2 || 'No'}
- **Verification Plan:** ${q3 || 'Run npm run test'}`;
    }

    // Non-interactive brainstorm
    return `## Brainstorming Session Answers (Non-interactive)
- **Task Description:** ${taskDesc}
- **Assumed Scope:** Auto-detected based on task description and repository context.
- **Verification Plan:** Run automated build, lint, and test suites.`;
  }

  generatePlan(taskDesc: string, context: RuntimeContext, brainstormAnswers: string): string {
    const matchedRules = context.rankedRules.map(r => `- [ ] Verify compliance with rule: [${r.metadata.id}](file:///${r.metadata.source.replace(/\\/g, '/')})`).join('\n');
    const matchedSkills = (context.injectedSkills || []).map(s => `- [ ] Follow guidance in skill: [${s.metadata.id}](file:///${s.metadata.source.replace(/\\/g, '/')})`).join('\n');

    return `# Execution Plan for: ${taskDesc}

${brainstormAnswers}

## Rules & Skills Gateways
${matchedRules || '- No specific rules matched.'}
${matchedSkills || '- No specific skills matched.'}

## Checklist & Tasks Decompositions

- [ ] **Task 1: Setup and Workspace Isolation**
  - Setup temporary test environment or branch context if required
- [ ] **Task 2: Test-Driven Development (TDD) Implementation**
  - [ ] Write failing test first (RED phase)
  - [ ] Write minimum code to pass test (GREEN phase)
  - [ ] Refactor code for optimal quality and cleanliness
- [ ] **Task 3: Validation & Auditing**
  - [ ] Run linting (\`npm run lint\`)
  - [ ] Run full build (\`npm run build\`)
  - [ ] Ensure all 180+ tests pass cleanly (\`npm run test\`)
- [ ] **Task 4: Document updates**
  - Update specification files in \`knowledge_base/\` and prepend release changelog in \`CHANGELOG.md\` if behavior altered.
`;
  }

  async createSession(
    taskDesc: string,
    rootPath: string,
    planContent: string,
    brainstormContent: string
  ): Promise<WorkflowSession> {
    const timestamp = Date.now();
    const sessionId = `run-${timestamp}`;
    const sessionDir = path.join(rootPath, '.harness', 'run', sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const planPath = path.join(sessionDir, 'plan.md');
    fs.writeFileSync(planPath, planContent, 'utf8');

    const brainstormPath = path.join(sessionDir, 'brainstorm.md');
    fs.writeFileSync(brainstormPath, brainstormContent, 'utf8');

    const defaultPhases: WorkflowPhase[] = [
      { name: 'brainstorm', skills: ['brainstorm-before-code'], optional: false, human_gate: true, completed: true, completedAt: new Date().toISOString() },
      { name: 'plan', skills: ['plan-before-implement'], optional: false, human_gate: true, completed: true, completedAt: new Date().toISOString() },
      { name: 'execute', skills: ['tdd-red-green-refactor', 'subagent-per-task'], optional: false, human_gate: false, completed: false },
      { name: 'validate', skills: ['verify-before-done'], optional: false, human_gate: false, completed: false }
    ];

    const session: WorkflowSession = {
      id: sessionId,
      workflowId: 'feature-dev',
      taskDescription: taskDesc,
      status: 'active',
      currentPhase: 'execute',
      phases: defaultPhases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planPath: path.relative(rootPath, planPath).replace(/\\/g, '/'),
      brainstormContent
    };

    const sessionPath = path.join(sessionDir, 'session.json');
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf8');

    return session;
  }

  private askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      rl.question(query, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}
