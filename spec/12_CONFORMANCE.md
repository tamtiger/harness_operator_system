# 12. CONFORMANCE

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose & Conformance Targets

## 1.1 Purpose
Conformance Specification định nghĩa các tiêu chí đánh giá mức độ tuân thủ (compliance) của các implementation (Runtime, CLI, MCP Server, SDK) đối với Harness Specification. Mục tiêu là loại bỏ hoàn toàn sự tự giải nghĩa và đảm bảo tính hoán đổi lẫn nhau (interoperability).

## 1.2 Conformance targets
Các thành phần bắt buộc phải conform gồm:
1. **Repository (Local/Project)**
2. **Manifest (`harness.yaml`)**
3. **Artifact (Rules, ADR, Map)**
4. **Runtime Engine**
5. **CLI Tool**
6. **MCP Server**
7. **SDK**
8. **Shared Harness packages**

---

# 2. Compliance Levels

Đặc tả phân chia thành 3 mức tương thích tăng dần:

### Level 1 - Core Compliance
- **Yêu cầu**: Cung cấp cấu trúc Repository hợp lệ, có `AGENTS.md`, manifest đúng schema, Runtime nạp được tri thức cục bộ và thực thi được các Repository Capabilities cơ bản (`read_file`, `write_file`).
- **Target**: Project Repository, Manifest, Runtime.

### Level 2 - Standard Compliance
- **Yêu cầu**: Đầy đủ Level 1, bổ sung CLI Tool hỗ trợ cả hai chế độ Shared Mode & Repository Mode, tự động sync map, quản lý và install Shared Harness từ registry qua version pinning.
- **Target**: CLI, Shared Harness, Capability Registry.

### Level 3 - Full Compliance
- **Yêu cầu**: Đầy đủ Level 2, bổ sung Governance Engine quản lý Proposal lifecycle (Draft -> Submitted -> Approved), tích hợp MCP Server kết nối stdio, SDK cung cấp đầy đủ 6 nhóm API và hỗ trợ Platform Extension Model. Chỉ có Level 3 mới hỗ trợ tính năng **Auto-Approve** (tự động phê duyệt các thay đổi Low-risk khi pass 100% test).
- **Target**: Governance Model, MCP Server, SDK, Extension Framework.

---

# 3. Conformance Matrix

Bảng ma trận phân phối mức độ bắt buộc của các yêu cầu đặc tả (Conformance Matrix):

| Requirement | Runtime | CLI | MCP Server | SDK | Level |
|---|---|---|---|---|---|
| **Repository Discovery** | **MUST** | **SHOULD** | **SHOULD** | **MAY** | Level 1 |
| **Manifest Validation** | **MUST** | **MUST** | **SHOULD** | **MAY** | Level 1 |
| **Artifact Loader & Cache** | **MUST** | **SHOULD** | **SHOULD** | **SHOULD** | Level 1 |
| **Capability Registry** | **MUST** | **SHOULD** | **MUST** | **SHOULD** | Level 2 |
| **Shared Harness Installer** | **MAY** | **MUST** | **MAY** | **SHOULD** | Level 2 |
| **Governance Draft Proposals** | **MUST** | **SHOULD** | **MUST** | **SHOULD** | Level 3 |
| **Traceability Audit Logs** | **MUST** | **SHOULD** | **MAY** | **SHOULD** | Level 3 |
| **Extension Plugin Discovery** | **MUST** | **SHOULD** | **MAY** | **MUST** | Level 3 |

---

# 4. Conformance Rules & Validation Process

## 4.1 Requirement Status Definitions
Trong kết quả đánh giá (Conformance Report), trạng thái của từng requirement được gán một trong các nhãn:
- **PASS**: Triển khai đầy đủ và chính xác theo đặc tả.
- **FAIL**: Thiếu hoặc triển khai sai lệch hành vi bắt buộc.
- **PARTIAL**: Triển khai thiếu một số trường optional hoặc recommended nhưng giữ nguyên hành vi cốt lõi.
- **NOT_APPLICABLE (N/A)**: Requirement thuộc thành phần không yêu cầu ở Compliance Level hiện hành.
- **SKIPPED**: Bỏ qua do thiếu môi trường kiểm thử tương ứng.

## 4.2 Conformance Validation Process
Tiến trình đánh giá tuân thủ (Validation Flow) chạy tự động qua 5 bước:

```text
Load Spec Rules ──► Scan Target Directory ──► Run Conformance Test Suite ──► Compile Results ──► Write Report JSON
```

1. **Load Rules**: Validator nạp danh sách các Assertions của Harness Spec.
2. **Discovery**: Validator quét thư mục cài đặt của implementation hoặc project repo.
3. **Execute Tests**: Chạy các test case giả lập hành vi (ví dụ: gửi manifest sai schema xem Runtime có trả đúng mã lỗi `MANIFEST_INVALID` hay không).
4. **Collect Outcome**: Tổng hợp kết quả pass/fail của từng assertion.
5. **Output**: Sinh file `conformance-report.json`.

---

# 5. Conformance Test Suite

Bộ test suite tiêu chuẩn được chia thành các nhóm con:

### 1. Repository & Manifest Test
- **Purpose**: Đảm bảo tệp manifest được parse chuẩn xác.
- **Pass Condition**: Parser trả về đúng đối tượng cấu hình khi YAML đúng và ném ra lỗi `MANIFEST_INVALID` khi YAML sai. Đồng thời, Parser phải bỏ qua các trường không xác định ở cấp cao nhất hoặc nằm trong vùng namespace `vendor:`.

### 2. Artifact Format Test
- **Purpose**: Đảm bảo tệp markdown rules/adr có metadata frontmatter đúng quy chuẩn.
- **Pass Condition**: Trả về `INVALID_METADATA` nếu frontmatter thiếu trường `id` hoặc `status`.

### 3. Runtime Lifecycle Test
- **Purpose**: Đảm bảo Runtime đi đúng máy trạng thái (Created -> Initializing -> Ready -> Planning -> Executing -> Verifying -> Passed -> Completed).
- **Pass Condition**: Runtime chuyển đổi trạng thái chính xác và cấm các transition bất hợp lệ (ví dụ: chuyển thẳng từ Created sang Completed).

### 4. CLI Command Test
- **Purpose**: Đảm bảo các exit code của CLI đồng bộ.
- **Pass Condition**: CLI trả exit code `0` khi chạy lệnh validate thành công và trả exit code `2` khi phát hiện vi phạm rules.

---

# 6. Certification Model & Compatibility Matrix

## 6.1 Certification Lifecyle
Quy trình chứng nhận tương thích (Certification Model):

```text
[Pending] ──► [Testing] ──► [Certified] ──► [Expired]
                                 │
                                 └──► [Revoked]
```

- **Pending**: Đăng ký chứng nhận.
- **Testing**: Chạy Conformance Test Suite.
- **Certified**: Đạt 100% các PASS của Required rules. Cấp chứng chỉ có thời hạn 1 năm.
- **Expired**: Hết hạn, yêu cầu test lại trên phiên bản Spec mới.
- **Revoked**: Bị thu hồi nếu phát hiện cố tình lách test hoặc sửa đổi runtime phá vỡ contract.

## 6.2 Version Compatibility Matrix
Định nghĩa khả năng tương thích giữa các phiên bản chính của Runtime và Specification:

| Specification Version | Runtime 1.0 (Core) | Runtime 1.1 (Standard) | Runtime 2.0 (Full) |
|---|---|---|---|
| **Spec 1.0** | **Supported** | Backward Compatible | Backward Compatible |
| **Spec 1.1** | Unsupported | **Supported** | Backward Compatible |
| **Spec 2.0** | Unsupported | Unsupported (Upgrade Req) | **Supported** |

---

# 7. Conformance Report Schema

Báo cáo kết quả Conformance bắt buộc phải xuất ra file JSON khớp với schema sau:

```json
{
  "conformance_version": "1.1",
  "timestamp": "2026-07-10T15:30:00Z",
  "implementation": {
    "name": "Kiro Runtime Engine",
    "version": "v1.0.5",
    "type": "Runtime"
  },
  "compliance_level": "Level 1",
  "summary": {
    "total_rules": 45,
    "passed": 42,
    "failed": 0,
    "skipped": 3
  },
  "results": [
    {
      "rule_id": "RFC-01-MANIFEST-LOAD",
      "status": "PASS",
      "duration_ms": 12,
      "message": "Manifest parsed successfully."
    }
  ]
}
```

---

# 8. Feature Matrix & Vendor Certification

## 8.1 Specification Feature Matrix
Để đánh giá chi tiết tính tuân thủ của một implementation, validator so khớp với ma trận tính năng (Feature Matrix):

| Feature Area | Specific Feature Check | Core Level | Standard Level | Full Level |
|---|---|---|---|---|
| **Repository** | Đọc `AGENTS.md` & `.harness/` | **MUST** | **MUST** | **MUST** |
| **Manifest** | Parser YAML & Validate schema | **MUST** | **MUST** | **MUST** |
| **Context** | Lọc và Xếp hạng tri thức (Ranking) | **MUST** | **MUST** | **MUST** |
| **Execution** | State Machine & Retry logic | **MUST** | **MUST** | **MUST** |
| **Capability** | Invocation & Permission model | **MUST** | **MUST** | **MUST** |
| **Workflow** | Chạy kiểm chứng tự động (Verify state) | **MUST** | **MUST** | **MUST** |
| **Governance** | Ghi Proposal, review & audit logs | **MAY** | **SHOULD** | **MUST** |
| **Shared Harness** | Tải từ registry, sync & check integrity | **MAY** | **MUST** | **MUST** |

## 8.2 Vendor Certification Process
Để một nhà phát triển được quyền công bố sản phẩm của mình đạt chuẩn "Harness Compatible":
1. **Self-Validation**: Phải tự chạy bộ Conformance Test Suite chính thức và pass 100% các Required assertions tương ứng với Compliance Level đăng ký (Core, Standard hoặc Full).
2. **Certification Report Submission**: Gửi tệp tin `conformance-report.json` và log chạy test suite lên Hội đồng đặc tả Harness (Harness Spec Board).
3. **Audit & Review**: Ban quản trị đặc tả chạy audit độc lập. Sau khi phê duyệt, sản phẩm sẽ được liệt kê vào danh sách Certified Implementations.

## 8.3 Experimental & Feature Lifecycle
Mỗi tính năng của đặc tả trải qua vòng đời:
- **Experimental Features**: Các tính năng mới bổ sung, chưa cam kết ổn định. Runtime chạy các tính năng này bắt buộc phải in ra cảnh báo (Warning) trong log: `Experimental Feature Invoked: [feature name]`.
- **Stable Features**: Đã đạt chuẩn tuân thủ.
- **Deprecated Features**: Tính năng cũ sắp loại bỏ. Runtime MUST đưa ra cảnh báo khuyến cáo nâng cấp.

---

# 8. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa cấu trúc Repository |
| 03. EXECUTION MODEL | Định nghĩa State Machine và Runtime Errors |
| 05. PLATFORM MODEL | Định nghĩa CLI và MCP Contracts |
| 08. MANIFEST SPECIFICATION | Định nghĩa Manifest Schema |
