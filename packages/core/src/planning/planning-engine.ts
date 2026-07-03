import { IPlanningEngine, ExecutionPlan, PlanValidationResult, IWorkspaceManager, ICodeIndex, ExecutionStep } from '@harness/contracts';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class PlanningEngine implements IPlanningEngine {
  public readonly serviceName = 'PlanningEngine';
  private db?: Database.Database;

  constructor(
    private readonly workspace: IWorkspaceManager,
    private readonly codeIndex?: ICodeIndex
  ) {}

  public async initialize(): Promise<void> {
    let dbPath = this.workspace.getDatabaseDir();
    if (dbPath !== ':memory:') {
      dbPath = path.join(dbPath, 'plans.db');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        task_id TEXT,
        version INTEGER,
        summary TEXT,
        files TEXT,
        rollback TEXT,
        test_strategy TEXT,
        status TEXT,
        PRIMARY KEY (task_id, version)
      );

      CREATE TABLE IF NOT EXISTS steps (
        task_id TEXT,
        version INTEGER,
        step_id TEXT,
        action TEXT,
        target TEXT,
        parameters TEXT,
        PRIMARY KEY (task_id, version, step_id)
      );
    `);
  }

  public async validatePlan(plan: ExecutionPlan): Promise<PlanValidationResult> {
    if (!this.db) throw new Error('Database not initialized');

    const diagnostics: string[] = [];
    const warnings: string[] = [];
    let riskScore = 10; // Base risk

    // 1. Schema Validation
    if (!plan.summary) diagnostics.push('Plan summary is missing');
    if (!plan.steps || plan.steps.length === 0) diagnostics.push('Plan must contain at least one step');
    if (!plan.rollback) diagnostics.push('Rollback strategy is missing');
    if (!plan.testStrategy) diagnostics.push('Test strategy is missing');

    if (diagnostics.length > 0) {
      return {
        status: 'REJECTED',
        reason: 'Schema validation failed',
        riskScore: 100,
        diagnostics,
        warnings
      };
    }

    // 2. Semantic Rules
    const stepIds = new Set<string>();
    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        diagnostics.push(`Duplicate step ID detected: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Check duplicate actions on the same file in a single plan
    const updatedFiles = new Set<string>();
    for (const step of plan.steps) {
      if (step.action === 'generate_file') {
        if (updatedFiles.has(step.target)) {
          warnings.push(`File ${step.target} is modified multiple times in sequential steps`);
        }
        updatedFiles.add(step.target);
      }
    }

    if (diagnostics.length > 0) {
      return {
        status: 'REJECTED',
        reason: 'Semantic rules validation failed',
        riskScore: 100,
        diagnostics,
        warnings
      };
    }

    // 3. Impact & Risk Analysis
    // Risk based on files modified
    const fileCount = plan.files ? plan.files.length : 0;
    if (fileCount > 5) {
      riskScore += 50;
      warnings.push(`Plan modifies a high number of files (${fileCount} files)`);
    } else {
      riskScore += fileCount * 5;
    }

    // Ask CodeIndex for impact if available
    if (this.codeIndex && plan.files) {
      let callerCount = 0;
      for (const file of plan.files) {
        const fileSymbols = await this.codeIndex.findFileSymbols(file);
        for (const sym of fileSymbols) {
          const refs = await this.codeIndex.findReferences(sym.id);
          callerCount += refs.length;
        }
      }
      if (callerCount > 10) {
        riskScore += 30;
        warnings.push(`Plan impacts widely used class symbols (${callerCount} external callers detected)`);
      }
    }

    // 4. Determine Approval Status
    let status: 'APPROVED' | 'AWAITING_APPROVAL' = 'APPROVED';
    let reason = 'Risk is low, plan is auto-approved';

    if (riskScore >= 60) {
      status = 'AWAITING_APPROVAL';
      reason = 'High risk plan, requires human confirmation';
    }

    // Save to history in database
    const insertPlan = this.db.prepare(`
      INSERT OR REPLACE INTO plans (task_id, version, summary, files, rollback, test_strategy, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertStep = this.db.prepare(`
      INSERT OR REPLACE INTO steps (task_id, version, step_id, action, target, parameters)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      insertPlan.run(
        plan.taskId,
        plan.version,
        plan.summary,
        plan.files ? plan.files.join(',') : '',
        plan.rollback,
        plan.testStrategy,
        status.toLowerCase()
      );

      for (const step of plan.steps) {
        insertStep.run(
          plan.taskId,
          plan.version,
          step.id,
          step.action,
          step.target,
          JSON.stringify(step.parameters || {})
        );
      }
    });

    tx();

    return {
      status,
      reason,
      riskScore,
      diagnostics,
      warnings
    };
  }

  public async approvePlan(taskId: string, version: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("UPDATE plans SET status = 'approved' WHERE task_id = ? AND version = ?");
    stmt.run(taskId, version);
  }

  public async rejectPlan(taskId: string, version: number, reason: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare("UPDATE plans SET status = 'rejected' WHERE task_id = ? AND version = ?");
    stmt.run(taskId, version);
  }

  public async getPlan(taskId: string, version?: number): Promise<ExecutionPlan | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    
    let row;
    if (version !== undefined) {
      const stmt = this.db.prepare('SELECT * FROM plans WHERE task_id = ? AND version = ?');
      row = stmt.get(taskId, version);
    } else {
      const stmt = this.db.prepare('SELECT * FROM plans WHERE task_id = ? ORDER BY version DESC LIMIT 1');
      row = stmt.get(taskId);
    }

    if (!row) return undefined;
    return this.mapRow(row);
  }

  public async getPlanHistory(taskId: string): Promise<ExecutionPlan[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM plans WHERE task_id = ? ORDER BY version ASC');
    const rows = stmt.all(taskId) as any[];
    return rows.map(r => this.mapRow(r));
  }

  public async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  private mapRow(r: any): ExecutionPlan {
    const stepsStmt = this.db!.prepare('SELECT * FROM steps WHERE task_id = ? AND version = ?');
    const stepRows = stepsStmt.all(r.task_id, r.version) as any[];
    const steps: ExecutionStep[] = stepRows.map(sr => ({
      id: sr.step_id,
      action: sr.action,
      target: sr.target,
      parameters: sr.parameters ? JSON.parse(sr.parameters) : {}
    }));

    return {
      taskId: r.task_id,
      summary: r.summary,
      steps,
      files: r.files ? r.files.split(',') : [],
      rollback: r.rollback,
      testStrategy: r.test_strategy,
      version: r.version,
      status: r.status
    };
  }
}
