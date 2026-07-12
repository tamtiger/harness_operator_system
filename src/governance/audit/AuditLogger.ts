import * as fs from 'fs';
import * as path from 'path';
import { AuditRecord } from '../../shared/types/governance';
import { ProposalId } from '../../shared/types/primitives';
import { RepositoryRoot } from '../../shared/types/repository';
import { RepositoryService } from '../../shared/contracts/services';

export class AuditLogger {
  constructor(
    private repo: RepositoryService,
    private root: RepositoryRoot
  ) {}

  private getLogsDir(): string {
    return path.join(this.root.path, '.harness', 'logs');
  }

  private ensureDirExists() {
    const dir = this.getLogsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(record: AuditRecord): void {
    this.ensureDirExists();
    const filePath = path.join(this.getLogsDir(), 'audit.jsonl');
    
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    content += JSON.stringify(record) + '\n';
    this.repo.persist(this.root, '.harness/logs/audit.jsonl', content);
  }

  getLog(proposalId: ProposalId): AuditRecord[] {
    this.ensureDirExists();
    const filePath = path.join(this.getLogsDir(), 'audit.jsonl');
    if (!fs.existsSync(filePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const records: AuditRecord[] = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const record = JSON.parse(trimmed) as AuditRecord;
            if (record.proposalId === proposalId) {
              records.push(record);
            }
          } catch (e) {
            // skip corrupted lines
          }
        }
      });

      return records;
    } catch (err) {
      return [];
    }
  }
}
