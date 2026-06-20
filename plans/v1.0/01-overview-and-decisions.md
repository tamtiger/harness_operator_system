# 01 — Overview & Decisions

> Big picture, scope, North Star, breaking changes, all decisions.

[← Index](./README.md) | [Architecture →](./02-architecture.md)

---

## 1. North Star

harness-os v1.0 là một **local AI engineering OS** — cung cấp đúng context, đúng rules, đúng lúc — để agent làm việc deterministic mà không cần đọc mò codebase, **theo industry standards 2025-2026**.

Một harness phải đảm bảo agent KHÔNG:
- Tuyên bố "done" khi chưa verify
- Đụng code ngoài scope
- Mất context giữa các session
- Lặp lại sai lầm đã từng phạm

Harness OS này phải làm được điều đó **cho bất kỳ repo nào, qua bất kỳ IDE nào, ở local**.

---

## 2. Tại sao v1.0 (không phải v0.8)?

Plan v0.8 ban đầu chỉ là port content từ legacy. Sau review nghiêm túc với industry research, phát hiện:

1. **Frontmatter schema lệch industry** — không tuân theo agentskills.io spec (đã được Microsoft/Anthropic/Hugging Face/Augment Code adopt). Migration cần.
2. **AGENTS.md đã thành chuẩn** — donate cho Agentic AI Foundation Dec 2025. Cần align template.
3. **MCP spec 2025-06-18** — 2025 stdio transport pattern + tool naming conventions.
4. **Folder naming "thoughts"** — non-standard. Industry dùng "artifacts" hoặc "specs".
5. **Skill folder structure thiếu** — spec yêu cầu `scripts/, references/, assets/, evals/` subfolders.
6. **Stale detection edge cases** — git status --porcelain false positives chưa handle.

→ Quyết định: nâng version v0.7 → v1.0, đại tu toàn diện thay vì incremental v0.8.

---

## 3. Scope

### 3.1 IN scope (v1.0)

| Domain | Hành động |
|---|---|
| **Skill format** | Migrate frontmatter sang agentskills.io spec (6 fields). Add `scripts/, references/, assets/, evals/` folders cho mỗi skill. |
| **AGENTS.md** | Align template với Agentic AI Foundation spec (build/test commands, conventions, boundaries sections). |
| **MCP tools** | Audit 25 tools — đảm bảo snake_case, descriptions theo MCP 2025-06-18 spec. |
| **Workflow** | Rewrite `harness-workflow` SKILL.md v2.0 — thêm CTR Gate (pre-flight, nhúng vào Plan file) + 3 Artifact Formats (Plan/Research/Review) inline. |
| **Artifacts** | Rename `thoughts/` → `artifacts/`. Drop number prefix. 3 types: plans, research, reviews. CTR lưu trong Plan file (section `## CTR`). |
| **Content port** | C# rulebooks (9 files) + payment-hub project rulebook (13 files) + 4 workflow skills + 1 baseline skill. |
| **Repo summary** | `harness tree`, `harness summary`, `harness reindex` CLI + `repo_summary_read` MCP tool + tree-hash stale detection + auto-reindex. |
| **State architecture** | Hybrid per-repo minimal + global `~/.harness/`. Per-repo chỉ giữ config + scope + verify. Bulk state (progress, handoff, artifacts, evidence) move sang global `~/.harness/repos/{repo_id}/`. |
| **Doctor** | Mở rộng `harness doctor` — check skills frontmatter, AGENTS.md routing cross-ref, orphan DB/file detection. |
| **Export/Import** | `harness export [--repo . | --all]` + `harness import <zip>` cho portability cross-machine. |
| **Docs** | `docs/glossary.md`, `docs/rulebooks.md`, `docs/skill-format.md`, `docs/agents-md-spec.md`, `docs/state-architecture.md`. |

### 3.2 OUT of scope (defer Phase G)

- ctags `search_symbols` MCP tool
- Git hooks `harness install-hooks`
- FTS5 search trong audit/evidence
- `build_context` orchestrator (context assembler)
- Skill ranking / conflict resolution
- Generalize project-rulebook ngoài C#
- Integrations Jira/GitLab/Confluence
- Sub-agents
- Hooks system inside server
- `harness publish` (team sharing via git — cần thêm UX research)
- `sqlite-vec` semantic search (chỉ khi có nhu cầu thực sự)

---

## 4. Breaking changes vs v0.7

| Area | v0.7 | v1.0 | Migration |
|---|---|---|---|
| **Skill frontmatter** | `name, version, updated, applies_to, triggers, description` | `name, description` (required) + `license, compatibility, metadata, allowed-tools` (optional, agentskills.io spec) | `version, updated, applies_to, triggers` move into `metadata` field. `description` field gộp "what + when to trigger" max 1024 chars. |
| **Skill folder** | Flat: `skills/<name>/SKILL.md` | Structured: `skills/<name>/{SKILL.md, scripts/, references/, assets/, evals/}` (subfolders optional but supported) | Add empty subfolders for built-in skills. |
| **Artifacts location** | N/A (no convention) | `~/.harness/repos/{repo_id}/artifacts/{plans, research, reviews}/YYYYMMDD_HHMM_{name}.md` | Global path, created by `harness init`. |
| **State location** | Per-repo `.harness/` (progress.md, feature_list.json, handoff/) | Per-repo minimal (config.yaml, scope.yaml, verify.yaml) + global `~/.harness/repos/{repo_id}/` | Auto-migration on first `session_start` — move files to global, leave per-repo pointer. |
| **Repo identity** | `repo_hash` (path-based, changes if repo moves) | UUID in `.harness/config.yaml` (stable forever) | `harness init` generates UUID; existing repos get UUID on first session_start. |
| **DB schema** | 4 tables (sessions, tasks, instincts, audit_events) | 5 tables (+repos) | Additive migration via `runMigrations()`. |
| **MCP tool count** | 25 | 26 (+repo_summary_read) | New tool registered in `src/index.ts`. |
| **CLI commands** | `init, doctor, status, verify, skills, tasks, instincts, install-mcp` | + `tree, summary, reindex, export, import` (Phase E) | Additive, backward-compat. |
| **Workflow skill** | `harness-workflow` 5-phase lifecycle | + CTR Gate + 3 Artifact Formats inline | SKILL.md rewrite. Backward-compat. |

**Data migration:** Auto-migration on first `session_start` per repo. Agent transparent — MCP tools abstract storage location. Existing `~/.harness/harness.sqlite` preserved (additive schema change only).

---

## 5. Decisions log (Q1-Q9)

### Q1 — Feature template (DROP)
**Decision:** Drop hoàn toàn `feature-manifest.json + prompt-spec.md + JSON schema + CreateProduct exemplar`.
**Reason:** User feedback "thấy nó ko đúng". Vertical slice + manifest-as-contract pattern không phù hợp với cách user làm việc. Rule architecture/naming đã đủ ở rulebook layer.
**Date:** 2026-05-27

### Q2 — EPCC mapping (NO SKIP RULES)
**Decision:** Merge "Mapping với EPCC" (3-4 dòng) vào `harness-workflow` SKILL.md. KHÔNG port skip rules — luôn chạy harness workflow đầy đủ.
**Reason:** Skip rules tạo escape hatch không cần thiết. EPCC orthogonal với karpathy-guidelines, không cần skill `epcc` riêng.
**Date:** 2026-05-27

### Q3 — Repo summary + auto-refresh (ADD, REVISED)
**Decision:** Phase E gồm `harness tree` + `harness summary` + `harness reindex` CLI + MCP tool `repo_summary_read` + **tree-hash stale detection + auto-reindex**. Defer ctags T3 sang Phase G.
**Approach:** Tách thành 2 files: `repo-summary.md` (content) + `repo-summary.meta.json` (metadata: `generated_at`, `tree_hash`, `version`). MCP tool `repo_summary_read` check `tree_hash` → nếu stale → auto-trigger reindex → trả content. Agent gọi 1 tool, nhận content luôn — zero friction.
**tree_hash:** Hash of `git ls-tree -r HEAD --name-only` filtered cho code files. Chỉ stale khi file structure thay đổi (add/remove/rename), KHÔNG stale khi chỉ sửa content existing files (vì summary mô tả structure, không content).
**Reason:** Token saving 60-70% — agent đọc 1 file summary (~700 tokens) thay 5 lần read file (~15,000 tokens). Auto-reindex = agent không cần biết gì thêm, không cần gọi `harness reindex` manually.
**Date:** 2026-05-27 (revised 2026-05-28)

### Q4 — Rulebook clarity (RENAME + DOCUMENT)
**Decision:** Rename `templates/project-rulebook/` → `templates/csharp-project-rulebook/`. Document 3 khái niệm (rulebook layer / stack rulebook / project rulebook) trong `docs/rulebooks.md` + `docs/glossary.md`.
**Reason:** 3 khái niệm khác nhau bị lẫn trong v0.8 draft. Rename + doc rõ ràng để user/agent không nhầm.
**Date:** 2026-05-27

### Q5 — CTR Gate + Artifact merge (APPROACH C)
**Decision:** CTR Gate là pre-condition của START phase (không phải phase mới). Artifact Formats inline trong `harness-workflow/SKILL.md` (không tách MCP tool). Rename `thoughts/` → `artifacts/`.
**Reason:** Approach C giữ 5 phase backward-compat, CTR là hard gate (rõ hơn step 0 trong START), artifact format inline tiết kiệm token (1 skill biết hết). Drop `templates/thoughts/` + `src/tools/thought.ts` → 26 tools (thay vì 28).
**Date:** 2026-05-27

### Q6 — Artifact types (3 TYPES, not 4)
**Decision:** 3 artifact types: **Plan** (SELECT — chứa CTR inline), **Research** (EXECUTE optional), **Review** (VERIFY). Drop Ticket — redundant với CTR + Plan.
**Reason:** CTR block capture "what" (objective, scope, success criteria). Plan section "Background" capture "why". Plan section "Goals" = desired outcome. → Ticket content 100% covered bởi CTR + Plan. Không cần file riêng.
**Updated:** 2026-05-28

### Q6b — CTR lưu ở đâu + section naming (MERGED INTO PLAN)
**Decision:** CTR nhúng vào đầu file Plan (section `## CTR`). Plan dùng `## Background` (thay "Context") theo Google/HashiCorp/Resend convention. Không trùng tên.
**Reason:** Industry standard: Google Design Doc dùng "Background" cho narrative context. "CTR" giữ nguyên viết tắt (compact metadata block). Không dùng "Situation" (military term, lạ trong engineering docs).
**Flow:** CTR Gate tạo file Plan (chỉ Summary + CTR) → SELECT phase fill Background, Goals, Non-Goals, Approach, Tasks, Alternatives, Risks, Validation.
**Folders:** `.harness/artifacts/{plans, research, reviews}/` (3 folders, no tickets/).
**Date:** 2026-05-28

### Q7 — Frontmatter schema (AGENTSKILLS.IO COMPLIANT)
**Decision:** Migrate sang agentskills.io spec — `name + description` required, `license, compatibility, metadata, allowed-tools` optional. Custom fields (`version, updated, applies_to, triggers`) move vào `metadata`.
**Reason:** Industry adoption: Microsoft Agent Framework, Anthropic Claude Skills, Augment Code, Hugging Face đều dùng spec này. Tránh future incompatibility.
**Date:** 2026-05-27 (Q7 review finding)

### Q8 — Folder naming (ARTIFACTS, NO NUMBER PREFIX)
**Decision:** `.harness/artifacts/{plans, research, reviews}/` — drop number prefix.
**Reason:** Number prefix gợi ý sequence nhưng workflow harness-os không tuyến tính (research optional, có thể skip). Plain names match industry trend 2025 (Anthropic, ECC). Tickets folder dropped (Q6 — ticket redundant with CTR + Plan).
**Date:** 2026-05-27 (Q8 review finding)

### Q9 — Stale detection accuracy (TREE-HASH, OPTION B)
**Decision:** Stale check dùng **tree-hash** = SHA-256 of sorted `git ls-tree -r HEAD --name-only` output filtered cho code files (`*.{ts,tsx,js,jsx,cs,py,go,rs,java,kt}`). So sánh với `tree_hash` trong `repo-summary.meta.json`. Cache result 30s in-process.
**Options considered:**
- (A) `git rev-parse HEAD` — false positive khi commit docs
- **(B) Hash of file tree structure (name-only)** — chỉ stale khi add/remove/rename files ✓
- (C) Hash of `git ls-files -s` (content SHA) — quá sensitive, stale khi sửa 1 dòng
**Reason:** Repo summary mô tả *structure* (modules, entry points, tree), không mô tả *content*. Option B = chỉ stale khi structure thực sự đổi. Performance: `git ls-tree` ~50ms, hash ~1ms → cache 30s.
**Date:** 2026-05-27 (revised 2026-05-28)

### Q10 — State architecture (HYBRID: per-repo minimal + global bulk)
**Decision:** Adopt hybrid state architecture. Per-repo (git-tracked) chỉ giữ 3-4 files tối giản. Bulk state move sang global `~/.harness/repos/{repo_id}/`.
**Per-repo (git-tracked):**
- `.harness/config.yaml` — repo identity (UUID, repo_name, remote_url)
- `.harness/scope.yaml` — boundaries
- `.harness/verify.yaml` — build/test commands
- `.harness/project-rulebook/` — team-reviewed rules (exception: cần git PR review)
**Global (`~/.harness/repos/{repo_id}/`):**
- `progress.md`, `feature_list.json`, `handoff/last.json`
- `artifacts/{plans, research, reviews}/`
- `repo-summary.md` + `repo-summary.meta.json`
- `evidence/{task_id}/`
**Repo identity:** UUID generated once at `harness init`, stored in `config.yaml`. Stable forever (không đổi khi move repo). Match bằng UUID khi import trên máy mới.
**Industry precedent:** Git (`.git/` per-repo + `~/.gitconfig` global), VS Code (`settings.json` per-repo + `~/.config/Code/` global), Docker, Terraform.
**Reason:**
1. Repo cleanliness: 3-4 files thay vì 10+ files trong `.harness/`
2. Git noise eliminated: artifacts/progress/handoff không commit → clean git log
3. Cross-repo query: SQL trên single SQLite DB
4. Portability: `harness export/import` + UUID match
**Trade-offs:**
- ❌ Clone ≠ có state (cần `harness import`) → mitigated by export/import
- ❌ `~/.harness/` không git-tracked → mitigated by export + cloud sync docs
**Date:** 2026-05-28

---

## 6. Map: keep / port / drop (từ legacy)

### 6.1 PORT — High value

| Item legacy | Đích v1.0 | Lý do |
|---|---|---|
| 8 file rule C# + dotnet-abp-conventions | `rulebooks/csharp/*.md` (9 files) + `skills/csharp-baseline/SKILL.md` | Content C# độc lập, không reproducible |
| 3 repair strategies | `skills/csharp-repair/SKILL.md` (1 skill, body 3 sections) | Self-repair guides giá trị độc lập |
| 4 workflows C# (bug-fix, code-review, feature-implementation) | `skills/csharp-{bugfix, code-review, feature}/SKILL.md` (3 skills) | SOP per task type |
| Payment Hub 13 rule files + docs | `rulebooks/csharp/projects/payment-hub/**` | User confirm dùng nhiều repo |
| Thoughts templates (3 types) | **Inline** vào `skills/harness-workflow/SKILL.md` body | Approach B merge — token efficient |
| Glossary 25 terms | `docs/glossary.md` (giữ Vietnamese) + thêm harness-os terms | Tham khảo |
| `validate-harness.ps1` checks | `harness doctor --check-skills-frontmatter --check-routing` | Static validation |
| `generate-source-tree.ps1` | `harness tree` CLI (TS port) | Cross-platform |

### 6.2 ADAPT

| Item legacy | Đã có ở mới | Action |
|---|---|---|
| EPCC workflow | `harness-workflow` 5 phase | Add "Mapping với EPCC" section (3-4 dòng), no skip rules |
| `AGENT_MEMORY.md` | `progress_log` + `handoff_write/read` | KHÔNG port — note migration trong `docs/workflow.md` |

### 6.3 DROP

| Item legacy | Lý do |
|---|---|
| `feature-template.md` + manifest schema + prompt-spec template + CreateProduct | Q1: user "không đúng" |
| `project-onboarding.md` workflow | `harness init --project-rulebook NAME` thay thế |
| `agent-memory-workflow.md` | `progress_log` + `handoff` thay AGENT_MEMORY.md |
| `payment-hub/features/webhook-ingress-yc04/` | Feature artifact, đã drop theo Q1 |
| EPCC skip rules | Q2: luôn chạy workflow đầy đủ |
| `integrations/{jira,gitlab,confluence}.md` | FPT-specific, harness core stay neutral |
| `harness_v8` ideas (FTS5, ctags, build_context, contracts YAML) | Defer Phase G, không port preemptively |
| `auto-refresh-token.kiro.hook` | Tool-specific |

---

## 7. Branch & timeline

**Branch:** `feat/v1.0-overhaul`
**Commits:** 7 chronological per phase (A-F, with A split into A1+A2)
**Timeline:**
- Tuần 1: Phase A1 (foundation refactor) + Phase A2 (state architecture) + Phase B (port content)
- Tuần 2: Phase C (skill standardization) + Phase D (workflow upgrade)
- Tuần 3: Phase E (CLI utilities + repo summary + export/import) + Phase F (docs polish)
- Phase G: defer 2+ tuần sau v1.0 ship

**Total LOC estimate:** ~7,000 lines (TS + markdown). 50% markdown (rulebooks port + docs), 50% TS code (state layer + CLI + MCP tools + frontmatter migration).

**Risk:** State migration + frontmatter migration in same release. Mitigation: Phase A2 (state) is additive — old paths still work until all tools migrated. Migration is copy-first, delete-later.

---

## 8. Risks consolidated

| ID | Risk | Mitigation | Phase |
|---|---|---|---|
| R1 | Frontmatter migration breaks existing skills | Migration script + extensive smoke test | A |
| R2 | Industry spec changes mid-implementation | Pin to agentskills.io v1.0 (current as of 2026-05) | A |
| R3 | Stale detection false positives | Q9 — tree-hash (structure only) + cache 30s | E |
| R4 | Rulebook port loses link references | Find/replace pass + validation script | B |
| R5 | Workflow skill too long (>500 lines) | Split into multiple files if exceeds; current target ~350 lines | D |
| R6 | Scope creep | Strict Phase G defer list; no exceptions during v1.0 | All |
| R7 | State migration loses data | Auto-migration copies (not moves) first; original `.harness/` files preserved until verified; `harness doctor --fix` for orphans | A2 |
| R8 | `~/.harness/` lost on machine wipe | Document: `harness export --all` định kỳ + symlink to cloud-synced folder | E |
| R9 | Concurrent write contention on SQLite | WAL mode + `busy_timeout=5000` (already in v0.7) | — |

---

## 9. Success criteria — Definition of Done v1.0

| # | Criterion | Verification |
|---|---|---|
| 1 | All 8 existing skills + 5 new skills migrated to agentskills.io frontmatter spec | `harness doctor --check-skills-frontmatter` passes |
| 2 | `harness-workflow` SKILL.md v2.0 contains CTR Gate + 3 Artifact Formats (Plan/Research/Review) + EPCC mapping | grep section headers |
| 3 | 9 file `rulebooks/csharp/*.md` + 13 file `rulebooks/csharp/projects/payment-hub/*.md` exist with content | filesystem + line count check |
| 4 | `harness init` creates per-repo `.harness/config.yaml` (UUID) + global `~/.harness/repos/{repo_id}/artifacts/{plans,research,reviews}/` | integration test |
| 5 | `harness summary` generates `repo-summary.md` + `repo-summary.meta.json` (with `tree_hash`) in global path | parsing test |
| 6 | `repo_summary_read` auto-reindexes when `tree_hash` stale (file added/removed) and returns fresh content | git integration test |
| 7 | `harness doctor` catches frontmatter violations, routing violations, orphan DB/file inconsistencies | fixture-based test |
| 8 | All existing 43 tests pass + new tests added (target ≥60 tests) | `npm test` |
| 9 | Smoke test passes with 13 skills + 26 MCP tools | `npm run smoke` |
| 10 | `docs/glossary.md`, `docs/rulebooks.md`, `docs/skill-format.md`, `docs/agents-md-spec.md`, `docs/state-architecture.md` exist with content | filesystem check |
| 11 | State hybrid works: `session_start` resolves global path from `config.yaml` UUID; all tools read/write from global | integration test |
| 12 | `harness export --repo .` produces importable zip; `harness import <zip>` restores on fresh machine | manual test |

→ All 12 = v1.0 ready to ship.
