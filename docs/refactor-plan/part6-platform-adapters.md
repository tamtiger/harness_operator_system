# Harness Refactoring Plan — Part 6: Multi-Platform Adapter Architecture (v2)

> **Bổ sung cho:** Migration Roadmap (Phase 11 mới)  
> **Corrections từ v1:** Bỏ Pi. Kiro: steering = bootstrap/guide (không chứa skills), skills = `.kiro/skills/`. Antigravity/Gemini CLI: dùng `.gemini/` + `GEMINI.md`.  
> **Reference verified:** obra/superpowers — `gemini-extension.json`, `GEMINI.md`, `.claude-plugin/`, `.cursor-plugin/`, `.opencode/`, `hooks/`

---

## Verified: Activation Mechanism per Platform

| Platform | Bootstrap file | Skill loading | Source verified |
|---|---|---|---|
| **Kiro** | `.kiro/steering/*.md` (`inclusion: always`) | `.kiro/skills/*.md` | Steering files in this session |
| **Cursor** | `.cursor-plugin/plugin.json` + sessionStart hook | File read via rules | `.cursor-plugin/plugin.json`, `hooks/hooks-cursor.json` |
| **OpenCode** | `opencode.json` plugin + `experimental.chat.messages.transform` | `.opencode/skills/` + native `skill` tool | `.opencode/INSTALL.md`, `docs/README.opencode.md` |
| **Antigravity / Gemini CLI** | `gemini-extension.json` + `GEMINI.md` | `GEMINI.md` `@include` skill files | `gemini-extension.json`, `GEMINI.md` |
| **Claude Code** | `.claude-plugin/plugin.json` + `hooks/hooks.json` SessionStart | File read via `Skill` tool | `hooks/session-start`, `hooks/hooks.json` |

**Hai cơ chế hoàn toàn khác nhau:**
- **File-based bootstrap** (Kiro, Antigravity/Gemini CLI): Chỉ cần đặt đúng files — platform tự load.  
- **Plugin/hook-based bootstrap** (Claude Code, Cursor, OpenCode): Cần manifest + hook script chạy at session start.

---

## 14. CLI Commands: `harness install-adapter`

### 14.1 Tổng quan

```bash
harness install-adapter <platform> [options]
harness adapter list
harness adapter verify <platform>
harness adapter remove <platform>
```

### 14.2 Supported Platforms

| Platform ID | Tên | Cơ chế | Scope |
|---|---|---|---|
| `kiro` | Kiro CLI | `.kiro/steering/` (guide) + `.kiro/skills/` (skills) | project hoặc `--global` |
| `cursor` | Cursor | `.cursor-plugin/` + `hooks/hooks-cursor.json` | project |
| `opencode` | OpenCode | `opencode.json` + `.opencode/skills/` | project hoặc `--global` |
| `antigravity` | Antigravity / Gemini CLI | `gemini-extension.json` + `GEMINI.md` | project |
| `claude-code` | Claude Code | `.claude-plugin/` + `hooks/hooks.json` | project |

---

### 14.3 `harness install-adapter kiro`

**Cơ chế Kiro:**  
- `.kiro/steering/` — tất cả files có `inclusion: always` được inject vào **mọi session** tự động. Đây là nơi đặt bootstrap/guide, KHÔNG phải skills.  
- `.kiro/skills/` — skill files (`SKILL.md`) được agent đọc on demand qua `read` tool.

**Quy tắc:** Steering file chỉ chứa hướng dẫn cách dùng Harness + skill index (tên + trigger). Skills thực sự nằm trong `.kiro/skills/`.

**Thao tác:**

```bash
# Project scope
harness install-adapter kiro

# Global scope (~/.kiro/steering/ + ~/.kiro/skills/)
harness install-adapter kiro --global
```

**Files được tạo — project scope:**

```
.kiro/steering/
  harness.md                   ← bootstrap: cách dùng Harness + skill index

.kiro/skills/
  harness-context-first/
    SKILL.md                   ← copy từ .harness/skills/harness-context-first.md
  brainstorm-before-code/
    SKILL.md
  plan-before-implement/
    SKILL.md
  tdd-red-green-refactor/
    SKILL.md
  subagent-per-task/
    SKILL.md
  two-stage-review/
    SKILL.md
  systematic-debug/
    SKILL.md
  verify-before-done/
    SKILL.md
  governance-checkpoint/
    SKILL.md
  finish-development/
    SKILL.md
```

**`.kiro/steering/harness.md`** (bootstrap — luôn được inject):

```markdown
---
inclusion: always
---

# Harness — AI Runtime

You have Harness. Harness is the workflow-driven AI runtime for this project.
It provides: knowledge base, architectural rules, coding skills, governance.

## Before any task (REQUIRED)
Run: `harness context --task "<your task description>"`
Returns: relevant knowledge, applicable rules, which skills to use.

## For feature/fix/refactor work (REQUIRED)
Run: `harness run "<task>"`
Activates: brainstorm → plan → execute → validate workflow.

## Available Skills
Read a skill when its trigger applies. Skills are in `.kiro/skills/<name>/SKILL.md`.

| Skill | Read when... |
|---|---|
| `harness-context-first` | Starting any task |
| `brainstorm-before-code` | Before writing any code |
| `plan-before-implement` | After brainstorm, before coding |
| `tdd-red-green-refactor` | Implementing any feature or bugfix |
| `subagent-per-task` | Executing a multi-task plan |
| `two-stage-review` | Reviewing code (spec + quality) |
| `systematic-debug` | Encountering any bug or failure |
| `verify-before-done` | Before claiming work complete |
| `governance-checkpoint` | Before changing public contracts |
| `finish-development` | When implementation is complete |

## CLI Quick Reference
harness context --task "..."   # load context + applicable skills
harness run "<task>"           # full workflow execution
harness skill list             # list all skills
harness workflow list          # list available workflows
harness validate               # validate repository structure
harness doctor                 # health check

## Tool Mapping (Kiro-specific)
| Skill action | Kiro tool |
|---|---|
| Create/track todo | `todo_list` tool |
| Dispatch subagent | `subagent` tool |
| Read a file | `read` tool |
| Run a command | `shell` tool |
| Search codebase | `grep` / `code` tool |
| Read a skill | `read` tool on `.kiro/skills/<name>/SKILL.md` |
```

**Files được tạo — global scope (`--global`):**

```
~/.kiro/steering/
  harness-global.md            ← global bootstrap (không có skill index — project-specific)

~/.kiro/skills/
  harness-context-first/SKILL.md
  tdd-red-green-refactor/SKILL.md
  verify-before-done/SKILL.md
  ... (chỉ generic skills, không có governance-checkpoint)
```

---

### 14.4 `harness install-adapter antigravity` (Gemini CLI)

**Cơ chế Antigravity / Gemini CLI (verified từ source):**  
- `gemini-extension.json` ở root: `{ "contextFileName": "GEMINI.md" }` — chỉ định file nào được load làm context.  
- `GEMINI.md` ở root: chứa nội dung bootstrap. Superpowers dùng `@./skills/using-superpowers/SKILL.md` để `@include` skill content.  
- Cơ chế `@include` của Gemini CLI đọc file được reference và inject vào context.

**Thao tác:**

```bash
harness install-adapter antigravity
```

**Files được tạo:**

```
gemini-extension.json          ← chỉ định contextFileName
GEMINI.md                      ← bootstrap content với @include references
```

**`gemini-extension.json`:**
```json
{
  "name": "harness",
  "description": "Workflow-driven AI runtime with knowledge base and skills",
  "version": "{{HARNESS_VERSION}}",
  "contextFileName": "GEMINI.md"
}
```

**`GEMINI.md`:**
```markdown
@.harness/skills/harness-context-first.md

You have Harness v{{VERSION}}.

Harness is the AI runtime for this project. Before any task:
- Run `harness context --task "<task>"` to load knowledge and skills.
- Run `harness run "<task>"` for full workflow execution.

## Available Skills
@.harness/skills/brainstorm-before-code.md
@.harness/skills/plan-before-implement.md
@.harness/skills/tdd-red-green-refactor.md
@.harness/skills/verify-before-done.md
@.harness/skills/governance-checkpoint.md

## CLI
harness context --task "..."  # load context
harness run "<task>"          # full workflow
harness skill list            # all skills
harness validate              # validate repo

## Tool Mapping (Gemini CLI)
| Skill action | Tool |
|---|---|
| Create a todo | Built-in task tracking |
| Dispatch subagent | Not natively available — execute inline |
| Read a file | `read_file` |
| Run a command | `run_shell_command` |
| Search codebase | `search_files` |
```

**Note về `@include`:** Nếu Gemini CLI version không hỗ trợ `@` syntax, fallback là copy nội dung key skills trực tiếp vào `GEMINI.md` khi `harness install-adapter` chạy. `harness adapter verify` sẽ detect xem skills content có out-of-sync không.

---

### 14.5 `harness install-adapter cursor`

**Cơ chế Cursor (verified):**  
`.cursor-plugin/plugin.json` với `"hooks": "./hooks/hooks-cursor.json"`. Hook format: `{ "version": 1, "hooks": { "sessionStart": [{ "command": "..." }] } }`. Session start → bash script → inject bootstrap JSON.

**Thao tác:**

```bash
harness install-adapter cursor
```

**Files được tạo:**

```
.cursor-plugin/
  plugin.json
  hooks.json
  session-start           ← bash script (Unix)
  session-start.cmd       ← polyglot wrapper (Windows + Unix)
```

**`.cursor-plugin/plugin.json`:**
```json
{
  "name": "harness",
  "displayName": "Harness",
  "description": "Workflow-driven AI runtime with knowledge base and skills",
  "version": "{{HARNESS_VERSION}}",
  "skills": ".harness/skills/",
  "hooks": "./.cursor-plugin/hooks.json"
}
```

**`.cursor-plugin/hooks.json`:**
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "./.cursor-plugin/session-start.cmd session-start"
      }
    ]
  }
}
```

**`session-start` bash** (generated at install, reads `.harness/skills/` index):  
Output JSON: `{ "additional_context": "<harness bootstrap + skill index>" }`

---

### 14.6 `harness install-adapter opencode`

**Cơ chế OpenCode (verified):**  
Plugin registered via `opencode.json`. Plugin registers skills dir via `config` hook. Bootstrap injected via `experimental.chat.messages.transform` hook. Project skills go in `.opencode/skills/`.

**Thao tác:**

```bash
harness install-adapter opencode             # project scope
harness install-adapter opencode --global    # ~/.config/opencode/opencode.json
```

**Files được tạo — project scope:**

```
.opencode/
  skills/
    harness-context-first/
      SKILL.md             ← symlink hoặc copy từ .harness/skills/
    brainstorm-before-code/
      SKILL.md
    ... (all skills)
```

**Project `opencode.json`** (created if not exists, or updated):
```json
{
  "plugin": [".harness/opencode-plugin"]
}
```

**`.harness/opencode-plugin/` structure** (generated at install):
```
.harness/opencode-plugin/
  index.js               ← OpenCode plugin entry point
  package.json
```

`index.js` dùng OpenCode plugin API để register skills directory (`.harness/skills/`) và inject bootstrap via `experimental.chat.messages.transform`. Logic tương tự Superpowers OpenCode plugin nhưng đọc từ `.harness/`.

---

### 14.7 `harness install-adapter claude-code`

**Cơ chế Claude Code (verified):**  
`SessionStart` hook → `run-hook.cmd session-start` → bash script → output `{ "hookSpecificOutput": { "additionalContext": "..." } }`.

**Thao tác:**

```bash
harness install-adapter claude-code
```

**Files được tạo:**

```
.claude-plugin/
  plugin.json
  marketplace.json
hooks/
  hooks.json             ← SessionStart hook registry
  session-start          ← bash: reads .harness/skills/ index, outputs additionalContext
  run-hook.cmd           ← polyglot bash/cmd wrapper (Windows-safe)
```

**`hooks/hooks.json`:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
            "async": false
          }
        ]
      }
    ]
  }
}
```

**`hooks/session-start`** (bash, output format per Claude Code spec):
```bash
#!/usr/bin/env bash
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS_ROOT="${HARNESS_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null)}"

# Build skill index from .harness/skills/
skill_index=$(harness skill list --format bootstrap 2>/dev/null || echo "Run 'harness skill list' for available skills.")

bootstrap="You have Harness. Before any task: harness context --task \"<task>\". For implementation: harness run \"<task>\".

## Skills
${skill_index}"

# Escape for JSON
bootstrap_escaped=$(printf '%s' "$bootstrap" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read())[1:-1])')

if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  printf '{"additional_context":"%s"}\n' "$bootstrap_escaped"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$bootstrap_escaped"
else
  printf '{"additionalContext":"%s"}\n' "$bootstrap_escaped"
fi
```

---

## 15. `harness skill list --format bootstrap`

Flag mới cho `harness skill list` để hỗ trợ session-start scripts generate skill index:

```bash
harness skill list --format bootstrap
```

Output (plain text, không có markdown headers):
```
harness-context-first: Use when starting any task
brainstorm-before-code: Use before writing any code
plan-before-implement: Use after brainstorm, before coding
tdd-red-green-refactor: Use when implementing any feature or bugfix
subagent-per-task: Use when executing a multi-task plan
two-stage-review: Use when reviewing code for spec + quality
systematic-debug: Use when encountering any bug or failure
verify-before-done: Use before claiming work complete
governance-checkpoint: Use before changing public contracts
finish-development: Use when implementation is complete
```

Dùng trong `hooks/session-start` để dynamic generate skill index thay vì hardcode.

---

## 16. `harness adapter list`

```bash
harness adapter list
```

```
Installed adapters:
  kiro          ✅ .kiro/steering/harness.md + .kiro/skills/ (10 skills)
  cursor        ✅ .cursor-plugin/ + hooks/
  antigravity   ✅ gemini-extension.json + GEMINI.md
  opencode      ❌ not installed
  claude-code   ❌ not installed

Run 'harness install-adapter <platform>' to install.
```

---

## 17. `harness adapter verify <platform>`

```bash
harness adapter verify kiro
```

Checks:
- `.kiro/steering/harness.md` exists và skill index matches current skills
- `.kiro/skills/` có đủ 10 skill directories
- Mỗi `.kiro/skills/<name>/SKILL.md` matches `.harness/skills/<name>.md`

```
kiro adapter: ⚠️ OUT OF SYNC
  .kiro/steering/harness.md — present ✅
  .kiro/skills/ — 8/10 skills present
    Missing: subagent-per-task, finish-development
  Run: harness sync to fix
```

---

## 18. `harness sync` Auto-sync Adapters

`harness sync` tự động re-sync tất cả installed adapters:

```bash
harness sync
# → Sync shared harness assets (existing behavior)
# → Re-generate .kiro/steering/harness.md (nếu skill list thay đổi)
# → Re-copy/update .kiro/skills/ (nếu skill content thay đổi)
# → Re-generate GEMINI.md (nếu antigravity installed + skills changed)
# → Re-generate hooks/session-start (nếu claude-code/cursor installed + skills changed)
# → Report: "Synced 3 adapters: kiro, cursor, antigravity"
```

**Trigger conditions:**
- Skill được thêm hoặc xóa khỏi `.harness/skills/`
- Skill content thay đổi (frontmatter description cập nhật)
- Harness version bump

---

## 19. `harness doctor` Adapter Health

```
harness doctor

Adapters:
  ✅ kiro         — .kiro/steering/harness.md (in sync, 10/10 skills)
  ⚠️ cursor       — hooks/session-start outdated (run: harness sync)
  ✅ antigravity  — GEMINI.md (in sync)
  ℹ️ opencode     — not installed
  ℹ️ claude-code  — not installed
```

---

## 20. Harness Bootstrap Template

Nội dung core của bootstrap được generate từ template tại `src/shared/templates/HARNESS_BOOTSTRAP_TEMPLATE.md`. Template có các placeholders:

- `{{VERSION}}` — harness version
- `{{SKILL_INDEX}}` — generated từ `.harness/skills/` frontmatter (tên + description)
- `{{TOOL_MAPPING}}` — platform-specific tool mapping block
- `{{PROJECT_NAME}}` — từ `harness.yaml`

---

## 21. Migration Phase 11 (updated)

### Phase 11: Multi-Platform Adapter Support

**Objectives:** Implement `harness install-adapter` cho 5 platforms. Auto-sync. Doctor checks.

**Components affected:**
- New: `src/adapters/cli/commands/install-adapter.ts`
- New: `src/adapters/cli/commands/adapter.ts` (list, verify, remove)
- New: `src/platform/adapters/kiro.ts`
- New: `src/platform/adapters/antigravity.ts`
- New: `src/platform/adapters/cursor.ts`
- New: `src/platform/adapters/opencode.ts`
- New: `src/platform/adapters/claude-code.ts`
- New: `src/shared/templates/HARNESS_BOOTSTRAP_TEMPLATE.md`
- Modified: `src/adapters/cli/index.ts`
- Modified: `src/platform/sync/SharedHarnessSynchronizer.ts` (adapter sync)
- Modified: `src/platform/doctor/DiagnosticsEngine.ts` (adapter health)
- Modified: `src/adapters/cli/commands/capabilities.ts` → add `harness skill list --format bootstrap`

**New CLI commands:**

```bash
harness install-adapter kiro          [--global] [--force]
harness install-adapter antigravity   [--force]
harness install-adapter cursor        [--force]
harness install-adapter opencode      [--global] [--force]
harness install-adapter claude-code   [--force]
harness adapter list
harness adapter verify <platform>
harness adapter remove <platform>
harness sync --adapters-only
harness skill list --format bootstrap  # new flag
```

**Superpowers concepts adopted:**
- Session-start hook pattern + `run-hook.cmd` polyglot wrapper → Cursor, Claude Code
- `gemini-extension.json` + `GEMINI.md` `@include` pattern → Antigravity/Gemini CLI
- `.opencode/skills/` directory registration → OpenCode
- Skill YAML frontmatter for tool-description → Kiro skill index

**Harness extensions:**
- `.kiro/steering/` bootstrap (Kiro-specific, không có trong Superpowers)
- `.kiro/skills/` per-project skill copies
- `harness skill list --format bootstrap` (dynamic skill index cho session scripts)
- `harness sync` adapter auto-resync
- `harness adapter verify` out-of-sync detection
- `harness doctor` adapter health reporting

**Breaking changes:** None — additive only

**Risks:**
- Platform API thay đổi (e.g., Gemini CLI `@include` syntax) — mitigate: `harness adapter verify` detects và warn
- Windows path issues với bash hooks — mitigate: `run-hook.cmd` polyglot (proven bởi Superpowers)
- OpenCode plugin API thay đổi — medium risk, isolate trong `src/platform/adapters/opencode.ts`

**Validation criteria:**
- `harness install-adapter kiro` → `.kiro/steering/harness.md` + `.kiro/skills/` với 10 skills
- Kiro session: agent nhận skill index, đọc đúng SKILL.md khi trigger applies
- `harness install-adapter antigravity` → `gemini-extension.json` + `GEMINI.md`
- `harness install-adapter cursor` → `.cursor-plugin/` + hooks, session hook fires
- `harness install-adapter claude-code` → `.claude-plugin/` + hooks, Windows-safe
- `harness install-adapter opencode` → `.opencode/skills/` + plugin entry
- `harness sync` re-syncs all installed adapters khi skills change
- `harness adapter list` shows correct status
- `harness adapter verify` detects out-of-sync skills
- `harness doctor` shows adapter health
- All existing conformance tests pass (additive only)

**Complexity:** Medium-High (7-10 days)

**Minimum viable:** `harness install-adapter kiro` — chỉ cần file I/O, không cần hook scripting. Deliver cuối Phase 1.  
**Recommended order:** After Phase 1 (skill asset type) + Phase 8 (skills library đủ 10 skills).

---

## Tóm tắt: File Layout sau khi install tất cả adapters

```
project-root/
├── .harness/
│   ├── harness.yaml
│   ├── skills/                        ← source of truth cho skills
│   │   ├── harness-context-first.md
│   │   ├── brainstorm-before-code.md
│   │   └── ... (10 skills)
│   └── opencode-plugin/               ← OpenCode plugin entry
│       ├── index.js
│       └── package.json
│
├── .kiro/
│   ├── steering/
│   │   └── harness.md                 ← bootstrap guide (auto-load)
│   └── skills/
│       ├── harness-context-first/SKILL.md   ← copies từ .harness/skills/
│       ├── brainstorm-before-code/SKILL.md
│       └── ... (10 skill dirs)
│
├── .cursor-plugin/
│   ├── plugin.json
│   ├── hooks.json
│   ├── session-start
│   └── session-start.cmd
│
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
│
├── .agents/plugins/
│   └── marketplace.json               ← Antigravity plugin manifest
│
├── hooks/
│   ├── hooks.json                     ← Claude Code SessionStart
│   ├── session-start                  ← bash bootstrap script
│   └── run-hook.cmd                   ← Windows polyglot wrapper
│
├── gemini-extension.json              ← Gemini CLI / Antigravity context
├── GEMINI.md                          ← Bootstrap + @include skills
│
└── opencode.json                      ← OpenCode plugin registration
```


---

## 22. PlatformAdapter Interface

Internal interface used by `harness adapter list`, `harness adapter verify`, and `harness sync`.
Not a public API — each platform implements it differently internally.

```typescript
// src/platform/adapters/PlatformAdapter.ts

type PlatformId = 'kiro' | 'cursor' | 'opencode' | 'antigravity' | 'claude-code';

interface PlatformAdapter {
  readonly id: PlatformId;
  install(root: string, options: AdapterInstallOptions): Promise<void>;
  verify(root: string): Promise<AdapterStatus>;
  sync(root: string, skills: SkillAsset[]): Promise<void>;
  remove(root: string): Promise<void>;
}

interface AdapterInstallOptions {
  global?: boolean;    // install to user home dir instead of project
  force?: boolean;     // overwrite existing files
}

interface AdapterStatus {
  installed: boolean;
  inSync: boolean;
  missingFiles: string[];
  outOfSyncSkills: string[];
}
```

Implementations:
- `src/platform/adapters/kiro.ts` — writes `.kiro/steering/harness.md` + `.kiro/skills/`
- `src/platform/adapters/antigravity.ts` — writes `gemini-extension.json` + `GEMINI.md`
- `src/platform/adapters/cursor.ts` — writes `.cursor-plugin/` + `hooks/`
- `src/platform/adapters/opencode.ts` — writes `.opencode/skills/` + plugin entry
- `src/platform/adapters/claude-code.ts` — writes `.claude-plugin/` + `hooks/`
