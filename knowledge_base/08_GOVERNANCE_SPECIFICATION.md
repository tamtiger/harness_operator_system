# 08_GOVERNANCE_SPECIFICATION.md — Governance Domain Specification

**Version:** 4.0
**Status:** Final
**Ngôn ngữ:** Tiếng Việt
**Cập nhật lần cuối:** 2026-07-11
**Phân loại:** Implementation Specification — Governance Domain

---

## Mục lục

1. [Purpose](#1-purpose)
2. [Responsibilities vs Non-Responsibilities](#2-responsibilities-vs-non-responsibilities)
3. [Proposal Model](#3-proposal-model)
4. [Proposal Lifecycle State Machine](#4-proposal-lifecycle-state-machine)
5. [Review Flow](#5-review-flow)
6. [Promotion Model](#6-promotion-model)
7. [Audit Model](#7-audit-model)
8. [Evidence Model](#8-evidence-model)
9. [Concurrency Rules](#9-concurrency-rules)
10. [Public Service Contract](#10-public-service-contract)
11. [Filesystem Interaction](#11-filesystem-interaction)
12. [Internal Modules](#12-internal-modules)
13. [Compile-time Dependencies](#13-compile-time-dependencies)
14. [Error Model](#14-error-model)
15. [Design Rules](#15-design-rules)
16. [Cross References](#16-cross-references)
17. [Out of Scope](#17-out-of-scope)

---

## 1. Purpose

**Governance** là domain chịu trách nhiệm quản lý **vòng đời của Knowledge** trong hệ thống Harness Operator.

Governance đảm bảo rằng mọi thay đổi về knowledge — dù do AI agent hay human đề xuất — đều phải trải qua một quy trình có kiểm soát: đề xuất (propose), xem xét (review), phê duyệt (approve), và cuối cùng là promote lên Shared Harness nếu phù hợp.

### Vai trò cốt lõi

- **Quản lý Proposals**: Tiếp nhận, theo dõi, và xử lý các đề xuất thay đổi knowledge từ mọi nguồn (AI agent và human).
- **Kiểm soát chất lượng**: Đảm bảo mọi knowledge thay đổi đều có evidence, rationale, và qua review của con người trước khi được áp dụng.
- **Audit Trail**: Ghi lại toàn bộ lịch sử thay đổi knowledge để truy vết và kiểm soát.
- **Promotion Gateway**: Là cổng duy nhất để knowledge được promote từ Local Harness lên Shared Harness.

### Giới hạn rõ ràng

- Governance **không ghi filesystem trực tiếp** — mọi I/O đều qua Repository domain.
- Governance **không tham gia Runtime Execution** — nó không biết và không cần biết AI tools đang chạy gì.
- Governance **không publish** lên Harness Repository — đó là trách nhiệm của Platform.

---

## 2. Responsibilities vs Non-Responsibilities

### 2.1 Governance LÀM những việc sau

| # | Responsibility | Mô tả chi tiết |
|---|---|---|
| G01 | **Tiếp nhận Proposals** | Nhận `ProposalRequest` từ AI agent hoặc human, tạo Proposal object với ID theo format chuẩn |
| G02 | **Quản lý Proposal Lifecycle** | Điều phối các state transitions của Proposal theo State Machine đã định nghĩa |
| G03 | **Enforce Review Gate** | Đảm bảo chỉ Human mới có thể APPROVE hoặc REJECT — AI agent không được phép |
| G04 | **Lock Proposal khi Review** | Khi một reviewer bắt đầu review, Proposal bị lock để tránh concurrent review |
| G05 | **Validate Evidence** | Kiểm tra Proposal phải có ít nhất 1 evidence item trước khi SUBMIT |
| G06 | **Orchestrate Promotion** | Khi Proposal được APPROVED với `type=promote_to_shared`, gọi Repository.persist() để ghi asset |
| G07 | **Ghi Audit Logs** | Ghi mọi action vào AuditRecord qua Repository.persist() |
| G08 | **Cung cấp Query Interface** | Cho phép list, filter, get proposals theo nhiều tiêu chí khác nhau |
| G09 | **Xử lý Concurrency** | Đảm bảo transitions là atomic và handle concurrent modification conflicts |
| G10 | **Ghi Proposal Content** | Lưu proposedContent vào `.harness/proposals/{id}.md` qua Repository.persist() |

### 2.2 Governance KHÔNG làm những việc sau

| # | Non-Responsibility | Domain chịu trách nhiệm |
|---|---|---|
| NG01 | Ghi filesystem trực tiếp | Repository domain |
| NG02 | Publish asset lên Shared Harness | Platform domain |
| NG03 | Đọc filesystem trực tiếp | Repository domain |
| NG04 | Khởi động hoặc dừng Execution Runtime | Platform domain |
| NG05 | Invoke capability hoặc tool | Capability domain |
| NG06 | Tham gia vào bất kỳ execution session nào | Execution domain |
| NG07 | Filter hoặc rank assets theo token budget | Context domain |
| NG08 | Synchronize Shared Harness từ remote | Platform domain |
| NG09 | Cung cấp Repository Context cho Runtime | Repository domain |
| NG10 | Validate syntax hay semantics của code trong proposal | AI tool / CI pipeline |

---

## 3. Proposal Model

Proposal là đơn vị trung tâm của Governance domain. Mỗi Proposal đại diện cho một đề xuất thay đổi knowledge.

```
Proposal {
  id: string           # format: PROP-YYYY-MM-DD-NNN
                       # Ví dụ: PROP-2026-07-11-001
  title: string        # Tiêu đề ngắn gọn, tối đa 100 ký tự
  description: string  # Mô tả chi tiết mục đích và phạm vi của proposal
  type: ProposalType   # 'new_asset' | 'update_asset' | 'delete_asset' | 'promote_to_shared'
  status: ProposalStatus
  targetAsset: AssetId | null  # null nếu type = 'new_asset'
  proposedContent: string      # Nội dung mới hoàn chỉnh hoặc diff format
  rationale: string            # Lý do tại sao cần thay đổi này
  evidence: Evidence[]         # Bằng chứng hỗ trợ proposal (tối thiểu 1 khi submit)
  author: string               # 'ai' hoặc human username
  reviewers: string[]          # Danh sách reviewer được chỉ định (có thể rỗng ban đầu)
  createdAt: ISO8601
  updatedAt: ISO8601
  reviewedAt: ISO8601 | null   # Thời điểm reviewer bắt đầu review
  approvedAt: ISO8601 | null   # Thời điểm được approve
  promotedAt: ISO8601 | null   # Thời điểm được promote (chỉ cho type=promote_to_shared)
  comments: Comment[]          # Tất cả comments từ reviewers
  tags: string[]               # Tags để phân loại và filter
}
```

### ProposalType

| Type | Mô tả | targetAsset |
|------|-------|-------------|
| `new_asset` | Tạo asset mới trong Local Harness | null |
| `update_asset` | Cập nhật nội dung asset đã tồn tại | Required |
| `delete_asset` | Xóa asset khỏi Local Harness | Required |
| `promote_to_shared` | Promote asset từ Local lên Shared Harness | Required |

### ProposalStatus

```
ProposalStatus: 'DRAFT' | 'SUBMITTED' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'PROMOTED' | 'CANCELLED'
```

### Comment Model

```
Comment {
  id: string
  author: string       # reviewer username hoặc 'ai'
  content: string
  timestamp: ISO8601
  type: 'general' | 'request_changes' | 'approval' | 'rejection'
}
```

### ID Format

Proposal ID theo format `PROP-YYYY-MM-DD-NNN`:
- `YYYY-MM-DD`: Ngày tạo proposal (UTC)
- `NNN`: Số thứ tự trong ngày, bắt đầu từ `001`, tăng dần
- Ví dụ: `PROP-2026-07-11-001`, `PROP-2026-07-11-002`

---

## 4. Proposal Lifecycle State Machine

### States và Transitions

```
                    ┌─────────┐
                    │  DRAFT  │──────────────────────────────┐
                    └────┬────┘                              │
                         │ author submits                    │ author cancels
                         ▼                                   │
                   ┌───────────┐                             ▼
                   │ SUBMITTED │                       ┌───────────┐
                   └─────┬─────┘                       │ CANCELLED │ (terminal)
                         │ reviewer picks up            └───────────┘
                         ▼
                   ┌───────────┐
              ┌────│ REVIEWING │────┐
              │    └─────┬─────┘   │
              │          │         │
   reject     │          │ approve │ request changes
   (comments) │          ▼         │
              │    ┌──────────┐    │
              │    │ APPROVED │    │
              │    └─────┬────┘    │
              │          │         │
              │          │ promote │
              │          ▼         │
              │    ┌──────────┐    │
              │    │ PROMOTED │    │
              │    └──────────┘    │
              │    (terminal)      │
              ▼                    │
        ┌──────────┐               │
        │ REJECTED │               │
        └──────────┘               │
        (terminal)                 │
                                   │
                         ┌─────────┘
                         │ (back to DRAFT for revision)
                         ▼
                    ┌─────────┐
                    │  DRAFT  │
                    └─────────┘
```

### Transition Rules

| From | To | Trigger | Actor |
|------|----|---------|-------|
| `DRAFT` | `SUBMITTED` | author submits proposal | Author (AI hoặc Human) |
| `DRAFT` | `CANCELLED` | author cancels proposal | Author |
| `SUBMITTED` | `REVIEWING` | reviewer picks up proposal | Reviewer (Human only) |
| `REVIEWING` | `APPROVED` | reviewer approves | Reviewer (Human only) |
| `REVIEWING` | `REJECTED` | reviewer rejects với comments | Reviewer (Human only) |
| `REVIEWING` | `DRAFT` | reviewer yêu cầu thay đổi | Reviewer (Human only) |
| `APPROVED` | `PROMOTED` | Platform promote | Platform (automated) |

### Transition Constraints

```
Transition Constraints:
  - AI agent có thể tạo DRAFT và SUBMITTED
  - Chỉ Human có thể APPROVE/REJECT
  - PROMOTE chỉ xảy ra sau APPROVE
  - Atomic transitions (no partial states)
  - Khi REVIEWING, Proposal bị lock cho reviewer đó
  - Không thể transition từ terminal states (PROMOTED, REJECTED, CANCELLED)
  - REJECTED proposal không thể reopen — phải tạo proposal mới
```

### Terminal States

Các states sau là **terminal** — không thể transition sang state khác:
- `PROMOTED`: Proposal đã được promote thành công
- `REJECTED`: Proposal đã bị từ chối (không thể reopen)
- `CANCELLED`: Proposal đã bị hủy bởi author

---

## 5. Review Flow

Chi tiết quy trình review từng bước:

### Bước 1 — Reviewer lấy danh sách Submitted proposals

Reviewer gọi `listProposals({ status: 'SUBMITTED' })` để lấy tất cả proposals đang chờ review. Kết quả được sắp xếp theo `createdAt` tăng dần (FIFO).

### Bước 2 — Reviewer chọn proposal để review

Reviewer đọc title, description, và tags để chọn proposal phù hợp với domain expertise của mình. Gọi `getProposal(id)` để xem chi tiết đầy đủ.

### Bước 3 — Lock proposal cho reviewer

Reviewer gọi `review(id, reviewerUsername)`. Governance:
- Kiểm tra proposal vẫn ở trạng thái `SUBMITTED`
- Transition sang `REVIEWING`
- Ghi `reviewedAt = now()`
- Thêm reviewer vào `reviewers[]` nếu chưa có
- **Lock proposal cho reviewer này** — reviewer khác không thể review concurrently

### Bước 4 — Reviewer đọc nội dung

Reviewer đọc toàn bộ:
- `proposedContent`: Nội dung đề xuất (full content hoặc diff)
- `rationale`: Lý do thay đổi
- `evidence[]`: Bằng chứng hỗ trợ
- `targetAsset`: Asset bị ảnh hưởng (nếu có)

### Bước 5 — Reviewer thêm comments

Reviewer có thể gọi nhiều lần để thêm comments trong quá trình review. Comments được append vào `comments[]` với timestamp.

### Bước 6 — Reviewer quyết định

Reviewer ra một trong ba quyết định:

| Quyết định | Action | Kết quả |
|-----------|--------|---------|
| **APPROVE** | `approve(id, reviewer, comments)` | Status → `APPROVED` |
| **REJECT** | `reject(id, reviewer, comments)` | Status → `REJECTED` (terminal) |
| **Request Changes** | `requestChanges(id, reviewer, comments)` | Status → `DRAFT` (author sửa lại) |

### Bước 7 — Transition state

Governance thực hiện transition atomic, ghi audit log, và notify relevant parties (nếu có notification system).



---

## 6. Promotion Model

Promotion là quá trình đưa một knowledge asset từ **Local Harness** lên **Shared Harness**, để toàn bộ tổ chức có thể sử dụng.

### Điều kiện Promotion

- Proposal phải ở trạng thái `APPROVED`
- Proposal type phải là `promote_to_shared`
- `targetAsset` phải tồn tại và hợp lệ trong Local Harness

### Luồng Promotion

```
1. Governance.promote(proposalId) được gọi
   │
   ├─► Kiểm tra Proposal.status == APPROVED
   ├─► Kiểm tra Proposal.type == 'promote_to_shared'
   ├─► Load asset từ Local Harness qua Repository
   │
2. Governance gọi Repository.persist() để ghi asset vào staging area
   │
   ├─► Asset được ghi vào `.harness/proposals/{id}_promoted_content.md`
   │
3. Platform nhận event/notification về asset đã sẵn sàng
   │
   ├─► Platform lấy asset content từ Repository
   ├─► Platform publish lên Shared Harness (remote hoặc local shared dir)
   │
4. Governance cập nhật Proposal status
   │
   ├─► Proposal.status → PROMOTED
   ├─► Proposal.promotedAt = now()
   │
5. Audit log ghi lại action
   │
   └─► AuditRecord { action: 'promoted', proposalId, actor: 'governance' }
```

### Phân chia trách nhiệm Governance vs Platform

| Bước | Governance | Platform |
|------|-----------|---------|
| Validate proposal | ✅ | ❌ |
| Ghi asset qua Repository | ✅ | ❌ |
| Publish lên Shared Harness | ❌ | ✅ |
| Update proposal status | ✅ | ❌ |
| Ghi audit log | ✅ | ❌ |

> **Nguyên tắc cốt lõi**: Governance chỉ promote (chuẩn bị và xác nhận). Platform chịu trách nhiệm publish (đưa lên Shared Harness thực sự).

### PromotionResult

```
PromotionResult {
  proposalId: string
  assetId: AssetId
  promotedAt: ISO8601
  sharedHarnessPath: string   # Đường dẫn trong Shared Harness
  success: boolean
  error: string | null
}
```

---

## 7. Audit Model

Mọi action trong Governance đều được ghi lại dưới dạng immutable audit records.

### AuditRecord

```
AuditRecord {
  id: string           # format: AUD-YYYY-MM-DD-NNN (tương tự Proposal ID)
  timestamp: ISO8601   # UTC timestamp của action
  action: AuditAction  # Loại action (xem bảng bên dưới)
  actor: string        # 'ai', 'platform', hoặc human username
  proposalId: string   # Proposal liên quan
  previousStatus: ProposalStatus | null  # null nếu là proposal_created
  newStatus: ProposalStatus | null       # null nếu action không đổi status
  details: string      # Mô tả chi tiết, bao gồm comments nếu có
}
```

### AuditAction Values

| Action | Khi nào ghi | previousStatus | newStatus |
|--------|------------|----------------|-----------|
| `proposal_created` | Proposal được tạo | null | `DRAFT` |
| `status_changed` | Mọi state transition | Old status | New status |
| `comment_added` | Comment được thêm | Current status | Current status |
| `promoted` | Governance.promote() thành công | `APPROVED` | `PROMOTED` |
| `published` | Platform publish xong (notify Governance) | `PROMOTED` | `PROMOTED` |

### Lưu trữ Audit Logs

```
Audit logs được ghi vào: .harness/logs/audit.jsonl
Format: JSONL (JSON Lines) — mỗi dòng là một AuditRecord JSON
Ghi qua: Repository.persist()
Append-only: KHÔNG được xóa hoặc sửa audit records
```

Ví dụ audit log entry:
```json
{"id":"AUD-2026-07-11-001","timestamp":"2026-07-11T10:30:00Z","action":"proposal_created","actor":"ai","proposalId":"PROP-2026-07-11-001","previousStatus":null,"newStatus":"DRAFT","details":"AI agent proposed new rule for TypeScript error handling"}
{"id":"AUD-2026-07-11-002","timestamp":"2026-07-11T11:00:00Z","action":"status_changed","actor":"john.doe","proposalId":"PROP-2026-07-11-001","previousStatus":"SUBMITTED","newStatus":"REVIEWING","details":"Reviewer john.doe picked up proposal for review"}
```

---

## 8. Evidence Model

Evidence là bằng chứng hỗ trợ cho một Proposal. Mỗi Proposal **phải có ít nhất 1 evidence item** khi SUBMIT.

### Evidence Structure

```
Evidence {
  id: string
  type: EvidenceType   # Loại bằng chứng (xem bảng bên dưới)
  source: string       # File path (nếu là file) hoặc mô tả nguồn
  content: string      # Nội dung evidence (log excerpt, test output, v.v.)
  timestamp: ISO8601   # Thời điểm evidence được thu thập
}
```

### EvidenceType Values

| Type | Mô tả | Ví dụ source |
|------|-------|-------------|
| `execution_log` | Log từ một execution session | `.harness/logs/exec-2026-07-11.jsonl` |
| `test_result` | Kết quả test pass/fail | `test-output.txt` hoặc CI run URL |
| `code_change` | Diff hoặc code change thực tế | `src/utils/error-handler.ts` |
| `human_observation` | Nhận xét trực tiếp từ engineer | `"Observed pattern in 5 PRs this week"` |

### Evidence Validation Rules

1. `id` phải unique trong scope của Proposal
2. `content` không được rỗng
3. `timestamp` phải là ISO8601 hợp lệ
4. `source` phải được cung cấp (không rỗng)
5. Khi `type = 'execution_log'` hoặc `'code_change'`, `source` nên là file path hợp lệ

### Evidence Best Practices

- Evidence càng cụ thể càng tốt — log excerpt tốt hơn là `"it worked"`
- Với `update_asset` proposals, nên có `code_change` evidence cho thấy tại sao change cần thiết
- Với `promote_to_shared` proposals, nên có nhiều evidence từ nhiều sources khác nhau

---

## 9. Concurrency Rules

Governance phải xử lý đúng các tình huống concurrent access để đảm bảo data integrity.

### Rule C01 — Single Reviewer Lock

Một Proposal chỉ có thể được review bởi **1 reviewer tại một thời điểm**. Khi reviewer A đang review proposal P:
- Reviewer B gọi `review(P.id, "B")` → nhận error `GOV_003`
- Reviewer A giữ lock cho đến khi gọi `approve()`, `reject()`, hoặc `requestChanges()`

### Rule C02 — Atomic Transitions

Mọi state transition PHẢI là **atomic** — không có trạng thái partial. Nếu transition thất bại ở bất kỳ bước nào, toàn bộ transition phải được rollback.

```
Atomic sequence cho APPROVE:
  1. Lock proposal record
  2. Validate current state == REVIEWING
  3. Validate reviewer == current lock holder
  4. Update status = APPROVED
  5. Set approvedAt = now()
  6. Append comment
  7. Unlock proposal
  8. Write audit log
  ─── Nếu bước nào thất bại → rollback toàn bộ ───
```

### Rule C03 — Locking Strategy

```
Locking Options (theo thứ tự ưu tiên):

Option A — File Lock (đơn giản, recommended cho single-node):
  - Tạo file `.harness/proposals/{id}.lock` khi bắt đầu review
  - Xóa file lock khi transition xong
  - Kiểm tra file lock existence trước mọi write operation

Option B — Optimistic Locking (cho distributed):
  - Mỗi Proposal có `version: number` field
  - Read-modify-write với version check
  - Nếu version mismatch → conflict error GOV_006
```

### Rule C04 — Conflict Resolution

Khi xảy ra concurrent modification conflict (hai người cùng approve):
- **First write wins**: Người ghi thành công trước được chấp nhận
- Người thua nhận error `GOV_006`
- Người thua phải đọc lại proposal (đã ở trạng thái terminal) và không cần action

### Rule C05 — Orphaned Locks

Nếu reviewer crash giữa chừng và không release lock:
- Lock timeout sau **30 phút** không có activity
- Sau timeout, bất kỳ reviewer nào có thể take over
- Take over được ghi vào audit log

---

## 10. Public Service Contract

Interface công khai của Governance domain. Các domain khác chỉ được tương tác qua interface này.

```typescript
interface GovernanceService {
  // Tạo và submit proposal mới
  submitProposal(request: ProposalRequest): Proposal

  // Submit proposal đã tồn tại
  submitExistingProposal(id: ProposalId): Proposal

  // Lấy danh sách proposals theo filter
  listProposals(filter: ProposalFilter): Proposal[]

  // Lấy chi tiết một proposal
  getProposal(id: ProposalId): Proposal

  // Reviewer bắt đầu review (lock proposal)
  review(id: ProposalId, reviewer: string): Proposal

  // Reviewer approve proposal
  approve(id: ProposalId, reviewer: string, comments: string): Proposal

  // Reviewer reject proposal
  reject(id: ProposalId, reviewer: string, comments: string): Proposal

  // Reviewer yêu cầu thay đổi (đưa về DRAFT)
  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal

  // Promote proposal đã APPROVED lên Shared Harness
  promote(id: ProposalId): PromotionResult

  // Lấy audit log của một proposal
  getAuditLog(proposalId: ProposalId): AuditRecord[]
}
```

### ProposalRequest

```typescript
interface ProposalRequest {
  title: string
  description: string
  type: ProposalType
  rationale: string
  evidence: Evidence[]
  proposedContent: string
  targetAsset?: AssetId
}
```

### ProposalFilter

```typescript
interface ProposalFilter {
  status?: ProposalStatus | ProposalStatus[]
  type?: ProposalType | ProposalType[]
  author?: string
  reviewer?: string
  tags?: string[]
  createdAfter?: ISO8601
  createdBefore?: ISO8601
  limit?: number          // Default: 50, Max: 200
  offset?: number         // Default: 0
  sortBy?: 'createdAt' | 'updatedAt'   // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'           // Default: 'desc'
}
```



---

## 11. Filesystem Interaction

### Nguyên tắc bất biến

> **Governance KHÔNG bao giờ ghi filesystem trực tiếp.**

Mọi thao tác I/O đều phải đi qua `Repository.persist()`. Đây là hard constraint, không phải guideline.

### Các file Governance quản lý (qua Repository)

| File Pattern | Nội dung | Khi ghi |
|-------------|---------|---------|
| `.harness/proposals/{id}.md` | Proposal content dưới dạng Markdown với YAML front matter | Khi tạo hoặc update proposal |
| `.harness/logs/audit.jsonl` | Audit records, JSONL format, append-only | Sau mỗi action |

### Proposal File Format

```markdown
---
id: PROP-2026-07-11-001
title: "Add TypeScript error handling rule"
type: new_asset
status: SUBMITTED
author: ai
createdAt: 2026-07-11T10:00:00Z
updatedAt: 2026-07-11T10:30:00Z
tags: [typescript, error-handling]
---

# PROP-2026-07-11-001: Add TypeScript error handling rule

## Description
[description content]

## Rationale
[rationale content]

## Proposed Content
[proposedContent]

## Evidence
[evidence items]
```

### Lý do không ghi trực tiếp

1. **Single filesystem owner**: Repository là domain duy nhất biết về filesystem layout.
2. **Atomic writes**: Repository thực hiện atomic write (write-temp + rename) để tránh partial writes.
3. **Path resolution**: Repository biết đường dẫn đúng theo OS và project root.
4. **Consistency**: Mọi ghi đều qua cùng một code path, dễ test và audit.

---

## 12. Internal Modules

Governance domain được chia thành các module nhỏ với trách nhiệm rõ ràng:

### proposal/
| Component | Trách nhiệm |
|-----------|------------|
| `ProposalManager` | Orchestrate lifecycle của Proposal: tạo, update, transition states |
| `ProposalRepository` | Serialize/deserialize Proposal objects và gọi Repository.persist() |

### review/
| Component | Trách nhiệm |
|-----------|------------|
| `ReviewManager` | Quản lý review process: lock, unlock, track reviewer assignment |
| `ReviewPolicy` | Enforce review rules: ai được review, validation trước khi approve |

### approval/
| Component | Trách nhiệm |
|-----------|------------|
| `ApprovalEngine` | Xử lý approve/reject/requestChanges, validate human-only constraint |

### promotion/
| Component | Trách nhiệm |
|-----------|------------|
| `PromotionEngine` | Orchestrate promotion flow, gọi Repository.persist(), notify Platform |

### audit/
| Component | Trách nhiệm |
|-----------|------------|
| `AuditLogger` | Tạo AuditRecord objects và queue chúng để ghi |
| `AuditRepository` | Serialize AuditRecord thành JSONL và gọi Repository.persist() |

### Module Dependency Graph

```
GovernanceService
    ├── ProposalManager
    │       └── ProposalRepository ──► Repository (external)
    ├── ReviewManager
    │       └── ReviewPolicy
    ├── ApprovalEngine
    ├── PromotionEngine ──────────────► Repository (external)
    └── AuditLogger
            └── AuditRepository ──────► Repository (external)
```

---

## 13. Compile-time Dependencies

### Dependencies (BẮT BUỘC)

| Dependency | Lý do |
|-----------|-------|
| `shared` | Dùng các shared types: `AssetId`, `ISO8601`, common error types |
| `repository` | Gọi `Repository.persist()` để ghi proposals và audit logs |

### Non-Dependencies (KHÔNG được import)

| Module | Lý do không được dùng |
|--------|-----------------------|
| `context` | Governance không liên quan đến Context building hay token budgets |
| `execution` | Governance không tham gia Runtime Execution |
| `capability` | Governance không invoke bất kỳ capability nào |
| `platform` | Governance không gọi Platform trực tiếp — Platform gọi Governance |

### Dependency Rule

```
governance → shared          ✅ Allowed
governance → repository      ✅ Allowed
governance → context         ❌ FORBIDDEN
governance → execution       ❌ FORBIDDEN
governance → capability      ❌ FORBIDDEN
governance → platform        ❌ FORBIDDEN
```

---

## 14. Error Model

| Code | Description | Recovery |
|------|-------------|----------|
| `GOV_001` | Proposal not found | Kiểm tra lại proposal ID, đảm bảo format `PROP-YYYY-MM-DD-NNN` |
| `GOV_002` | Invalid proposal state transition | Kiểm tra current state của proposal trước khi gọi transition |
| `GOV_003` | Proposal already being reviewed | Đợi reviewer hiện tại hoàn thành hoặc chờ lock timeout (30 phút) |
| `GOV_004` | Proposal has no evidence | Thêm ít nhất 1 evidence item trước khi submit |
| `GOV_005` | Promotion failed | Kiểm tra Repository write permissions và disk space |
| `GOV_006` | Concurrent modification conflict | Retry với version mới nhất của proposal |
| `GOV_007` | Reviewer not authorized | Kiểm tra reviewer có trong danh sách authorized reviewers |
| `GOV_008` | AI agent cannot approve or reject | Chỉ human mới được approve/reject — đây là intentional constraint |
| `GOV_009` | Cannot modify terminal proposal | Proposal đã ở PROMOTED/REJECTED/CANCELLED không thể thay đổi |
| `GOV_010` | Invalid evidence | Evidence thiếu required fields hoặc content rỗng |

### Error Response Format

```typescript
interface GovernanceError {
  code: string         // e.g., 'GOV_002'
  message: string      // Human-readable message
  proposalId?: string  // Nếu liên quan đến proposal cụ thể
  currentState?: ProposalStatus  // State hiện tại (cho GOV_002)
  details?: string     // Additional context
}
```

---

## 15. Design Rules

### DR01 — Human Gate là bất biến

APPROVE và REJECT **phải** do Human thực hiện. Hệ thống phải kiểm tra và từ chối (`GOV_008`) nếu `actor == 'ai'` cố gọi `approve()` hoặc `reject()`. Đây không phải recommendation — đây là hard constraint được enforce ở code level.

### DR02 — Evidence-first Proposal

Không có SUBMIT nào được thực hiện mà không có evidence. Validation phải xảy ra **trước** khi transition DRAFT → SUBMITTED. Proposal thiếu evidence là signal của quality problem.

### DR03 — Audit là append-only

Audit log không bao giờ được xóa hoặc sửa đổi. Mọi update đều là thêm record mới. File `.harness/logs/audit.jsonl` chỉ được mở ở chế độ append.

### DR04 — Idempotent Operations

`promote(id)` và `approve(id)` phải idempotent — gọi nhiều lần với cùng proposal đã ở terminal state không gây error catastrophic, chỉ return current state.

### DR05 — Separation: Governance vs Platform

Governance **không biết** Shared Harness ở đâu. Governance chỉ biết: sau khi persist staging content, notify Platform. Platform quyết định publish đi đâu. Nếu Governance cần biết Shared Harness path, đó là design violation.

### DR06 — Proposal ID Uniqueness

ID `PROP-YYYY-MM-DD-NNN` phải globally unique. Nếu trong ngày đã có 001, 002, 003 thì proposal tiếp theo phải là 004. Counter được persist vào `.harness/proposals/_counter.json` qua Repository.

### DR07 — Fail Fast với rõ ràng

Khi validation fails, throw error với code cụ thể (`GOV_00X`) ngay lập tức. Không silently ignore. Không wrap trong generic error. Caller cần biết chính xác cái gì sai.

### DR08 — Lock Timeout là Safety Net

Lock timeout (30 phút) chỉ là safety net cho crash scenarios. Trong normal operation, reviewer **phải** release lock bằng cách gọi một trong: `approve()`, `reject()`, `requestChanges()`. Hệ thống không nên dựa vào timeout cho normal flow.

---

## 16. Cross References

### Files liên quan trong knowledge_base

| File | Mối liên hệ |
|------|------------|
| `00_ARCHITECTURE.md` | Architecture Foundation — định nghĩa Knowledge Lifecycle và vai trò Governance trong hệ thống tổng thể |
| `01_HARNESS_MODEL.md` | Harness Model — định nghĩa Shared vs Local Harness, là target của Promotion |
| `02_ASSET_MODEL.md` | Asset Model — định nghĩa `AssetId`, asset types, là subject của Proposals |
| `03_SYSTEM_ARCHITECTURE.md` | System Architecture — định nghĩa domain boundaries và interaction patterns |
| `04_REPOSITORY_SPECIFICATION.md` | Repository Domain — Governance phụ thuộc vào `Repository.persist()` cho mọi I/O |
| `05_CONTEXT_SPECIFICATION.md` | Context Domain — không liên quan đến Governance |
| `06_EXECUTION_SPECIFICATION.md` | Execution Domain — không liên quan đến Governance |

### Inbound Dependencies (ai gọi Governance)

| Caller | Mục đích |
|--------|---------|
| Platform | Gọi `promote()` sau khi approve, nhận notification để publish |
| AI Agent | Gọi `submitProposal()` để đề xuất knowledge changes |
| Human (CLI/UI) | Gọi tất cả review operations (`review()`, `approve()`, `reject()`, v.v.) |

### Outbound Dependencies (Governance gọi ai)

| Callee | Mục đích |
|--------|---------|
| Repository | `Repository.persist()` để ghi proposals và audit logs |

---

## 17. Out of Scope

Các chức năng sau **không thuộc** phạm vi Governance domain và sẽ không được implement ở đây:

| Out of Scope Item | Thuộc về |
|------------------|---------|
| Publish asset lên remote Shared Harness | Platform domain |
| Sync Shared Harness từ remote repository | Platform domain |
| Validate code syntax trong proposedContent | CI/CD pipeline hoặc AI tool |
| Notification system (email, Slack, v.v.) | Platform / Adapter layer |
| CLI commands cho review workflow | Platform / Adapter layer |
| Authentication và user management | Infrastructure / Adapter layer |
| Rate limiting cho proposal submissions | Platform / Adapter layer |
| Analytics và reporting về proposal trends | Separate analytics service |
| Automated review bởi AI | Intentionally excluded (Human gate principle) |
| Rollback đã-published Shared assets | Platform domain |
| Versioning của Shared Harness | Platform / Repository domain |
| Diff calculation giữa proposedContent và currentContent | UI / Adapter layer |

---

*Tài liệu này là specification đầy đủ để implement Governance domain. Mọi câu hỏi về design intent nên tham chiếu `00_ARCHITECTURE.md` và `03_SYSTEM_ARCHITECTURE.md` trước.*
