# GLOSSARY.md — Thuật ngữ Thống nhất

> Universal Coding Harness
>
> Version: 1.0
>
> Status: Approved
>
> Mục đích: Chuẩn hóa thuật ngữ xuyên suốt mọi tài liệu thiết kế và implementation.

---

## Quy tắc

1. Mọi tài liệu, source code, commit message **phải** sử dụng đúng thuật ngữ trong bảng dưới.
2. Nếu thuật ngữ cũ xuất hiện, phải sửa thành thuật ngữ chuẩn.
3. Tên viết tắt chỉ được dùng **sau khi** đã giới thiệu tên đầy đủ ít nhất một lần.

---

## Bảng Thuật ngữ Chuẩn

### Kiến trúc Tổng thể

| Thuật ngữ Chuẩn | Viết tắt | Thuật ngữ Cũ / Đồng nghĩa | Định nghĩa |
|-----------------|----------|--------------------------|-----------|
| **Harness** | — | Universal Coding Harness, UCH | Toàn bộ hệ thống |
| **Gateway** | — | Harness Gateway, MCP Server | Điểm vào duy nhất cho AI Agent |
| **Governance Layer** | — | Governance Services | Tập hợp các Engine chịu trách nhiệm kiểm soát |
| **Plugin Layer** | — | Plugin System | Tập hợp các plugin ngôn ngữ/framework |
| **Workspace** | — | — | Toàn bộ runtime state tại `~/.harness/` |

---

### Core Engines

| Thuật ngữ Chuẩn | Viết tắt | Thuật ngữ Cũ / Đồng nghĩa | Định nghĩa |
|-----------------|----------|--------------------------|-----------|
| **Context Engine** | CE | Context Service, Context Builder | Xây dựng Context Pack cho AI |
| **Planning Engine** | PE | Planning Service | Validate, đánh giá risk, phê duyệt Plan |
| **Policy Engine** | — | — | Sub-module của Planning Engine, chịu trách nhiệm quyết định Governance (approve/reject/retry/escalate). Phase 1: nằm trong Planning Engine. Phase 2: có thể tách riêng. |
| **Generation Engine** | GE | ~~Scaffold Engine~~, Generation System | Sinh mọi artifact có cấu trúc (code skeleton, config, migration, test, docs). **Scaffold Engine là tên cũ v4, KHÔNG dùng nữa.** |
| **Runtime Engine** | RE | Runtime Service, Execution Runtime | Điều phối thực thi, checkpoint, rollback |
| **Verification Engine** | VE | Verification Service, Verification System | Xác minh kết quả thực thi |
| **Knowledge Engine** | KE | Knowledge Service | Lưu trữ, index, search, ranking tri thức |
| **Repository Analyzer** | RA | — | Phân tích source code, sinh metadata & draft docs |
| **Code Index** | CI | Code Intelligence | Parse source code, xây dựng Symbol Graph & Reference Graph |

---

### Dữ liệu & Artifact

| Thuật ngữ Chuẩn | Thuật ngữ Cũ | Định nghĩa |
|-----------------|-------------|-----------|
| **Context Pack** | — | Payload tối ưu chứa knowledge + code + examples cho AI |
| **Execution Plan** | Plan | Kế hoạch thực thi đã structured gồm steps, files, rollback |
| **Execution Contract** | — | Output của Planning Engine, input của Runtime Engine. Chứa scope, constraints, policies. **Phase 1: nhập vào Execution Plan, không tách riêng.** |
| **Knowledge Item** | Knowledge Artifact | Đơn vị tri thức đã chuẩn hóa trong Knowledge Engine |
| **Knowledge Bundle** | — | Tập hợp Knowledge Items được ranking cho một query |
| **Verification Report** | — | Kết quả tổng hợp từ tất cả Verification Layers |
| **Checkpoint** | Snapshot | Bản sao trạng thái file trước khi mutation |
| **Convention Profile** | — | Bộ conventions phát hiện từ repository |
| **Protected Region** | Locked Region | Vùng code AI không được sửa trong generated artifact |

---

### Risk & Policy

| Thuật ngữ Chuẩn | Giá trị | Định nghĩa |
|-----------------|---------|-----------|
| **Risk Level** | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Mức độ nguy hiểm của Plan |
| **Approval Decision** | `APPROVED`, `REJECTED`, `AWAITING_APPROVAL`, `RETRY`, `ESCALATED`, `EXPIRED` | Kết quả phê duyệt |
| **Verification Status** | `PASS`, `FAIL`, `WARN` | Kết quả xác minh |
| **Severity** | `INFO`, `WARNING`, `ERROR`, `BLOCKER` | Mức nghiêm trọng của Verification finding |

---

### Plugin & Capability

| Thuật ngữ Chuẩn | Định nghĩa |
|-----------------|-----------|
| **Capability** | Khả năng trừu tượng (Build, Test, Lint, Generate, Analyze, Verify) |
| **Capability Registry** | Nơi duy nhất quản lý và resolve Capability |
| **Capability Provider** | Plugin cung cấp implementation cho Capability |
| **Plugin Manifest** | File khai báo metadata của Plugin |

---

### Infrastructure

| Thuật ngữ Chuẩn | Định nghĩa |
|-----------------|-----------|
| **Event Bus** | Internal event bus, không phải message queue |
| **Workspace Manager** | Quản lý `~/.harness/` filesystem |
| **Audit Log** | Append-only log cho compliance và debugging |
| **Operational Log** | Log debug, có thể rotate |
| **Metrics** | Số liệu hiệu năng, có thể aggregate |

---

### Trạng thái

| Thuật ngữ Chuẩn | Context | Giá trị |
|-----------------|---------|---------|
| **Task State** | Runtime Engine | `CREATED → READY → RUNNING → VERIFYING → DONE` hoặc `FAILED → ROLLING_BACK` |
| **Step State** | Runtime Engine | `PENDING → IN_PROGRESS → DONE` hoặc `FAILED` |
| **Service Lifecycle** | Core | `Initialize → Start → Ready → Stop → Dispose` |

---

## Thuật ngữ KHÔNG Dùng

| ❌ Không dùng | ✅ Thay bằng | Lý do |
|--------------|-------------|-------|
| Scaffold Engine | Generation Engine | Tên cũ v4, Generation bao quát hơn |
| Knowledge Service | Knowledge Engine | Thống nhất suffix "-Engine" |
| Context Service | Context Engine | Thống nhất suffix "-Engine" |
| Planning Service | Planning Engine | Thống nhất suffix "-Engine" |
| Runtime Service | Runtime Engine | Thống nhất suffix "-Engine" |
| Verification Service | Verification Engine | Thống nhất suffix "-Engine" |
| Code Intelligence | Code Index | Tránh nhầm với AI intelligence |
| Locked Region | Protected Region | v5 hỗ trợ nhiều loại (immutable, append-only, replaceable, managed) |

---

**End of Glossary**
