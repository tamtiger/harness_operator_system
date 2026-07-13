# AGENTS.md

> **Harness Version:** {{HARNESS_VERSION}} | **Template Version:** 2.0.0
> **Generated:** {{GENERATED_TIME}}
> **Purpose:** Operational Contract cho tất cả AI Agent làm việc trong repository này.

---

## 1. Về Harness

Repository này được quản lý bởi **Harness Platform**. Thư mục `.harness/` chứa tri thức vận hành của project:

| Thư mục / File | Nội dung |
|---|---|
| `.harness/harness.yaml` | Manifest — khai báo cấu trúc project |
| `.harness/repository-map.md` | Bản đồ thư mục tự động sinh |
| `.harness/rules/` | Coding rules, architecture constraints |
| `.harness/knowledge/` | Domain knowledge, specs, decisions |
| `.harness/workflows/` | Task execution workflows |
| `.harness/prompts/` | Reusable AI prompts |

**Luôn đọc `.harness/` trước khi đọc source code.**

> Nếu CLI `harness` chưa có trong PATH: chạy `npm install -g harness-operator-system` hoặc dùng `npx harness-operator-system <command>`.

---

## 2. Skills System

Harness ships with built-in skills that guide agent behavior. Skills are invoked using a meta-skill rule: check before ANY action.

### Available Skills

| Skill ID | Trigger | Purpose |
|----------|---------|---------|
| `using-superpowers` | `any` | **Meta-skill**: 1% rule — check skills before every action |
| `brainstorm-before-code` | `implement, add, build, create, design` | HARD-GATE: no code without approved design |
| `plan-before-implement` | `implement, modify, change` | Write bite-sized plan before editing files |
| `tdd-red-green-refactor` | `implement, add, fix, test` | Iron Law: no production code without failing test first |
| `subagent-per-task` | `implement, build, create` | Delegate isolated subtasks to specialized agents |
| `verify-before-done` | `verify, done, complete, commit` | Iron Law: no completion claims without fresh evidence |
| `harness-context-first` | `any` | Load context via `harness context` before acting |
| `governance-checkpoint` | `any` | Check if changes need a governance proposal |
| `dispatching-parallel-agents` | `implement, build, create` | Run multiple subagents concurrently on independent tasks |
| `executing-plans` | `implement, build` | Execute plans step by step, mark progress |
| `finishing-a-development-branch` | `implement, build` | Finalize branch: squash, self-review, tag |
| `using-git-worktrees` | `implement, build` | Isolate work via parallel git worktrees |
| `writing-skills` | `implement` | Skill authoring: YAML frontmatter, triggers, structure |
| `systematic-debugging` | `fix, bug` | Root cause → hypothesize → verify → fix cycle |
| `requesting-code-review` | `implement, build` | Request review: diff package, review brief |
| `receiving-code-review` | `implement, build` | Process feedback, fix, re-verify |
| `two-stage-review` | `implement, build` | Task-scoped review → branch merge review |

### Using Skills

1. Invoke `using-superpowers` at conversation start
2. Check if any skill applies (1% rule — if uncertain, invoke)
3. Announce "Using [skill] to [purpose]" and follow the skill exactly
4. If the skill has a checklist, create a todo per item

---

## 3. Repository Overview

**Project:** {{PROJECT_NAME}}
**Domain:** {{PROJECT_DOMAIN}}
**Architecture:** {{PROJECT_ARCHITECTURE}}
**Language:** {{PRIMARY_LANGUAGE}}
**Entry Point:** `{{PROJECT_ENTRY_POINT}}`

---

## 4. Read Order

```
.harness/harness.yaml          → hiểu cấu trúc project
.harness/repository-map.md     → hiểu layout codebase
.harness/rules/                → hiểu constraints
.harness/knowledge/            → hiểu domain context
Source Code                    → implement
```

Khi docs xung đột với code: **Architecture > Specs > Rules > Docs > Code**

---

## 5. Development Workflow

```
Explore → Đọc .harness/ knowledge liên quan
Understand → Xác định components và contracts bị ảnh hưởng
Plan → Viết plan ngắn; nếu thay đổi cấu trúc → submit proposal trước
Implement → Theo architecture, match code style, chỉ sửa files trong scope
Validate → Build + Test + Lint + harness validate — tất cả phải pass
Update Knowledge → Cập nhật .harness/ nếu behaviour thay đổi
Review → Verify checklist
```

---

## 6. Harness CLI

```bash
# Trước khi bắt đầu
harness doctor                          # kiểm tra môi trường
harness status                          # xem assets đang load

# Trước khi code
harness context --task "mô tả task"     # NLP classify → filter skills/workflows phù hợp

# Xem skills
harness skill list                      # liệt kê skills với triggers
harness skill show <id>                 # xem nội dung skill chi tiết

# Xem workflows
harness workflow list                   # liệt kê workflows

# Trong quá trình phát triển
harness capability list                 # liệt kê capabilities có thể tái sử dụng

# Sau khi implement
harness validate                        # validate repository structure
harness run "verify what you built"     # NLP classify → execute task
harness conformance run                 # chạy conformance suite

# Khi cần thay đổi governance
harness proposal list                                # xem proposals hiện có
harness publish .harness/proposals/change.md        # tạo draft
harness proposal list --status DRAFT                # lấy ID
harness proposal submit <id>                        # submit để review
# harness proposal approve <id>                    # HUMAN ONLY
```

---

## 7. MCP Tools

Nếu kết nối qua MCP, bốn tools sau đây có sẵn:

```jsonc
// Thực thi task (NLP classify description → chọn workflow/skills phù hợp)
{ "name": "harness_run", "arguments": { "description": "mô tả task" } }

// Validate repository
{ "name": "harness_validate", "arguments": { "root": "/path/to/repo" } }

// Liệt kê proposals
{ "name": "harness_proposal_list", "arguments": { "status": "SUBMITTED" } }

// Submit draft proposal theo ID
{ "name": "harness_proposal_submit", "arguments": { "id": "prop-xxx" } }
```

> `harness_proposal_approve` **không có trên MCP** — approve là human-only action qua CLI.

---

## 8. Build Commands

```bash
# Restore dependencies
{{BUILD_COMMAND_RESTORE}}

# Build
{{BUILD_COMMAND_BUILD}}

# Test
{{BUILD_COMMAND_TEST}}

# Lint
{{LINT_COMMAND}}

# Format
{{FORMAT_COMMAND}}
```

---

## 9. Decision Authority

**AI CÓ THỂ:** Refactor nội bộ, cải thiện readability, thêm/cải thiện test, fix bugs, sửa docs.

**AI PHẢI XIN APPROVAL TRƯỚC KHI:** Đổi public API/interface, đổi database schema, thêm dependency mới, đổi architecture, đổi Harness assets (`.harness/`), break backward compatibility.

---

## 10. Repository Rules

**Always:** Theo project architecture · Tái sử dụng patterns có sẵn · Cập nhật docs khi behaviour thay đổi · Chạy `harness validate` trước khi request review.

**Never:** Đoán requirements — dừng lại và hỏi · Tự phát minh API không có trong knowledge · Skip validation · Xóa test để pass build · Che giấu failure.

---

## 11. Definition of Done

Task hoàn thành **chỉ khi**:
- [ ] Implementation đúng
- [ ] Build pass
- [ ] Tests pass (không có test bị skip)
- [ ] Lint pass
- [ ] `harness validate` pass
- [ ] Docs cập nhật nếu behaviour thay đổi
- [ ] `.harness/` knowledge cập nhật nếu cần
- [ ] Human review hoàn thành

---

## 12. Nguyên tắc

**Knowledge trước Code · Architecture trước Implementation · Correctness trước Speed · Consistency trước Creativity**

Nếu thiếu knowledge cần thiết → dừng lại và hỏi thay vì đoán.

---

*Generated by `harness init` · Managed by Harness Platform v{{HARNESS_VERSION}}*
