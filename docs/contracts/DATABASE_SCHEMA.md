# Database Schemas
```sql
-- project.db (SQLite)

-- Knowledge Store
CREATE TABLE knowledge_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,         -- ARCHITECTURE, CODE, ADR, PATTERN, CONVENTION
  source TEXT NOT NULL,       -- file path
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,                  -- JSON array
  module TEXT,
  confidence REAL DEFAULT 1.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- BM25 search index (managed by minisearch, separate)

-- Planning Store
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,       -- APPROVED, REJECTED, AWAITING_APPROVAL
  risk_level TEXT NOT NULL,   -- LOW, MEDIUM, HIGH, CRITICAL
  data TEXT NOT NULL,         -- JSON: steps, impact, rollback
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Runtime Store
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  state TEXT NOT NULL,        -- CREATED, READY, RUNNING, VERIFYING, DONE, FAILED
  current_step TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  files TEXT NOT NULL,        -- JSON: [{path, content, hash}]
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Verification Store
CREATE TABLE verification_reports (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  overall_status TEXT NOT NULL,  -- PASS, FAIL
  layers TEXT NOT NULL,          -- JSON: [{layer, status, duration, diagnostics}]
  created_at TEXT NOT NULL
);

-- Audit Log (append-only)
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  session_id TEXT,
  task_id TEXT,
  event TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload TEXT,               -- JSON
  created_at TEXT NOT NULL
);

-- Metrics
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  labels TEXT,                -- JSON
  created_at TEXT NOT NULL
);

-- Code Index (separate DB: symbols.db)
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,         -- class, interface, enum, method, property
  namespace TEXT,
  file_path TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  visibility TEXT,            -- public, private, internal, protected
  hash TEXT NOT NULL
);

CREATE TABLE references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_symbol_id TEXT NOT NULL,
  to_symbol_id TEXT NOT NULL,
  relationship TEXT NOT NULL, -- inherits, implements, calls, references, imports
  file_path TEXT NOT NULL,
  line INTEGER,
  FOREIGN KEY (from_symbol_id) REFERENCES symbols(id),
  FOREIGN KEY (to_symbol_id) REFERENCES symbols(id)
);
```