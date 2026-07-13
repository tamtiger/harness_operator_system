# Harness Refactoring Plan — Part 5: Documentation & Migration Roadmap

---

## 12. Documentation Refactoring Plan

### 12.1 README.md

**Hiện tại:** Tập trung vào "knowledge management platform", CLI reference, MCP config. Không nhắc đến workflow, skill, hay runtime model.

**Sau refactor:**

```
# Harness — Workflow-Driven AI Runtime

## What is Harness?
Harness là nền tảng AI-native kết nối knowledge của tổ chức với quá trình
thực thi của AI agent. Mọi task chạy qua workflow engine — từ brainstorming
đến merge, có kế hoạch rõ ràng, có review, có governance.

## Runtime Architecture
[Diagram: User Request → Workflow Engine → Planner → Execution → Validation → Report]

Giải thích từng layer: Workflow Engine, Planner, Execution Engine, Capabilities, Skills,
Validation, Knowledge Sync, Governance, Report.

## Workflow Model
Harness workflows = sequences của phases, mỗi phase dùng skills.
Built-in workflows: feature-dev | bug-fix | refactor | code-review | audit | docs.
Skills = behavioral contracts cho agent: markdown documents được inject vào context.

## Quick Start
harness init / harness doctor / harness run "task"

## CLI Usage
harness run "<task>"                        # primary entry
harness run "<task>" --workflow feature-dev # explicit workflow
harness run "<task>" --dry-run              # preview plan
harness workflow list                        # available workflows
harness skill list                           # available skills
harness context --task "..."                 # preview context

## MCP Usage
harness_run / harness_workflow_list / harness_skill_list / harness_context_load

## Repository Setup
harness init → .harness/harness.yaml + skills/ + workflows/ + knowledge/

## Feature Development Workflow (full example)
Step-by-step walkthrough của feature-dev workflow từ run đến merge.
```

**Key changes:**
- Headline: "Workflow-Driven AI Runtime" thay vì "knowledge management"
- Workflow model section là prominent, không buried
- `harness run` là first command shown
- Skills section với examples
- Existing: MCP config, install, governance — giữ nguyên nhưng move sau workflow section

---

### 12.2 AGENTS.md (Harness Repository — cho contributors)

**Hiện tại:** Tốt nhưng thiếu workflow section. Không mention skills. Read order không bao gồm skills.

**Sau refactor:**

```markdown
# AGENTS.md — Harness Platform (Contributor)

## Mission
[giữ nguyên nội dung tốt hiện tại]

## Runtime Architecture
Thêm section giải thích WorkflowEngine, Planner, Execution loop, Skill assets.
Domain ownership: WorkflowEngine + Planner thuộc Execution domain.

## Skills System
- Skills live in src/shared/skills/ (built-in) và .harness/skills/ (project-level)
- Format: markdown với YAML frontmatter
- Trigger conditions chỉ trong description, không có workflow summary
- Khi thêm skill mới: phải follow writing-skills pattern (baseline test trước)

## Read Order (cập nhật)
1. knowledge_base/00_ARCHITECTURE.md
2. knowledge_base/03_SYSTEM_ARCHITECTURE.md  
3. knowledge_base/<spec liên quan>
4. src/shared/skills/*.md  ← mới
5. knowledge_base/11_DATA_MODELS.md
6. src/

## Development Workflow (cập nhật)
Thêm bước: "Check if WorkflowEngine affected" và "Update workflow template if needed"

## Known Issues (cập nhật)
Thêm các KI mới: workflow engine không tồn tại (KI-008), skill asset type missing (KI-009)

## Review Checklist (cập nhật)
- [ ] Skill assets follow trigger-conditions-only description convention
- [ ] WorkflowEngine integration tested
- [ ] Progress ledger durability verified nếu ExecutionRuntime changed
```

**Key additions:**
- Runtime Architecture section mô tả WorkflowEngine
- Skills System section với contribution guide
- Read Order include `src/shared/skills/`
- Review Checklist có skill + workflow items

---

### 12.3 AGENTS_TEMPLATE.md (cho AI agents trong project repos)

**Hiện tại:** Tốt nhưng hardcoded build commands, static MCP tool list, không mention skills, không mention workflow.

**Sau refactor:**

```markdown
# AGENTS.md — [PROJECT_NAME]

## How to Use Harness (thay vì chỉ list tools)

### Step 1: Load Context
harness context --task "<your task description>"
→ Nhận: relevant knowledge, applicable rules, available skills

### Step 2: Run with Workflow
harness run "<task>"
→ Workflow Engine tự classify workflow type
→ hoặc: harness run "<task>" --workflow feature-dev để explicit

### Step 3: Follow Skill Instructions
Agent nhận skill list trong context. Mỗi skill có trigger condition.
Khi skill applies: announce "Using [skill] to [purpose]" và follow it.
Skills không negotiable — no rationalizing out.

## Available Skills (dynamic — from harness skill list)
[AGENT: Run `harness skill list` to see current skills. Do not assume from this template.]

## Available Workflows (dynamic — from harness workflow list)
[AGENT: Run `harness workflow list` to see current workflows.]

## Build Commands (inferred, not hardcoded)
[AGENT: Detect from package.json / Cargo.toml / pom.xml / go.mod.
Do NOT use hardcoded commands from this template.]

## CLI Reference
harness run "<task>"           # primary entry (replaces manual steps)
harness context --task "..."   # load context for task
harness validate               # validate repository
harness skill list             # see available skills
harness workflow list          # see available workflows
harness capability list        # see available capabilities
harness doctor                 # health check

## MCP Tools
harness_run / harness_validate / harness_workflow_list / 
harness_skill_list / harness_context_load / harness_proposal_list / harness_proposal_submit

## Governance
harness publish → harness proposal submit → human: harness proposal approve
[AGENT: Run `harness doctor` to check if governance is configured for this project.]

## Definition of Done (giữ nguyên checklist)
[Không thay đổi — valid và important]
```

**Key changes:**
- Hướng dẫn "How to Use Harness" thay vì chỉ list commands
- Skills và Workflows là **dynamic** — agent phải query, không assume từ template
- Build commands: agent phải infer từ project files, không hardcode
- MCP tools list updated
- Xóa: `{{BUILD_COMMAND_RESTORE}}` placeholders (agent should detect)

---

## 13. Incremental Migration Roadmap

> Mỗi phase độc lập và deployable. Không có phase nào yêu cầu rewrite toàn bộ.

---

### Phase 0: Fix Known Issues (No new features)

**Objectives:** Fix KI-001 đến KI-007 trước khi bắt đầu refactor.  
**Components affected:** CLI adapter, templates, governance CLI  
**Superpowers concepts adopted:** None  
**Harness extensions:** None  
**Breaking changes:** None  
**Risks:** Low — all fixes are internal  
**Validation criteria:** KI-001 đến KI-007 đóng, `harness conformance run` vẫn pass 30/30  
**Complexity:** Low (1-2 days)

**Exit criteria:** All KI-001..KI-007 closed • harness conformance run → 30/30 pass • npm test → 0 failures

Fixes:
- KI-001: Postbuild script copy templates
- KI-002: `getPackageVersion()` trong `harness version`
- KI-003: `--force` flag parsing trong `init.ts`
- KI-004: Flag parsing cho `--source/--version` trong `install`
- KI-005: `--file` flag cho `proposal submit`
- KI-006: Remove hardcoded tags trong `context.ts`
- KI-007: Add `proposal reject/promote/request-changes` commands

---

### Phase 1: Skill Asset Type

**Objectives:** Add `skill` as formal asset type. Harness có thể load, validate, list skills từ `.harness/skills/`.  
**Components affected:** `src/repository/assets/AssetLoader.ts`, `src/shared/types/assets.ts`, `knowledge_base/11_DATA_MODELS.md`, `knowledge_base/02_ASSET_MODEL.md`  
**Superpowers concepts adopted:** SKILL.md format (YAML frontmatter: name, description)  
**Harness extensions:** `triggers`, `workflows` frontmatter fields (Harness-specific)  
**Breaking changes:** None — additive only  
**Risks:** Low  
**Validation criteria:**
- `AssetLoader` loads `.harness/skills/*.md` files
- YAML frontmatter parsed: name, description, triggers, workflows
- `harness status` shows skill count
- `harness skill list` works (Phase 3 CLI command can be added here)
- Existing asset types unaffected
- `harness conformance run` still 30/30  
**Complexity:** Low-Medium (2-3 days)

**Exit criteria:** harness skill list returns ≥10 skills • harness status shows skill count • npm test → 0 failures

Deliverables:
- `src/shared/types/assets.ts` → add `SkillAsset` type
- `knowledge_base/11_DATA_MODELS.md` → add SkillAsset model
- `knowledge_base/02_ASSET_MODEL.md` → add skill to asset type enum
- `src/repository/assets/AssetLoader.ts` → handle `skill` type
- `src/shared/skills/` → 3 pilot skills: `harness-context-first.md`, `verify-before-done.md`, `governance-checkpoint.md`

---

### Phase 2: Context Enhancement — Skills Injection

**Objectives:** ContextService inject relevant skills vào context output. `harness context --task` includes applicable skills.  
**Components affected:** `src/context/builder/ContextBuilder.ts`, `src/context/filter/ContextFilter.ts`, `src/adapters/cli/commands/context.ts`  
**Superpowers concepts adopted:** Session-start skill injection (adapted — Harness dùng `harness context` thay vì bash hook)  
**Harness extensions:** Trigger-based skill matching  
**Breaking changes:** None — `harness context` output extends with skills section  
**Risks:** Low  
**Validation criteria:**
- `harness context --task "implement feature"` returns relevant knowledge + matching skills
- Skills matched by `triggers` field trong frontmatter
- Token budget allocation includes skill content
- `harness context --task "..."` no longer hardcodes `['auth','implementation']`  
**Complexity:** Medium (2-3 days)

**Exit criteria:** harness context --task "x" returns skills section • no hardcoded tags • npm test → 0 failures

---

### Phase 3: CLI Expansion — Workflow & Skill Commands

**Objectives:** Add `harness workflow list/run`, `harness skill list/show` commands.  
**Components affected:** `src/adapters/cli/index.ts`, new command files  
**Superpowers concepts adopted:** Skill catalog pattern  
**Harness extensions:** Workflow template listing  
**Breaking changes:** None — additive  
**Risks:** Low  
**Validation criteria:**
- `harness workflow list` outputs available workflow templates
- `harness skill list` outputs available skills with descriptions
- `harness skill show <name>` outputs full skill content
- All existing commands unaffected  
**Complexity:** Low (1-2 days)

**Exit criteria:** harness workflow list works • harness skill list works • harness skill show works • npm test → 0 failures

---

### Phase 4: Planner — Task Decomposition

**Objectives:** Implement Planner component. `harness run` gains planning phase.  
**Components affected:** New `src/execution/planner/Planner.ts`, `src/adapters/cli/commands/run.ts`, `knowledge_base/06_EXECUTION_SPECIFICATION.md`  
**Superpowers concepts adopted:** `writing-plans` task structure (TDD steps, no placeholders, file mapping)  
**Harness extensions:** Knowledge base integration for plan context  
**Breaking changes:** `harness run` behavior changes — adds interactive planning phase. Flag `--no-brainstorm` để preserve old behavior.  
**Risks:** Medium — interactive phase may break scripted uses  
**Validation criteria:**
- `harness run "add retry logic"` → prompts brainstorm questions (if TTY)
- `harness run "add retry logic" --no-brainstorm` → uses knowledge context, generates plan directly
- Plan saved to `.harness/run/<session-id>/plan.md`
- Plan has correct task structure (TDD steps, exact file paths)
- `harness run --dry-run` prints plan without executing
- Conformance run 30/30  
**Complexity:** High (5-7 days)

**Exit criteria:** harness run "x" produces .harness/run/<id>/plan.md • --dry-run prints plan • --no-brainstorm skips interactive • npm test → 0 failures • harness conformance run → 30/30

Deliverables:
- `src/execution/planner/Planner.ts`
- `src/shared/types/execution.ts` → add `WorkflowSession`, `WorkflowPhase`
- `knowledge_base/06_EXECUTION_SPECIFICATION.md` → add Planner section
- `knowledge_base/11_DATA_MODELS.md` → add WorkflowSession, WorkflowTemplate
- `.harness/workflows/feature-dev.yaml` (workflow template)
- `.harness/workflows/bug-fix.yaml`

---

### Phase 5: Workflow Engine

**Objectives:** Implement WorkflowEngine. Route `harness run` through workflow classification → skill loading → planner → execution.  
**Components affected:** New `src/execution/workflow/WorkflowEngine.ts`, `src/platform/service.ts`, `src/adapters/cli/commands/run.ts`  
**Superpowers concepts adopted:** `using-superpowers` routing logic (adapted as code)  
**Harness extensions:** Workflow template system, knowledge-based workflow selection  
**Breaking changes:** `harness run` execution flow changes significantly. `--no-workflow` flag để bypass.  
**Risks:** High — central execution path changes  
**Validation criteria:**
- `harness run "implement X"` correctly classified as feature-dev
- `harness run "fix bug Y"` correctly classified as bug-fix
- `classify()` handles ambiguous descriptions with user confirmation (interactive) or 'unclassified' return (non-interactive)
- Skills loaded and present in execution context
- Workflow template phases followed in order
- Human gates pause for confirmation
- `harness conformance run` 30/30  
**Complexity:** High (7-10 days)

**Exit criteria:** harness run "implement x" auto-classifies as feature-dev • harness run "fix y" auto-classifies as bug-fix • human gates pause correctly • harness conformance run → 30/30

---

### Phase 6: Durable Execution State

**Objectives:** ExecutionRuntime writes progress to file, not just in-memory. Resume capability.  
**Components affected:** `src/execution/runtime/ExecutionRuntime.ts`, `src/execution/service.ts`, new `src/execution/ledger/ProgressLedger.ts`  
**Superpowers concepts adopted:** `.superpowers/sdd/progress.md` durable ledger pattern  
**Harness extensions:** Structured ledger format (JSON per task entry), session management  
**Breaking changes:** None — additive (in-memory state preserved, file state added)  
**Risks:** Low-Medium  
**Validation criteria:**
- Task completions written to `.harness/run/<session>/progress.md`
- `harness run --resume <session-id>` skips completed tasks
- State survives process restart
- Progress ledger survives context compaction (it's a file)  
**Complexity:** Medium (3-4 days)

**Cleanup policy cho `.harness/run/`:**
- TTL: Sessions status='done' hoặc 'failed' older than 7 days → auto-deleted by `harness doctor`
- Max sessions: Keep max 10 recent sessions. Khi exceed → delete oldest completed.
- Git: Thêm `.harness/run/` vào `.gitignore` recommendation trong `harness init`
- Manual: `harness run --clean` để xoá tất cả completed sessions
- Size estimate: ~5-50KB per session (plan + progress + spec), tối đa ~500KB cho 10 sessions

**Progress Ledger format** (`.harness/run/<session-id>/progress.md`):
```markdown
# Harness Run Progress — <session-id>

## Session
task: "<task description>"
workflow: <workflow-type>
started: <ISO timestamp>

## Tasks
- [x] Task 1: <name> (commits: <sha>, review: clean)
- [x] Task 2: <name> (commits: <sha>, review: clean)
- [ ] Task 3: <name> (in progress)
```

Resume rule: `WorkflowEngine.resume()` reads ledger → skips `[x]` tasks → continues from first `[ ]` task.

**Exit criteria:** .harness/run/<id>/progress.md written after each task • harness run --resume <id> skips completed tasks • state survives process restart

---

### Phase 7: Subagent Execution Pattern

**Objectives:** ExecutionRuntime adopts fresh-subagent-per-task pattern with two-stage review.  
**Components affected:** `src/execution/runtime/ExecutionRuntime.ts`, `src/capability/builtin/aiOps.ts`  
**Superpowers concepts adopted:** `subagent-driven-development` — fresh context, file handoff, two-stage review, model selection  
**Harness extensions:** Review gate integrated with Harness knowledge base for spec source  
**Breaking changes:** Execution model changes — tasks now dispatched as subagent prompts  
**Risks:** High — requires AI model access in execution path  
**Validation criteria:**
- Each task dispatched as fresh subagent with task brief path
- Review package generated after each task
- Two-stage verdict required before task marked complete
- Critical/Important findings trigger fix subagent dispatch
- Final whole-branch review dispatched
- All existing conformance tests pass  
**Complexity:** Very High (10-14 days)

**Exit criteria:** each task dispatched as fresh subagent • two-stage review verdict required • critical findings block next task • harness conformance run → 30/30

---

### Phase 8: Documentation & Skills Library

**Objectives:** Update README, AGENTS.md, AGENTS_TEMPLATE.md. Ship 10 core skills. Update knowledge_base.  
**Components affected:** All documentation files, `src/shared/skills/`, `knowledge_base/`  
**Superpowers concepts adopted:** 8 directly-adopted skills (tdd, debug, verify, plan, brainstorm, subagent, review, finish)  
**Harness extensions:** 2 Harness-specific skills (context-first, governance-checkpoint)  
**Breaking changes:** AGENTS_TEMPLATE.md breaking change — removes hardcoded build commands  
**Risks:** Low — documentation only  
**Validation criteria:**
- README clearly explains workflow model
- AGENTS_TEMPLATE.md: agent must query for skills/workflows/build commands
- All 10 skills have correct YAML frontmatter
- Skill descriptions follow trigger-conditions-only convention
- `harness doctor` no longer reports template issues  
**Complexity:** Medium (3-5 days)

**Exit criteria:** harness doctor 0 template errors • README explains workflow model • AGENTS_TEMPLATE.md has no hardcoded build commands • 10 skills present with valid frontmatter

---

### Phase 9: MCP Expansion

**Objectives:** Add new MCP tools: `harness_workflow_list`, `harness_workflow_status`, `harness_skill_list`, `harness_context_load`, `harness_run_resume`.  
**Components affected:** `src/adapters/mcp/server.ts`  
**Superpowers concepts adopted:** None — Harness-specific  
**Harness extensions:** All new tools  
**Breaking changes:** None — additive  
**Risks:** Low  
**Validation criteria:**
- All 5 new tools registered and functional
- `harness_run` updated with `workflow`, `dry_run`, and `no_brainstorm` params
- MCP conformance test updated to cover new tools
- Existing 4 tools unaffected  
**Complexity:** Low-Medium (2-3 days)

**Exit criteria:** all 5 new MCP tools registered • harness_run accepts workflow + dry_run params • existing 4 MCP tools unaffected

---

### Phase 10: Governance Integration & Conformance Update

**Objectives:** WorkflowEngine automatically checks governance requirements. Update conformance suite to cover workflow scenarios.  
**Components affected:** `src/execution/workflow/WorkflowEngine.ts`, `src/adapters/cli/commands/conformance.ts`, `knowledge_base/17_CONFORMANCE.md`  
**Superpowers concepts adopted:** None  
**Harness extensions:** Governance checkpoint in workflow  
**Breaking changes:** None  
**Risks:** Low  
**Validation criteria:**
- `harness run "add capability"` automatically suggests proposal submit
- Conformance suite updated with 10+ new workflow scenarios
- `harness conformance run` 40/40 (30 existing + 10 new)  
**Complexity:** Medium (3-4 days)

**New workflow conformance test cases:**

| ID | Test | Expected |
|----|------|----------|
| TC-31 | classify("implement user auth") | returns 'feature-dev', confidence ≥ 0.7 |
| TC-32 | classify("fix login crash") | returns 'bug-fix', confidence ≥ 0.7 |
| TC-33 | classify("ambiguous task text") | returns 'unclassified' or prompts user |
| TC-34 | WorkflowEngine loads feature-dev template | template has ≥3 phases |
| TC-35 | Planner generates plan with TDD steps | plan.md contains test-first steps |
| TC-36 | --no-brainstorm skips interactive | no user prompts in output |
| TC-37 | --dry-run previews plan without executing | no side effects, plan printed |
| TC-38 | Progress ledger written after task | progress.md contains [x] entry |
| TC-39 | harness run --resume skips completed | only [ ] tasks executed |
| TC-40 | Workflow session state transitions | PLANNING→EXECUTING→REVIEWING→DONE valid |

**Exit criteria:** harness run "add capability" suggests proposal • harness conformance run → ≥40/40 (30 existing + ≥10 new workflow scenarios)

---

### Migration Summary

| Phase | Focus | Complexity | Breaking | Risk |
|---|---|---|---|---|
| 0 | Fix KI-001..KI-007 | Low | None | Low |
| 1 | Skill asset type | Low-Med | None | Low |
| 2 | Context + skills inject | Medium | None | Low |
| 3 | CLI expansion | Low | None | Low |
| 4 | Planner | High | `harness run` adds phase | Medium |
| 5 | Workflow Engine | High | `harness run` routed | High |
| 6 | Durable state | Medium | None | Low-Med |
| 7 | Subagent execution | Very High | Execution model | High |
| 8 | Docs + Skills library | Medium | Template format | Low |
| 9 | MCP expansion | Low-Med | None | Low |
| 10 | Governance + Conformance | Medium | None | Low |

**Total estimated complexity:** 8-12 weeks for full migration (one developer, part-time)  
**Independent deliverables:** Phases 0, 1, 2, 3 can be done in any order.  
**Dependency chain:** Phase 4 requires Phase 1+2. Phase 5 requires Phase 4. Phase 7 requires Phase 5+6. Phase 10 requires Phase 5.

**Recommended order:** 0 → 1 → 2 → 3 → 8 (docs) → 4 → 5 → 6 → 7 → 9 → 10

The reason to do Phase 8 (docs) early is: documentation clarifies design before implementation begins. Updated AGENTS_TEMPLATE.md shapes how AI agents use the system immediately, before the runtime is ready.
