# AGENTS.md — Harness Platform

> **Phiên bản:** 0.0.15 (Spec 4.0)
> **Mục đích:** Hợp đồng vận hành cho AI Agent đóng góp vào codebase **Harness** (không phải repo dùng Harness).

---

## 1. Mission

Bạn đang làm việc trong **Harness Operator System** — nền tảng quản lý tri thức AI-native. Trách nhiệm của bạn là giữ nhất quán giữa **Knowledge → Architecture → Implementation → Validation → Governance** ở mọi thời điểm.

---

## 2. Core Principles

1. **Knowledge First** — Đọc `knowledge_base/` trước khi sửa code.
2. **Architecture Before Implementation** — Domain boundaries và dependency rules trong `03_SYSTEM_ARCHITECTURE.md` là bất biến.
3. **Single Source of Truth** — `knowledge_base/11_DATA_MODELS.md` là SST cho mọi type, DTO, enum.
4. **Governance Over Assumptions** — Thay đổi cấu trúc cần proposal + human approval trước khi implement.
5. **Continuous Validation** — Build + test + lint phải pass. Không ngoại lệ.

---

## 3. Repository Overview

### Domains & Planes

| Plane | Domain | Path |
|---|---|---|
| Control | Platform | `src/platform/` |
| Persistence | Repository | `src/repository/` |
| Persistence | Context | `src/context/` |
| Runtime | Execution | `src/execution/` |
| Runtime | Capability | `src/capability/` |
| Knowledge | Governance | `src/governance/` |

### Dependency flow (không được đảo ngược)

```
Adapters (CLI/MCP) → Platform → Repository/Context/Execution/Governance → Capability → shared/
```

### Thư mục quan trọng

| Path | Mô tả |
|---|---|
| `src/shared/contracts/services.ts` | Tất cả service interfaces (SST cho contracts) |
| `src/shared/errors/` | HarnessError base + 71 error factory functions |
| `src/shared/templates/` | AGENTS_TEMPLATE.md, REPOSITORY_MAP_TEMPLATE.md |
| `src/adapters/cli/index.ts` | CLI entry point — route tất cả commands |
| `src/adapters/cli/factory.ts` | Tạo PlatformService instance |
| `src/adapters/mcp/server.ts` | MCP server — 4 tools |
| `knowledge_base/` | 21 spec files — nguồn sự thật duy nhất |

---

## 4. Read Order

Trước khi implement bất kỳ task nào, đọc theo thứ tự này:

```
1. knowledge_base/00_ARCHITECTURE.md        — tổng quan, planes, concepts
2. knowledge_base/03_SYSTEM_ARCHITECTURE.md — domain contracts, dependency rules
3. knowledge_base/<spec liên quan>           — spec chi tiết của domain bị ảnh hưởng
4. knowledge_base/11_DATA_MODELS.md         — tất cả types/DTOs/enums
5. implementation_plan/                     — context của milestone
6. src/                                     — source code thực tế
```

---

## 5. Development Workflow

```
Explore → Understand → Plan → Implement → Validate → Update Knowledge → Review
```

| Bước | Hành động |
|---|---|
| **Explore** | Đọc spec liên quan trong `knowledge_base/` |
| **Understand** | Xác định contract bị thay đổi, type bị ảnh hưởng |
| **Plan** | Viết plan ngắn cho task không tầm thường; submit proposal nếu là thay đổi cấu trúc |
| **Implement** | Theo architecture rules, match code style hiện tại, chỉ sửa files trong scope |
| **Validate** | `npm run build` + `npm run test` + `npm run lint` — tất cả phải pass |
| **Update Knowledge** | Cập nhật `knowledge_base/` spec nếu behaviour thay đổi; update `CHANGELOG.md` |
| **Review** | Verify checklist mục 10 |

---

## 6. CLI Commands (trong quá trình phát triển)

```bash
# Trước mỗi session
harness doctor

# Kiểm tra trạng thái
harness status [--json]

# Xem context cho task
harness context --task "implement retry logic"

# Thực thi task
harness run "validate all built-in capabilities are registered"

# Validate repository
harness validate [--strict]

# Liệt kê capabilities
harness capability list

# Chạy conformance suite (bắt buộc trước release)
harness conformance run

# Khởi tạo test repo
harness init /tmp/test-repo

# Governance
harness proposal list
harness proposal submit <id>
harness proposal approve <id>    # HUMAN ONLY
```

---

## 7. MCP Tools

Khởi động server: `harness mcp-server`

### `harness_run`
```json
{ "description": "string (required)", "workflowId": "string (optional)" }
```

### `harness_validate`
```json
{ "root": "string (optional — mặc định: cwd)" }
```

### `harness_proposal_list`
```json
{ "status": "DRAFT|SUBMITTED|REVIEWING|APPROVED|REJECTED|PROMOTED (optional)" }
```

### `harness_proposal_submit`
```json
{ "id": "string (required — ID của draft proposal)" }
```

> `harness_proposal_approve` **không có trên MCP** — approve là human-only action.
>
> **Lưu ý:** Tool `harness_proposal_submit` nhận `id` của proposal đã có sẵn, không phải tạo mới từ content.

---

## 8. Repository Rules

**Always:**
- Giữ domain boundaries — không import trực tiếp giữa domains
- Dependency flow một chiều — không đảo ngược
- Dùng Error Model factory (`src/shared/errors/factories.ts`) cho mọi error
- Sync `knowledge_base/` với implementation khi behaviour thay đổi
- Update `CHANGELOG.md` — chỉ latest entry, không sửa history
- Viết test cho mọi function có observable behaviour

**Never:**
- Break architecture hoặc tạo circular dependency
- Tạo type/DTO mới mà không khai báo trong `11_DATA_MODELS.md` trước
- Skip build/test/lint và claim task done
- Xóa/disable test để pass build
- Sửa `.harness/logs/audit.jsonl` trực tiếp
- Remove capability hoặc CLI command mà không có proposal

---

## 9. Known Issues

| ID | Triệu chứng | Fix direction |
|---|---|---|
| **KI-001** | `harness init` tạo AGENTS.md chỉ 3 dòng | Thêm postbuild script copy templates; fix path trong `init.ts` |
| **KI-002** | `harness version` hiện `v1.0.0` thay vì `0.0.15` | Dùng `getPackageVersion()` helper đã có trong `platform/service.ts` |
| **KI-003** | `harness init --force` không hoạt động | Parse `--force` trong `index.ts`, skip early exit trong `init.ts` |
| **KI-004** | `harness install --source/--version` flags không hoạt động | Parse flags trong `index.ts` (dùng pattern của `--status` trong proposal list) |
| **KI-005** | `harness proposal submit --file` không hoạt động | Implement `--file` parsing, đọc markdown, gọi `submitProposal()` |
| **KI-006** | `harness context` hardcode tags `['auth','implementation']` | Remove static tags, để context builder filter by relevance |
| **KI-007** | CLI thiếu `proposal reject/promote/request-changes` | Thêm 3 command mới; `GovernanceService` đã có các method này |

---

## 10. Governance Workflow

```
Submit → Review (lock 30min) → HUMAN Approve → Promote to Shared
```

**Cần proposal:** đổi public contract, đổi data model, thêm/xóa capability, đổi CLI/MCP interface, đổi manifest schema.

**Không cần proposal:** fix bugs (KI-001 đến KI-007), refactor nội bộ, thêm test, sửa docs.

```bash
harness proposal list                            # xem proposals hiện có
harness publish .harness/proposals/my.md         # tạo draft từ file
harness proposal list --status DRAFT             # lấy ID
harness proposal submit <id>                     # submit
harness proposal approve <id>                    # HUMAN ONLY
```

---

## 11. Build & Validation

```bash
npm run build    # zero tsc errors
npm run test     # all vitest tests pass
npm run lint     # zero ESLint errors
harness conformance run  # tất cả 30 Level-3 cases phải pass trước release
```

---

## 12. Review Checklist

- [ ] Requirement đã thỏa mãn đầy đủ
- [ ] Domain boundaries được bảo toàn
- [ ] Dependency flow một chiều
- [ ] Public contracts không thay đổi (hoặc proposal đã approve)
- [ ] Types mới có trong `11_DATA_MODELS.md`
- [ ] Errors mới dùng factory pattern
- [ ] Tests mới encode *lý do* behaviour quan trọng
- [ ] `npm run build && npm run test && npm run lint` — tất cả pass
- [ ] `knowledge_base/` spec cập nhật nếu behaviour thay đổi
- [ ] `CHANGELOG.md` latest entry cập nhật

---

## 13. Definition of Done

Task hoàn thành **chỉ khi**:
1. Implementation đúng theo spec
2. `npm run build` pass — zero TypeScript errors
3. `npm run test` pass — không có test bị skip
4. `npm run lint` pass — zero ESLint errors
5. `knowledge_base/` spec đã cập nhật nếu cần
6. `CHANGELOG.md` latest entry đã cập nhật
7. Nếu thay đổi cấu trúc: proposal đã submit và human đã approve trước khi implement

---

## 14. Decision Authority

**AI CÓ THỂ (không cần approval):**
Refactor nội bộ, cải thiện readability, thêm test, fix bugs trong KI-001 đến KI-007, sửa docs/typos.

**AI PHẢI XIN APPROVAL TRƯỚC KHI:**
Đổi `src/shared/contracts/`, đổi domain structure, thêm/xóa built-in capability, đổi CLI public interface, đổi MCP tool schema, thêm npm dependency, đổi manifest schema, break backward compatibility.

---

## 15. Nguyên tắc

```
Knowledge (knowledge_base/)
      ↓
Architecture (03_SYSTEM_ARCHITECTURE.md)
      ↓
Implementation (src/)
      ↓
Validation (tests/, conformance)
      ↓
Governance (.harness/proposals/, .harness/logs/)
```

Khi không chắc chắn → đọc thêm knowledge trước khi viết thêm code.
