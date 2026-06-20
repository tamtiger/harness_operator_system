# 04 — Research & References

> Industry standards, citations, comparison tables, and justifications for v1.0 design choices.

[← Phases](./03-phases.md) | [Index](./README.md)

---

## Mục đích

File này lưu giữ research làm cơ sở cho **mọi quyết định kiến trúc của v1.0**. Khi có ai hỏi "tại sao chọn cái này?" — câu trả lời ở đây với link tới nguồn industry chuẩn.

Content rephrased và summarized cho compliance với licensing.

---

## 1. agentskills.io Specification (Q7)

**Nguồn chính:** [agentskills.io/specification](https://agentskills.io/specification)
**Spec donor:** Anthropic (Claude Skills format), donated to community
**Adopters:** Microsoft Agent Framework, Hugging Face, Augment Code, OpenClaw, Veryfront, Apollo GraphQL

### 1.1 Frontmatter schema (chính thức)

| Field | Required | Constraint | Mục đích |
|---|---|---|---|
| `name` | Yes | 1-64 chars, lowercase + digit + hyphen, no leading/trailing/consecutive hyphens, must match parent dir | Unique skill identifier |
| `description` | Yes | 1-1024 chars, non-empty | Describes WHAT skill does AND WHEN to use (single field, not separated) |
| `license` | No | SPDX identifier hoặc reference to bundled file | Licensing |
| `compatibility` | No | Max 500 chars | Environment requirements (intended product, system packages, network access) |
| `metadata` | No | Arbitrary key-value | Extension point for custom fields |
| `allowed-tools` | No | Space-separated string | Pre-approved tools the skill may use (experimental) |

**Source:** [agentskills.io spec](https://agentskills.io/specification), confirmed via [Microsoft Learn (Agent Framework Skills)](https://learn.microsoft.com/en-us/agent-framework/agents/skills) and [Hugging Face SKILL.md format](https://huggingface.co/learn/context-course/unit1/skill-format).

Content was rephrased for compliance with licensing restrictions.

### 1.2 Standard directory structure

```
skill-name/
├── SKILL.md              # Required — manifest with frontmatter + body
├── scripts/              # Optional — executable scripts
├── references/           # Optional — extended documentation
├── assets/               # Optional — templates, images, data files
└── evals/                # Optional — evaluation test cases
    └── evals.yaml
```

**Source:** [explainx.ai standardization guide](https://explainx.ai/skills/supercent-io/skills-template/skill-standardization)

### 1.3 So sánh harness-os v0.7 vs spec

| Field | v0.7 (legacy) | Spec | v1.0 (target) |
|---|---|---|---|
| `name` | ✓ | ✓ Required | ✓ Required (unchanged) |
| `description` | ✓ | ✓ Required | ✓ Required (≤1024 chars, merge "what + when") |
| `version` | ✓ Top-level | ✗ Not in spec | Move to `metadata.version` |
| `updated` | ✓ Top-level | ✗ Not in spec | Move to `metadata.updated` |
| `applies_to` | ✓ Top-level | ✗ Not in spec | Move to `metadata.applies_to` |
| `triggers` | ✓ Top-level | ✗ Not in spec | Move to `metadata.triggers` |
| `license` | ✗ | Optional | Add (default null) |
| `compatibility` | ✗ | Optional | Add (use for stack hints) |
| `allowed-tools` | ✗ | Optional | Add (Phase G feature) |

**Migration policy:** v0.7 custom fields move to `metadata` field — backward-compat preserved, future-compat ensured.

### 1.4 Tại sao chọn agentskills.io spec?

1. **Industry adoption rộng:** Microsoft, Anthropic, Hugging Face, Augment Code đều adopt. Nguy cơ deprecation thấp.
2. **Vendor-neutral:** Không bị lock vào 1 IDE/agent tool.
3. **Progressive disclosure:** Cùng triết lý "load context khi cần" của harness-os.
4. **Extension via `metadata`:** Cho phép custom fields without breaking spec.
5. **VS Code linter, validators ecosystem:** Sẵn có tools để validate compliance.

---

## 2. AGENTS.md (Agentic AI Foundation)

**Nguồn:** [agentsmd.net](https://agentsmd.net) | [OpenAI Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
**Status:** Donated to Agentic AI Foundation December 2025 — open vendor-neutral standard
**Adopters:** OpenAI Codex, Cursor, Windsurf, Claude Code, GitHub Copilot, Gemini

### 2.1 Required sections per spec

1. **Project overview** — what this codebase does
2. **Build commands** — how to build
3. **Test commands** — how to test
4. **Conventions** — naming, formatting, style
5. **Boundaries** — what agent must not touch

**Source:** [agentsmd.net guide](https://agentsmd.net), [Codersera AGENTS.md complete guide 2026](https://codersera.com/blog/agents-md-complete-guide-2026/)

Content was rephrased for compliance with licensing restrictions.

### 2.2 Harness-os extensions

Harness-os bổ sung (không xung đột với spec):
- Routing table — skill → when to load
- Non-negotiable rules — hard constraints
- Pointer to `.harness/repo-summary.md` — fast context for agents
- Pointer to `.harness/skills/` — repo-specific skill overrides

### 2.3 Tại sao tuân theo AGENTS.md spec?

1. **Single source of truth:** Mọi major coding agent (Codex, Cursor, Claude, Copilot) đọc `AGENTS.md` mặc định. Không cần `CLAUDE.md`, `.cursorrules`, etc.
2. **Vendor-neutral:** Foundation governance = không bị control bởi 1 vendor.
3. **OpenAI Codex's own dogfooding:** Codex CLI scaffold `AGENTS.md` bằng GPT-5 trong khi chính nó được build với million+ LOC bởi agents — proven pattern.

**Source:** [OpenAI harness-engineering blog](https://openai.com/index/harness-engineering/) — they shipped 1M+ LOC product with agent team, AGENTS.md was central.

---

## 3. MCP (Model Context Protocol) Specification 2025

**Nguồn:** [modelcontextprotocol.io spec 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

### 3.1 Tool naming conventions

- `snake_case` — uniform across MCP ecosystem
- Short but descriptive (LLM uses name to decide which tool to invoke)
- Unique within server

**Source:** [Grizzly Peak Software MCP best practices](https://grizzlypeaksoftware.com/library/mcp-tool-creation-patterns-and-best-practices-sgph5f29)

### 3.2 Transport choices

| Transport | Use case | Notes |
|---|---|---|
| **stdio** | Local server (current) | JSON-RPC over stdin/stdout, newline-delimited |
| HTTP+SSE | Legacy remote | Replaced by Streamable HTTP in 2025 |
| Streamable HTTP | Production remote | Current standard for hosted MCP servers |

harness-os v1.0 = stdio (local only, no remote in scope).

**Source:** [Digital Applied MCP vocabulary 2026](https://www.digitalapplied.com/blog/mcp-tool-use-vocabulary-reference-guide-2026)

### 3.3 Tool primitives

MCP defines 3 primitives:
- **Tools** — functions the model can call (harness-os has 26)
- **Resources** — data the model can read
- **Prompts** — reusable templates

harness-os v1.0 only uses Tools. Resources + Prompts deferred (Phase G).

**Source:** [Composio MCP guide 2026](https://composio.dev/blog/mcp-server-step-by-step-guide-to-building-from-scrtch)

### 3.4 Audit + Output limits

- 8KB output truncation per tool response — protects context window
- Audit log to JSONL stream
- Loop guard for repeated calls

These are harness-os patterns following MCP best practices.

---

## 4. Artifact types — Industry standards (Q6 + Q6b)

### 4.1 Why 3 types (not 4) — Ticket dropped

Original plan had 4 types: Ticket, Plan, Research, Review.

**Analysis:** Ticket content (Problem, Desired Outcome, Scope, Acceptance Criteria) is 100% covered by:
- CTR block: objective, scope, success criteria, rules
- Plan `## Background`: why/problem statement
- Plan `## Goals`: desired outcome
- Plan `## Non-Goals`: out of scope

→ Ticket is redundant layer. Dropped.

**Final:** 3 artifact types: **Plan** (contains CTR), **Research**, **Review**.

### 4.2 Plan section naming — "Background" not "Context" (Q6b)

**Problem:** CTR has "Context" (operational metadata) AND Plan had "Context" (narrative why). Name collision.

**Industry research:**

| Company/Standard | Section for "why/history" | Section for "operational metadata" |
|---|---|---|
| Google Design Doc | **Background** | Context and scope (separate) |
| HashiCorp RFC | **Background** | Summary (separate) |
| Resend RFC | **Background** | Purpose (separate) |
| Amazon 6-pager | State of the business | Introduction |
| Rust RFC | **Motivation** | Summary |
| MADR (ADR) | Context and Problem Statement | — |

**Pattern:** Industry overwhelmingly uses **"Background"** for narrative context (why, history, current state). No one uses "Context" for both operational metadata AND narrative.

**Decision:** 
- `## CTR` = compact operational metadata (repo, stack, scope, rules) — keeps "CTR" as abbreviation
- `## Background` = narrative explanation (why, history) — follows Google/HashiCorp/Resend convention

No naming collision. Both terms are industry-standard in their respective roles.

**Source:** [Google Design Docs](https://www.industrialempathy.com/posts/design-docs-at-google/), [HashiCorp RFC template](https://www.hashicorp.com/how-hashicorp-works/articles/rfc-template), [Resend RFC process](https://resend.com/handbook/engineering/how-we-use-rfcs)

Content was rephrased for compliance with licensing restrictions.

### 4.3 Plan format (CTR + Google Design Doc lite)

**Format reference:**
- [Google Design Docs](https://www.industrialempathy.com/posts/design-docs-at-google/)
- [HashiCorp RFC template](https://www.hashicorp.com/how-hashicorp-works/articles/rfc-template)
- [Pragmatic Engineer RFC examples](https://newsletter.pragmaticengineer.com/p/software-engineering-rfc-and-design)

**Sections (synthesized from 3 sources + CTR merge):**
- Summary (1-2 sentences)
- CTR (operational metadata — repo, stack, scope, success criteria, rules)
- Background (narrative why, history — replaces "Context" to avoid collision with CTR)
- Goals
- Non-Goals (critical for scope clarity)
- Approach
- Tasks (checkboxes)
- Alternatives Considered (table format with pros/cons/why rejected)
- Risks / Mitigations
- Validation
- Open Questions

harness-os v1.0 Plan format = CTR block + Google Design Doc lite (subset of above, scaled for individual coding tasks).

Content was rephrased for compliance with licensing restrictions.

### 4.3 Research / ADR

**Format reference:**
- [MADR v4 (Markdown ADR)](https://adr.github.io/madr/)
- [Nygard original ADR](https://github.com/joelparkerhenderson/architecture-decision-record)

**Nygard ADR sections:** Title, Status, Context, Decision, Consequences
**MADR v4 sections:** Title, Status, Context and Problem, Decision Drivers, Considered Options, Decision Outcome, Pros/Cons of Decision

harness-os v1.0 Research format = research-first with optional ADR-style Decision section. When research concludes with a decision, record inline (no separate ADR file).

Content was rephrased for compliance with licensing restrictions.

### 4.4 Review / Code Review Output

**Format reference:**
- Conventional code review output: Summary → Must Fix (blocking) → Should Fix (non-blocking) → Observations
- Inspired by [PropelCode AI code review session provenance](https://www.propelcode.ai/blog/ai-code-review-agent-session-provenance)

harness-os v1.0 Review format adds **Verification checklist** to ensure agent self-reviewed against acceptance criteria from ticket.

### 4.6 Artifact types — Why these 3 (not more)

Considered but rejected:

| Artifact | Why not in v1.0 |
|---|---|
| **Ticket** | Redundant — CTR + Plan (Background/Goals/Non-Goals) covers 100% of ticket content |
| Session Summary | Already covered by `session_handoff` tool |
| Incident Report / Post-mortem | Ops concern, not coding workflow |
| Runbook | Ops concern |
| Release Notes / Changelog | CHANGELOG.md convention exists |
| Session Provenance | Covered by audit_log + progress.md |

**Source:**
- [PropelCode artifact-first coding agents](https://www.propelcode.ai/blog/artifact-first-coding-agents-files-vs-chat-memory)
- [TheLinuxCode artifacts in software 2026](https://thelinuxcode.com/artifacts-in-software-development-2026-turning-work-into-verifiable-reusable-evidence/)

---

## 5. Context Engineering (Q5 — CTR Gate justification)

**Term origin:** Replaces "prompt engineering" as defining skill of AI development in 2026.

**Sources:**
- [Martin Fowler — Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)
- [Taskade — Context Engineering 2026 Field Guide](https://www.taskade.com/blog/context-engineering)
- Gartner prediction (July 2025): "context engineering will appear in 80% of AI tools by 2028"

### 5.1 Context Engineering 3-layer model

Industry consensus on 3 layers an agent operates in:
1. **Context** — repo state, history, current understanding
2. **Task** — current intent, scope, success criteria
3. **Rules** — constraints, guardrails, conventions

→ harness-os v1.0 CTR Gate maps directly to this 3-layer model. Naming intentional.

Content was rephrased for compliance with licensing restrictions.

### 5.2 Pre-flight pattern

**Inspired by:**
- [Forte Group — Pre-Flight Checklist for AI Agents](https://www.fortegrp.com/insights/ai-agent-readiness-the-pre-flight-checklist-every-enterprise-needs-before-production)
- [AI Audit Checklist 2026 — 12-point pre-flight](https://aiauditchecklist.com/)
- [Preflight devpost — sprint checklist that runs itself](https://devpost.com/software/preflight-the-sprint-checklist-that-runs-itself)

→ Pre-flight gate before agent acts is established pattern. CTR Gate = harness-os specific instance.

### 5.3 Why CTR is hard gate (not optional)

From research:
- "AI ends up following loudest or most recent instructions while ignoring guardrails buried in middle of massive markdown file"
- Token efficiency: explicit Context/Task/Rules block at session start = focused attention

**Source:** [Stop Engineering Prompts, Start Engineering Context](https://medium.com/@muhammad.shafat/stop-engineering-prompts-start-engineering-context-a-guide-to-the-agent-skills-standard-bc8e2056f40a)

---

## 6. Folder structure — Why no number prefix (Q8)

**Considered:** `01-tickets, 02-research, 03-plans, 04-reviews` (legacy convention)

**Rejected because:**
- Number prefix gợi ý sequence
- Workflow harness-os không tuyến tính: research là optional, có thể skip
- Number không match thứ tự thực tế tạo (ticket → plan → research → review hoặc ticket → plan → review)

**Decision:** Plain names `tickets, plans, research, reviews`

**Industry comparison:**
| Source | Convention |
|---|---|
| ECC harness | `skills/, agents/, hooks/, rules/` (no numbers) |
| Anthropic Claude Skills | `skills/<name>/` (no numbers) |
| Folder Structure as Agent Architecture (arXiv 2025) | Numbered for stages, plain for capabilities |

→ harness-os v1.0 = plain names (capabilities, not stages).

**Source:** [arXiv 2603.16021 — Folder Structure as Agent Architecture](https://arxiv.org/html/2603.16021v2)

---

## 7. Stale Detection (Q9 — tree-hash Option B)

### 7.1 Why tree-hash (structure only, not content)

Repo summary describes *structure*: modules, entry points, directory tree. It does NOT describe file content. Therefore:
- Adding/removing/renaming a file → summary is stale (structure changed)
- Modifying content of existing file → summary still valid (structure unchanged)

This insight leads to Option B: hash of file paths only.

### 7.2 Options considered

| Option | Hash source | Stale when | Verdict |
|---|---|---|---|
| A | `git rev-parse HEAD` | Any commit | Too sensitive — commit docs → false stale |
| **B** | `git ls-tree -r HEAD --name-only` (filtered) | File add/remove/rename | ✓ Correct granularity |
| C | `git ls-files -s` (content SHA) | Any content change | Too sensitive — edit 1 line → stale |

### 7.3 Filter strategy

Filter `git ls-tree` output by code file extensions:
```
['.ts', '.tsx', '.js', '.jsx', '.cs', '.py', '.go', '.rs', '.java', '.kt']
```

Non-code files (md, yaml, json, lock, config) excluded — these don't affect module structure.

### 7.4 Auto-reindex vs manual

**v0.7 plan:** Tool returns `stale: true` + `suggest: "harness reindex"` → agent must decide to call reindex.
**v1.0 decision:** Tool auto-reindexes when stale → returns fresh content always. Agent has zero friction.

Trade-off: first call after structure change takes ~200-500ms longer (reindex). Acceptable — happens rarely (only when files added/removed).

### 7.5 Cache strategy

30-second in-process cache for `computeTreeHash()`:
- Agent calls `repo_summary_read` 100 times in 30s → 1 git invocation
- TTL 30s short enough that real changes propagate quickly
- Memoize by `repoPath` key

**Sources:**
- [Stack Overflow — git status --porcelain returns identical files](https://stackoverflow.com/questions/78426712/git-status-porcelain-return-file-difference-that-are-identical) (why not use porcelain)
- [Stack Overflow — Why shouldn't I use porcelain to detect changes](https://stackoverflow.com/questions/47235361/why-shouldnt-i-use-this-porcelain-git-command-to-tell-if-my-repo-has-any-change)

---

## 8. Token Efficiency (Q3 — Repo summary justification)

### 8.1 Math on agent token cost

| Action | Tokens |
|---|---|
| `read_file("Service.cs")` 1 file 200 lines | ~3,000 |
| Agent reads 5 files to understand structure | ~15,000 |
| `grep` returns 50 lines context | ~500 |
| Single `repo-summary.md` (~80 lines) | ~700 |

**Saving:** Replace 5 file reads with 1 summary read = ~14,300 tokens saved per session = ~95% reduction for navigation.

**Source corroboration:**
- [PropelCode — Files Beat Chat Memory](https://www.propelcode.ai/blog/artifact-first-coding-agents-files-vs-chat-memory)
- [MindStudio — Scout Pattern for Pre-Screening Context](https://www.mindstudio.ai/blog/scout-pattern-ai-agents-context-pre-screening/)

### 8.2 Why not full ctags index in v1.0

Considered Tier 3 (ctags symbol search) but deferred:
- ctags is external dep — user must install (`brew install universal-ctags` / `choco install ctags`)
- Adds complexity (parsing `.tags` file, query API)
- Tier 2 (summary) already gives 60-70% saving
- Marginal value of Tier 3 unclear without usage data

→ Phase G if proven needed.

---

## 9. Skill content — Karpathy-inspired principles

**Reference:** [karpathy-skills repo](https://github.com/multica-ai/andrej-karpathy-skills)

4 core principles:
1. **Think Before Coding** — state assumptions, ask if uncertain
2. **Simplicity First** — minimum code, no speculative features
3. **Surgical Changes** — touch only what you must
4. **Goal-Driven Execution** — define success, iterate until verified

→ Embedded in `skills/karpathy-guidelines/SKILL.md`. v1.0 keeps this skill unchanged (only frontmatter migration).

Content was rephrased for compliance with licensing restrictions.

---

## 10. Five-subsystem harness model

**Reference:** [learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering)

5 subsystems:
1. **Instructions** — what to do, how to behave
2. **State** — persistent memory across sessions
3. **Verification** — proof of correctness
4. **Scope** — boundaries
5. **Session Lifecycle** — START → SELECT → EXECUTE → VERIFY → WRAP UP

harness-os v1.0 implements all 5 + adds 6th:
6. **Continuous Learning** (instincts) — from ECC

**Source attribution:**
- 5 subsystems pattern: learn-harness-engineering L02
- Continuous learning: [ECC harness](https://github.com/affaan-m/ECC)

Content was rephrased for compliance with licensing restrictions.

---

## 11. EPCC (Explore-Plan-Code-Check)

**Reference:** legacy `harness_coding_framework/thoughts/workflows/epcc.md`

4 phases:
1. **Explore** — understand requirements, research
2. **Plan** — break down into tasks
3. **Code** — implement with TDD
4. **Check** — verify, review, merge

→ harness-os v1.0 maps EPCC to 5-phase lifecycle (1-line in `harness-workflow` SKILL.md):
- Explore + Plan = START + SELECT
- Code = EXECUTE
- Check = VERIFY + WRAP UP

**Decision (Q2):** No skip rules — always run full lifecycle. CTR Gate has its own skip rule for trivial tasks.

---

## 12. Comparison: harness-os vs other harness frameworks

| Feature | harness-os v1.0 | ECC | learn-harness-engineering | claude-code |
|---|---|---|---|---|
| Skill format | agentskills.io spec | Custom | None | Anthropic Claude Skills (= agentskills.io) |
| MCP server | ✓ stdio, 26 tools | ✗ | ✗ | ✗ |
| AGENTS.md compliance | ✓ Foundation spec | Partial | Partial | ✓ |
| Cross-IDE | ✓ 8 IDEs | ✓ 4 IDEs | ✗ | Claude only |
| Continuous learning (instincts) | ✓ | ✓ | ✗ | ✗ |
| Repo summary | ✓ with stale detection | ✗ | ✗ | ✗ |
| Verification pipeline | ✓ verify_run | ✗ | ✓ | Partial |
| Scope enforcement | ✓ scope_check | Partial | ✓ | ✗ |

**Differentiation:** harness-os = MCP-first + multi-stack + production-grade verification. Most compliant với industry specs trong 2026.

**Source:**
- ECC: [github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)
- learn-harness-engineering: [github.com/walkinglabs/learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering)
- Anthropic harness design: [anthropic.com/engineering/harness-design-long-running-apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)

---

## 13. Open questions for future research (Phase G)

| Topic | Why defer | Source to revisit |
|---|---|---|
| Skill ranking with `priority/requires/suggests/excludes` | No usage data on conflicts yet | Veryfront, Microsoft Agent Framework conflict resolution |
| Sub-agents | Single-user tool, no multi-agent need yet | [Anthropic 3-agent architecture](https://www.anthropic.com/engineering/harness-design-long-running-apps) |
| FTS5 cross-session search | Audit log small enough for grep | hermes-agent state.py pattern |
| `build_context` orchestrator | Repo summary covers 60-70% case | harness_v8 plan in legacy |
| Hooks system inside MCP server | IDE adapters provide hook templates | ECC reentrancy guard pattern |
| `harness publish` (team sharing) | Need UX research on friction | Git LFS, Obsidian Publish patterns |
| `sqlite-vec` semantic search | No proven need yet | sqlite-vec extension docs |

---

## 14. State Architecture — Hybrid Model (Q10)

### 14.1 Industry precedent

| Pattern | Examples | Pros | Cons |
|---|---|---|---|
| Per-repo only | `.github/`, `.vscode/` | Self-contained, git-tracked | Pollute repo, duplicate structure |
| Global centralized | `~/.config/` | Clean repo, cross-repo query | Not portable, lost on machine wipe |
| **Hybrid** | Git, VS Code, Docker, Terraform | Best of both | 2 locations, needs abstraction |

Git uses `.git/` per-repo + `~/.gitconfig` global. VS Code uses `settings.json` per-repo + `~/.config/Code/` global. Terraform uses `.terraform/` per-project + `~/.terraform.d/` global. harness-os follows this established pattern.

### 14.2 Why UUID (not path hash)

Path-based hash (`sha256(repo_path)`) changes when user moves repo directory. UUID generated once at `harness init` is stable forever. When importing on a new machine, UUID in `config.yaml` (git-tracked) matches the imported state — no re-linking needed.

### 14.3 Repo summary — split file + auto-reindex

**Problem with v0.7 approach (frontmatter in .md):**
- Parsing YAML frontmatter from markdown is slower than reading JSON
- Mixing metadata with content makes the file harder to cache/invalidate
- Agent had to check `stale` flag and decide whether to call `harness reindex`

**v1.0 approach:**
- `repo-summary.md` — pure content, human-readable
- `repo-summary.meta.json` — machine metadata (`tree_hash`, `generated_at`)
- MCP tool auto-reindexes when stale → agent always gets fresh content, zero friction

**tree_hash (Option B):** Hash of sorted code file paths from `git ls-tree -r HEAD --name-only`. Only changes when files are added/removed/renamed. Does NOT change when content is modified — because summary describes *structure* (modules, entry points, tree), not *content*.

### 14.4 Trade-offs

| Aspect | Per-repo (v0.7) | Hybrid (v1.0) |
|---|---|---|
| Repo cleanliness | ❌ 10+ files in `.harness/` | ✅ 3-4 files |
| Git noise | ❌ artifacts → commit noise | ✅ artifacts not git-tracked |
| Portability | ✅ clone = có state | ❌ cần `harness export/import` |
| Cross-repo query | ❌ navigate từng repo | ✅ SQL trên single DB |
| Backup | ✅ git backup | ⚠️ cần backup `~/.harness/` |
| Team sharing | ✅ git push = shared | opt-in qua `harness publish` (Phase G) |

| Con | Mitigation |
|---|---|
| State lost on new machine | `harness export/import` + UUID match from config.yaml |
| `~/.harness/` not git-tracked | Document: symlink to cloud-synced folder or periodic `harness export --all` |
| DB orphan if files deleted manually | `harness doctor --check-orphans --fix` |

Content was rephrased for compliance with licensing restrictions.

---

## 15. Citations summary (deduplicated)

| Source | Used for |
|---|---|
| [agentskills.io/specification](https://agentskills.io/specification) | Frontmatter schema |
| [agentsmd.net](https://agentsmd.net) | AGENTS.md template |
| [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) | MCP spec |
| [adr.github.io/madr](https://adr.github.io/madr/) | MADR ADR template |
| [industrialempathy.com — Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) | Plan format |
| [martinfowler.com — Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) | CTR 3-layer model |
| [openai.com — Harness Engineering](https://openai.com/index/harness-engineering/) | AGENTS.md scaffolding |
| [github.com/joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | Nygard ADR |
| [propelcode.ai — Artifact-First Coding Agents](https://www.propelcode.ai/blog/artifact-first-coding-agents-files-vs-chat-memory) | Token efficiency |
| [github.com/multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Karpathy guidelines |
| [github.com/walkinglabs/learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) | 5 subsystems |
| [github.com/affaan-m/ECC](https://github.com/affaan-m/ECC) | Continuous learning, IDE adapters |
| [anthropic.com — Harness Design](https://www.anthropic.com/engineering/harness-design-long-running-apps) | Multi-agent harness inspiration |

All quoted content rephrased and summarized per licensing requirements (≤30 verbatim words per source).
