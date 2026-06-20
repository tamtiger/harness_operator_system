import { appendFileSync, existsSync, statSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { gzipSync } from "node:zlib";
import { resolveGlobalHome } from "../lib/repo.js";

export let AUDIT_LIMIT = 10 * 1024 * 1024; // 10MB
export const MAX_BACKUP_FILES = 10;

export function setAuditLimit(limit: number) {
  AUDIT_LIMIT = limit;
}

function getTimestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function rotateAuditFile(filePath: string): void {
  try {
    const content = readFileSync(filePath);
    const compressed = gzipSync(content);
    
    const ts = getTimestamp();
    let backupPath = filePath.replace("audit.jsonl", `audit.${ts}.jsonl.gz`);
    
    let counter = 1;
    while (existsSync(backupPath)) {
      backupPath = filePath.replace("audit.jsonl", `audit.${ts}-${counter}.jsonl.gz`);
      counter++;
    }

    writeFileSync(backupPath, compressed);
    writeFileSync(filePath, ""); // Clear original file

    // Clean up oldest backups if exceeding MAX_BACKUP_FILES
    try {
      const dir = dirname(filePath);
      const files = readdirSync(dir);
      const gzFiles = files
        .filter(f => f.startsWith("audit.") && f.endsWith(".jsonl.gz"))
        .map(f => ({ name: f, path: join(dir, f), stat: statSync(join(dir, f)) }));
      
      gzFiles.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);

      if (gzFiles.length > MAX_BACKUP_FILES) {
        const toDeleteCount = gzFiles.length - MAX_BACKUP_FILES;
        for (let i = 0; i < toDeleteCount; i++) {
          try {
            unlinkSync(gzFiles[i].path);
          } catch {}
        }
      }
    } catch (err) {
      process.stderr.write(`[Audit Cleanup Error] ${err}\n`);
    }
  } catch (err) {
    process.stderr.write(`[Audit Rotation Error] ${err}\n`);
  }
}

/**
 * Append a JSON line to ~/.harness/audit.jsonl.
 * Atomic: each write is a single line with newline.
 * Compresses to backup files every time size grows by AUDIT_LIMIT, but keeps the original file.
 */
export function appendAuditJsonl(event: {
  event_type: string;
  payload: unknown;
  timestamp: string;
}): void {
  const home = resolveGlobalHome();
  const filePath = join(home, "audit.jsonl");

  const line = JSON.stringify(event) + "\n";
  appendFileSync(filePath, line, "utf-8");

  // Check size and rotate if grown by > AUDIT_LIMIT
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      const currentSize = stats.size;
      const lastBackupPath = join(home, "audit.last_backup");
      
      let lastBackupSize = 0;
      if (existsSync(lastBackupPath)) {
        try {
          lastBackupSize = parseInt(readFileSync(lastBackupPath, "utf-8").trim(), 10) || 0;
        } catch {}
      }

      if (currentSize - lastBackupSize > AUDIT_LIMIT) {
        rotateAuditFile(filePath);
        writeFileSync(lastBackupPath, "0", "utf-8");
      }
    }
  } catch {}
}
