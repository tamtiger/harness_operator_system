# Cấu trúc file

[← Mục lục](./README.md) | [← Instincts](./instincts.md) | [Troubleshooting →](./troubleshooting.md)

---

## Runtime data (global — không vào git)

```
~/.harness/                              
├── harness.sqlite                # Database: sessions, tasks, instincts, audit
├── audit.jsonl                   # Append-only event stream
├── skills/                       # User override skills
│   └── my-custom-skill/
│       └── SKILL.md
└── evidence/                     # Verify outputs
    └── {repo_hash}/
        └── {task_id}/
            └── verify-2026-05-26.json
```

---

## Per-repo data (vào git — agent đọc được)

```
your-repo/
├── AGENTS.md                     # Entry point cho agent
├── init.sh                       # Health check + install script
└── .harness/
    ├── progress.md               # Session history (human + agent readable)
    ├── feature_list.json         # Scope boundaries per feature
    ├── scope.yaml                # Forbidden/allowed paths + per-task rules
    ├── verify.yaml               # Verification commands per stack
    ├── skills/                   # Repo-specific skills (override global)
    │   └── repo-conventions/
    │       └── SKILL.md
    └── handoff_last.json         # Context cho session tiếp theo
```

---

## Giải thích từng file

| File | Mục đích | Ai đọc | Ai ghi |
|------|----------|--------|--------|
| `AGENTS.md` | Entry point — rules + workflow cho agent | Agent | `harness init` |
| `init.sh` | Health check script (Node version, deps, etc.) | Human/CI | `harness init` |
| `.harness/progress.md` | Log tiến độ qua các session | Agent + Human | Agent (qua `progress_log`) |
| `.harness/feature_list.json` | Danh sách features + scope | Agent | Agent (qua `feature_list_update`) |
| `.harness/scope.yaml` | Forbidden paths + allowed paths per task | Agent (qua `scope_check`) | Human |
| `.harness/verify.yaml` | Lệnh verify (install/build/test/lint) | Agent (qua `verify_run`) | Human / `harness init` |
| `.harness/handoff_last.json` | State cho session sau | Agent | Agent (qua `session_handoff`) |
| `~/.harness/harness.sqlite` | Sessions, tasks, instincts, audit | MCP server | MCP server |
| `~/.harness/audit.jsonl` | Event stream (append-only) | Debug/trace | MCP server (auto) |

---

## Ví dụ nội dung files

### `.harness/scope.yaml`

```yaml
forbidden_paths:
  - "migrations/**"
  - ".github/**"
  - "infra/**"
  - ".env*"
allowed_per_task:
  TASK-12:
    - "src/payments/**"
    - "tests/payments/**"
    definition_of_done:
      - "all tests in tests/payments pass"
      - "lint clean"
      - "no new console.log"
```

### `.harness/verify.yaml` (Node)

```yaml
runtime: node
commands:
  install: "bun install"   # hoặc "npm ci" nếu dùng npm
  build: "bun run build"   # hoặc "npm run build"
  test: "bun run test"     # hoặc "npm run test"
  lint: "bun run lint"     # hoặc "npm run lint"
timeouts:
  build: 120
  test: 300
```

### `.harness/verify.yaml` (.NET)

```yaml
runtime: dotnet
commands:
  install: "dotnet restore"
  build: "dotnet build --no-restore"
  test: "dotnet test --no-build --logger trx"
  lint: "dotnet format --verify-no-changes"
  typecheck: null
timeouts:
  build: 180
  test: 300
```

### `.harness/handoff_last.json`

```json
{
  "session_id": "a3f1b2c4-5678-9abc-def0-123456789abc",
  "summary": "Implemented payment validation with unit tests",
  "unfinished": ["Integration test for refund path"],
  "next_steps": ["Write refund integration test", "Add error handling for timeout"],
  "suggested_skills": ["tdd-workflow", "systematic-diagnosis"],
  "last_known_good": "All 42 tests passing, build clean",
  "written_at": "2026-05-26T14:32:00Z"
}
```

### `.harness/progress.md`

```markdown
# Progress Log

## 2026-05-26 14:32 — session a3f1b2 — task TASK-12
- **Status:** done
- **Summary:** Implemented payment validation with 5 unit tests
- **Evidence:** `.harness/evidence/TASK-12/verify-2026-05-26.json`
- **Next:** Add integration test for refund path

## 2026-05-25 10:15 — session b4c2d1 — task TASK-11
- **Status:** done
- **Summary:** Setup CI pipeline with GitHub Actions
- **Next:** Add payment validation (TASK-12)
```
