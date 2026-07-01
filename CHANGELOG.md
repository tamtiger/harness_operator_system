# Changelog

Tất cả thay đổi đáng chú ý của dự án sẽ được ghi nhận tại đây.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.3.1] — 2026-07-01

### Changed

- **AGENTS.md**: Rewrite hoàn toàn — fix 5 vấn đề từ review:
  - Thêm `harness_submit_plan()` vào workflow (thiếu hoàn toàn trước đó)
  - AC-08 nâng thành Absolute Constraint #3 (không chỉ trong diagram)
  - Approval polling protocol rõ ràng (30s interval)
  - Thêm Section 5 Error Handling (FAILED, ESCALATED, scope violation)
  - Bỏ CHANGELOG/README rules (mâu thuẫn scope enforcement)
- **AGENTS.md §7**: Thêm reference tới CONTRIBUTING.md cho AI agent code trên Harness

### Added

- **CONTRIBUTING.md**: Tách dev conventions ra khỏi AGENTS.md (Section 4 cũ lẫn 2 đối tượng)

### Fixed

- AGENTS.md thiếu `harness_submit_plan()` — bước quan trọng nhất của Pull model
- CHANGELOG/README constraint mâu thuẫn với Scope Enforcement
- Section 4 trộn protocol (cho mọi repo) với dev rules (chỉ cho Harness)
- Thiếu xử lý FAILED state trong workflow
- Approval "Wait" không có protocol cụ thể

---

## [0.3.0] — 2026-07-01

### Changed

- **Plan v3.1**: Fix 9 vấn đề từ review
- **AC-06**: Đổi từ "cost tracking bắt buộc" → "duration + retry tracking bắt buộc" (Harness không có cost data trong Pull model)
- **Data Model**: Task thêm `agent`, `duration_ms`, `cost_self_reported`; Plan thêm `submitted_by`
- **Scope enforcement**: Check per-step tại 'DONE' thay vì cuối task (phát hiện sớm hơn)
- **Approval polling**: Ghi rõ poll-based protocol (30s interval), không blocking

### Added

- **ADR-012**: Pull Model primary Phase 1, Push Model deferred — quyết định lớn nhất v3
- **ADR-013**: Progress Report trước File Modification (protocol constraint + safety net)
- **ADR-006**: Duration/Retry tracking thay cost tracking trong Pull model
- **Pre-code Checklist** (Plan §20): 25 items chia theo Design/Technical/Environment/Knowledge/DoD
- **AGENTS.md Specification** (TECH §12): Ai tạo, nội dung tối thiểu, agent-specific variants
- **Cross-references**: Plan ↔ TECH Design với anchor links cụ thể
- **Table of Contents** trong TECH Design
- **MCP tool responses**: Chi tiết `scope_violation`, `snapshot_warning`, `ESCALATED` status
- **Retry escalation protocol**: `harness_report_completion()` trả ESCALATED khi vượt limit

### Fixed

- AC-06 mâu thuẫn với Pull model (không có cost data)
- Snapshot timing phụ thuộc thứ tự gọi chưa enforced → ADR-013 + safety net
- Approval gate thiếu polling protocol → documented poll-based 30s
- Toàn bộ ADR biến mất → khôi phục 7 ADR relevant + thêm 2 mới
- Pre-code Checklist biến mất → khôi phục với nội dung Pull model
- AGENTS.md chưa định nghĩa → TECH §12 specification đầy đủ
- Cross-reference biến mất → anchor links throughout
- Retry counting chưa rõ → documented trong MCP Server Design
- Scope check timing chưa rõ → per-step tại DONE

---

## [0.2.0] — 2026-07-01

### Changed

- **Architecture**: Chuyển từ Push model (Harness gọi AI) sang Pull model (AI gọi Harness qua MCP) cho Phase 1
- **Plan v3**: MCP Server là interface chính, AI Adapter chuyển sang Phase 2+
- **Planning Engine**: Từ "yêu cầu AI sinh plan" → "nhận plan từ AI, validate, approve/reject"
- **Runtime Engine**: Từ "điều phối AI execution" → "track state, checkpoint khi AI báo"
- **Engine interfaces**: `IPlanningEngine.submitPlan()` thay `generatePlan()`, `IRuntimeEngine.reportProgress()` thay `executePlan()`
- **TECHNICAL_DESIGN.md**: Viết lại hoàn toàn theo Pull model, bỏ AI Adapter khỏi Phase 1
- **AGENTS.md**: Thêm rules Update CHANGELOG + README, conventions single-package, no AI API keys

### Removed

- AI Adapter interface (chuyển sang Phase 2 Push model)
- Monorepo structure (single package)
- `.env.example` + ANTHROPIC_API_KEY (Harness không gọi AI)
- `pnpm-workspace.yaml`

---

## [0.1.0] — 2026-07-01

### Added

- **Project scaffold**: Single-package TypeScript project (tsup, Vitest, Biome)
- **Core types**: 11 type definition files covering Task, Plan, Knowledge, Verification, Context, Memory, Session, CodeIndex, Events, Failure, Config
- **Engine interfaces**: IKnowledgeEngine, IContextEngine, IPlanningEngine, IRuntimeEngine, IVerificationEngine, ICodeIndex, IMemoryStore, IAuditLogger
- **Zod schema**: `ProjectConfigSchema` with validation (namespace format, path traversal protection, defaults)
- **Utils**:
  - `scoreRisk()` — deterministic risk scoring from plan impact (AC-02)
  - `computeTokenBudget()` — token allocation by risk level (LOW→30K, CRITICAL→80K)
  - `generateId()`, `now()`, `estimateTokens()`, `contentHash()`
- **CLI commands**:
  - `harness doctor` — checks Node.js ≥20, Git, project.yaml, docs/
  - `harness init` — scaffolds project.yaml + docs/ templates
  - Placeholder commands: `index`, `task`, `plan review/approve/reject`, `verify`, `cost`
- **Tests**: 24 unit tests (risk-scoring, token-budget, config-schema, id utils)

### Architecture Decisions

- **No ANTHROPIC_API_KEY**: Harness does not call AI directly. AI Agents (Kiro, Antigravity, Claude Code, Cursor) call Harness via MCP tools.
- **Single package**: Flat `src/` structure instead of monorepo. One CLI tool doesn't need 4 packages with separate configs.
- **MCP-first**: Harness exposes tools via MCP Server. AI agents pull context on demand.
