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
      created_at TEXT NOT NULL
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
  `);
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
