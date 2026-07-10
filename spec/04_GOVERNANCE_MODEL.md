# 04. GOVERNANCE MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose & Governance Overview

## 1.1 Purpose
Governance Model định nghĩa cách thức quản trị, kiểm soát chất lượng và điều phối sự thay đổi của Repository Knowledge trong hệ sinh thái Harness. Mục tiêu là đảm bảo mọi tri thức (Rules, ADR, Map) đều phát triển một cách an toàn, có kiểm chứng và có sự phê duyệt của con người.

## 1.2 Responsibilities
- **MUST**: Quản lý quy trình thay đổi thông qua Proposals.
- **MUST**: Kiểm soát chất lượng thông qua Reviews và Evidence.
- **MUST**: Kiểm soát quyền chỉnh sửa chặt chẽ giữa AI và Human.
- **MUST**: Cung cấp cơ chế Audit log bất biến (immutable traces).
- **MUST NOT**: Can thiệp vào Runtime Execution hoặc Capability Engine.

---

# 2. Governance Roles & Ownership Model

## 2.1 Governance Roles
Hệ thống phân định 3 vai trò (Roles) cốt lõi tham gia vận hành:

### 1. Repository Owner (Human)
- **Purpose**: Con người sở hữu cao nhất đối với Project Repository.
- **Responsibilities**: Đưa ra quyết định cuối cùng, phê duyệt/từ chối các Proposals, cập nhật cấu hình manifest.
- **Permissions**: Full Access (Đọc/Ghi/Approve/Reject/Override).
- **Restrictions**: Phải chịu trách nhiệm trước các vi phạm Conformance.

### 2. Reviewer (Human)
- **Purpose**: Thành viên chuyên môn tham gia thẩm định.
- **Responsibilities**: Đọc đề xuất, chạy thử nghiệm kiểm chứng và đưa ra quyết định Review (Approve/Request Changes).
- **Permissions**: Đọc tri thức, viết Review, đề xuất sửa đổi.
- **Restrictions**: Cấm tự ý merge Proposals nếu không có quyền Approver.

### 3. AI Agent
- **Purpose**: Tác nhân AI thực thi tác vụ.
- **Responsibilities**: Chạy task, phát hiện lỗi tri thức, sinh đề xuất Proposal mới ở dạng nháp.
- **Permissions**: Read-only đối với rules/adr cục bộ và shared. Quyền ghi nháp vào thư mục `proposals/`.
- **Restrictions**: Tuyệt đối không có quyền tự duyệt (self-approval), tự merge hoặc sửa trực tiếp các tệp tin tri thức đã được duyệt.

## 2.2 Artifact Ownership Matrix

Quyền hạn đối với từng loại tài sản (Artifact) được phân vai rõ rệt:

| Artifact | Owner | Editor | Reviewer | Approver | Runtime Permission | CLI Permission |
|---|---|---|---|---|---|---|
| **Manifest** | Repository Owner | Human | Human | Repository Owner | Read-only | Read/Write (CLI upgrade) |
| **Repo Map** | Project Team | Human / AI | Human | Repository Owner | Read-only | Read/Write (CLI sync) |
| **Rule** | Project Lead | Human | Human | Project Lead | Read-only | Read-only |
| **ADR** | Architect | Human | Human | Architect | Read-only | Read-only |
| **Proposal** | Creator (AI/Human) | Creator | Human | Repository Owner | Read/Write (Draft) | Read/Write (Draft) |
| **Logs** | Runtime Engine | Runtime | Human | None | Read/Write (Append) | Read-only |

---

# 3. Change Classification & Risk Levels

Mọi đề xuất thay đổi tri thức đều phải được phân loại để xác định quy trình phê duyệt:

| Change Type | Target Artifact | Risk Level | Review Requirement | Approval Requirement | Rollback Requirement |
|---|---|---|---|---|---|
| **Documentation** | Knowledge topic | **Low** | 1 Reviewer | Auto-approve if tests pass | Git revert |
| **Rule Update** | Repository Rule | **Medium** | 1 Peer Reviewer | Human Approval required | Revert change and re-verify |
| **Manifest Update** | `harness.yaml` | **High** | 2 Peer Reviewers | Repo Owner Approval | CLI repair / restore config |
| **Shared Package** | Shared sources | **Critical** | Core Platform Team | Organization Owner | Revert registry package |

---

# 4. Proposal Model & Lifecycle

## 4.1 Proposal Structure
Mỗi Proposal được lưu dưới dạng một tệp Markdown trong `.harness/proposals/` và có cấu trúc:
- **Identity (ID)**: Chuỗi định danh dạng `<YYYYMMDD>-<title-slug>.md`.
- **Author**: Định danh người hoặc AI tạo đề xuất (ví dụ: `agent::gemini`).
- **Target**: Artifact ID cần thay đổi.
- **Reason**: Lý do thực hiện thay đổi.
- **Evidence**: Liên kết đến tệp log chứa bằng chứng.
- **Status**: Trạng thái hiện tại.

## 4.2 Proposal Lifecycle State Machine

```text
[Draft] ──► [Submitted] ──► [Reviewing] ──► [Approved] ──► [Implemented] ──► [Closed]
                                 │
                                 ├──► [Rejected]
                                 └──► [Changes Requested]
```

- **Draft**: AI tạo đề xuất, lưu tạm trong `proposals/`.
- **Submitted**: Gửi đề xuất, sẵn sàng cho con người review.
- **Reviewing**: Reviewer đang xem xét và chạy verify.
- **Approved**: Được Approver ký duyệt.
- **Implemented**: Runtime hoặc CLI tự động merge nội dung vào thư mục chính thức (`rules/`, `adr/`).
- **Closed**: Lưu trữ proposal đã xong.
- **Rejected**: Đề xuất bị từ chối, đóng băng tệp và không được merge.

---

# 5. Review & Approval Model

## 5.1 Review Decision Model
Reviewer đưa ra một trong các quyết định sau:
- **Approve**: Đạt yêu cầu, chuyển tiếp lên chain phê duyệt.
- **Reject**: Không đạt, đóng Proposal.
- **Request Changes**: Yêu cầu AI/Tác giả sửa đổi nội dung và gửi lại.
- **Need More Info**: Yêu cầu bổ sung thêm Evidence.

## 5.2 Approval Chain & Threshold
- **Threshold**: Các thay đổi có rủi ro từ mức Medium trở lên bắt buộc phải có chữ ký số hoặc phê duyệt bằng lệnh CLI của con người (Human Approval).
- **Automatic Approval**: Chỉ được áp dụng đối với các tệp tin Descriptive Knowledge bổ trợ (Low risk) khi toàn bộ conformance validator check đạt 100% PASS.

## 5.3 Approval Detection Mechanism

Runtime phát hiện thay đổi trạng thái Proposal qua hai cơ chế:

**1. File-based Polling (Default)**
- Runtime poll thư mục `.harness/proposals/` mỗi 60 giây.
- Approval được xác nhận khi trường `status` trong frontmatter của Proposal thay đổi từ `submitted` sang `approved` (do Human sửa thủ công hoặc CLI `harness approve <id>`).

**2. CLI Command (Recommended)**
Human chạy lệnh:
```bash
harness approve <proposal-id>   # Approve
harness reject <proposal-id>    # Reject
```
CLI cập nhật trường Status và Runtime tự động nhận ra thay đổi ở poll cycle tiếp theo.

### Timeout Behavior
Khi Human Approval Timeout (mặc định 24h) hết hạn mà Proposal vẫn ở trạng thái `submitted`:
- Task chuyển sang `Failed (Terminal)` với lý do `ApprovalTimeout`.
- Proposal KHÔNG bị xóa — vẫn nằm ở `proposals/` với status `TimedOut`.
- AI có thể tạo lại Proposal mới cho Task tiếp theo.

## 5.4 Auto-Approve Eligibility
Auto-approve CHỈ được phép khi Runtime đạt Level 3 (Full Compliance).

| Compliance Level | Auto-Approve | Manual Approve |
|---|---|---|
| Level 1 (Core) | ❌ Không được phép | ✅ Bắt buộc với mọi Proposal |
| Level 2 (Standard) | ❌ Không được phép | ✅ Bắt buộc với mọi Proposal |
| Level 3 (Full) | ✅ Chỉ với Low-risk + tests 100% PASS | ✅ Medium/High/Critical |

Level 1 và Level 2 Runtime MUST từ chối tự động merge Proposal bất kể risk level.

---

# 6. Conflict Resolution & Audit Model

## 6.1 Conflict Resolution
- **AI-AI Conflict**: Nếu hai AI sửa đổi cùng một tệp Rule cục bộ, Runtime so khớp checksum và thời gian nạp. Sửa đổi sau sẽ bị báo lỗi `ConflictDetected`.
- **Merge Conflict**: Khi có xung đột git merge, con người (Human Owner) bắt buộc phải đứng ra giải quyết thủ công bằng Git.
- **Shared vs Local Conflict**: Tri thức Local luôn có độ ưu tiên cao nhất và ghi đè Shared.

## 6.2 Audit & Traceability Model
Để phục vụ việc kiểm toán (Audit), mọi hoạt động thay đổi phải ghi nhận đầy đủ các thông tin:
- **Who**: Tên tác nhân thực hiện (Human ID hoặc Agent ID).
- **When**: Timestamp ISO 8601.
- **What**: File diff (Before vs After).
- **Why**: Lý do thay đổi nghiệp vụ.
- **Evidence**: Log chạy test kiểm chứng.

Các tệp Audit log này được commit trực tiếp vào Git lịch sử của Repository để đảm bảo tính bất biến (Immutability) và khả năng truy vết lâu dài (Traceability).

---

# 7. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge và Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Task, Execution và Execution Result |
| 05. PLATFORM MODEL | Định nghĩa cách Governance được triển khai và tự động hóa |

Governance Model định nghĩa cách kết quả của Execution được chuyển thành Repository Knowledge thông qua một quy trình có kiểm soát và có thể kiểm chứng.
