# Harness Refactoring Plan — Part 2: Pattern Analysis & Gap Analysis

> **Nguồn:** Verified từ obra/superpowers source code và Harness source code tại `C:\FPT\MyProject\harness_operator_system`

---

## 4. Reusable Pattern Analysis

### Pattern 1: Skill-as-Behavioral-Contract

**Vấn đề giải quyết:** Agent không có memory về best practices giữa các session. Mỗi lần phải remind lại.

**Cách hoạt động:** Skill markdown được inject vào context at session start. Agent đọc và internalize. "If brainstorming skill applies, you MUST invoke it" — không có runtime enforcement, chỉ có well-designed prompt pressure.

**Tại sao work:** LLM là text processors. Text đủ rõ ràng + áp lực đủ mạnh (rationalization tables, red flags, iron laws) → compliance cao hơn ad-hoc instructions.

**Harness nên:** **Adopt** — Tạo asset type mới `skill` song song với `workflow`. Skill trong Harness = markdown file với YAML frontmatter giống Superpowers, được inject vào context qua `harness context`.

---

### Pattern 2: Session-Start Context Injection

**Vấn đề giải quyết:** Agent không biết nó có superpowers khi session bắt đầu.

**Cách hoạt động:** `hooks/session-start` bash script đọc `using-superpowers/SKILL.md`, escape, output JSON `additionalContext`. Platform inject vào system prompt.

**Tại sao work:** Agent nhận context TRƯỚC user message đầu tiên → skill index có sẵn ngay.

**Harness nên:** **Adapt** — Harness đã có `harness context` command và AGENTS.md injection. Cần thêm cơ chế inject skill index vào AGENTS.md template hoặc vào session-start hook (nếu target Claude Code). Harness cũng cần expose `harness session-init` output cho platforms hỗ trợ hooks.

---

### Pattern 3: Brainstorm → Plan → Execute Separation

**Vấn đề giải quyết:** Agent jump thẳng vào code mà không hiểu requirements. Dẫn đến xây nhầm thứ.

**Cách hoạt động:**  
- `brainstorming`: Explore → Questions → 2-3 approaches → Design sections → User approval → Write spec
- `writing-plans`: Spec → File structure → Task decomposition (2-5 min each) → No placeholders  
- Execution: Chỉ bắt đầu sau khi plan complete và user confirm

**Tại sao work:** Separation of concerns giữa thinking và doing. Spec được commit trước khi code được viết — design artifact tồn tại độc lập với session context.

**Harness nên:** **Adopt** — Đây là chính xác workflow mà `harness run "task"` cần follow. Phase 1: brainstorm (dùng Harness knowledge base + context). Phase 2: plan. Phase 3: execute.

---

### Pattern 4: Fresh Subagent Per Task

**Vấn đề giải quyết:** Context contamination — agent nhớ các implementation decisions từ task trước, bị anchored vào những assumption sai.

**Cách hoạt động:** Controller không bao giờ pass session history cho implementer. Controller construct EXACTLY những gì subagent cần: task brief path, report path, interfaces, global constraints.

**Tại sao work:** Fresh context = unbiased execution. Subagent không có sunk cost nên không rationalize bad decisions.

**Harness nên:** **Adopt** — `subagent-driven-development` là execution model target cho `harness run`. Mỗi task trong plan = một subagent dispatch với context curated bởi controller.

---

### Pattern 5: Two-Stage Review (Spec + Quality)

**Vấn đề giải quyết:** Code review thường chỉ check quality, bỏ qua spec compliance. Result: code đẹp nhưng sai requirements.

**Cách hoạt động:** Task reviewer phải report TWO verdicts: (1) Spec compliance ✅/❌ — all requirements met? (2) Code quality ✅/❌ — well built? Both required before proceeding.

**Tại sao work:** Tách biệt "did we build the right thing" vs "did we build it right". Cả hai đều mandatory.

**Harness nên:** **Adopt** — Harness conformance suite đã verify behavior, nhưng chưa có per-task two-stage review loop. Cần thêm vào workflow execution model.

---

### Pattern 6: File Handoff Pattern

**Vấn đề giải quyết:** Pasting large artifacts (diff, task brief) vào controller context làm tăng context size. Một session thực tế hit 42k chars pasted history.

**Cách hoạt động:** `scripts/task-brief PLAN N` → print path. `scripts/review-package BASE HEAD` → print path. Subagent đọc file thay vì nhận paste.

**Tại sao work:** Controller context chỉ chứa paths, không chứa content. Content nằm trong files — persistent và readable on demand.

**Harness nên:** **Adopt** — `harness run` controller nên write task briefs và review packages ra `.harness/run/` directory, pass paths thay vì content.

---

### Pattern 7: Durable Progress Ledger

**Vấn đề giải quyết:** Context compaction xóa memory của controller → re-dispatch completed tasks (expensive, wrong).

**Cách hoạt động:** `.superpowers/sdd/progress.md` — mỗi task complete → append một dòng. Git-tracked. Tồn tại qua compaction. Controller check ledger đầu tiên khi resume.

**Tại sao work:** Git history + ledger = complete source of truth. "Trust the ledger and git log over your own recollection."

**Harness nên:** **Adopt** — Add `.harness/run/<session-id>/progress.md` vào execution model. ExecutionRuntime cần persist state ra file, không chỉ in-memory statusMap.

---

### Pattern 8: Iron Law + Rationalization Table

**Vấn đề giải quyết:** Agent rationalize ra khỏi rules dưới pressure ("this is simple", "TDD is overkill", "emergency").

**Cách hoạt động:** Mỗi rule-enforcing skill có: Iron Law (one-liner absolute), Rationalization Table (excuse → reality), Red Flags list (STOP signals), "violating letter = violating spirit" principle.

**Tại sao work:** Anti-fragile design — skill được written AFTER observing actual rationalizations agents use. Each counter is data-driven.

**Harness nên:** **Adopt** — Harness skills/workflows cần structure này, đặc biệt cho: validation-before-done, governance-required-check, knowledge-first principle.

---

### Pattern 9: Git Worktree Isolation

**Vấn đề giải quyết:** Feature work trên main branch → dirty state, conflicts, context bleed.

**Cách hoạt động:** `using-git-worktrees` detect existing isolation → prefer native tools → fallback to `git worktree add` → setup deps → verify clean baseline.

**Tại sao work:** Independent workspace per feature = no cross-contamination, easy discard if wrong direction.

**Harness nên:** **Adapt** — Harness không cần own worktree management (git handles it), nhưng `harness run` có thể optionally create worktree hoặc verify isolation exists trước khi execute.

---

### Pattern 10: Skill Description = Triggering Condition Only

**Vấn đề giải quyết:** Descriptions that summarize workflow → agent follows description instead of reading skill body. Result: partial compliance.

**Cách hoạt động:** `description` YAML field describes ONLY when to use, NOT what the skill does. Example: "Use when implementing any feature or bugfix, before writing implementation code" — không nhắc tới TDD cycle.

**Tại sao work:** Agent reads description to decide which skills to load. If description summarizes workflow, agent shortcuts. If description only has trigger, agent MUST read skill body for instructions.

**Harness nên:** **Adopt** — Harness skill asset `description` field phải follow cùng convention: trigger conditions only, no workflow summary.

---

## 5. Harness Gap Analysis

### 5.1 Strengths (Giữ nguyên)

| Strength | Source | Giá trị |
|---|---|---|
| Knowledge Base (21 spec files) | `knowledge_base/` | Ground truth cho mọi AI agent làm việc trong repo |
| Governance System | `src/governance/` | Proposal → Review → Approve → Promote workflow có human gate |
| Capability Registry | `src/capability/` | 27 built-in capabilities, extensible, 6-step registration |
| Context Assembly | `src/context/` | Relevance ranking, token budget, filter by task |
| Repository Validation | `src/repository/validation/` | Structure validation, manifest validation |
| Conformance Suite | `tests/conformance.test.ts` | 30 Level-3 test cases |
| Multi-AI support | AGENTS.md, AGENTS_TEMPLATE.md | Works with any AI tool |
| MCP server | `src/adapters/mcp/server.ts` | 4 tools, stdio transport |
| Shared+Local Harness | Resolution engine | Organisation-level + project-level knowledge merge |

### 5.2 Weaknesses (Cần fix)

| Weakness | Evidence | Impact |
|---|---|---|
| `harness run` không có workflow | `src/adapters/cli/commands/run.ts` (1249 bytes) | Agent nhận task nhưng không có structure để follow |
| Execution is capability-dispatch only | `ExecutionRuntime.ts` — không có planning phase | Thiếu: brainstorm → plan → execute lifecycle |
| No Skill asset type | Asset types: rule, prompt, workflow, template, knowledge — không có `skill` | Không thể define behavioral contracts như Superpowers |
| No subagent pattern | Không có orchestrator-subagent separation | Agent tự execute mọi thứ trong một context = drift |
| In-memory execution state | `ExecutionServiceImpl` dùng `Map<string, TaskState>` | State mất khi process restart, không có durability |
| No progress ledger | Không có `.harness/run/progress.md` | Cannot resume after context compaction |
| AGENTS_TEMPLATE.md hardcodes tags | `src/adapters/cli/commands/context.ts` | Context thường không relevant, hardcode `['auth','implementation']` |
| No design/brainstorm phase | Không có skill tương đương | Agent jump straight to code |
| No review loop in workflow | Execution một chiều, không có check-in | Quality không được verify systematically |
| No task decomposition | `writing-plans` analog không tồn tại | Tasks không được breakdown thành TDD steps |
| Verification is implicit | Không có `verification-before-completion` skill | Agent claim done mà không run verification commands |
| MCP chỉ có 4 tools | `harness_run`, `harness_validate`, `harness_proposal_list`, `harness_proposal_submit` | Không đủ cho workflow runtime integration |

### 5.3 Missing Runtime Capabilities

| Missing Capability | Superpowers Equivalent | Priority |
|---|---|---|
| Behavioral skills (SKILL.md) | `skills/*/SKILL.md` | Critical |
| Session-start context injection | `hooks/session-start` | Critical |
| Brainstorming workflow | `skills/brainstorming/SKILL.md` | High |
| Implementation planning | `skills/writing-plans/SKILL.md` | High |
| Subagent orchestration | `skills/subagent-driven-development/SKILL.md` | High |
| Durable progress ledger | `.superpowers/sdd/progress.md` | High |
| File handoff scripts | `scripts/task-brief`, `scripts/review-package` | Medium |
| Two-stage review gate | Task reviewer (spec + quality) | High |
| Verification gate | `skills/verification-before-completion/SKILL.md` | High |
| TDD discipline | `skills/test-driven-development/SKILL.md` | High |
| Debug methodology | `skills/systematic-debugging/SKILL.md` | Medium |
| Branch completion | `skills/finishing-a-development-branch/SKILL.md` | Medium |

### 5.4 Missing Workflow Capabilities

| Missing | Description | Priority |
|---|---|---|
| Workflow Engine | Central dispatcher that routes `harness run` through phases | Critical |
| Planner | Takes task → generates TDD-style task breakdown | Critical |
| Workflow templates | Feature dev / Bug fix / Refactor / Review / Audit / Docs | High |
| Per-workflow skill requirements | Which skills must be active for which workflow | High |
| Workflow selection | Auto-detect from task description | Medium |

### 5.5 CLI Limitations

| Limitation | KI Reference | Priority |
|---|---|---|
| `harness run` không có planning phase | No existing KI | Critical |
| `harness context` hardcodes tags `['auth','implementation']` | KI-006 | High |
| `harness init --force` broken | KI-003 | Medium |
| `harness version` hardcoded | KI-002 | Low |
| Missing `proposal reject/promote/request-changes` | KI-007 | Medium |
| No `harness workflow list/run` | No existing KI | Critical |
| No `harness skill list` | No existing KI | High |
| `harness run` output không có structured report | No existing KI | High |

### 5.6 MCP Limitations

| Limitation | Description | Priority |
|---|---|---|
| `harness_run` không có workflow integration | Calls execution directly | Critical |
| No workflow introspection tool | Cannot query available workflows | High |
| No skill listing tool | Cannot list available skills | High |
| No progress/status tool | Cannot query run progress | Medium |
| `harness_proposal_approve` intentionally excluded | Human-only action (correct) | N/A |

### 5.7 Knowledge Integration Limitations

| Limitation | Description | Priority |
|---|---|---|
| Context không auto-inject skills | Skills cần manually specify in `harness context --task` | High |
| Knowledge không được ranked by workflow phase | Tất cả knowledge treated equal | Medium |
| Skill asset type không tồn tại | Cannot store behavioral contracts in knowledge base | Critical |
| AGENTS.md không liệt kê available skills | AI agent không biết skills có sẵn | High |

### 5.8 Governance Limitations

| Limitation | Description | Priority |
|---|---|---|
| Governance không integrate với workflow | `harness run` không tự động check proposal requirements | Medium |
| No workflow-level governance | Không thể require approval cho specific workflow types | Low |
| Proposal format không có workflow section | Proposals không chỉ rõ affected workflow | Low |
