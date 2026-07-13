# AGENTS.md — Harness Platform

> **Phiên bản:** 0.0.17 (Spec 4.0)
> **Mục đích:** Hợp đồng vận hành cho AI Agent đóng góp vào codebase **Harness** (không phải repo dùng Harness).

---

## 1. Mission

Bạn đang làm việc trong **Harness Operator System** — nền tảng quản lý tri thức AI-native. Trách nhiệm của bạn là giữ nhất quán giữa **Knowledge → Architecture → Implementation → Validation → Governance** ở mọi thời điểm.

---

## 2. Core Principles

1. **Knowledge First** — Đọc `knowledge_base/` trước khi sửa code.
2. **Architecture Before Implementation** — Domain boundaries và dependency rules trong `03_SYSTEM_ARCHITECTURE.md` là bất biến.
3. **Single Source of Truth** — `knowledge_base/11_DATA_MODELS.md` là SST cho mọi type, DTO, enum.
4. **Governance Over Assumptions** — Thay đổi cấu trúc cần proposal + human approval trước khi implement.
5. **Continuous Validation** — Build + test + lint phải pass. Không ngoại lệ.

---

## 3. Repository Overview

### Domains & Planes

| Plane | Domain | Path |
|---|---|---|
| Control | Platform | `src/platform/` |
| Persistence | Repository | `src/repository/` |
| Persistence | Context | `src/context/` |
| Runtime | Execution | `src/execution/` |
| Runtime | Capability | `src/capability/` |
| Knowledge | Governance | `src/governance/` |

### Dependency flow (không được đảo ngược)

```
Adapters (CLI/MCP) → Platform → Repository/Context/Execution/Governance → Capability → shared/
```

### Thư mục quan trọng

| Path | Mô tả |
|---|---|
| `src/shared/contracts/services.ts` | Tất cả service interfaces (SST cho contracts) |
| `src/shared/errors/` | HarnessError base + 71 error factory functions |
| `src/shared/utils/NlpClassifier.ts` | Neural network task classifier — 7 intents, song ngữ Anh-Việt |
| `src/shared/templates/` | AGENTS_TEMPLATE.md, REPOSITORY_MAP_TEMPLATE.md |
| `src/shared/templates/prompts/` | implementer-prompt.md, task-reviewer-prompt.md, code-reviewer.md |
| `src/shared/skills/` | 17 skill files — superpowers, brainstorm, TDD, verify, plan, subagent, context-first, governance-checkpoint, parallel-agents, executing-plans, finish-branch, worktrees, writing-skills, debugging, request-review, receive-review, two-stage-review |
| `src/adapters/cli/index.ts` | CLI entry point — route tất cả commands |
| `src/adapters/cli/factory.ts` | Tạo PlatformService instance |
| `src/adapters/mcp/server.ts` | MCP server — 4 tools |
| `knowledge_base/` | 21 spec files — nguồn sự thật duy nhất |

---

## 4. Skills System

Harness ships with 17 built-in skills that guide agent behavior. Skills are invoked using a meta-skill rule: check before ANY action. Skills are loaded into agent context via `ContextFilter` trigger matching and `NlpClassifier` task type classification.

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

1. Always invoke `using-superpowers` at conversation start
2. Check if any skill applies (1% rule — if uncertain, invoke)
3. Announce "Using [skill] to [purpose]" and follow the skill exactly
4. If the skill has a checklist, create a todo per item

Prompt templates for subagent dispatch are in `src/shared/templates/prompts/`:
- `implementer-prompt.md` — implementer subagent dispatch
- `task-reviewer-prompt.md` — task-scoped spec + quality reviewer
- `code-reviewer.md` — senior code review for merge readiness

---

## 5. Read Order

Trước khi implement bất kỳ task nào, đọc theo thứ tự này:

```
1. knowledge_base/00_ARCHITECTURE.md        — tổng quan, planes, concepts
2. knowledge_base/03_SYSTEM_ARCHITECTURE.md — domain contracts, dependency rules
3. knowledge_base/<spec liên quan>           — spec chi tiết của domain bị ảnh hưởng
4. knowledge_base/11_DATA_MODELS.md         — tất cả types/DTOs/enums
5. implementation_plan/                     — context của milestone
6. src/                                     — source code thực tế
```

---

## 6. Development Workflow

```
Explore → Understand → Plan → Implement → Validate → Update Knowledge → Review
```

| Bước | Hành động |
|---|---|
| **Explore** | Đọc spec liên quan trong `knowledge_base/` |
| **Understand** | Xác định contract bị thay đổi, type bị ảnh hưởng |
| **Plan** | Viết plan ngắn cho task không tầm thường; submit proposal nếu là thay đổi cấu trúc |
| **Implement** | Theo architecture rules, match code style hiện tại, chỉ sửa files trong scope |
| **Validate** | `npm run build` + `npm run test` + `npm run lint` — tất cả phải pass |
| **Update Knowledge** | Cập nhật `knowledge_base/` spec nếu behaviour thay đổi; update `CHANGELOG.md` |
| **Review** | Verify checklist mục 10 |

---

## 7. CLI Commands (trong quá trình phát triển)

```bash
# Trước mỗi session
harness doctor

# Kiểm tra trạng thái
harness status [--json]

# Xem context cho task (NLP classify description → filter skills/workflows)
harness context --task "implement retry logic"

# Xem skills
harness skill list                # liệt kê skills với triggers
harness skill show <id>           # xem nội dung skill chi tiết

# Xem workflows
harness workflow list             # liệt kê workflows

# Thực thi task (NLP classify description → chọn workflow/skills phù hợp)
harness run "validate all built-in capabilities are registered"

# Validate repository
harness validate [--strict]

# Liệt kê capabilities
harness capability list

# Chạy conformance suite (bắt buộc trước release)
harness conformance run

# Khởi tạo test repo
harness init /tmp/test-repo

# Governance
harness proposal list
harness proposal submit <id>
harness proposal approve <id>    # HUMAN ONLY
```

---

## 8. MCP Tools

Khởi động server: `harness mcp-server`

### `harness_run`
```json
{ "description": "string (required — NLP classify → chọn workflow)", "workflowId": "string (optional)" }
```

### `harness_validate`
```json
{ "root": "string (optional — mặc định: cwd)" }
```

### `harness_proposal_list`
```json
{ "status": "DRAFT|SUBMITTED|REVIEWING|APPROVED|REJECTED|PROMOTED (optional)" }
```

### `harness_proposal_submit`
```json
{ "id": "string (required — ID của draft proposal)" }
```

> `harness_proposal_approve` **không có trên MCP** — approve là human-only action.
>
> **Lưu ý:** Tool `harness_proposal_submit` nhận `id` của proposal đã có sẵn, không phải tạo mới từ content.

---

## 9. Repository Rules

**Always:**
- Giữ domain boundaries — không import trực tiếp giữa domains
- Dependency flow một chiều — không đảo ngược
- Dùng Error Model factory (`src/shared/errors/factories.ts`) cho mọi error
- Sync `knowledge_base/` với implementation khi behaviour thay đổi
- Update `CHANGELOG.md` — chỉ latest entry, không sửa history
- Viết test cho mọi function có observable behaviour

**Never:**
- Break architecture hoặc tạo circular dependency
- Tạo type/DTO mới mà không khai báo trong `11_DATA_MODELS.md` trước
- Skip build/test/lint và claim task done
- Xóa/disable test để pass build
- Sửa `.harness/logs/audit.jsonl` trực tiếp
- Remove capability hoặc CLI command mà không có proposal

---

## 11. Governance Workflow

```
Submit → Review (lock 30min) → HUMAN Approve → Promote to Shared
```

**Cần proposal:** đổi public contract, đổi data model, thêm/xóa capability, đổi CLI/MCP interface, đổi manifest schema.

**Không cần proposal:** fix bugs, refactor nội bộ, thêm test, sửa docs.

```bash
harness proposal list                            # xem proposals hiện có
harness publish .harness/proposals/my.md         # tạo draft từ file
harness proposal list --status DRAFT             # lấy ID
harness proposal submit <id>                     # submit
harness proposal approve <id>                    # HUMAN ONLY
```

---

## 12. Build & Validation

```bash
npm run build    # zero tsc errors
npm run test     # all vitest tests pass
npm run lint     # zero ESLint errors
harness conformance run  # tất cả 30 Level-3 cases phải pass trước release
```

---

## 13. Review Checklist

- [ ] Requirement đã thỏa mãn đầy đủ
- [ ] Domain boundaries được bảo toàn
- [ ] Dependency flow một chiều
- [ ] Public contracts không thay đổi (hoặc proposal đã approve)
- [ ] Types mới có trong `11_DATA_MODELS.md`
- [ ] Errors mới dùng factory pattern
- [ ] Tests mới encode *lý do* behaviour quan trọng
- [ ] `npm run build && npm run test && npm run lint` — tất cả pass
- [ ] `knowledge_base/` spec cập nhật nếu behaviour thay đổi
- [ ] `CHANGELOG.md` latest entry cập nhật

---

## 14. Definition of Done

Task hoàn thành **chỉ khi**:
1. Implementation đúng theo spec
2. `npm run build` pass — zero TypeScript errors
3. `npm run test` pass — không có test bị skip
4. `npm run lint` pass — zero ESLint errors
5. `knowledge_base/` spec đã cập nhật nếu cần
6. `CHANGELOG.md` latest entry đã cập nhật
7. Nếu thay đổi cấu trúc: proposal đã submit và human đã approve trước khi implement

---

## 15. Decision Authority

**AI CÓ THỂ (không cần approval):**
Refactor nội bộ, cải thiện readability, thêm test, fix bugs, sửa docs/typos.

**AI PHẢI XIN APPROVAL TRƯỚC KHI:**
Đổi `src/shared/contracts/`, đổi domain structure, thêm/xóa built-in capability, đổi CLI public interface, đổi MCP tool schema, thêm npm dependency, đổi manifest schema, break backward compatibility.

---

## 16. Nguyên tắc

```
Knowledge (knowledge_base/)
      ↓
Architecture (03_SYSTEM_ARCHITECTURE.md)
      ↓
Implementation (src/)
      ↓
Validation (tests/, conformance)
      ↓
Governance (.harness/proposals/, .harness/logs/)
```

Khi không chắc chắn → đọc thêm knowledge trước khi viết thêm code.
