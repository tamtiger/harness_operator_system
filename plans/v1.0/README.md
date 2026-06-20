# harness-os v1.0 Plan — Index

**Version:** 1.0.0
**Ngày bắt đầu:** 2026-05-27
**Status:** APPROVED — sẵn sàng thực thi
**Repo nguồn (cho port):** `C:\FPT\MyProject\harness_coding_framework` (legacy, doc-only)
**Repo đích:** `C:\FPT\MyProject\harness_operator_system` (active, MCP server v0.7 → v1.0)

---

## Mục tiêu v1.0

Đại tu toàn bộ harness-os từ v0.7 → v1.0 — căn chỉnh theo industry standards 2025-2026, port giá trị từ legacy `harness_coding_framework`, và refactor architecture cho production-grade.

4 trụ cột:
1. **Industry compliance** — agentskills.io spec, AGENTS.md (Agentic AI Foundation), MCP 2025-06-18 spec
2. **Content port** — C#/ABP rulebooks + payment-hub project rulebook + workflow skills
3. **Workflow upgrade** — CTR Gate + 3 Artifact types + Repo summary với auto-reindex
4. **State architecture** — Hybrid per-repo minimal + global `~/.harness/` (clean repos, cross-repo query, portability)

---

## Cấu trúc plan (5 files)

| File | Mục đích | Khi nào đọc |
|---|---|---|
| **[00-archived-v0.8-draft.md](./00-archived-v0.8-draft.md)** | Plan v0.8 cũ + 6 brainstorm Q&A đã resolved | Tham chiếu lịch sử quyết định |
| **[01-overview-and-decisions.md](./01-overview-and-decisions.md)** | Tóm tắt v1.0, scope, North Star, breaking changes, decisions log | Đọc đầu tiên để hiểu big picture |
| **[02-architecture.md](./02-architecture.md)** | Kiến trúc đích: file layout, schemas, tool inventory, config | Khi cần hiểu HOW it's structured |
| **[03-phases.md](./03-phases.md)** | Phase A→F backlog với deliverables + verification | Khi thực thi từng phase |
| **[04-research-references.md](./04-research-references.md)** | Industry standards research, citations, comparison tables | Khi cần justify quyết định |

---

## Quick links

- **Bắt đầu thực thi?** → [03-phases.md](./03-phases.md) Phase A1
- **Tại sao schema này?** → [04-research-references.md](./04-research-references.md)
- **Decisions Q1-Q10?** → [01-overview-and-decisions.md](./01-overview-and-decisions.md) section "Decisions Log"
- **File nào ở đâu?** → [02-architecture.md](./02-architecture.md) "File Layout"
- **State architecture?** → [01-overview-and-decisions.md](./01-overview-and-decisions.md) Q10 + [02-architecture.md](./02-architecture.md) per-repo/global sections

---

## Branch & commit strategy

- **Branch:** `feat/v1.0-overhaul` (single branch)
- **Commit per phase:** A1, A2, B, C, D, E, F = 7 commits chronological
- **PR:** sau Phase F, gộp cả 7 commits

## Timeline

```
Tuần 1:  Phase A1 (foundation refactor) + Phase A2 (state architecture)
Tuần 2:  Phase B (port C# rulebooks) + Phase C (skill standardization)
Tuần 3:  Phase D (workflow upgrade) + Phase E (CLI + repo summary + export/import)
Tuần 4:  Phase F (docs + glossary + polish)
```

Phase G (defer) — chỉ làm sau khi v1.0 stable 2 tuần.
