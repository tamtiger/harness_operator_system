# harness-os v0.8 Plan — Port giá trị từ `harness_coding_framework`

**Version:** 0.8.0
**Ngày:** 2026-05-27
**Repo nguồn:** `C:\FPT\MyProject\harness_coding_framework` (legacy, doc-only)
**Repo đích:** `C:\FPT\MyProject\harness_operator_system` (active, MCP server v0.7)
**Bias:** chắt lọc — không bê nguyên. Repo cũ có nhiều ý hay nhưng cũng nhiều thứ mới đã giải quyết bằng cách khác hoặc không phù hợp với architecture mới (MCP-first, multi-stack).
**Status:** APPROVED — sẵn sàng thực thi (Q1-Q4 đã chốt 2026-05-27)

**Quyết định Q1-Q5 (2026-05-27):**
- Q1 — **DROP** feature template hoàn toàn (`feature-manifest.json` + `prompt-spec.md` + JSON schema + CreateProduct exemplar). User feedback: "thấy nó ko đúng".
- Q2 — Merge **mapping EPCC** vào `harness-workflow` SKILL.md. **KHÔNG port skip rules** — luôn chạy harness workflow đầy đủ, không bypass.
- Q3 — Phase D mở rộng: `harness tree` + `harness summary` + MCP `repo_summary_read` + hash-based stale detection. Defer ctags T3 sang v0.9.
- Q4 — Rename `templates/project-rulebook/` → `templates/csharp-project-rulebook/`. Document 3 khái niệm rulebook trong glossary.
- Q5 — **CTR Gate + Artifact Formats merge vào harness-workflow SKILL.md:**
  - Thêm **CTR Gate** (pre-flight checklist) TRƯỚC START phase. Agent draft Context/Task/Rules → user confirm → ghi progress.md. Skip khi task < 3 files.
  - Thêm **Artifact Formats** section (4 types: Ticket, Plan, Research, Review) inline trong SKILL.md. KHÔNG cần MCP tool `thought_create`/`thought_list`.
  - Rename `thoughts/` → **`artifacts/`** (path: `.harness/artifacts/{01-tickets, 02-research, 03-plans, 04-reviews}/`)
  - DROP `templates/thoughts/` folder, DROP `src/tools/thought.ts` (2 MCP tools).
  - Tool count: 25 + 1 (repo_summary_read) = **26 tools** total.
  - Artifact formats theo industry standards: Plan = Google Design Doc lite (Context/Goals/Non-Goals/Alternatives), Research = ADR merge (Findings + Decision if applicable), Review = structured code review output.

---

## 1. Tóm tắt một câu

Repo cũ là **doc-driven harness cho C#/ABP**, repo mới là **MCP server đa stack**. Cái có giá trị nhất ở repo cũ là **content** (rule C#/ABP, workflows, repair strategies, artifact format) chứ không phải framework. Port content vào dạng skill + template, drop tooling/integration đặc thù.

---

## 2. Inventory repo cũ — đã đọc gì

| Khu vực | File | Bản chất |
|---|---|---|
| Bootstrap | `AGENTS.md`, `README.md`, `glossary.md`, `CHANGELOG.md` | Doc-only routing |
| C# baseline | `c#/{architecture,dependency,naming,anti-patterns,api-contract,testing,ci,error-code}-rules.md` + `dotnet-abp-conventions.md` + `module-map.md` | **Content** rule cho C#/ABP |
| Feature artifact | `c#/feature-template.md`, `c#/feature-manifest.schema.json`, `c#/prompt-spec-template.md`, `c#/examples/CreateProduct/{prompt-spec.md,feature-manifest.json}` | **Schema + exemplar** cho vertical slice |
| Workflows | `c#/workflows/{feature-implementation,bug-fix,code-review,project-onboarding,agent-memory-workflow}.md` | SOP per task type |
| Repair | `c#/repair-strategies/{compile,runtime,test}-errors.md` | Self-repair guides |
| Project rulebook | `c#/projects/payment-hub/{12 files}` + `docs/` + `features/webhook-ingress-yc04` | Stack baseline + project override pattern |
| Thoughts | `thoughts/{templates, shared/01-tickets, 02-research, 03-plans}` + `workflows/epcc.md` | Long-form artifact workspace |
| Integrations | `integrations/{jira,gitlab,confluence,workflows}.md` | FPT-specific tool wrappers |
| Scripts | `scripts/{validate-harness,generate-source-tree}.ps1` | CLI utilities |
| Future plan | `harness_v8_final_plan.md` | Đề xuất MCP server, FTS5, contracts YAML, SKILL.md priority/requires |

---

## 3. Map: keep / port / drop

Quyết định dựa trên "repo mới đã có gì + content có giá trị độc lập với tooling không".

### 3.1 PORT — High value, không trùng

| Item cũ | Đích ở repo mới | Lý do |
|---|---|---|
| 8 file rule C# (`architecture, dependency, naming, anti-patterns, api-contract, testing, ci, error-code`) + `dotnet-abp-conventions` | `skills/csharp-baseline/SKILL.md` (frontmatter + body link rulebook) **+** `rulebooks/csharp/*.md` (raw rule content, load qua `skill_load` hoặc đọc trực tiếp) | Content C# thật, không reproducible từ skill khác |
| 3 repair strategies (compile/runtime/test) | `skills/csharp-repair/SKILL.md` (single skill, body có 3 sections) | Self-repair guide giá trị độc lập |
| 4 workflows C# (bug-fix, code-review, feature-implementation, project-onboarding) | `skills/csharp-{bugfix, code-review, feature, onboarding}/SKILL.md` | SOP cụ thể, complement skills generic hiện có |
| `payment-hub/` 13 file rule + `module-map.md` + `docs/` | Port content đầy đủ vào `rulebooks/csharp/projects/payment-hub/` (đầy đủ rules, KHÔNG port `features/webhook-ingress-yc04/` vì đó là feature artifact đã drop) **+** scaffold trống vào `templates/csharp-project-rulebook/` (7 file `.md.tpl`) | User confirm dùng cho nhiều repo. Project rulebook = override stack rulebook khi project có constraint riêng (PCI-DSS, idempotency, state machine) |
| `thoughts/templates/{ticket,plan,research,repo-summary}.md` | **Merge artifact formats inline** vào `skills/harness-workflow/SKILL.md` body (4 types: Ticket, Plan, Research, Review). KHÔNG tạo `templates/thoughts/` folder riêng, KHÔNG tạo MCP tool. Agent đọc format từ skill, tự tạo file. Path: `.harness/artifacts/{01-tickets,02-research,03-plans,04-reviews}/YYYYMMDD_HHMM_{name}.md` | Approach B (merge vào workflow) — token efficient, 1 file biết hết, no extra tools. Industry standards applied: Plan = Google Design Doc lite, Research = ADR merge, Review = structured code review. |
| `glossary.md` (25 terms ABP/payment domain) | `docs/glossary.md` (giữ Vietnamese, label "domain glossary, optional") **+** thêm 3 khái niệm rulebook (stack/project/template) | Tham khảo, không enforce |
| `validate-harness.ps1` checks: routing cross-ref, prompt-spec required headings | Mở rộng `harness doctor` thêm flags `--check-skills-frontmatter --check-routing` (KHÔNG port `--check-manifests` vì feature template đã drop) | Static validation bổ sung cho `verify_run` (cái đó là build/test) |
| `generate-source-tree.ps1` | `harness tree` CLI command (port logic vào `src/cli/harness.ts`, dùng built-in `fs` của Node, không PS1) | Tiện ích, dùng được khi tạo repo summary |
| `harness_v8` ideas: SKILL.md `priority/requires/suggests/excludes/max_context_tokens` | **Phase D** — extend `lib/frontmatter.ts` schema (parse-only, chưa enforce ranking) | Mới hiện có `applies_to + triggers`, thiếu ranking → khi nhiều skill match cùng task, không xác định được skill nào load trước |
| **NEW (Q3):** Repo summary + auto-refresh | `harness tree` + `harness summary` CLI commands **+** MCP tool `repo_summary_read` với hash-based stale detection (so `git rev-parse HEAD` với `last_indexed_rev` trong frontmatter của `.harness/repo-summary.md`) | Token saving 60-70% — agent đọc 1 file summary ~700 tokens thay vì 5 lần read file ~15,000 tokens |

### 3.2 ADAPT — Concept tốt, đã có ở dạng khác, cần hợp nhất

| Item cũ | Đã có ở mới dưới dạng | Hành động |
|---|---|---|
| EPCC workflow (Explore-Plan-Code-Check) | `harness-workflow` lifecycle (5 phase: START/SELECT/EXECUTE/VERIFY/WRAP UP) | Thêm 1 section "Mapping với EPCC" (3-4 dòng) trong `skills/harness-workflow/SKILL.md` body. **KHÔNG** port skip rules — luôn chạy harness workflow đầy đủ. **KHÔNG** tạo skill `epcc` riêng. |
| `AGENT_MEMORY.md` long-running file | `progress_log` + `handoff_write/read` | KHÔNG port — repo mới đã thay AGENT_MEMORY tĩnh bằng SQLite + jsonl. Thêm note vào `docs/workflow.md` giải thích migration |

### 3.3 DROP — Không port

| Item cũ | Lý do |
|---|---|
| **`feature-template.md` + `feature-manifest.schema.json` + `prompt-spec-template.md` + `c#/examples/CreateProduct/`** | **Q1 2026-05-27:** User đánh giá "không đúng" — drop hoàn toàn. Vertical slice + manifest-as-contract pattern không phù hợp với cách user làm việc. Rule architecture/naming đã đủ ở rulebook layer. |
| `c#/workflows/project-onboarding.md` | `harness init --stack csharp --project-rulebook NAME` đã thay thế (Phase B). |
| `c#/workflows/agent-memory-workflow.md` | `progress_log` + `handoff_write/read` đã thay AGENT_MEMORY.md tĩnh. |
| `c#/projects/payment-hub/features/webhook-ingress-yc04/` | Là feature artifact (`feature-manifest.json` + `prompt-spec.md`) — đã drop theo Q1. |
| EPCC skip rules ("< 3 files, doc-only thì bypass") | **Q2 2026-05-27:** Luôn chạy harness workflow, không bypass. Skip rules tạo escape hatch không cần thiết. |
| `integrations/{jira,gitlab,confluence,workflows}.md` | FPT-specific, agent-tool-specific (Antigravity hooks). Nếu user muốn dùng → tự cho vào repo skills (`.harness/skills/`). Harness core stay neutral |
| `harness_v8_final_plan.md` các đề xuất: FTS5 cross-session search, ctags index, `build_context` orchestrator, contracts YAML | Một số đã solve khác (instincts thay AGENT_MEMORY, `verify_run` thay contracts validation), một số là Phase 6+ ở repo mới. Re-evaluate sau khi v0.7 stable, không port preemptively |
| `auto-refresh-token.kiro.hook` (Kiro-specific token refresh) | Tool-specific, không thuộc về harness |
| Vietnamese language policy | Repo mới đã quyết định: Vietnamese cho user docs, English cho rule technical. Reuse policy đó, không cần file riêng |

---

## 4. Kiến trúc đề xuất sau khi tích hợp

```
harness_operator_system/
├── skills/                              ← THÊM 5 skill mới C#/ABP
│   ├── (8 skills hiện có)
│   ├── harness-workflow/SKILL.md        ← UPDATE — thêm "Mapping với EPCC" section
│   ├── csharp-baseline/SKILL.md         ← NEW — link đến rulebooks/csharp/
│   ├── csharp-feature/SKILL.md          ← NEW — feature implementation SOP (workflow only, KHÔNG dùng manifest/prompt-spec)
│   ├── csharp-bugfix/SKILL.md           ← NEW — bug fix SOP
│   ├── csharp-code-review/SKILL.md      ← NEW — review checklist
│   └── csharp-repair/SKILL.md           ← NEW — compile/runtime/test repair (3 sections in 1 skill)
│
├── rulebooks/                           ← MỚI — content layer (raw markdown)
│   └── csharp/
│       ├── architecture.md              ← Port từ c#/architecture-rules.md
│       ├── dependency.md
│       ├── naming.md
│       ├── anti-patterns.md
│       ├── api-contract.md
│       ├── error-code.md
│       ├── testing.md
│       ├── ci.md
│       ├── abp-conventions.md           ← Port từ dotnet-abp-conventions.md
│       └── projects/                    ← project rulebook layer
│           └── payment-hub/             ← port full content (NOT feature folder)
│               ├── README.md
│               ├── module-map.md
│               ├── adapter-rules.md
│               ├── api-contract-rules.md
│               ├── ci-rules.md
│               ├── data-rules.md
│               ├── glossary.md
│               ├── idempotency-rules.md
│               ├── messaging-rules.md
│               ├── observability-rules.md
│               ├── security-rules.md
│               ├── state-machine.md
│               ├── testing-rules.md
│               └── docs/                ← payment-hub design docs
│
├── templates/                           ← MỞ RỘNG — thêm 2 nhóm
│   ├── (5 file hiện có)
│   ├── csharp-project-rulebook/         ← NEW (Q4) — scaffold trống cho project rulebook mới
│   │   ├── README.md.tpl
│   │   ├── module-map.md.tpl
│   │   ├── security-rules.md.tpl
│   │   ├── observability-rules.md.tpl
│   │   ├── api-contract-rules.md.tpl
│   │   ├── testing-rules.md.tpl
│   │   └── ci-rules.md.tpl
│   └── (NO thoughts/ folder — artifact formats inline in harness-workflow SKILL.md)
│
├── src/
│   ├── tools/
│   │   ├── (8 module hiện có)
│   │   └── repo_summary.ts              ← NEW (Q3) — repo_summary_read với hash-based stale check
│   ├── cli/harness.ts                   ← MỞ RỘNG — thêm `harness tree`, `harness summary`, `harness reindex`, `harness init --project-rulebook NAME`
│   └── lib/
│       ├── frontmatter.ts               ← MỞ RỘNG — schema thêm priority, requires, suggests, excludes (parse-only)
│       └── repo_summary.ts              ← NEW — generate summary, parse git rev
│
└── docs/
    ├── glossary.md                      ← NEW — port legacy + thêm 3 khái niệm rulebook + harness-os terms
    ├── rulebooks.md                     ← NEW — explain layer/stack/project rulebook + when to create
    └── plans/
        └── 2026-05-27-harness-v0.8-port-from-coding-framework.md  ← FILE NÀY
```

**Lưu ý kiến trúc (sau Q1-Q5):**
- `rulebooks/` là directory mới cùng cấp `skills/`. Skill = "khi nào dùng + workflow", rulebook = "content cụ thể, không workflow".
- **Q1 drop:** KHÔNG có `templates/csharp-feature/`, KHÔNG có MCP tool `feature_manifest_validate` / `feature_scaffold`. `feature_list.json` (per-repo scope) là khái niệm độc lập, không bị nhầm với feature-manifest đã drop.
- **Q4 rename:** `templates/csharp-project-rulebook/` (rõ scope là csharp). 3 khái niệm rulebook (layer / stack / project) document trong `docs/rulebooks.md` + `docs/glossary.md`.
- **Q3 add:** `repo_summary_read` MCP tool + `harness summary`/`reindex` CLI. Auto-refresh: hash-based stale (so `git rev-parse HEAD` với `last_indexed_rev` trong frontmatter `.harness/repo-summary.md`).
- **Q5 merge:** Artifact formats (Ticket/Plan/Research/Review) inline trong `harness-workflow/SKILL.md`. CTR Gate cũng inline. KHÔNG có `templates/thoughts/`, KHÔNG có `src/tools/thought.ts`. Agent tự tạo file theo format. Path: `.harness/artifacts/` (rename từ `thoughts/`). Total **26 MCP tools** (25 existing + 1 repo_summary_read).

---

## 5. Phased backlog (sau Q1-Q4)

> **Branch strategy:** 1 branch chung `feat/port-coding-framework`, mỗi phase 1 commit.

### Phase A — Port content C# + payment-hub (1-2 ngày, mostly copy)

**Goal:** Agent đang dùng repo C# có rule sẵn ngay khi `skill_load("csharp-baseline")`. Project rulebook payment-hub available cho user reference.

A1. Tạo `rulebooks/csharp/` với 9 file `.md` từ legacy (copy nguyên content, chỉ chỉnh internal links):
- `architecture.md` ← `c#/architecture-rules.md`
- `dependency.md` ← `c#/dependency-rules.md`
- `naming.md` ← `c#/naming-conventions.md`
- `anti-patterns.md` ← `c#/anti-patterns.md`
- `api-contract.md` ← `c#/api-contract-rules.md`
- `error-code.md` ← `c#/error-code-conventions.md`
- `testing.md` ← `c#/testing-rules.md`
- `ci.md` ← `c#/ci-rules.md`
- `abp-conventions.md` ← `c#/dotnet-abp-conventions.md`

A2. Tạo `rulebooks/csharp/projects/payment-hub/` với 13 file content (full port, NO feature folder):
- `README.md`, `module-map.md`, `adapter-rules.md`, `api-contract-rules.md`, `ci-rules.md`, `data-rules.md`, `glossary.md`, `idempotency-rules.md`, `messaging-rules.md`, `observability-rules.md`, `security-rules.md`, `state-machine.md`, `testing-rules.md`
- + folder `docs/` (5 design docs payment-hub)
- KHÔNG port `features/webhook-ingress-yc04/` (đã drop theo Q1)

A3. Tạo 1 skill C# baseline:
```yaml
---
name: csharp-baseline
version: "1.0"
updated: 2026-05-27
applies_to: ["dotnet"]
triggers: ["session_start", "task_create"]
description: Baseline architecture, naming, dependency, testing rules for C#/.NET/ABP.
---
```
Body: list 9 rulebook file paths + 1 dòng giới thiệu mỗi file. Trỏ payment-hub override khi `applies_to` match.

A4. **Rewrite `skills/harness-workflow/SKILL.md` v2.0** — major update:
- Thêm **CTR Gate** section (pre-flight): format, when required/skip, flow
- Thêm **Artifact Formats** section (4 types inline): Ticket, Plan, Research, Review
  - Ticket: Problem + Desired Outcome + Scope + AC (checkboxes)
  - Plan: Context + Goals/Non-Goals + Proposed Approach + Tasks + Alternatives (table) + Risks + Validation
  - Research: Question + Findings (sub-headings) + Decision if applicable (ADR pattern) + Follow-Up
  - Review: Summary + Must Fix + Should Fix + Observations + Verification checklist
- Thêm **Mapping với EPCC** section (3-4 dòng, no skip rules)
- Update **Lifecycle Phases** — reference artifacts + CTR gate
- Artifact path: `.harness/artifacts/{01-tickets,02-research,03-plans,04-reviews}/YYYYMMDD_HHMM_{name}.md`
- Giữ nguyên: 5 Subsystems, Rules, Anti-Patterns

A5. Update `scripts/smoke-test.ts`: bump skill count 8 → 9.

A6. Update `docs/skills.md` — thêm row `csharp-baseline`.

**Deliverables:**
- `rulebooks/csharp/*.md` (9 files)
- `rulebooks/csharp/projects/payment-hub/**` (13 rule files + docs/)
- `skills/csharp-baseline/SKILL.md`
- `skills/harness-workflow/SKILL.md` (updated)
- Smoke test pass (9 skills)

**Verification:**
- `npm run build && npm test && npm run smoke`
- `node dist/cli/harness.js skills --list` thấy 9 skills
- `node dist/cli/harness.js skills --show csharp-baseline` render frontmatter + body OK
- File `rulebooks/csharp/projects/payment-hub/README.md` đọc được

---

### Phase B — Project rulebook scaffold + CLI (1 ngày)

**Goal:** User có thể `harness init --project-rulebook NAME` scaffold 7 file rule trống.

> **Note (Q5):** Phase này KHÔNG còn thought tools (merged vào harness-workflow SKILL.md). Chỉ project-rulebook scaffold + CLI.

B1. Tạo `templates/csharp-project-rulebook/` 7 file `.md.tpl`:
- `README.md.tpl` — placeholder cho project mission, non-goals, links
- `module-map.md.tpl` — placeholder cho concrete modules + tech stack
- `security-rules.md.tpl` — placeholder permissions, tenant, sensitive data
- `observability-rules.md.tpl` — placeholder trace/metric/log
- `api-contract-rules.md.tpl` — placeholder API style + versioning
- `testing-rules.md.tpl` — placeholder unit/integration/contract
- `ci-rules.md.tpl` — placeholder build/test/analyzer gates

(Port từ legacy `c#/workflows/project-onboarding.md` "Required Rulebook Files" section, blank-out content payment-specific.)

B2. Mở rộng CLI `harness init`:
```
harness init [path] --stack csharp --project-rulebook NAME
   → scaffold .harness/* + render templates/csharp-project-rulebook/*.tpl vào target
```
NAME là project slug (e.g. `payment-hub`, `oms-service`). File output: `<repo>/.harness/project-rulebook/<NAME>/{7 files}.md`.

B3. CLI `harness init` cũng tạo `.harness/artifacts/` folder structure:
```
.harness/artifacts/
├── 01-tickets/
├── 02-research/
├── 03-plans/
└── 04-reviews/
```
(Empty folders, ready for agent to create artifacts per harness-workflow SKILL.md.)

**Deliverables:**
- `templates/csharp-project-rulebook/*.tpl` (7 files)
- CLI `harness init --project-rulebook NAME`
- `harness init` creates `.harness/artifacts/` folder structure
- Smoke test pass (no tool count change — still 25)

**Verification:**
- `harness init . --stack csharp --project-rulebook test-svc` → 7 file rule trống scaffold
- `.harness/artifacts/{01-tickets,02-research,03-plans,04-reviews}/` folders exist
- All existing tests pass

---

### Phase C — Workflow skills + harness doctor checks (1-2 ngày)

**Goal:** Agent C# có SOP cho 4 task type. `harness doctor` catch static violations.

C1. Tạo 4 skill workflow:
- `skills/csharp-feature/SKILL.md` ← từ `c#/workflows/feature-implementation.md`
  - **Rewrite to remove** mọi reference tới `feature-manifest.json` / `prompt-spec.md` / `c#/feature-template.md` (đã drop). Giữ workflow steps: contracts → domain → application → infrastructure → exposure → validation.
- `skills/csharp-bugfix/SKILL.md` ← từ `c#/workflows/bug-fix.md`
  - Rewrite remove manifest references.
- `skills/csharp-code-review/SKILL.md` ← từ `c#/workflows/code-review.md`
  - Rewrite remove "Manifest And Spec Sync" step.
- `skills/csharp-repair/SKILL.md` ← gộp 3 file `c#/repair-strategies/{compile,runtime,test}-errors.md`, body có 3 sections.

(Workflow `project-onboarding` skip — `harness init --project-rulebook` thay thế. `agent-memory-workflow` skip — `progress_log`/`handoff` thay thế.)

C2. Mở rộng `harness doctor` (file `src/cli/harness.ts` + helper trong `src/lib/repo.ts`):
- `--check-skills-frontmatter` → parse mọi `skills/*/SKILL.md`, validate required fields (`name, version, updated, applies_to, triggers, description`)
- `--check-routing` → parse `AGENTS.md` của repo target, extract markdown table file refs (`backtick`-quoted), assert tồn tại
- Default `harness doctor` chạy cả 2 checks này (additive)

(KHÔNG add `--check-manifests` — feature manifest đã drop theo Q1.)

C3. Cập nhật smoke test: 13 skills (9 + 4 csharp workflow).

**Deliverables:**
- 4 skill workflow mới
- `harness doctor` mở rộng 2 checks
- Test cases trong `src/lib/*.test.ts`

**Verification:**
- `skill_list --filter dotnet` returns 5 (csharp-baseline + 4 workflow)
- `harness doctor` báo lỗi rõ ràng khi: skill thiếu `triggers`, AGENTS.md ref file không tồn tại
- All existing 43 tests pass + new tests

---

### Phase D — Repo summary + tree + glossary + frontmatter v2 (2 ngày)

**Goal (Q3 + Q4):** Token saving 60-70% qua repo summary với hash-based stale detection. Glossary clarify 3 khái niệm rulebook.

D1. CLI `harness tree` (Q3 T1):
```
harness tree [--path .] [--depth 4] [--exclude .git,node_modules,bin,obj] [--output FILE]
```
Port logic từ `generate-source-tree.ps1` sang TS dùng `node:fs`. KHÔNG dùng external dep.

D2. CLI `harness summary` + `harness reindex` (Q3 T2):
```
harness summary [--path .] [--output .harness/repo-summary.md]
harness reindex [--path .]   # alias of summary, name agent dễ nhận
```
Output `.harness/repo-summary.md` format:
```markdown
---
last_indexed_at: 2026-05-27T10:30:00Z
last_indexed_rev: a3f1b2c4
stack: dotnet
---

# Repo: <name>

## Stack
- <detected: .NET 8 / Node 20 / Python 3.12 / Go 1.22>

## Modules
| Project | Path | Layer/Type |
|---|---|---|
| ... | ... | ... |

## Entry points
- ...

## Build & Test
- Build: <command>
- Test: <command>

## Tree (depth 3)
```
<tree output>
```
```

Logic generate:
- `last_indexed_rev` = `git rev-parse HEAD` (gracefully handle non-git repo)
- Stack detection: reuse `src/lib/runtime.ts`
- Modules: parse package.json/csproj/go.mod/pyproject.toml
- Tree: depth 3 (config flag)

D3. MCP tool mới `src/tools/repo_summary.ts`:
```typescript
repo_summary_read(repo_path: string)
  → {
      summary: string,            // file content (truncate 8KB)
      stale: boolean,             // true if HEAD != last_indexed_rev
      last_indexed_at: string,    // ISO date
      last_indexed_rev: string,   // short SHA
      suggest: string | null      // "harness reindex" if stale
    }
```
Stale check: parse frontmatter của `.harness/repo-summary.md`, so `last_indexed_rev` với `git rev-parse HEAD` (gọi `execSync` timeout 5s).

D4. Register `repo_summary_read` trong `src/index.ts`. Smoke test 25 → 26 tools.

D5. Tạo `docs/glossary.md`:
- Port 25 thuật ngữ từ legacy `glossary.md` (giữ Vietnamese)
- Thêm 8-10 term harness-os: instinct, scope, handoff, evidence, audit log, loop guard, frontmatter triggers, applies_to, repo summary, stale flag
- Thêm section **"3 khái niệm rulebook"** (Q4):
  - **Rulebook layer** = `rulebooks/` directory, raw rule content
  - **Stack rulebook** = `rulebooks/csharp/*.md`, generic per stack
  - **Project rulebook** = `rulebooks/csharp/projects/<name>/*.md`, override khi project có constraint
  - **Project rulebook template** = `templates/csharp-project-rulebook/`, scaffold trống
  - Precedence: project > stack

D6. Tạo `docs/rulebooks.md` (mới):
- Khi nào tạo project rulebook (project có constraint không generic được)
- Cách scaffold via `harness init --project-rulebook NAME`
- Pattern stack baseline + project override (lift từ legacy AGENTS.md)
- Ví dụ: payment-hub `security-rules.md` override stack `architecture.md` về persistence của Full PAN

D7. Mở rộng schema frontmatter (parse-only, chưa enforce):
- `lib/frontmatter.ts`: thêm 4 field optional `priority` (number 0-100), `requires` (array), `suggests` (array), `excludes` (array)
- `skill_list` returns include 4 fields mới (null khi skill chưa khai báo)
- KHÔNG implement ranking/conflict resolution logic — defer v0.9
- Document trong `docs/skills.md`: "experimental fields, not yet enforced"

**Deliverables:**
- `harness tree`, `harness summary`, `harness reindex` CLI commands
- `repo_summary_read` MCP tool (26 tools total)
- `.harness/repo-summary.md` auto-generated với stale detection
- `docs/glossary.md`, `docs/rulebooks.md`
- Frontmatter v2 schema parsed

**Verification:**
- `harness tree --depth 2` print tree đúng format
- `harness summary` → file `.harness/repo-summary.md` tạo ra với frontmatter đúng
- Modify code → commit → `repo_summary_read` returns `{ stale: true, suggest: "harness reindex" }`
- `harness reindex` → `stale: false` sau khi gọi
- `skill_list` returns include 4 fields mới (null cho skill cũ)

---

### Phase E — DEFER (chỉ làm khi có usage data thực)

Không làm trong v0.8:
- ctags `search_symbols` MCP tool (Q3 T3)
- Git hooks `harness install-hooks` (Q3 mechanism A)
- Skill ranking/conflict resolution (frontmatter v2 enforce logic)
- FTS5 search trong audit/evidence
- `build_context` orchestrator
- Integrations Jira/GitLab/Confluence (FPT-specific)
- Generalize project-rulebook ngoài csharp (sang nestjs/spring/etc.)

---

## 6. Risks & quyết định

### R1. ~~Phân biệt `feature_list.json` vs `feature-manifest.json`~~ → **RESOLVED bằng Q1**

Q1 drop `feature-manifest.json` hoàn toàn. `feature_list.json` (per-repo scope) tồn tại độc lập, không còn nguy cơ nhầm lẫn.

### R2. `rulebooks/` vs `skills/`

**Quyết định:**
- `skills/<name>/SKILL.md` = "khi nào dùng + workflow steps", agent load qua `skill_load`
- `rulebooks/<stack>/<topic>.md` = "rule content thuần", agent đọc khi skill body link tới
- Một skill CÓ THỂ link nhiều rulebook. Một rulebook CÓ THỂ được link bởi nhiều skill.
- `rulebooks/<stack>/projects/<name>/*.md` = project rulebook, override stack rule
- Document chi tiết trong `docs/rulebooks.md` + `docs/glossary.md` (Phase D).

### R3. PowerShell scripts → Node CLI

**Quyết định:** Port logic sang TypeScript. Không giữ PS1.

### R4. Vietnamese vs English

**Quyết định:**
- Skill body: EN (technical accuracy, copy nguyên từ legacy)
- Skill `description` field: VN OK
- Rulebook content: EN (lift nguyên từ legacy)
- User docs (`docs/*.md`): VN
- KHÔNG dịch khi port content C#

### R5. Scope creep

**Quyết định Q1-Q4 đã giảm scope đáng kể:**
- DROP feature template (-1 phase work, -2 MCP tools)
- DROP EPCC skip rules (-confusion về when to bypass workflow)
- ADD repo summary (Q3) bù vào — nhưng giá trị token saving rõ ràng
- Phase A → D vẫn fit 2 tuần

### R6. Workspace edit

**Resolved:** `harness_coding_framework` đã add vào workspace (read-only). Đọc semantic OK, không edit vào đó.

### R7 (NEW). Stale detection accuracy (Q3)

**Vấn đề:** `last_indexed_rev` so với `git rev-parse HEAD` chỉ catch git-tracked changes. Uncommitted changes (working tree dirty) không bị flag stale.

**Quyết định:**
- Phase D: extend stale check thêm `git status --porcelain` returns non-empty → also `stale: true` với `reason: "uncommitted changes"`
- Trade-off: 1 thêm `execSync` per call — chấp nhận vì repo summary không gọi quá thường xuyên

---

## 7. Success criteria — đo được

| Tiêu chí | Phase | Cách đo |
|---|---|---|
| `csharp-baseline` skill load được, body link đúng 9 rulebook | A | `skill_load("csharp-baseline")` returns frontmatter + body |
| 9 file `rulebooks/csharp/*.md` tồn tại | A | File system check |
| 13 file `rulebooks/csharp/projects/payment-hub/*.md` tồn tại | A | File system check |
| `harness-workflow` SKILL.md v2.0 có CTR Gate + 4 Artifact Formats + EPCC mapping | A | grep skill body for sections |
| Artifact path dùng `.harness/artifacts/` (không phải `thoughts/`) | A | grep SKILL.md |
| `harness init --project-rulebook NAME` scaffold 7 file rule trống | B | Integration test |
| `harness init` creates `.harness/artifacts/{01-tickets,02-research,03-plans,04-reviews}/` | B | Folder existence check |
| 4 skill workflow C# load được | C | `skill_list --filter dotnet` returns 5 |
| `harness doctor` catch 2 loại static violation (frontmatter, routing) | C | Test với fixture broken |
| `harness tree --depth 2` print tree đúng format | D | Snapshot test |
| `harness summary` generate `.harness/repo-summary.md` với frontmatter `last_indexed_rev` | D | File parsing test |
| `repo_summary_read` returns `stale: true` sau khi commit code | D | Integration test với git |
| Smoke test pass: 13 skills (8 + 1 baseline + 4 workflow), 26 MCP tools (25 + 1 repo_summary_read) | A-D | `npm run smoke` |
| `npm test` pass tất cả 43 + tests mới | A-D | CI |

---

## 8. Thứ tự thực thi đề xuất (sau Q1-Q4)

**Tuần 1:**
- Day 1-2: Phase A (port content + payment-hub) — 1 commit
- Day 3-4: Phase B (project rulebook scaffold + thought tool) — 1 commit

**Tuần 2:**
- Day 1-2: Phase C (workflow skills + doctor checks) — 1 commit
- Day 3-4: Phase D (repo summary + glossary + frontmatter v2) — 1 commit
- Day 5: Buffer — cross-IDE smoke test, update CHANGELOG, polish

**Phase E: DEFER. Re-evaluate sau 2 tuần usage thực.**

**Branch:** `feat/port-coding-framework` (đã tạo). 4 commit chronological theo phase.

---

## 8.5 Brainstorm — 4 câu hỏi của user (2026-05-27, RESOLVED)

> 4 câu hỏi user đặt ra trên plan v0.8 draft. Phần này lưu lại analysis để tham chiếu — quyết định cuối đã apply lên Phase A-D ở Section 5.

---

### Q1 — Feature template là gì? Có cần thiết không? Mục đích?

**Định nghĩa (từ legacy `c#/feature-template.md` + exemplar `CreateProduct/`):**

Feature template là **scaffolding pattern cho vertical slice C#/ABP**. Gồm 4 thứ:

1. **Folder structure** cố định:
   ```
   {Module}.Application/Features/{FeatureName}/
   ├── {FeatureName}AppService.cs
   ├── {FeatureName}Command.cs (hoặc Query.cs)
   ├── {FeatureName}Handler.cs
   ├── {FeatureName}Validator.cs
   ├── {FeatureName}Profile.cs (AutoMapper)
   ├── prompt-spec.md
   └── feature-manifest.json
   ```

2. **`feature-manifest.json`** — declarative metadata cho 1 feature (theo JSON Schema):
   ```json
   {
     "feature": "CreateProduct", "module": "Catalog", "type": "Command",
     "layers_touched": ["Domain.Shared","Domain","Application","..."],
     "permissions": ["Catalog.Product.Create"],
     "events": ["ProductCreatedEto"],
     "ai_status": "Complete|Draft|NeedsReview"
   }
   ```

3. **`prompt-spec.md`** — human-reviewed source-of-truth cho feature (business goal, scope, domain rules, acceptance criteria, error code mapping).

4. **JSON Schema** validate manifest.

**Mục đích thực sự (không phải mục đích tự nhận):**

| Mục đích | Có giá trị thực không? |
|---|---|
| Force structure → agent biết file đặt ở đâu, không hallucinate path | **CÓ.** Đây là giá trị #1. Agent C#/ABP hay đoán sai path do ABP có 6 layer projects. |
| Manifest = boundary contract → agent đọc manifest TRƯỚC khi sửa code, biết feature ảnh hưởng layer nào | **CÓ, nhưng đòi hỏi agent kỷ luật.** Nếu agent skip đọc manifest, không có giá trị. |
| `prompt-spec.md` = bản đặc tả review-được trước khi sinh code | **CÓ.** Tách "what to build" (spec) khỏi "how to build" (code). |
| `ai_status` field → state machine cho feature lifecycle | **TRUNG BÌNH.** Hữu ích khi nhiều feature pending review cùng lúc. Single dev: thừa. |

**Scope thực:** ABP-specific. Express, FastAPI, Gin... không có "vertical slice rigid layering", không cần manifest.

**Khuyến nghị → User quyết định Q1 (2026-05-27): DROP HOÀN TOÀN.**

Lý do user: "thấy nó ko đúng". Pattern manifest-as-contract + vertical slice rigid yêu cầu agent kỷ luật cao đọc manifest trước mỗi edit, thực tế không enforce được. Rule architecture/naming ở rulebook layer đã đủ.

**Hành động:** Tất cả `feature-template.md`, `feature-manifest.schema.json`, `prompt-spec-template.md`, `c#/examples/CreateProduct/` → vào DROP list (Section 3.3). Phase B chỉ còn project-rulebook scaffold + thought tool. Workflow skills C# (Phase C) rewrite remove mọi reference tới manifest/prompt-spec.

---

### Q2 — EPCC vs karpathy-guidelines, dùng cái nào?

**So sánh trục:**

| | karpathy-guidelines | EPCC |
|---|---|---|
| Bản chất | **Mindset / principles** (cách tư duy) | **Workflow / process** (làm gì khi nào) |
| Số bước | 4 nguyên tắc (Think, Simplicity, Surgical, Goal-Driven) | 4 phase (Explore, Plan, Code, Check) |
| Áp dụng khi nào | LUÔN — trong mọi phase, mọi task | TUẦN TỰ — phase trước hoàn tất rồi đến phase sau |
| Granularity | Per-decision (mỗi quyết định nhỏ) | Per-task (mỗi task lớn) |
| "When to skip" rule | Không có (luôn áp dụng) | Có (< 3 files, doc-only, user explicit) |
| Đo lường | Khó đo (subjective) | Dễ đo (file artifact mỗi phase) |

**KHÔNG phải hai option đối lập** — chúng orthogonal. karpathy = "how to think" áp lên TỪNG bước của EPCC.

**EPCC vs harness-workflow hiện có (cái này MỚI là cùng level):**

| harness-workflow | EPCC | Map |
|---|---|---|
| START | Explore (research) | ≈ |
| SELECT | Plan (task breakdown) | ≈ |
| EXECUTE | Code | = |
| VERIFY | Check (test pass) | ≈ |
| WRAP UP | (Check phần "Merge/PR") | ≈ |

→ **EPCC = harness-workflow rút gọn**. 4 phase EPCC ≈ 5 phase harness-workflow.

**Điểm khác biệt:**
- harness-workflow gắn chặt với MCP tools (`session_start`, `task_list`, `verify_run`, `session_handoff`)
- EPCC chỉ là markdown SOP, không gắn tool
- EPCC có "skip rule" rõ ràng (< 3 files), harness-workflow không có

**Khuyến nghị → User quyết định Q2 (2026-05-27):**

| Skill | Quyết định | Lý do |
|---|---|---|
| `karpathy-guidelines` | **GIỮ** (đã có, không đụng) | Principles trục dọc, applies_to "*", luôn cần |
| `harness-workflow` | **GIỮ** (đã có) | Lifecycle process trục ngang, gắn tool MCP |
| `epcc` skill mới | **KHÔNG TẠO** | Trùng với harness-workflow ở level process |
| EPCC mapping | **MERGE** vào `harness-workflow` body 3-4 dòng | Người quen EPCC nhận diện được |
| EPCC skip rules ("< 3 files thì bypass") | **KHÔNG PORT** | User decision: "Lúc nào cũng chạy harness workflow". Skip rules tạo escape hatch không cần thiết — file nhỏ vẫn cần START để đọc handoff/progress. |

**Hành động (Phase A):**
- Update `skills/harness-workflow/SKILL.md`: thêm 1 section ngắn "Mapping với EPCC" (3-4 dòng).
- KHÔNG thêm "Skip rules" section.
- KHÔNG tạo skill `epcc`.

---

### Q3 — `harness tree` + repo map: nghiên cứu sâu hơn

**Vấn đề user nêu:** Agent tốn token đọc source code nhiều lần để navigate. Cần repo map + auto-refresh khi code đổi.

**Phân tích token math:**

| Action | Tokens xấp xỉ |
|---|---|
| `read_file("src/Payment/PaymentService.cs")` 1 file 200 lines | ~3,000 tokens |
| Agent phải đọc 5 file để hiểu structure | ~15,000 tokens |
| Search bằng grep tool returns 50 lines context | ~500 tokens |
| 1 file repo-summary.md (~80 lines) | ~700 tokens |
| 1 file `.tags` ctags index (text) full repo 5KLoC | ~3,000 tokens nhưng query được, không cần load hết |

→ Repo map giảm 80-95% token nếu thay được 5 lần read file bằng 1 lần read summary.

**Spectrum giải pháp (từ đơn giản → phức tạp):**

| Tier | Tên | Nội dung | Effort | Token saving |
|---|---|---|---|---|
| **T1** | `harness tree` | Cây thư mục text, exclude `node_modules/.git/bin/obj`, depth configurable | 0.5 ngày | 30-40% |
| **T2** | `harness summary` | Tree + module list + entry points + build/test cmds + tech stack (đọc package.json/csproj) | 1 ngày | 60-70% |
| **T3** | `harness reindex` | T2 + ctags symbols (`.tags`) + MCP tool `search_symbols(query, kind)` | 2-3 ngày | 80-90% |
| **T4** | Full code intelligence | T3 + dependency graph + caller/callee + impact analysis | 5+ ngày | 90-95% nhưng overkill |

**Auto-refresh mechanisms (critical part user hỏi):**

| Mechanism | How | Pros | Cons |
|---|---|---|---|
| **A. Git hook** (`post-commit`) | `harness install-hooks` add `.git/hooks/post-commit` script chạy `harness reindex` | Tự động, không phải nhớ | Cần opt-in. User dùng `git commit --no-verify` thì miss. Multi-repo phải install per-repo. |
| **B. Hash-based stale check** | Lưu `last_indexed_git_rev` trong `.harness/repo-meta.json`. Mỗi lần MCP tool gọi đọc summary → so với HEAD → nếu khác → trả flag `stale: true` + suggest refresh | Không cần config. Self-aware. | Index không tự refresh, phải agent gọi `reindex`. |
| **C. TTL** | Stale nếu file > N giờ | Đơn giản | Sai context — code không đổi vẫn báo stale |
| **D. File watcher daemon** | `chokidar` watch `src/`, refresh on change | Real-time | Daemon chạy nền, phá vibe "local CLI tool", phức tạp lifecycle |

**Khuyến nghị 2 lớp:**

**Lớp 1 — MUST trong v0.8 (Phase D):**
- T1 + T2: `harness tree` và `harness summary` — output text vào `.harness/repo-summary.md`
- Mechanism B (hash-based): mỗi lần MCP tool đọc summary → check `git rev-parse HEAD` vs `last_indexed_rev`. Nếu khác → response include `{ stale: true, suggest: "harness reindex" }`. Agent đọc flag, tự gọi reindex.
- MCP tool mới: `repo_summary_read(repo_path)` returns `{ summary, stale, last_indexed_at, last_indexed_rev }`

**Lớp 2 — DEFER tới v0.9 (sau khi đo usage):**
- T3 (ctags + `search_symbols`)
- Mechanism A (git hooks) — opt-in via `harness install-hooks`

**Tại sao không làm T3 ngay:**
- ctags không đi kèm Node, phải user cài (`brew install universal-ctags` / `choco install ctags`)
- Add external dep ngược triết lý "no extra deps" của repo
- T2 đã giải quyết 60-70% token cost. Marginal value của T3 chưa rõ.

**Schema `.harness/repo-summary.md` đề xuất:**
```markdown
---
last_indexed_at: 2026-05-27T10:30:00Z
last_indexed_rev: a3f1b2c4
stack: dotnet
---

# Repo: paymenthub-tenant-notifier-service

## Stack
- .NET 8 + ABP Framework 8.x + EF Core + MongoDB

## Modules (8 projects)
| Project | Purpose | Layer |
|---|---|---|
| Domain.Shared | Enums, error codes | Domain.Shared |
| Domain | Entities, services | Domain |
| ... | ... | ... |

## Entry points
- Host: `host/.../FRT.PaymentHub.TenantNotifier.HttpApi.Host/Program.cs`
- Tests: `test/*/`

## Build & Test
- Build: `dotnet build FRT.PaymentHub.TenantNotifier.sln`
- Test: `dotnet test`

## Tree (depth 3)
```
src/
├── ...Application/
│   └── Features/
└── ...
```

## Recent changes (since last index)
- 12 files modified (truncated to 20)
```

**Hành động Phase D revision:**
- `harness tree` (T1): port từ PS1 sang TS, output text
- `harness summary` (T2): NEW — generate `repo-summary.md`
- `harness reindex` (alias gọi summary): NEW
- MCP tool `repo_summary_read`: NEW
- Stale detection trong `repo_summary_read`: NEW
- Bump tool count smoke test: 25 → 30

---

### Q4 — `project-rulebook` khác `rulebooks` thế nào?

**Confusion từ plan v0.8 hiện tại:** Có 2 thứ tên gần nhau, mô tả không rõ.

**Thực tế là 3 KHÁI NIỆM khác nhau:**

| Khái niệm | Path | Nội dung | Mục đích |
|---|---|---|---|
| **A. Rulebook layer** | `rulebooks/` | Thư mục root chứa raw rule content (markdown) | Tách "rule content" khỏi "skill workflow" |
| **B. Stack rulebook** | `rulebooks/csharp/*.md` | Rule generic cho stack (architecture, naming, testing) | Baseline áp dụng cho mọi project C# |
| **C. Project rulebook** | `rulebooks/csharp/projects/payment-hub/*.md` | Rule cụ thể cho project (security, idempotency, state-machine) | Override stack rule khi project có constraint riêng |
| **D. Project rulebook template** | `templates/csharp-project-rulebook/` | Stub trống của (C) | Scaffold nhanh khi user tạo project mới |

**Quan hệ:**
```
rulebooks/                              ← layer concept (A)
└── csharp/                             ← stack rulebook (B)
    ├── architecture.md                 ← stack-level rule
    ├── naming.md
    └── projects/
        └── payment-hub/                ← project rulebook (C)
            ├── README.md                ← project-level rule (overrides B)
            ├── security-rules.md
            └── ...

templates/                              
└── csharp-project-rulebook/            ← template (D), copies become (C)
    ├── README.md.tpl
    └── ...
```

**Precedence:** Project rule (C) > Stack rule (B). Đã có pattern này trong legacy.

**Khuyến nghị clarity:**
- Plan v0.8 dùng tên rõ ràng:
  - `rulebooks/csharp/` = "stack rulebook"
  - `rulebooks/csharp/projects/payment-hub/` = "project rulebook"
  - `templates/csharp-project-rulebook/` = "project rulebook template" (ĐỔI TÊN từ `templates/project-rulebook/` để tránh nhầm)
- Document trong `docs/glossary.md`:
  - "rulebook" = raw rule content (vs skill = workflow)
  - "stack rulebook" vs "project rulebook" precedence
- Document trong `docs/skills.md` hoặc `docs/rulebooks.md` (NEW): khi nào tạo project rulebook (= khi project có constraint không reusable cho project khác cùng stack)

**Ví dụ minh họa:**
- Architecture "Domain không depend Application" — nằm ở (B), apply cho mọi C# project
- "Payment Hub không lưu Full PAN/CVV (PCI-DSS SAQ A)" — nằm ở (C), specific cho payment-hub
- User tạo project mới `oms-service`: chạy `harness init . --stack csharp --project-rulebook oms-service` → scaffold (D) → user fill content thành (C)

**Hành động Phase A + B revision:**
- Phase A: port payment-hub vào `rulebooks/csharp/projects/payment-hub/` (đúng path đầy đủ)
- Phase B: rename `templates/project-rulebook/` → `templates/csharp-project-rulebook/`
- CLI: `harness init --project-rulebook NAME` (NAME là project slug)
- Plan: thêm section glossary "rulebook layer" trong docs

---

### Tóm tắt actions đã apply vào plan v0.8 (sau Q1-Q4 resolved)

1. **Q1 (DROP):** Bỏ hoàn toàn feature template (`feature-manifest.json` + `prompt-spec.md` + JSON schema + CreateProduct exemplar). Section 3.3 DROP. Phase B chỉ còn project-rulebook + thought tool. Workflow skills C# (Phase C) rewrite remove manifest/prompt-spec references.
2. **Q2 (NO SKIP):** Drop idea skill `epcc` riêng. Merge **mapping EPCC** vào `harness-workflow` SKILL.md (KHÔNG port skip rules — luôn chạy workflow đầy đủ).
3. **Q3 (REPO SUMMARY):** Phase D mở rộng: `harness tree` + `harness summary` + `harness reindex` CLI + MCP tool `repo_summary_read` + hash-based stale detection (kèm uncommitted check). Defer ctags T3 sang v0.9.
4. **Q4 (RULEBOOK CLARITY):** Rename `templates/project-rulebook/` → `templates/csharp-project-rulebook/`. Document 3 khái niệm (layer/stack/project rulebook) trong `docs/glossary.md` + `docs/rulebooks.md`.

---

### Q5 — Brainstorm `thoughts/templates/` — chuẩn industry nào áp dụng? (2026-05-27)

> User hỏi: "ở bên ngoài áp dụng như nào, kiếm chuẩn rồi áp dụng"

**Bối cảnh:** Legacy repo có 4 template: ticket, plan, research, repo-summary. Câu hỏi: có chuẩn industry nào tốt hơn không? Nên giữ nguyên, sửa, hay thay bằng format chuẩn?

#### Industry standards đã research:

| Standard | Sections chính | Dùng cho | Source |
|---|---|---|---|
| **MADR v4** (Markdown Any Decision Record) | Title, Status, Context, Decision Drivers, Options, Decision Outcome, Pros/Cons | Ghi nhận quyết định kiến trúc/kỹ thuật | [adr.github.io/madr](https://adr.github.io/madr/) |
| **Nygard ADR** (original) | Title, Status, Context, Decision, Consequences | ADR tối giản | Michael Nygard 2011 |
| **Google Design Doc** | Context, Goals, Non-Goals, Proposed Solution, Alternatives Considered, Cross-cutting concerns | Thiết kế trước khi code | [industrialempathy.com](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| **HashiCorp RFC** | Problem, Proposed Solution, Alternatives, Implementation Plan, Open Questions | Đề xuất thay đổi lớn cần feedback | [hashicorp.com](https://www.hashicorp.com/how-hashicorp-works/articles/rfc-template) |
| **Pragmatic Engineer RFC** | Summary, Motivation, Proposed Solution, Drawbacks, Alternatives, Unresolved Questions | RFC cho engineering team | [newsletter.pragmaticengineer.com](https://newsletter.pragmaticengineer.com/p/software-engineering-rfc-and-design) |
| **arc42 Section 9** | Context, Problem, Decision Drivers, Considered Alternatives, Decision, Consequences | ADR trong arc42 architecture framework | [docs.arc42.org](https://docs.arc42.org/section-9/) |

#### Map legacy templates → industry standards:

| Legacy template | Closest industry standard | Gap analysis |
|---|---|---|
| **ticket** | Jira/GitHub Issue template | Legacy OK — metadata + problem + acceptance criteria. Thiếu: `Priority` enum rõ ràng (đã có), `Labels/Tags` (thiếu). |
| **plan** | Google Design Doc (lite) / HashiCorp RFC | Legacy thiếu: **Goals/Non-Goals** (critical!), **Alternatives Considered** (critical!), **Definition of Done** (có nhưng weak). Quá gắn EPCC (đã drop skip rules). |
| **research** | ADR (Nygard) / MADR (khi research dẫn tới decision) | Legacy OK cho pure research. Thiếu: **Decision** section khi research kết luận bằng 1 quyết định. Nên merge ADR vào research khi applicable. |
| **repo-summary** | Không có chuẩn industry trực tiếp (đây là harness-specific) | Legacy OK. Sẽ auto-generate bởi `harness summary` (Phase D). Template chỉ dùng khi user muốn manual fill. |

#### Đề xuất: Redesign 4 templates theo industry best practices

**1. `ticket.md.tpl` — giữ gần nguyên, thêm Tags**

Ticket template legacy đã tốt. Thêm 1 field `Tags` cho filtering.

```markdown
# Ticket: {ShortTitle}

## Metadata
- **ID**: `{ProjectOrArea}-{NumberOrSlug}`
- **Stack**: `{dotnet|node|python|go|other}`
- **Project**: `{ProjectNameOrNone}`
- **Priority**: `Critical|High|Medium|Low`
- **Effort**: `S|M|L|XL`
- **Status**: `Draft|Ready|In Progress|Done`
- **Tags**: `{comma-separated: bug, feature, refactor, infra, docs}`

## Problem
{User-visible problem, business need, or engineering gap.}

## Desired Outcome
{What should be true when work is complete.}

## Scope
### In Scope
- ...

### Out Of Scope
- ...

## Acceptance Criteria
- [ ] Testable condition 1.
- [ ] Testable condition 2.

## References
- ...
```

**Thay đổi vs legacy:** Drop `Module`, `Requester`, `Estimated Effort` → `Effort` (shorter). Thêm `Tags`. Drop `Constraints` (merge vào Scope/Out Of Scope). Acceptance criteria dùng checkbox `- [ ]` (actionable).

---

**2. `plan.md.tpl` — redesign theo Google Design Doc lite**

Legacy plan quá gắn EPCC steps, thiếu Goals/Non-Goals/Alternatives. Redesign:

```markdown
# Plan: {ShortTitle}

## Metadata
- **Ticket**: `{PathToTicketOrJiraKey}`
- **Author**: `{agent|human}`
- **Status**: `Draft|Approved|In Progress|Done`
- **Created**: `{YYYY-MM-DD}`

## Context
{1-2 paragraphs: tại sao cần làm việc này, background, current state.}

## Goals
- Goal 1 (testable).
- Goal 2 (testable).

## Non-Goals
- Explicitly NOT doing X.
- Explicitly NOT doing Y.

## Proposed Approach
{Mô tả approach chính. Có thể chia thành steps/phases.}

### Tasks
1. [ ] Task 1 — `{files affected}`
2. [ ] Task 2 — `{files affected}`
3. [ ] Task 3 — `{files affected}`

## Alternatives Considered
| Alternative | Pros | Cons | Why rejected |
|---|---|---|---|
| {Alt 1} | ... | ... | ... |
| {Alt 2} | ... | ... | ... |

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| ... | High/Medium/Low | ... |

## Validation
- Build: `{command}`
- Test: `{command}`
- Other: `{manual check or script}`

## Open Questions
- {Question that must be resolved before implementation, or "None".}
```

**Thay đổi vs legacy:**
- DROP "Rulebooks Read" (agent đã biết từ skill, không cần list lại)
- DROP "Implementation Steps (Tuân thủ EPCC)" (EPCC đã merge vào harness-workflow, plan không cần repeat)
- ADD "Context" (Google Design Doc pattern — WHY)
- ADD "Goals / Non-Goals" (critical — scope clarity)
- ADD "Alternatives Considered" (ADR/RFC pattern — shows thinking)
- ADD "Tasks" as checkboxes (actionable, trackable)
- KEEP "Risks" (rename from "Risks And Mitigations" → table format)
- KEEP "Validation" (rename from "Validation Plan")
- KEEP "Open Questions"

---

**3. `research.md.tpl` — merge ADR pattern khi research leads to decision**

```markdown
# Research: {ShortTitle}

## Metadata
- **Author**: `{agent|human}`
- **Status**: `Draft|Complete`
- **Created**: `{YYYY-MM-DD}`
- **Tags**: `{comma-separated: architecture, library, pattern, performance, security}`

## Question
{Codebase, product, or external research question to answer.}

## Scope
- Stack: {dotnet|node|...}
- Project: {name or "general"}
- Sources reviewed: {files, repos, docs, URLs}

## Findings
### Finding 1: {title}
{Detail with source/file reference.}

### Finding 2: {title}
{Detail with source/file reference.}

## Decision (if applicable)
> Nếu research dẫn tới 1 quyết định kiến trúc/kỹ thuật, ghi ở đây theo ADR format.
> Nếu research chỉ là thu thập thông tin, bỏ section này.

- **Decision**: {What was decided.}
- **Rationale**: {Why this option over others.}
- **Consequences**: {What follows from this decision — positive and negative.}

## Recommendation
{Proposed direction and why it fits.}

## Follow-Up
- [ ] {Next action 1}
- [ ] {Next action 2}
```

**Thay đổi vs legacy:**
- ADD "Metadata" (status, tags — cho `thought_list` filtering)
- ADD "Decision (if applicable)" — merge ADR Nygard pattern (Context → Decision → Consequences) khi research kết luận bằng quyết định. Tránh phải tạo file ADR riêng.
- Findings dùng sub-headings (dễ scan hơn bullet list)
- Follow-Up dùng checkboxes

---

**4. `repo-summary.md.tpl` — giữ nguyên, sẽ auto-generate**

Template này chủ yếu dùng cho `harness summary` auto-generate (Phase D). Giữ nguyên structure legacy vì nó đã tốt. Chỉ thêm YAML frontmatter cho stale detection:

```markdown
---
last_indexed_at: {ISO_DATETIME}
last_indexed_rev: {GIT_SHORT_SHA}
stack: {detected_stack}
---

# Repo: {RepoName}

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Language | {auto-detected} |
| Framework | {auto-detected} |
| Database | {from config or "unknown"} |

## Modules
| Project/Package | Path | Purpose |
|---|---|---|
| ... | ... | ... |

## Entry Points
- Host: `{path}`
- Tests: `{path}`

## Build & Test
```bash
{build_command}
{test_command}
```

## Tree (depth 3)
```text
{auto-generated tree}
```

## Notes
- {Manual notes — only filled by human/agent, not auto-generated.}
```

**Thay đổi vs legacy:** Thêm YAML frontmatter (stale detection). Drop "Metadata" section (redundant với frontmatter). Drop "Dependencies (High-Level)" (quá verbose, agent đọc package.json trực tiếp nếu cần). Drop "References" (link trong Notes nếu cần).

---

#### Tóm tắt quyết định templates

| Template | Strategy | Industry influence |
|---|---|---|
| `ticket.md.tpl` | Minor tweak (thêm Tags, checkbox AC) | GitHub/Jira issue template |
| `plan.md.tpl` | **Major redesign** — Google Design Doc lite + ADR alternatives | Google Design Doc, HashiCorp RFC |
| `research.md.tpl` | Moderate update — merge ADR "Decision" section | MADR v4, Nygard ADR |
| `repo-summary.md.tpl` | Keep + add frontmatter (auto-generate by `harness summary`) | Harness-specific (no industry equivalent) |

#### Áp dụng bên ngoài (ở repo target) — flow thực tế:

```
Agent nhận task "Add refund endpoint"
  ↓
1. session_start → đọc handoff
2. thought_create(type="ticket", name="add-refund-endpoint")
   → .harness/thoughts/01-tickets/20260527_1400_add-refund-endpoint.md
   → Agent fill template: Problem, Desired Outcome, Scope, AC
3. thought_create(type="plan", name="add-refund-endpoint")
   → .harness/thoughts/03-plans/20260527_1410_add-refund-endpoint.md
   → Agent fill: Context, Goals, Non-Goals, Proposed Approach, Tasks, Alternatives, Risks
4. [Optional] thought_create(type="research", name="refund-saga-pattern")
   → .harness/thoughts/02-research/20260527_1420_refund-saga-pattern.md
   → Agent fill: Question, Findings, Decision (if applicable)
5. EXECUTE tasks from plan
6. verify_run → session_handoff
```

**Khi nào dùng template nào:**
- **ticket** = "CÁI GÌ cần làm" (problem statement, acceptance criteria)
- **plan** = "LÀM NHƯ THẾ NÀO" (approach, tasks, alternatives, risks)
- **research** = "TÌM HIỂU" (khi chưa biết đủ để plan, hoặc cần so sánh options)
- **repo-summary** = "REPO NÀY LÀ GÌ" (auto-generated, token saving cho agent)

**Không phải mọi task đều cần cả 4.** Minimum path: ticket → plan → execute. Research chỉ khi uncertain. Repo-summary auto-generate 1 lần.

---

**Hành động Phase B (update):**
- Dùng redesigned templates ở trên thay vì copy nguyên legacy.
- `thought_create` tool render template với `{YYYY-MM-DD}` = today, `{ShortTitle}` = name param, `{Status}` = "Draft".
- `thought_list` parse YAML frontmatter (nếu có) hoặc first H1 heading để extract title + status.

---

### Q6 — CTR Gate + Artifact merge vào harness-workflow (2026-05-27, RESOLVED)

> User yêu cầu: "thêm CTR - Context, Task, Rules trước khi harness workflow" + "nghiên cứu merge vào harness workflow luôn"

**Quyết định (Approach C — CTR as gate condition):**

1. **CTR Gate** = pre-flight checklist TRƯỚC START phase (không phải phase mới)
   - Agent draft 3 sections (Context / Task / Rules) → user confirm → ghi progress.md + hiển thị chat
   - Skip khi task < 3 files hoặc single module
   - Hard gate: KHÔNG được tiến vào START nếu chưa confirm

2. **Artifact Formats merge vào SKILL.md** (Approach B — inline, no separate tools)
   - 4 types: Ticket (SELECT), Plan (SELECT), Research (EXECUTE), Review (VERIFY)
   - Industry standards applied: Plan = Google Design Doc lite, Research = ADR merge, Review = structured code review
   - Path: `.harness/artifacts/{01-tickets, 02-research, 03-plans, 04-reviews}/YYYYMMDD_HHMM_{name}.md`
   - Rename `thoughts/` → `artifacts/`

3. **DROP:**
   - `templates/thoughts/` folder
   - `src/tools/thought.ts` (2 MCP tools: `thought_create`, `thought_list`)
   - Tool count: 26 (thay vì 28)

4. **Lifecycle giữ 5 phase**, updated steps reference artifacts + CTR gate

---

## 9. Quyết định đã xác nhận (2026-05-27)

1. **Phạm vi port:** Full A→D. Detail từng phase khi bắt đầu.
2. **Workspace:** `harness_coding_framework` đã add vào workspace (read-only, không edit vào đó).
3. **`payment-hub`:** PORT content payment-hub vào harness-os core → `rulebooks/csharp/projects/payment-hub/` (vì dùng cho nhiều repo).
4. **Integrations Jira/GitLab/Confluence:** DROP.
5. **Language:** EN cho rule, VN cho user docs.
6. **Branch strategy:** 1 branch chung, mỗi phase 1 commit.
