# Harness Refactoring Plan — Part 3: Mapping & New Architecture

---

## 6. Superpowers → Harness Mapping

> Mỗi Superpowers component được verified từ source code. Không có tên được bịa ra.

| Harness Component | Superpowers Component | Component Type | Source Location | Keep | Adapt | Replace | Harness Extension | Reason |
|---|---|---|---|:---:|:---:|:---:|:---:|---|
| `AssetLoader` (asset type: `skill`) | `skills/*/SKILL.md` | Prompt (markdown doc) | `skills/` | — | ✅ | — | — | Harness extend asset model để load `.harness/skills/*.md` files với YAML frontmatter |
| `ContextService` (inject skills) | `hooks/session-start` (bash) | Runtime Component | `hooks/session-start` | — | ✅ | — | — | Harness inject skill list vào context thay vì bash hook; cùng mục đích, khác mechanism |
| Workflow Engine (mới) | `skills/using-superpowers/SKILL.md` (routing rules) | Prompt | `skills/using-superpowers/SKILL.md` | — | — | — | ✅ | Harness cần code-based workflow engine; Superpowers dùng pure prompt routing |
| Planner (mới) | `skills/writing-plans/SKILL.md` | Process Skill | `skills/writing-plans/SKILL.md` | — | ✅ | — | — | Harness Planner lấy task decomposition idea từ writing-plans, nhưng integrate với knowledge base |
| ExecutionRuntime (refactor) | `skills/subagent-driven-development/SKILL.md` | Process Skill | `skills/subagent-driven-development/SKILL.md` | — | ✅ | — | — | Harness ExecutionRuntime cần adopt per-task subagent + review loop pattern |
| `.harness/run/progress.md` (mới) | `.superpowers/sdd/progress.md` | Runtime Component | Per-session in working tree | — | ✅ | — | — | Durable ledger cùng concept, Harness đặt trong `.harness/run/<session>/` |
| `harness run` (refactor) | `skills/brainstorming/SKILL.md` | Process Skill | `skills/brainstorming/SKILL.md` | — | ✅ | — | — | `harness run` cần brainstorm phase trước execute; idea từ brainstorming skill |
| Skill asset type (mới) | YAML frontmatter schema | Template | `skills/*/SKILL.md` | — | — | — | ✅ | Harness cần formal asset type `skill` với `name`, `description`, `triggers`, `workflow` fields |
| Context budget (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có; Harness-specific strength để keep |
| GovernanceService (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có governance; Harness-specific strength |
| CapabilityRegistry (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có capability registry; Harness-specific strength |
| Knowledge Base (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có knowledge base; major Harness advantage |
| RepositoryValidator (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có validation; Harness-specific |
| ConformanceSuite (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers có eval harness nhưng khác scope; giữ Harness conformance |
| Task review gate (mới) | `task-reviewer-prompt.md` trong `subagent-driven-development` | Template | `skills/subagent-driven-development/task-reviewer-prompt.md` | — | ✅ | — | — | Harness ExecutionRuntime cần two-stage review gate |
| TDD skill asset | `skills/test-driven-development/SKILL.md` | Process Skill | `skills/test-driven-development/SKILL.md` | — | ✅ | — | — | Port sang Harness skill format, giữ nguyên nội dung iron law |
| Debug skill asset | `skills/systematic-debugging/SKILL.md` | Process Skill | `skills/systematic-debugging/SKILL.md` | — | ✅ | — | — | Port sang Harness skill format |
| Verification skill asset | `skills/verification-before-completion/SKILL.md` | Process Skill | `skills/verification-before-completion/SKILL.md` | — | ✅ | — | — | Port sang Harness skill format |
| Scripts (`task-brief`, `review-package`) | `scripts/task-brief`, `scripts/review-package` | Runtime Component | `scripts/` | — | ✅ | — | — | Harness implement tương đương trong `src/execution/scripts/` |
| `harness workflow` CLI commands (mới) | — | — | — | — | — | — | ✅ | Harness-specific: `workflow list`, `workflow run`, `workflow status` |
| MCP tool: `harness_workflow_run` (mới) | — | — | — | — | — | — | ✅ | Harness-specific MCP extension |
| `harness skill list` CLI (mới) | — | — | — | — | — | — | ✅ | Harness-specific: list available skills |
| Parallel agent dispatch | `skills/dispatching-parallel-agents/SKILL.md` | Process Skill | `skills/dispatching-parallel-agents/SKILL.md` | — | ✅ | — | — | Port sang Harness skill; Harness cũng cần Planner biết when to dispatch parallel vs sequential |
| Code review skill | `skills/requesting-code-review/SKILL.md`, `skills/receiving-code-review/SKILL.md` | Process Skill | `skills/requesting-code-review/`, `skills/receiving-code-review/` | — | ✅ | — | — | Port sang Harness skill; integrate với Harness governance |
| Branch completion skill | `skills/finishing-a-development-branch/SKILL.md` | Process Skill | `skills/finishing-a-development-branch/SKILL.md` | — | ✅ | — | — | Port sang Harness skill |
| Git worktrees skill | `skills/using-git-worktrees/SKILL.md` | Process Skill | `skills/using-git-worktrees/SKILL.md` | — | ✅ | — | — | Port sang Harness skill; adapt cho Windows path handling |
| Shared/Local merge (giữ) | — | — | — | ✅ | — | — | ✅ | Superpowers không có; Harness-specific two-tier knowledge |
| MCP server (expand) | — | — | — | — | ✅ | — | ✅ | Giữ 4 existing tools, thêm workflow + skill tools |

---

## 7. New Harness Runtime Architecture

### 7.1 Data Model Additions (cần update `11_DATA_MODELS.md`)

```typescript
// New: Skill Asset
interface SkillAsset {
  type: 'skill';
  name: string;           // từ frontmatter
  description: string;    // trigger conditions only
  triggers: string[];     // workflow types that auto-include this skill
  workflows: string[];    // optional: explicit workflow names
  content: string;        // full markdown body
  path: string;
}
```

### Skill YAML Frontmatter Spec

```yaml
# Required fields
name: <string>          # kebab-case, unique across .harness/skills/ + shared/skills/
description: <string>   # starts with "Use when...", max 500 chars
                        # MUST contain only trigger conditions — no workflow steps
# Optional fields
triggers:               # workflow types that auto-include this skill
  - feature-dev         # valid: feature-dev|bug-fix|refactor|code-review|audit|docs|any
workflows:              # explicit workflow ids (alternative to triggers)
  - feature-dev
```

Validation rule for `description`: MUST NOT contain process words (`steps`, `then`, `after`, `workflow`, `phases`) — description is a trigger condition, not a workflow summary.

```typescript
// New: WorkflowTemplate
interface WorkflowTemplate {
  id: string;
  name: string;           // feature-dev | bug-fix | refactor | code-review | audit | docs
  description: string;
  requiredSkills: string[];   // skill names to inject
  phases: WorkflowPhase[];
  entryConditions: string[];
  exitConditions: string[];
  governanceRequired: boolean;
}

// New: WorkflowPhase
interface WorkflowPhase {
  name: string;           // brainstorm | plan | execute | validate | report
  skills: string[];       // skills active in this phase
  optional: boolean;
  humanGate: boolean;     // pause for user confirmation
}

// New: WorkflowSession
interface WorkflowSession {
  sessionId: string;
  workflowId: string;
  taskDescription: string;
  planPath: string;       // .harness/run/<sessionId>/plan.md
  ledgerPath: string;     // .harness/run/<sessionId>/progress.md
  startedAt: string;
  status: 'planning' | 'executing' | 'reviewing' | 'done' | 'failed';
}
```

### WorkflowSession State Transitions

| From | To | Condition |
|---|---|---|
| `planning` | `executing` | plan saved + user confirmed |
| `executing` | `reviewing` | all tasks complete |
| `executing` | `failed` | unrecoverable error or abort |
| `reviewing` | `done` | final review approved |
| `reviewing` | `executing` | critical findings → re-execute |
| `*` | `failed` | abort signal received |

```typescript
// Service Interfaces (add to src/shared/contracts/services.ts)
interface WorkflowEngine {
  classify(task: string): Promise<WorkflowType>;
  run(task: string, options: WorkflowRunOptions): Promise<WorkflowSession>;
  resume(sessionId: string): Promise<WorkflowSession>;
  cancel(sessionId: string): Promise<void>;
  getStatus(sessionId: string): WorkflowSession;
}

interface Planner {
  brainstorm(task: string, context: RuntimeContext): AsyncIterable<string>;
  plan(spec: string, context: RuntimeContext): Promise<PlanDocument>;
  decompose(plan: PlanDocument): Promise<TaskList>;
}

type WorkflowType = 'feature-dev' | 'bug-fix' | 'refactor' | 'code-review' | 'audit' | 'docs';

interface WorkflowRunOptions {
  workflow?: WorkflowType;      // explicit override
  noBrainstorm?: boolean;       // skip interactive phase
  dryRun?: boolean;             // preview plan only
  resumeSessionId?: string;     // resume from ledger
  json?: boolean;               // structured output
}
```

### Workflow Error Taxonomy

New error categories (add to `src/shared/errors/factories.ts` when implementing):
- `WorkflowClassificationError` — cannot determine workflow type from task
- `PlanningError` — brainstorm or decomposition failed
- `TaskExecutionError` — implementer subagent failed (max 3 attempts)
- `ReviewRejectionError` — critical findings, cannot auto-fix
- `ValidationError` — verify-before-done gate failed
- `GovernanceBlockError` — proposal required but not submitted

| Error | Auto-retry | Human gate | Terminal |
|---|---|---|---|
| `TaskExecutionError` | 2x | after 3rd attempt | yes, after 3rd |
| `ReviewRejectionError` | N/A | yes | no |
| `GovernanceBlockError` | N/A | yes | no |
| `ValidationError` | N/A | no | yes (fail fast) |
| `PlanningError` | N/A | yes | no |

### 7.2 Architecture Diagram

```
User Request (CLI: harness run "task" | MCP: harness_run)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                  WORKFLOW ENGINE                     │
│  Detects workflow type → selects workflow template  │
│  Loads required skills → injects into context       │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                     PLANNER                         │
│  Loads knowledge base context (relevant assets)     │
│  Brainstorms with user → generates spec             │
│  Decomposes spec → task list (TDD steps)            │
│  Saves plan to .harness/run/<session>/plan.md       │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                EXECUTION ENGINE                     │
│  Per-task loop:                                     │
│    1. Extract task brief → file                     │
│    2. Dispatch IMPLEMENTER (fresh context)          │
│    3. Generate review package → file                │
│    4. Dispatch TASK REVIEWER (spec + quality)       │
│    5. If issues → dispatch FIX agent → re-review   │
│    6. Append to progress ledger                     │
│  Final: dispatch WHOLE-BRANCH REVIEWER              │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│               CAPABILITIES (existing)               │
│  27 built-in capabilities                           │
│  fileOps / gitOps / searchOps / aiOps / repoOps    │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│           SKILLS (new asset type)                   │
│  .harness/skills/*.md + shared/skills/*.md          │
│  Injected into context for relevant workflow phases │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│              VALIDATION GATE                        │
│  verification-before-completion enforcement         │
│  conformance check (if configured)                  │
│  harness validate (repository structure)            │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│           KNOWLEDGE SYNCHRONIZATION                 │
│  Auto-detect: did behavior change?                  │
│  Prompt: update .harness/knowledge/ if needed       │
│  harness validate to confirm                        │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                  GOVERNANCE                         │
│  Check: does this change require a proposal?        │
│  If yes: prompt user → harness publish → submit     │
│  Audit log entry                                    │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                    REPORT                           │
│  Structured output: tasks completed, tests passed,  │
│  issues found, files changed, governance actions    │
└─────────────────────────────────────────────────────┘
```

### 7.3 Layer Responsibilities

**Workflow Engine (mới — `src/execution/workflow/WorkflowEngine.ts`)**
- Receive task description từ `harness run` hoặc MCP
- Classify workflow type: feature-dev / bug-fix / refactor / code-review / audit / docs
- Load workflow template từ `.harness/workflows/<type>.yaml`
- Load required skills từ `.harness/skills/` và `~/.harness/skills/`
- Inject skill list + applicable knowledge context
- Return `WorkflowSession` với plan path, session id, progress ledger path

**Planner (mới — `src/execution/planner/Planner.ts`)**
- Được gọi bởi Workflow Engine sau workflow selection
- Query ContextService để load relevant knowledge assets
- Nếu interactive: engage brainstorming skill flow với user
- Nếu non-interactive: generate plan từ task description + knowledge
- Decompose thành tasks với TDD structure
- Save plan to `.harness/run/<session-id>/plan.md`
- Return task list

**Execution Engine (refactor `src/execution/runtime/ExecutionRuntime.ts`)**
- Đọc plan và create todos
- Per-task loop với 5 phases: brief → implement → review-package → task-review → ledger
- Dispatch subagents (via `aiOps` capability, already exists)
- Two-stage review gate enforcement
- Final whole-branch review dispatch
- Persist state vào `progress.md` sau mỗi task
- Sequential per task by design — parallel dispatch only when Planner detects truly independent tasks via `dispatching-parallel-agents` skill. Never run multiple implementers concurrently on the same codebase.

**Capabilities (giữ nguyên — `src/capability/`)**
- Không thay đổi interface
- Cần thêm: `aiOps.dispatchSubagent()` nếu chưa có
- `fileOps` dùng cho task-brief và review-package output

**Skills (mới asset type — `src/repository/assets/AssetLoader.ts`)**
- Load `.harness/skills/*.md` files
- YAML frontmatter: `name`, `description`, `triggers`, `workflows`
- Skills được filter và inject vào context theo workflow phase
- ContextService updated để biết skill assets

**Validation Gate (nâng cấp `src/execution/verifier/ResultVerifier.ts`)**
- Hiện tại: basic result verification
- Sau refactor: mandatory verification-before-completion pattern
- Check: command specified? ran? output confirms? ONLY THEN claim done

**Knowledge Synchronization (mới — prompt-based trong workflow)**
- Cuối mỗi workflow: check if behavior changed
- If yes: emit prompt to update relevant `.harness/knowledge/` files
- `harness validate` để confirm
- Không có code enforcer — đây là workflow step

**Governance (giữ + integrate)**
- Giữ nguyên governance flow
- WorkflowEngine tự động check: does this task type require proposal?
- Nếu yes: pause → prompt user → link to `harness proposal submit`

**Report (nâng cấp output của `harness run`)**
- Structured JSON output (khi `--json`)
- Human output: tasks completed, files changed, tests, issues, governance actions

### 7.4 Dependency Flow (unchanged, verified against current)

```
Adapters (CLI / MCP)
    → Platform
        → WorkflowEngine (new)
            → Planner (new)
            → ExecutionEngine (refactored)
                → Capabilities (existing)
                → Skills (new asset type via Repository)
        → Repository
        → Context
        → Governance (existing)
    → Capability
    → shared/
```

Dependency flow một chiều được giữ nguyên. `WorkflowEngine` nằm trong Execution domain, phụ thuộc vào Repository (cho skill loading) và Context (cho knowledge injection).

### 7.5 File Intent Map

New files to create (implementation reference — paths may be refined during implementation):

```
src/execution/
  workflow/WorkflowEngine.ts      — WorkflowEngine service
  workflow/WorkflowRegistry.ts    — load + cache workflow templates
  planner/Planner.ts              — brainstorm + decompose
  ledger/ProgressLedger.ts        — read/write .harness/run/*/progress.md
  scripts/task-brief.ts           — extract task N from plan to file
  scripts/review-package.ts       — generate git diff package to file
  runtime/ExecutionRuntime.ts     — refactor (existing)
  verifier/ResultVerifier.ts      — refactor (existing)

src/shared/
  skills/                         — built-in skill assets (.md files)
  templates/HARNESS_BOOTSTRAP_TEMPLATE.md — new
```
