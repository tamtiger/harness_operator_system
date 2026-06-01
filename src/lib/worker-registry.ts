import { getDb } from "../db/client.js";
import { log } from "./logger.js";

export interface WorkerRecord {
  worker_id: string;
  pid: number | null;
  status: string; // 'running' | 'finished' | 'failed' | 'killed' | 'timeout'
  started_at: string;
  timeout_at: string;
  ended_at: string | null;
  command: string;
  repo_path: string;
  session_id: string;
}

export function registerWorker(worker: {
  worker_id: string;
  pid: number | null;
  command: string;
  repo_path: string;
  session_id: string;
  timeout_seconds: number;
}): void {
  const db = getDb();
  const startedAt = new Date().toISOString();
  const timeoutAt = new Date(Date.now() + worker.timeout_seconds * 1000).toISOString();

  db.prepare(`
    INSERT INTO workers (worker_id, pid, status, started_at, timeout_at, command, repo_path, session_id)
    VALUES (?, ?, 'running', ?, ?, ?, ?, ?)
  `).run(
    worker.worker_id,
    worker.pid,
    startedAt,
    timeoutAt,
    worker.command,
    worker.repo_path,
    worker.session_id
  );
}

export function updateWorkerPid(workerId: string, pid: number): void {
  const db = getDb();
  db.prepare("UPDATE workers SET pid = ? WHERE worker_id = ?").run(pid, workerId);
}

export function finishWorker(workerId: string, status: "finished" | "failed" | "killed" | "timeout"): void {
  const db = getDb();
  const endedAt = new Date().toISOString();
  db.prepare("UPDATE workers SET status = ?, ended_at = ? WHERE worker_id = ?").run(
    status,
    endedAt,
    workerId
  );
}

export function listWorkers(filter?: { repoPath?: string; status?: string }): WorkerRecord[] {
  const db = getDb();
  let query = "SELECT * FROM workers";
  const params: any[] = [];

  if (filter) {
    const clauses: string[] = [];
    if (filter.repoPath) {
      clauses.push("repo_path = ?");
      params.push(filter.repoPath);
    }
    if (filter.status) {
      clauses.push("status = ?");
      params.push(filter.status);
    }
    if (clauses.length > 0) {
      query += " WHERE " + clauses.join(" AND ");
    }
  }

  query += " ORDER BY started_at DESC";
  return db.prepare(query).all(...params) as WorkerRecord[];
}

export function getWorker(workerId: string): WorkerRecord | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(workerId) as WorkerRecord | undefined;
}

export function killWorker(workerId: string): boolean {
  const worker = getWorker(workerId);
  if (!worker) return false;

  if (worker.status === "running") {
    if (worker.pid) {
      try {
        process.kill(worker.pid, "SIGTERM");
      } catch (err: any) {
        if (err.code !== "ESRCH") {
          log("error", `Failed to kill process ${worker.pid}: ${err.message}`);
        }
      }
    }
    finishWorker(workerId, "killed");
    return true;
  }
  return false;
}

export function cleanupExpiredWorkers(repoPath?: string): number {
  const db = getDb();
  const now = new Date().toISOString();
  let query = "SELECT * FROM workers WHERE status = 'running' AND timeout_at < ?";
  const params: any[] = [now];

  if (repoPath) {
    query += " AND repo_path = ?";
    params.push(repoPath);
  }

  const expired = db.prepare(query).all(...params) as WorkerRecord[];
  let count = 0;

  for (const w of expired) {
    if (w.pid) {
      try {
        process.kill(w.pid, "SIGTERM");
      } catch (err: any) {
        if (err.code !== "ESRCH") {
          log("error", `Failed to kill expired process ${w.pid}: ${err.message}`);
        }
      }
    }
    finishWorker(w.worker_id, "timeout");
    count++;
  }

  return count;
}
