# State Architecture

[← Mục lục](./README.md)

---

## Overview

harness-os uses a **hybrid state model**: minimal per-repo state for fast access, with bulk global state for cross-repo operations and persistence.

---

## Hybrid Model

### Per-Repo State (`.harness/`)

Each initialized repo has a `.harness/` directory containing:

```
.harness/
├── config.yaml           # Repo identity (UUID, name, stack)
├── progress.md           # Append-only session log
├── scope.yaml            # Allowed/forbidden paths
├── verify.yaml           # Verification pipeline config
├── handoff_last.json     # Last session handoff
└── evidence/
    └── {task_id}/
        └── verify.json   # Verification evidence per task
```

**Design principle:** Only files needed for immediate agent work live here. Fast to read, small footprint, git-friendly.

### Global State (`~/.harness/`)

Cross-repo state lives in the user's home directory:

```
~/.harness/
├── harness.sqlite        # Sessions, tasks, instincts, audit events, scorecards, instinct_outcomes
├── audit.jsonl           # Append-only audit trail
├── skills/               # User global skills (override built-in)
├── repos/
    └── {repo_id}/
        ├── repo-summary.md    # Auto-generated repo overview
        └── artifacts/
            ├── plans/
            ├── research/
            └── reviews/
```

**Design principle:** Bulk data, cross-repo queries, and historical records live here. Not git-tracked.

---

## UUID Identity

Each repo gets a stable UUID when initialized via `harness init`:

```yaml
# .harness/config.yaml
repo_id: "a3f1b2c4-5678-9abc-def0-123456789abc"
repo_name: "my-project"
stack: "node"
created_at: "2026-05-27T10:00:00Z"
```

The UUID is:
- Generated once during `harness init`
- Stored in `.harness/config.yaml`
- Used as the key in `~/.harness/repos/{repo_id}/`
- Registered in the global SQLite database
- Stable across repo moves/renames (identity follows the config file)

---

## SQLite Database

Location: `~/.harness/harness.sqlite` (override with `HARNESS_HOME` env var)

### Tables

```sql
sessions              (id, repo_path, status, started_at, ended_at, current_phase, verify_called, variant_id)
tasks                 (id, session_id, title, scope, status, created_at, task_type)
instincts             (id, description, tags, confidence, ttl_days, created_at, success_count, failure_count, reference_count, last_outcome, last_referenced_at, type, context, resolution, review_trigger, status)
session_instinct_refs (session_id, instinct_id, outcome, referenced_at)
workers               (worker_id, pid, status, started_at, timeout_at, ended_at, command, repo_path, session_id)
reflections           (id, session_id, task_id, trigger, findings, actions_taken, created_at)
audit_events          (id, event_type, payload, created_at)
scorecards            (id, task_id, session_id, task_type, variant_id, verify_pass, tool_calls, retry_count, loop_events, files_touched, execution_time_ms, instincts_used, skills_used, created_at)
instinct_outcomes     (instinct_id, task_id, task_type, variant_id, outcome, scorecard_id, timestamp)
```

### Settings

- WAL mode for concurrent reads
- Foreign keys enabled
- Additive-only migrations (never drop/alter columns, check with `table_info`)
- **Automatic Connection Lifecycle**: The SQLite connection automatically closes cleanly on process exit (`exit` event) or termination signals (`SIGINT`, `SIGTERM`), preventing locks.

---

## Export / Import

### Export

```bash
harness export [--repo .] [--output FILE]
```

Exports `.harness/` directory contents (JSON, MD, YAML files) + handoff into a single JSON file.

### Import

```bash
harness import <file.json>
```

Restores exported state into the current repo's `.harness/` directory.

### Export Format

```json
{
  "manifest": {
    "version": "1.0",
    "exported_at": "2026-05-27T10:00:00Z",
    "source": "/path/to/repo"
  },
  "state": {
    "config.yaml": "...",
    "progress.md": "...",
    "handoff_last.json": "..."
  }
}
```

---

## Backup Strategy

### What to Back Up

| Data | Location | Strategy |
|------|----------|----------|
| Per-repo state | `.harness/` | Committed to git (recommended) |
| Global database | `~/.harness/harness.sqlite` | Periodic file copy |
| Audit trail | `~/.harness/audit.jsonl` | Logs all tool events. When it exceeds 10MB, it creates a timestamped backup (`audit.<timestamp>.jsonl`) and truncates the active file to 0 bytes to prevent indefinite growth. |
| Artifacts | `~/.harness/repos/*/artifacts/` | Periodic backup or sync |


### Recommendations

1. **Git-track `.harness/`** — progress, scope, verify config are useful for team
2. **Exclude `evidence/`** from git — large, regenerable
3. **Back up SQLite weekly** — contains session history and instincts
4. **Export before major changes** — `harness export` creates a portable snapshot

### Recovery

If global state is lost:
- Sessions/tasks: lost (recreate via `session_start`)
- Instincts: lost (re-learn or import from backup)
- Per-repo state: preserved in git
- Artifacts: lost if not backed up

If per-repo state is lost:
- Run `harness init --force` to regenerate defaults
- Import from backup: `harness import backup.json`
- Progress history: lost (append-only, not recoverable)
