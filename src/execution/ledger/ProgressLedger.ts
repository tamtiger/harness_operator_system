import * as fs from 'fs';
import * as path from 'path';
import { execError } from '../../shared/errors/factories';

export const LEDGER_FILENAME = 'ledger.md';

export interface LedgerEntry {
  taskId: string;
  stepId: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export class ProgressLedger {
  private entries: LedgerEntry[] = [];
  private filePath: string;

  constructor(private rootPath: string, private sessionId: string) {
    const ledgerDir = path.join(rootPath, '.harness', 'run', sessionId);
    this.filePath = path.join(ledgerDir, 'ledger.md');
  }

  init(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.write();
  }

  startTask(taskId: string, stepId: string, description?: string): void {
    const existing = this.entries.find(e => e.taskId === taskId && e.stepId === stepId);
    if (existing) {
      existing.status = 'running';
      existing.startedAt = new Date().toISOString();
    } else {
      this.entries.push({
        taskId,
        stepId,
        description,
        status: 'running',
        startedAt: new Date().toISOString()
      });
    }
    this.write();
  }

  completeTask(taskId: string, stepId: string): void {
    const entry = this.findOrThrow(taskId, stepId);
    entry.status = 'completed';
    entry.completedAt = new Date().toISOString();
    this.write();
  }

  failTask(taskId: string, stepId: string, error: string): void {
    const entry = this.findOrThrow(taskId, stepId);
    entry.status = 'failed';
    entry.completedAt = new Date().toISOString();
    entry.error = error;
    this.write();
  }

  skipTask(taskId: string, stepId: string, reason?: string): void {
    const entry = this.findOrThrow(taskId, stepId);
    entry.status = 'skipped';
    entry.completedAt = new Date().toISOString();
    entry.error = reason;
    this.write();
  }

  getStatus(taskId: string, stepId: string): LedgerEntry | undefined {
    return this.entries.find(e => e.taskId === taskId && e.stepId === stepId);
  }

  getEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  static fromLedgerFile(rootPath: string, sessionId: string): ProgressLedger | null {
    const ledgerPath = path.join(rootPath, '.harness', 'run', sessionId, LEDGER_FILENAME);
    if (!fs.existsSync(ledgerPath)) return null;

    const content = fs.readFileSync(ledgerPath, 'utf8');
    const ledger = new ProgressLedger(rootPath, sessionId);

    const lineRegex = /^\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(?:✅|🔄|❌|⏭️|⏳)\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(\S+)\s*\|\s*(.*)\s*\|$/;
    const lines = content.split('\n');
    for (const line of lines) {
      const match = lineRegex.exec(line);
      if (match) {
        ledger.entries.push({
          taskId: match[1],
          stepId: match[2],
          status: match[3] as LedgerEntry['status'],
          startedAt: match[4] !== '-' ? match[4] : undefined,
          completedAt: match[5] !== '-' ? match[5] : undefined,
          error: match[6] !== '-' ? match[6] : undefined
        });
      }
    }

    return ledger.entries.length > 0 ? ledger : null;
  }

  getPendingCount(): number {
    return this.entries.filter(e => e.status === 'pending' || e.status === 'running').length;
  }

  getFailedCount(): number {
    return this.entries.filter(e => e.status === 'failed').length;
  }

  private findOrThrow(taskId: string, stepId: string): LedgerEntry {
    const entry = this.entries.find(e => e.taskId === taskId && e.stepId === stepId);
    if (!entry) {
      throw execError('EXEC_002', { reason: `Ledger entry not found: ${taskId}/${stepId}` });
    }
    return entry;
  }

  private write(): void {
    const lines: string[] = [
      `# Progress Ledger — Session: ${this.sessionId}`,
      `# Updated: ${new Date().toISOString()}`,
      '',
      '| Task | Step | Status | Started | Completed | Error |',
      '|------|------|--------|---------|-----------|-------|',
    ];

    for (const entry of this.entries) {
      const statusIcon = entry.status === 'completed' ? '✅' :
        entry.status === 'running' ? '🔄' :
        entry.status === 'failed' ? '❌' :
        entry.status === 'skipped' ? '⏭️' : '⏳';
      lines.push(
        `| ${entry.taskId} | ${entry.stepId} | ${statusIcon} ${entry.status} | ${entry.startedAt || '-'} | ${entry.completedAt || '-'} | ${entry.error || '-'} |`
      );
    }

    lines.push('', '## Summary', '');
    const total = this.entries.length;
    const completed = this.entries.filter(e => e.status === 'completed').length;
    const failed = this.entries.filter(e => e.status === 'failed').length;
    const skipped = this.entries.filter(e => e.status === 'skipped').length;
    const pending = this.entries.filter(e => e.status === 'pending' || e.status === 'running').length;
    lines.push(`- **Total:** ${total} | **Completed:** ${completed} | **Failed:** ${failed} | **Skipped:** ${skipped} | **Pending:** ${pending}`);

    fs.writeFileSync(this.filePath, lines.join('\n'), 'utf8');
  }
}
