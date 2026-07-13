import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProgressLedger } from '../src/execution/ledger/ProgressLedger';

describe('ProgressLedger', () => {
  let tempDir: string;
  let ledger: ProgressLedger;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-ledger-test-'));
    ledger = new ProgressLedger(tempDir, 'run-12345');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create ledger.md on init', () => {
    ledger.init();
    const ledgerPath = path.join(tempDir, '.harness', 'run', 'run-12345', 'ledger.md');
    expect(fs.existsSync(ledgerPath)).toBe(true);
    const content = fs.readFileSync(ledgerPath, 'utf8');
    expect(content).toContain('Progress Ledger');
    expect(content).toContain('run-12345');
  });

  it('should track task lifecycle: start → complete', () => {
    ledger.init();
    ledger.startTask('task-1', 'step-a', 'Read file');
    ledger.completeTask('task-1', 'step-a');

    const entry = ledger.getStatus('task-1', 'step-a');
    expect(entry).toBeDefined();
    expect(entry!.status).toBe('completed');
    expect(entry!.startedAt).toBeDefined();
    expect(entry!.completedAt).toBeDefined();
    expect(ledger.getPendingCount()).toBe(0);
    expect(ledger.getFailedCount()).toBe(0);
  });

  it('should track failed tasks', () => {
    ledger.init();
    ledger.startTask('task-1', 'step-a', 'Read file');
    ledger.failTask('task-1', 'step-a', 'File not found');

    const entry = ledger.getStatus('task-1', 'step-a');
    expect(entry!.status).toBe('failed');
    expect(entry!.error).toBe('File not found');
    expect(ledger.getFailedCount()).toBe(1);
  });

  it('should track skipped tasks', () => {
    ledger.init();
    ledger.startTask('task-1', 'step-a', 'Skip test');
    ledger.skipTask('task-1', 'step-a', 'Not needed');
    const entry = ledger.getStatus('task-1', 'step-a');
    expect(entry!.status).toBe('skipped');
  });

  it('should return all entries via getEntries', () => {
    ledger.init();
    ledger.startTask('task-1', 'step-a', 'Step A');
    ledger.startTask('task-1', 'step-b', 'Step B');
    ledger.completeTask('task-1', 'step-a');
    const entries = ledger.getEntries();
    expect(entries.length).toBe(2);
  });

  it('should write updated content to ledger.md after each operation', () => {
    ledger.init();
    ledger.startTask('task-1', 'step-a', 'Read file');
    ledger.completeTask('task-1', 'step-a');

    const ledgerPath = path.join(tempDir, '.harness', 'run', 'run-12345', 'ledger.md');
    const content = fs.readFileSync(ledgerPath, 'utf8');
    expect(content).toContain('✅ completed');
    expect(content).toContain('Summary');
    expect(content).toContain('**Completed:** 1');
  });

  it('should throw EXEC_002 for unknown entry', () => {
    ledger.init();
    expect(() => ledger.completeTask('nonexistent', 'step-x')).toThrow();
  });
});
