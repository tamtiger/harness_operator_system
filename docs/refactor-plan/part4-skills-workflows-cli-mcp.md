# Harness Refactoring Plan — Part 4: Skills, Workflows, CLI & MCP

---

## 8. Core Skill Design

> Target: ~10 skills. Smallest set capable của supporting all development workflows. Mỗi skill là một file `.harness/skills/<name>.md` (hoặc `~/.harness/skills/`).

### Skill 1: `harness-context-first`

**Purpose:** Enforce rằng agent phải đọc Harness knowledge trước khi implement bất cứ thứ gì.  
**Inputs:** Task description, repository path  
**Outputs:** Loaded context từ `.harness/knowledge/`, applicable rules  
**Internal capabilities:** ContextService (existing)  
**Superpowers inspiration:** `using-superpowers` — "check for relevant skills before ANY response"  
**Classification:** Adapted (Superpowers = skill check; Harness = knowledge check)  
**Content:** Iron law: "NO CODE WITHOUT HARNESS CONTEXT FIRST". Rationalization table: "I know this codebase" → "You might not know what changed in .harness/". Red flags list.

---

### Skill 2: `brainstorm-before-code`

**Purpose:** Ensure agent explore requirements, propose approaches, get user approval trước khi write any code.  
**Inputs:** Task description  
**Outputs:** Approved design spec, saved to `.harness/run/<session>/spec.md`  
**Internal capabilities:** ContextService (load knowledge), fileOps (save spec)  
**Superpowers inspiration:** `brainstorming` — one question at a time, 2-3 approaches, design sections  
**Classification:** Directly adopted (same structure, same philosophy)  
**Content:** Checklist: explore context → questions → 2-3 approaches → design sections → user approval → write spec → self-review. Terminal state: invoke `plan-before-implement`.

---

### Skill 3: `plan-before-implement`

**Purpose:** Decompose approved spec thành bite-sized TDD tasks với exact file paths và complete code.  
**Inputs:** Spec file path, knowledge context  
**Outputs:** Plan file `.harness/run/<session>/plan.md` với tasks structure  
**Internal capabilities:** fileOps (read spec, write plan), ContextService  
**Superpowers inspiration:** `writing-plans` — DRY, YAGNI, TDD, no placeholders, task-brief format  
**Classification:** Directly adopted  
**Content:** File structure mapping → task right-sizing → plan header → task structure với TDD steps → no-placeholders rule → self-review → execution handoff.

---

### Skill 4: `tdd-red-green-refactor`

**Purpose:** Enforce RED-GREEN-REFACTOR cycle cho mọi feature và bugfix.  
**Inputs:** Task brief  
**Outputs:** Committed code với tests  
**Internal capabilities:** gitOps, fileOps, termOps (run tests)  
**Superpowers inspiration:** `test-driven-development` — iron law, delete-code rule, rationalization table  
**Classification:** Directly adopted (nearly verbatim — proven effective)  
**Content:** Iron law: "NO PRODUCTION CODE WITHOUT FAILING TEST FIRST". Delete-and-restart rule. RED verification (watch it fail). GREEN verification (watch it pass). REFACTOR step. Full rationalization table.

---

### Skill 5: `subagent-per-task`

**Purpose:** Enforce fresh-subagent-per-task pattern trong execution loop.  
**Inputs:** Plan path, task number, global constraints  
**Outputs:** Task brief file path, dispatched subagent, review package file path  
**Internal capabilities:** aiOps (dispatch subagent), fileOps (write briefs/packages), gitOps (diff)  
**Superpowers inspiration:** `subagent-driven-development` — fresh context, file handoff, model selection, ledger  
**Classification:** Adapted (Harness có aiOps capability làm backend; Superpowers uses native Task tool)  
**Content:** Pre-flight plan scan → task-brief script → dispatch implementer → status handling (DONE/BLOCKED/NEEDS_CONTEXT) → review-package → dispatch reviewer → two-stage verdict → ledger append.

---

### Skill 6: `two-stage-review`

**Purpose:** Enforce spec compliance check AND code quality check trước khi mark task complete.  
**Inputs:** Task brief, report, diff file path  
**Outputs:** Review verdict (spec ✅/❌, quality ✅/❌), findings list  
**Internal capabilities:** aiOps (dispatch reviewer), fileOps (read diff)  
**Superpowers inspiration:** `task-reviewer-prompt.md` in `subagent-driven-development`  
**Classification:** Adapted (Harness integrate với knowledge base cho spec source)  
**Content:** Two-verdict requirement. Spec compliance check against Harness knowledge. Code quality check against ECC rules. Critical/Important → dispatch fix subagent. Minor → record in ledger.

---

### Skill 7: `systematic-debug`

**Purpose:** Enforce root-cause-before-fix discipline.  
**Inputs:** Bug description, error output, failing test  
**Outputs:** Root cause hypothesis, fix + test  
**Internal capabilities:** termOps (run tests), fileOps (read code), gitOps (check recent changes)  
**Superpowers inspiration:** `systematic-debugging` — 4 phases, data flow tracing, 3-fix architectural question  
**Classification:** Directly adopted  
**Content:** 4 phases: root cause → pattern → hypothesis → implementation. Iron law. Multi-component diagnostic instrumentation pattern. "3+ fixes = architecture problem" rule.

---

### Skill 8: `verify-before-done`

**Purpose:** Prevent agent from claiming completion without running verification.  
**Inputs:** Completion claim  
**Outputs:** Evidence: command run, output, pass/fail  
**Internal capabilities:** termOps (run build/test/lint), fileOps  
**Superpowers inspiration:** `verification-before-completion` — gate function, iron law, common failures table  
**Classification:** Directly adopted  
**Content:** Gate function: identify command → run → read output → verify → ONLY THEN claim. Common failures table (tests pass ≠ build succeeds). Red flags: "should work now", "I'm confident", agent success reports.

---

### Skill 9: `governance-checkpoint`

**Purpose:** Harness-specific — ensure agent checks governance requirements trước khi public contract changes.  
**Inputs:** Type of change being made  
**Outputs:** Go/No-go, proposal ID if required  
**Internal capabilities:** GovernanceService (existing)  
**Superpowers inspiration:** None — Harness-specific extension  
**Classification:** Harness-specific  
**Content:** Checklist: is this a structural change? → does it need proposal? → is proposal already approved? Decision table: change type → proposal required Y/N. Link to `harness proposal submit` flow.

---

### Skill 10: `finish-development`

**Purpose:** Guide completion — verify tests → detect environment → present merge/PR/keep/discard options.  
**Inputs:** Current git state  
**Outputs:** Branch merged/PR created/kept/discarded  
**Internal capabilities:** gitOps (merge, push, worktree), termOps (run tests)  
**Superpowers inspiration:** `finishing-a-development-branch` — 4 options, environment detection, cleanup rules  
**Classification:** Directly adopted  
**Content:** Verify tests → detect worktree vs normal repo → 4 options → execute → cleanup. Never cleanup harness-owned worktrees without confirmation.

---

## 9. Core Workflow Design

### Workflow 1: Feature Development

**Goal:** Implement new feature từ idea đến merged code.  
**Entry condition:** User request: "implement X", "add Y", "build Z"  
**Required skills:** `harness-context-first`, `brainstorm-before-code`, `plan-before-implement`, `tdd-red-green-refactor`, `subagent-per-task`, `two-stage-review`, `verify-before-done`, `governance-checkpoint`, `finish-development`

**Execution stages:**

| Stage | Phase | Human Gate | Skill | Superpowers origin | Harness ext |
|---|---|:---:|---|---|---|
| 1. Context load | brainstorm | ❌ | `harness-context-first` | — | ✅ Knowledge base |
| 2. Brainstorm | brainstorm | ✅ | `brainstorm-before-code` | brainstorming | — |
| 3. Spec review | brainstorm | ✅ | — | brainstorming | — |
| 4. Planning | plan | ✅ | `plan-before-implement` | writing-plans | — |
| 5. Workspace isolation | execute | ❌ | — | using-git-worktrees | — |
| 6. Per-task execution | execute | ❌ | `tdd-red-green-refactor`, `subagent-per-task` | subagent-driven-dev | — |
| 7. Per-task review | execute | ❌ | `two-stage-review` | task-reviewer | — |
| 8. Governance check | execute | ✅ | `governance-checkpoint` | — | ✅ Harness |
| 9. Final review | validate | ❌ | `two-stage-review` | requesting-code-review | — |
| 10. Verification | validate | ❌ | `verify-before-done` | verification-before-completion | — |
| 11. Knowledge sync | sync | ✅ | — | — | ✅ Harness |
| 12. Finish | complete | ✅ | `finish-development` | finishing-a-dev-branch | — |

**Validation:** All tests pass + harness validate pass + verify-before-done gate cleared  
**Exit condition:** User chooses merge/PR/keep/discard

**YAML template** (`.harness/workflows/feature-dev.yaml`):
```yaml
id: feature-dev
name: Feature Development
description: Implement new features from idea to merged code
entry_conditions: ["implement", "add", "build", "create", "new feature"]
required_skills:
  - harness-context-first
  - brainstorm-before-code
  - plan-before-implement
  - tdd-red-green-refactor
  - subagent-per-task
  - two-stage-review
  - verify-before-done
  - governance-checkpoint
  - finish-development
phases:
  - name: brainstorm
    skills: [brainstorm-before-code]
    optional: false
    human_gate: true
  - name: plan
    skills: [plan-before-implement]
    optional: false
    human_gate: true
  - name: execute
    skills: [tdd-red-green-refactor, subagent-per-task]
    optional: false
    human_gate: false
  - name: validate
    skills: [verify-before-done]
    optional: false
    human_gate: false
  - name: report
    skills: []
    optional: false
    human_gate: false
governance_required: false
```

Other workflow templates follow this same schema. See `.harness/workflows/` for all templates.

---

### Workflow 2: Bug Fix

**Goal:** Fix a specific bug with root cause investigation.  
**Entry condition:** User request: "fix X", "bug:", error message  
**Required skills:** `harness-context-first`, `systematic-debug`, `tdd-red-green-refactor`, `verify-before-done`, `finish-development`

**Stages:** Context → Debug (4 phases) → TDD fix → Verification → Finish  
**Note:** Không cần brainstorm phase nếu bug clearly defined. Planner tạo single-task plan.  
**Superpowers origins:** `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `finishing-a-development-branch`  
**Harness extensions:** context-first (knowledge base), governance-checkpoint (nếu fix changes public API)

---

### Workflow 3: Refactoring

**Goal:** Improve code structure without changing behavior.  
**Entry condition:** User request: "refactor X", "clean up Y", "extract Z"  
**Required skills:** `harness-context-first`, `brainstorm-before-code` (lite), `plan-before-implement`, `tdd-red-green-refactor`, `verify-before-done`

**Stages:** Context → Scope (không brainstorm fully — refactor scope is known) → Plan → Execute (TDD) → Verify  
**Critical rule:** Verify behavior unchanged: run test suite before AND after. Any new test failures = rollback.  
**Superpowers origins:** `writing-plans`, `test-driven-development`, `verification-before-completion`  
**Harness extensions:** context-first, governance-checkpoint (nếu refactor changes public interface)

---

### Workflow 4: Code Review

**Goal:** Review a diff or MR for spec compliance and code quality.  
**Entry condition:** User provides diff, MR URL, or branch  
**Required skills:** `two-stage-review`

**Stages:** Load diff → Spec compliance check (against knowledge + plan) → Code quality check → Report findings  
**Superpowers origins:** `requesting-code-review`, `receiving-code-review`  
**Harness extensions:** Load knowledge base spec as review baseline

---

### Workflow 5: Repository Audit

**Goal:** Audit repository for conformance, knowledge gaps, and quality.  
**Entry condition:** `harness run "audit repository"` or `harness conformance run`  
**Required skills:** `harness-context-first`, `verify-before-done`

**Stages:** Load all knowledge → harness validate → conformance run → gap analysis (knowledge vs code) → report  
**Superpowers origins:** None (Harness-specific)  
**Harness extensions:** All stages. Uses conformance suite (30 test cases).

---

### Workflow 6: Documentation Update

**Goal:** Update documentation to reflect current state.  
**Entry condition:** "update docs for X", "document Y"  
**Required skills:** `harness-context-first`, `verify-before-done`

**Stages:** Context → Identify outdated docs → Update → harness validate → verify  
**Superpowers origins:** — (Superpowers không có doc workflow)  
**Harness extensions:** All stages. Must update `.harness/knowledge/` if behavior docs changed.

---

## 10. CLI Refactoring Plan

### 10.1 `harness run "<task>"` — Primary Entry Point Redesign

**Hiện tại:** Gọi `ExecutionService.execute()` trực tiếp với task description. Không có planning phase. Không có workflow selection.

**Sau refactor:**
```
harness run "<task>"
    → WorkflowEngine.classify(task) → workflow type
    → WorkflowEngine.loadSkills(workflow) → inject vào session context
    → Planner.brainstorm(task) [interactive if TTY, auto if pipe]
    → Planner.plan(spec) → .harness/run/<session>/plan.md
    → ExecutionEngine.execute(plan) → per-task subagent loop
    → ValidationGate.verify()
    → KnowledgeSync.prompt()
    → GovernanceEngine.check()
    → Report(structured)
```

**Options:**
- `harness run "<task>" --workflow feature-dev` — explicit workflow selection
- `harness run "<task>" --no-brainstorm` — skip interactive brainstorm (use for CI/scripting)
- `harness run "<task>" --dry-run` — show plan without executing
- `harness run "<task>" --json` — structured JSON output
- `harness run "<task>" --resume <session-id>` — resume từ progress ledger

---

### 10.2 All CLI Commands — Classification

| Command | Action | Justification |
|---|---|---|
| `harness version` | Keep + Fix (KI-002) | Essential, fix version hardcode |
| `harness help` | Keep | Essential |
| `harness init [path]` | Keep + Fix (KI-001, KI-003) | Essential, fix template copy + --force |
| `harness validate [--strict]` | Keep | Essential validation |
| `harness status [--json]` | Keep | Essential health check |
| `harness doctor` | Keep | Essential diagnostics |
| `harness run "<task>"` | **Modify** (major) | Primary runtime entry — add workflow engine |
| `harness context --task "..."` | Keep + Fix (KI-006) | Fix hardcoded tags; add `--skills` flag |
| `harness capability list` | Keep | Still valid |
| `harness install <source> [version]` | Keep + Fix (KI-004) | Fix flag parsing |
| `harness update [version] [--force]` | Keep | Still valid |
| `harness sync` | Keep | Still valid |
| `harness publish <asset-path>` | Keep | Still valid |
| `harness proposal list [--status]` | Keep | Still valid |
| `harness proposal submit <id>` | Keep + Fix (KI-005) | Fix --file flag |
| `harness proposal approve <id>` | Keep | Human-only, correct |
| `harness mcp-server` | Keep | Essential |
| `harness conformance run` | Keep | Essential |
| **`harness workflow list`** | **Add** | List available workflow templates |
| **`harness workflow run <type> "<task>"`** | **Add** | Explicit workflow selection |
| **`harness skill list`** | **Add** | List available skills |
| **`harness skill show <name>`** | **Add** | Show skill content |
| **`harness run --resume <session-id>`** | **Add** (flag) | Resume interrupted run |
| **`harness proposal reject <id>`** | **Add** (KI-007) | GovernanceService method exists |
| **`harness proposal promote <id>`** | **Add** (KI-007) | GovernanceService method exists |
| **`harness proposal request-changes <id>`** | **Add** (KI-007) | GovernanceService method exists |

---

### 10.3 `harness context` Enhancement

**Hiện tại:** Hardcodes tags `['auth','implementation']` → irrelevant context  
**Sau refactor:**
- `harness context --task "<description>"` → semantic search qua ContextService, không hardcode tags
- `harness context --task "<description>" --workflow feature-dev` → filter by workflow type
- `harness context --task "<description>" --skills` → include skill assets in output
- Output shows: knowledge assets + applicable skills + applicable rules

---

## 11. MCP Refactoring Plan

### 11.1 Existing Tools — Classification

| Tool | Action | Justification |
|---|---|---|
| `harness_run` | **Modify** | Route through WorkflowEngine, add `workflow` param |
| `harness_validate` | Keep | Still valid |
| `harness_proposal_list` | Keep | Still valid |
| `harness_proposal_submit` | Keep | Still valid |

### 11.2 New Tools to Add — Full Schemas

**`harness_workflow_list`**
```json
{
  "name": "harness_workflow_list",
  "description": "List available workflow templates",
  "inputSchema": { "type": "object", "properties": {}, "required": [] }
}
```

**`harness_workflow_status`**
```json
{
  "name": "harness_workflow_status",
  "description": "Get status of a running or completed workflow session",
  "inputSchema": {
    "type": "object",
    "properties": {
      "session_id": { "type": "string", "description": "Session ID from harness_run response" }
    },
    "required": ["session_id"]
  }
}
```

**`harness_skill_list`**
```json
{
  "name": "harness_skill_list",
  "description": "List available skills with trigger descriptions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Filter skills by workflow type",
        "enum": ["feature-dev", "bug-fix", "refactor", "code-review", "audit", "docs"]
      }
    },
    "required": []
  }
}
```

**`harness_context_load`**
```json
{
  "name": "harness_context_load",
  "description": "Load knowledge context and applicable skills for a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "task": { "type": "string", "description": "Task description" },
      "workflow": {
        "type": "string",
        "description": "Optional workflow type to filter context",
        "enum": ["feature-dev", "bug-fix", "refactor", "code-review", "audit", "docs"]
      }
    },
    "required": ["task"]
  }
}
```

**`harness_run_resume`**
```json
{
  "name": "harness_run_resume",
  "description": "Resume an interrupted workflow session from its progress ledger",
  "inputSchema": {
    "type": "object",
    "properties": {
      "session_id": { "type": "string", "description": "Session ID to resume" }
    },
    "required": ["session_id"]
  }
}
```

### 11.3 Tool Organization

**Generic Runtime Tools** (workflow-agnostic):
- `harness_run`, `harness_validate`, `harness_workflow_list`, `harness_workflow_status`, `harness_skill_list`, `harness_context_load`, `harness_run_resume`

**Governance Tools** (Harness-specific):
- `harness_proposal_list`, `harness_proposal_submit`

**Note:** `harness_proposal_approve` vẫn intentionally excluded từ MCP — human-only action via CLI là đúng.

### 11.4 `harness_run` New Schema

```json
{
  "name": "harness_run",
  "description": "Execute a task through Harness workflow engine",
  "inputSchema": {
    "type": "object",
    "properties": {
      "description": { "type": "string", "description": "Task description" },
      "workflow": { 
        "type": "string",
        "description": "Workflow type override",
        "enum": ["feature-dev", "bug-fix", "refactor", "code-review", "audit", "docs", "auto"]
      },
      "no_brainstorm": { "type": "boolean", "default": false },
      "dry_run": { "type": "boolean", "default": false }
    },
    "required": ["description"]
  }
}
```

### 11.5 Planner Integration

MCP caller có thể dùng `harness_run` với `dry_run: true` để nhận plan preview, review nó, sau đó call lại với `session_id` để confirm và execute. Điều này cho phép human-in-the-loop approval qua MCP mà không cần CLI.
