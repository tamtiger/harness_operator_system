# Harness Refactoring Plan — Part 1: Research & Analysis
## Executive Summary, Superpowers Inventory, Runtime Architecture

> **Ngày:** 2026-07-13  
> **Trạng thái:** Planning Only — Không có code được viết  
> **Nguồn tham chiếu:** https://github.com/obra/superpowers (commit main, v6.1.1)

---

## 1. Executive Summary

### Vấn đề hiện tại

Harness là một nền tảng **knowledge management** tốt nhưng thiếu **runtime identity**. Khi AI agent nhận lệnh `harness run "task"`, nó thực thi như một pipeline câm — không có kế hoạch rõ ràng, không có vòng review, không có phân tách subagent, không có durable state. Kết quả là agent hoạt động tốt trên thư viện tri thức nhưng kém trên quy trình thực thi.

Superpowers giải quyết đúng cái mà Harness thiếu: **một phương pháp luận làm việc có hệ thống** cho AI agent — từ brainstorming, lập kế hoạch, thực thi có kiểm soát, review, đến merge. Tất cả được mã hoá dưới dạng markdown có thể đọc và tuân theo.

### Mục tiêu refactoring

Biến Harness từ **knowledge container** thành **Workflow-Driven AI Runtime** bằng cách:

1. Áp dụng mô hình **Skill** của Superpowers vào hệ thống asset của Harness
2. Đưa **workflow engine** vào trung tâm thực thi của `harness run`
3. Giữ nguyên toàn bộ năng lực hiện có: Knowledge Base, Governance, Capability, MCP, CLI, Validation

### Nguyên tắc thiết kế

- **Incremental, không rewrite** — mỗi phase độc lập và có thể deploy
- **Superpowers là nguồn cảm hứng, không phải blueprint** — Harness có context riêng
- **Skill = Asset loại mới** — không phá vỡ model asset hiện có
- **Workflow = Sequence của Steps dùng Skills** — không thay thế ExecutionService
- **Simple, extensible, model-agnostic** — không hardcode AI provider

---

## 2. Superpowers Runtime Inventory

> Tất cả thông tin dưới đây được xác minh trực tiếp từ source code của repository `obra/superpowers` (main branch, v6.1.1). Không có thông tin nào từ blog hay memory.

### 2.1 Plugin Manifest

| Thuộc tính | Giá trị | Source |
|---|---|---|
| Name | `superpowers` | `.claude-plugin/plugin.json` |
| Version | `6.1.1` | `.claude-plugin/plugin.json` |
| Hooks | Không có trong `plugin.json` | `.claude-plugin/plugin.json` |
| Hook registry | Tách riêng | `hooks/hooks.json` |

**Quan sát quan trọng:** Plugin manifest `.claude-plugin/plugin.json` chỉ chứa metadata (name, version, description, author, license). Không có hooks. Hooks được khai báo riêng trong `hooks/hooks.json`.

### 2.2 Event Hook System

**File:** `hooks/hooks.json`

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

**Kết luận verified:** Chỉ có một hook event: `SessionStart`. Hook này trigger script `hooks/session-start` bash.

### 2.3 Session-Start Hook (Activation Mechanism)

**File:** `hooks/session-start` (bash script)

Cơ chế hoạt động:
1. Đọc nội dung toàn bộ `skills/using-superpowers/SKILL.md`
2. Escape thành JSON string
3. Output JSON payload `{ "hookSpecificOutput": { "additionalContext": "..." } }` (Claude Code format)
4. Harness-specific format handling: Claude Code (`CLAUDE_PLUGIN_ROOT`), Cursor (`CURSOR_PLUGIN_ROOT`), hoặc generic SDK format

**Kết luận verified:** Session-start hook inject nguyên văn nội dung `using-superpowers` SKILL.md vào context của agent ngay lúc session khởi động. Đây là toàn bộ activation mechanism — không có code runtime, không có server.

### 2.4 Skills Library — Complete Inventory

Tất cả 13 skill đều là **markdown documents** với YAML frontmatter (`name`, `description`), không có executable code. Chúng được đọc bởi agent qua file read tool.

| # | Skill Name | Type | Trigger Condition | Source |
|---|---|---|---|---|
| 1 | `using-superpowers` | Meta | Bắt đầu mọi conversation | `skills/using-superpowers/SKILL.md` |
| 2 | `brainstorming` | Process | Trước bất kỳ creative work nào | `skills/brainstorming/SKILL.md` |
| 3 | `writing-plans` | Process | Sau khi có spec, trước khi code | `skills/writing-plans/SKILL.md` |
| 4 | `subagent-driven-development` | Execution | Execute plan trong session hiện tại | `skills/subagent-driven-development/SKILL.md` |
| 5 | `executing-plans` | Execution | Execute plan trong separate session | `skills/executing-plans/SKILL.md` |
| 6 | `dispatching-parallel-agents` | Execution | 2+ independent tasks | `skills/dispatching-parallel-agents/SKILL.md` |
| 7 | `test-driven-development` | Implementation | Implement bất kỳ feature/bugfix | `skills/test-driven-development/SKILL.md` |
| 8 | `systematic-debugging` | Debug | Gặp bất kỳ bug/failure | `skills/systematic-debugging/SKILL.md` |
| 9 | `verification-before-completion` | Validation | Trước khi claim work done | `skills/verification-before-completion/SKILL.md` |
| 10 | `requesting-code-review` | Review | Sau khi complete feature | `skills/requesting-code-review/SKILL.md` |
| 11 | `receiving-code-review` | Review | Nhận feedback code review | `skills/receiving-code-review/SKILL.md` |
| 12 | `using-git-worktrees` | Isolation | Trước khi bắt đầu feature work | `skills/using-git-worktrees/SKILL.md` |
| 13 | `finishing-a-development-branch` | Completion | Khi implementation complete | `skills/finishing-a-development-branch/SKILL.md` |
| 14 | `writing-skills` | Meta | Tạo/sửa skills | `skills/writing-skills/SKILL.md` |

### 2.5 Supporting Scripts

**File:** `scripts/task-brief` — Extract task N từ plan file, write ra uniquely-named file, in path ra stdout.  
**File:** `scripts/review-package` — Run `git diff`, write ra file, in path ra stdout.  

**Pattern:** Handoff artifacts qua files (không paste vào context) để tiết kiệm context budget.

### 2.6 Durable State

**Path:** `.superpowers/sdd/progress.md` (git-tracked, in working tree)  
**Format:** Plain text ledger, mỗi dòng: `Task N: complete (commits .., review clean)`  
**Mục đích:** Controller resume sau context compaction mà không cần re-dispatch completed tasks.

### 2.7 Workspace Isolation

**Mechanism:** Git worktrees — `.worktrees/<branch-name>/`  
**Governance:** Harness (platform) tạo worktree, Superpowers chỉ detect và work trong đó.  
**Rule:** `.worktrees/` phải có trong `.gitignore`.

### 2.8 Multi-Harness Support Structure

| Plugin Directory | Target Platform |
|---|---|
| `.claude-plugin/` | Claude Code |
| `.codex-plugin/` | Codex CLI/App |
| `.cursor-plugin/` | Cursor |
| `.kimi-plugin/` | Kimi Code |
| `.opencode/` | OpenCode |
| `.pi/extensions/` | Pi |
| `.agents/plugins/` | Antigravity, GitHub Copilot CLI |

---

## 3. Runtime Architecture Analysis

### 3.1 Kiến trúc thực sự của Superpowers

Superpowers KHÔNG phải là:
- ❌ MCP server
- ❌ Execution framework với code
- ❌ Capability registry
- ❌ State machine với transitions
- ❌ Workflow engine

Superpowers LÀ:
- ✅ **Một tập hợp markdown documents** (skills) mô tả cách AI agent nên hành xử
- ✅ **Một activation mechanism** (session-start hook) inject skill index vào agent context
- ✅ **Một behavioral contract** — agent phải đọc và tuân theo skill trước khi phản hồi
- ✅ **Một phương pháp luận** — không phải code, là discipline

### 3.2 Complete Runtime Lifecycle

```
SESSION START
    │
    ▼
hooks/session-start (bash) chạy
    │ reads skills/using-superpowers/SKILL.md
    ▼
Agent nhận additionalContext: "You have superpowers. [SKILL.md content]"
    │
    ▼
USER REQUEST đến agent
    │
    ▼
Agent kiểm tra: skill nào áp dụng? (theo using-superpowers rules)
    │
    ├─ "Let's build X" → INVOKE brainstorming
    │       │
    │       ▼
    │   brainstorming: explore context → ask questions → propose 2-3 approaches
    │       → present design sections → user approves → write spec to file → commit
    │       → INVOKE writing-plans
    │
    ├─ Sau khi có spec → INVOKE writing-plans
    │       │
    │       ▼
    │   writing-plans: map file structure → define tasks (TDD steps, 2-5 min each)
    │       → self-review plan → save to docs/superpowers/plans/YYYY-MM-DD-.md
    │       → offer execution choice (subagent vs inline)
    │
    ├─ Plan ready → INVOKE subagent-driven-development (recommended)
    │       │
    │       ▼
    │   Controller reads plan → create todos → pre-flight scan
    │       │
    │       ▼ (per task loop)
    │   [1] scripts/task-brief PLAN N → task-N-brief.md
    │   [2] Dispatch IMPLEMENTER subagent (fresh context, gets brief path)
    │        ├─ subagent INVOKE test-driven-development
    │        ├─ subagent implements → tests → self-reviews → commits
    │        └─ subagent reports: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
    │   [3] scripts/review-package BASE HEAD → review-package.md  
    │   [4] Dispatch TASK REVIEWER subagent (gets brief + report + diff)
    │        ├─ Spec compliance check
    │        └─ Code quality check
    │   [5] If Critical/Important → dispatch FIX subagent → re-review
    │   [6] Append to .superpowers/sdd/progress.md
    │       │
    │       ▼ (all tasks done)
    │   Dispatch FINAL CODE REVIEWER (requesting-code-review/code-reviewer.md)
    │       │
    │       ▼
    │   INVOKE finishing-a-development-branch
    │        ├─ run tests → detect environment
    │        ├─ Present 4 options: merge / PR / keep / discard
    │        └─ Execute choice → cleanup worktree
    │
    ├─ Bug found → INVOKE systematic-debugging
    │       → 4 phases: root cause → pattern → hypothesis → fix
    │       → INVOKE test-driven-development for the fix
    │       → INVOKE verification-before-completion
    │
    └─ About to claim done → INVOKE verification-before-completion
            → identify command → run it → read output → THEN claim
```

### 3.3 Key Architectural Insights

**Insight 1: Skills là behavioral contracts, không phải executable code**  
Mọi enforcement đến từ việc agent đọc và internalize skill content. Không có runtime enforcement — discipline là toàn bộ mechanism.

**Insight 2: Subagent isolation là core quality mechanism**  
Implementer subagent không biết gì ngoài task brief của nó. Reviewer subagent không biết gì ngoài diff và requirements. Context isolation prevents contamination.

**Insight 3: File handoff preserves controller context**  
`scripts/task-brief` và `scripts/review-package` write artifacts to disk, không paste vào context. Controller chỉ pass file path. Điều này giữ controller context budget cho coordination work.

**Insight 4: Durable ledger beats in-memory state**  
`.superpowers/sdd/progress.md` tồn tại qua context compaction. Controller có thể restart từ ledger + `git log` bất cứ lúc nào.

**Insight 5: Routing là responsibility của agent, không phải framework**  
`using-superpowers` skill dạy agent rules để tự routing: "brainstorming trước creative work", "systematic-debugging trước fix". Không có code router.
