import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { RepoConfig } from "../lib/repo-identity.js";

const HARNESS_HOME = process.env.HARNESS_HOME || join(homedir(), ".harness");
const DB_PATH = join(HARNESS_HOME, "harness.sqlite");

let _db: Database.Database | null = null;

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      repo_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT NOT NULL,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      title TEXT NOT NULL,
      scope TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS instincts (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0.5,
      ttl_days INTEGER,
      created_at TEXT NOT NULL,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      reference_count INTEGER DEFAULT 0,
      last_outcome TEXT,
      last_referenced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS session_instinct_refs (
      session_id TEXT NOT NULL,
      instinct_id TEXT NOT NULL,
      outcome TEXT, -- 'success', 'failure', or NULL if not yet known
      referenced_at TEXT NOT NULL,
      PRIMARY KEY (session_id, instinct_id),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (instinct_id) REFERENCES instincts(id)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repos (
      repo_id TEXT PRIMARY KEY,
      repo_name TEXT NOT NULL,
      repo_path TEXT,
      remote_url TEXT,
      registered_at TEXT NOT NULL,
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS workers (
      worker_id TEXT PRIMARY KEY,
      pid INTEGER,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      timeout_at TEXT NOT NULL,
      ended_at TEXT,
      command TEXT,
      repo_path TEXT,
      session_id TEXT
    );

    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      task_id TEXT,
      trigger TEXT NOT NULL,
      findings TEXT NOT NULL,
      actions_taken TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  // Idempotent column migrations for instincts table
  const cols = db.prepare("PRAGMA table_info(instincts)").all() as Array<{ name: string }>;
  const colNames = cols.map(c => c.name);

  if (!colNames.includes("type")) {
    db.exec("ALTER TABLE instincts ADD COLUMN type TEXT DEFAULT 'instinct'");
  }
  if (!colNames.includes("context")) {
    db.exec("ALTER TABLE instincts ADD COLUMN context TEXT");
  }
  if (!colNames.includes("resolution")) {
    db.exec("ALTER TABLE instincts ADD COLUMN resolution TEXT");
  }
  if (!colNames.includes("review_trigger")) {
    db.exec("ALTER TABLE instincts ADD COLUMN review_trigger TEXT");
  }
}

export function getDb(): Database.Database {
  if (_db) return _db;

  ensureDir(HARNESS_HOME);
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  runMigrations(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export function getDbPath(): string {
  return DB_PATH;
}

export function getHarnessHome(): string {
  return HARNESS_HOME;
}

export function registerRepo(config: RepoConfig): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO repos (repo_id, repo_name, repo_path, remote_url, registered_at, last_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    config.repo_id,
    config.repo_name,
    null,
    config.remote_url || null,
    config.registered_at,
    new Date().toISOString(),
  );
}

export function updateRepoLastActive(repoId: string): void {
  const db = getDb();
  db.prepare(`UPDATE repos SET last_active = ? WHERE repo_id = ?`).run(
    new Date().toISOString(),
    repoId,
  );
}
