# Harness Platform — Implementation Plan

**Version:** 2.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11  
**Dựa trên:** Knowledge Base v4.0

---

## Nguyên tắc triển khai

**Interface-first.** M0 ổn định toàn bộ contracts trước khi bất kỳ domain nào được implement.

**Vertical slice.** Mỗi milestone tạo ra một hệ thống có thể chạy được. Sau M1 có thể chạy `harness validate`. Sau M7 có thể chạy `harness run` end-to-end.

**Dependency-driven.** Milestone chỉ bắt đầu khi tất cả dependency đã pass DoD.

**Test liên tục.** Unit test và integration test viết cùng code, không để cuối milestone.

**Review gate.** Không merge khi chưa qua: AI self-review → static analysis → tests → human approval.

---

## Dependency Graph

```
M0 Foundation
(Shared types, interfaces, error model, contracts)
        │
        ▼
M1 Repository Discovery
(Discovery, manifest parsing, validation)
        │
        ▼
M2 Asset Loading
(Asset loader, resolution, context building)
        │
        ├─────────────────────┐
        ▼                     ▼
M3 Context Builder      M4 Capability Registry
(filter, rank, budget)  (registry, 27 built-ins)
        │                     │
        └──────────┬──────────┘
                   ▼
          M5 Execution Runtime
          (state machine, scheduler, retry)
                   │
                   ├─────────────────────┐
                   ▼                     ▼
          M6 Platform              M8 Governance
          (orchestration)          (proposal, audit)
                   │
                   ▼
          M7 CLI End-to-End
                   │
                   ▼
          M9 MCP Adapter
                   │
                   ▼
          M10 Conformance Suite
                   │
                   ▼
          M11 Production Hardening
```

**Critical path:** M0 → M1 → M2 → M5 → M6 → M7 → M10  
**Parallel:** M3 ‖ M4 (sau M2), M6 ‖ M8 (sau M5)

---

## Milestone Overview

| File | Milestone | Deliverable có thể chạy | Effort | Prerequisite |
|------|-----------|------------------------|--------|--------------|
| [M0](./M0_FOUNDATION.md) | Foundation | Contracts ổn định, 0 compile errors | 2 ngày | — |
| [M1](./M1_REPOSITORY_DISCOVERY.md) | Repository Discovery | `harness init`, `harness validate` | 3 ngày | M0 |
| [M2](./M2_ASSET_LOADING.md) | Asset Loading | `harness status` (assets loaded) | 3 ngày | M1 |
| [M3](./M3_CONTEXT_BUILDER.md) | Context Builder | `harness context` (inspect context) | 2 ngày | M2 |
| [M4](./M4_CAPABILITY_REGISTRY.md) | Capability Registry | `harness capability list` | 3 ngày | M0 *(parallel M2)* |
| [M5](./M5_EXECUTION_RUNTIME.md) | Execution Runtime | `harness run` (basic) | 3 ngày | M3 + M4 |
| [M6](./M6_PLATFORM.md) | Platform | `harness run` full, `harness doctor` | 3 ngày | M5 |
| [M7](./M7_CLI.md) | CLI End-to-End | Tất cả CLI commands | 2 ngày | M6 |
| [M8](./M8_GOVERNANCE.md) | Governance | `harness proposal` workflow | 2 ngày | M5 *(parallel M6)* |
| [M9](./M9_MCP.md) | MCP Adapter | MCP server, tool calls | 2 ngày | M7 |
| [M10](./M10_CONFORMANCE.md) | Conformance Suite | conformance-report.json Level 2 | 3 ngày | M7 + M8 + M9 |
| [M11](./M11_HARDENING.md) | Production Hardening | Production-ready release | 3 ngày | M10 |

**Tổng:** ~31 ngày (1 engineer) · ~20 ngày (2 engineers với parallel)

---

## Cấu trúc mỗi Milestone

Mỗi file milestone tuân theo cấu trúc sau:

```
## Objective
## Dependencies
## Vertical Slice (cái gì chạy được sau milestone này)
## Interfaces (contract cần implement)
## Tasks + Subtasks
## Acceptance Scenarios
## Unit Tests
## Integration Tests
## Definition of Done
## Review Gate
```

---

## Review Gate Process (áp dụng cho mọi milestone)

```
Code hoàn thành
      ↓
AI self-review: spec compliance check
      ↓
tsc --noEmit + eslint (0 errors)
      ↓
dependency-cruiser (0 violations)
      ↓
Unit tests pass
      ↓
Integration tests pass
      ↓
Human review (checkpoint quan trọng)
      ↓
Approve → Merge to main
```

---

## Testing Strategy

| Loại test | Viết khi nào | Tool |
|-----------|-------------|------|
| Unit test | Cùng lúc với code | vitest |
| Integration test | Cuối mỗi milestone | vitest |
| Contract test | M0 (mock implementations) | vitest |
| Conformance test | M10 | vitest (custom suite) |
| Performance benchmark | M11 | vitest bench |
| Security test | M11 | custom scripts |

---

## Toolstack khuyến nghị

```
Runtime:    Node.js >= 20
Language:   TypeScript >= 5.x
Build:      tsc + esbuild
Test:       vitest
YAML:       js-yaml
Validation: zod (runtime) + ajv (JSON Schema)
CLI:        commander
MCP:        @modelcontextprotocol/sdk
Lint:       eslint + @typescript-eslint
Deps:       dependency-cruiser
```

---

## Spec References

| Cần biết về | Đọc file |
|------------|----------|
| Architecture tổng quan | `knowledge_base/00_ARCHITECTURE.md` |
| Harness Model | `knowledge_base/01_HARNESS_MODEL.md` |
| Asset taxonomy | `knowledge_base/02_ASSET_MODEL.md` |
| Package structure, dependency rules | `knowledge_base/03_SYSTEM_ARCHITECTURE.md` |
| Repository domain | `knowledge_base/04_REPOSITORY_SPECIFICATION.md` |
| Context domain | `knowledge_base/05_CONTEXT_SPECIFICATION.md` |
| Execution domain | `knowledge_base/06_EXECUTION_SPECIFICATION.md` |
| Capability domain | `knowledge_base/07_CAPABILITY_SPECIFICATION.md` |
| Governance domain | `knowledge_base/08_GOVERNANCE_SPECIFICATION.md` |
| Platform domain | `knowledge_base/09_PLATFORM_SPECIFICATION.md` |
| Manifest schema | `knowledge_base/10_MANIFEST_SPECIFICATION.md` |
| All data types | `knowledge_base/11_DATA_MODELS.md` |
| Filesystem layout | `knowledge_base/12_FILESYSTEM_SPECIFICATION.md` |
| CLI commands | `knowledge_base/13_CLI_SPECIFICATION.md` |
| Error codes | `knowledge_base/14_ERROR_MODEL.md` |
| Security | `knowledge_base/15_SECURITY_MODEL.md` |
| Versioning | `knowledge_base/16_VERSIONING.md` |
| Conformance | `knowledge_base/17_CONFORMANCE.md` |
