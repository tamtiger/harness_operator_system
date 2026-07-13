# 17. CONFORMANCE SPECIFICATION

> **Version:** 4.0 | **Status:** Final | **Ngôn ngữ:** Tiếng Việt
> **Cập nhật:** 2026-07-11

---

## 1. Purpose

Conformance Specification định nghĩa tiêu chí tuân thủ và cách đánh giá các implementation.

Tài liệu này quy định:
- Các **Conformance Targets** — thành phần nào phải tuân thủ
- Các **Compliance Levels** — mức độ tuân thủ từ Core đến Full
- **Conformance Matrix** — bảng yêu cầu chi tiết theo từng target và level
- **Test Suite** — bộ test cases dùng để kiểm chứng
- **Certification Model** — quy trình cấp chứng nhận

Mọi implementation muốn được công nhận là "Harness-conformant" phải vượt qua bộ test tương ứng với level mục tiêu.

---

## 2. Conformance Targets

Các thành phần sau đây phải conform với Harness Specification:

| # | Target | Mô tả |
|---|--------|--------|
| 1 | **Project Repository** | Cấu trúc thư mục, AGENTS.md, harness.yaml |
| 2 | **Manifest (harness.yaml)** | Schema hợp lệ, các trường bắt buộc |
| 3 | **Assets** | Rules, Prompts, Templates, Knowledge, Workflows, v.v. |
| 4 | **Runtime Engine** | Thực thi task, quản lý context, capabilities |
| 5 | **CLI Tool** | Giao diện dòng lệnh, các commands chuẩn |
| 6 | **MCP Server** | Model Context Protocol adapter |
| 7 | **Shared Harness Packages** | Thư viện dùng chung, install/update/sync |

---

## 3. Compliance Levels

Có ba mức tuân thủ, xếp theo thứ tự tăng dần. Mức cao hơn bao gồm toàn bộ yêu cầu của mức thấp hơn.

### Level 1 — Core

Mức tối thiểu để được coi là một Harness implementation.

- Repository có tệp `AGENTS.md`
- `harness.yaml` hợp lệ với schema chuẩn
- Runtime có thể load được local assets
- Runtime có thể execute được basic file capabilities (`file.read`, `file.write`)
- Error codes bao gồm ít nhất nhóm `REPO_*` và `MFT_*`

### Level 2 — Standard

Mức đầy đủ cho triển khai production.

- Đáp ứng toàn bộ **Level 1**
- Shared Harness install / update / sync hoạt động đúng
- CLI hỗ trợ tất cả các commands chuẩn
- Context filter / rank / budget được implement đầy đủ
- Context caching hoạt động (cache hit trên lần build thứ hai)
- Tất cả **29 built-in capabilities** được đăng ký và hoạt động

### Level 3 — Full

Mức đầy đủ nhất, dành cho các implementation enterprise.

- Đáp ứng toàn bộ **Level 2**
- Governance engine với Proposal lifecycle hoàn chỉnh
- MCP Server adapter
- Audit logging đầy đủ
- Plugin model (custom capabilities)
- Publish to Harness Repository

---

## 4. Conformance Matrix

Bảng chi tiết mọi requirement theo từng target và compliance level:

| Requirement | Runtime | CLI | MCP | Level | Ghi chú |
|---|---|---|---|---|---|
| Repository Discovery | **MUST** | SHOULD | SHOULD | 1 | Tìm root từ subdirectory |
| Manifest Validation | **MUST** | **MUST** | SHOULD | 1 | Schema + required fields |
| Local Asset Loading | **MUST** | SHOULD | SHOULD | 1 | Load từ `.harness/` |
| Basic Capabilities (file.read, file.write) | **MUST** | SHOULD | SHOULD | 1 | Hai capability tối thiểu |
| Error Codes (REPO, MFT) | **MUST** | **MUST** | SHOULD | 1 | Hai nhóm mã lỗi bắt buộc |
| Shared Harness Install | MAY | **MUST** | MAY | 2 | CLI là primary installer |
| Context Filter/Rank/Budget | **MUST** | SHOULD | SHOULD | 2 | Pipeline xử lý context |
| Context Caching | SHOULD | MAY | MAY | 2 | Tối ưu hiệu suất |
| All 27 Built-in Capabilities | **MUST** | SHOULD | SHOULD | 2 | Danh sách đầy đủ trong spec |
| Governance (Proposal) | **MUST** | SHOULD | **MUST** | 3 | Proposal lifecycle |
| Audit Logging | **MUST** | SHOULD | MAY | 3 | Ghi log toàn bộ hành động |
| MCP Tool Interface | N/A | MAY | **MUST** | 3 | Chỉ áp dụng cho MCP |
| Plugin/Custom Capability | SHOULD | SHOULD | MAY | 3 | Extensibility model |
| Publish to Repository | MAY | **MUST** | MAY | 3 | CLI là primary publisher |

> **Ký hiệu:** MUST = bắt buộc | SHOULD = khuyến nghị | MAY = tùy chọn | N/A = không áp dụng

---

## 5. Requirement Status Definitions

Kết quả đánh giá từng requirement trong conformance report:

| Trạng thái | Ý nghĩa |
|---|---|
| **PASS** | Implemented đúng và đầy đủ |
| **FAIL** | Thiếu hoặc implement sai |
| **PARTIAL** | Implement một phần; hành vi cốt lõi đúng nhưng chưa hoàn chỉnh |
| **N/A** | Không áp dụng cho target này |
| **SKIP** | Bỏ qua do thiếu môi trường test |

---

## 6. Conformance Test Suite

Bộ test cases để kiểm chứng conformance. Mỗi test case có định danh duy nhất `TC-XX`.

### Group 1: Repository & Manifest Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-01 | Parse valid minimal manifest | Manifest hợp lệ, tối giản | Thành công, object hợp lệ |
| TC-02 | Parse manifest với unknown fields | Manifest có trường lạ | IGNORE unknown fields, không lỗi |
| TC-03 | Parse manifest thiếu required field | Manifest thiếu `id` hoặc `version` | Lỗi `MFT_003` |
| TC-04 | Parse manifest với wrong version | `spec_version: 0.1` | Lỗi `MFT_004` |
| TC-05 | Discover repository từ subdirectory | CWD là subdirectory | Trả về đúng root directory |

### Group 2: Asset Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-06 | Load rule với valid front matter | File `.md` có YAML front matter hợp lệ | Rule object đầy đủ |
| TC-07 | Load asset thiếu `id` | Asset không có trường `id` | Lỗi `REPO_006` |
| TC-08 | Load hai assets cùng ID | Hai assets có `id` trùng nhau | Lỗi `REPO_006` |
| TC-09 | Override resolution: Local overrides Shared | Local và Shared cùng `id` | Local wins |
| TC-10 | Merge resolution: Knowledge | Knowledge từ Local và Shared | Cả hai sources được merge |

### Group 3: Context Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-11 | Build context từ valid repository | Repository hợp lệ | `RuntimeContext` object |
| TC-12 | Filter by `scope_paths` | `scope_paths: ["src/"]` | Chỉ rules matching path |
| TC-13 | Budget allocation khi over limit | Context vượt token budget | Áp dụng `priority_trim` |
| TC-14 | Cache hit lần build thứ hai | Build lần 2 với same inputs | Không rebuild, cache hit |

### Group 4: Execution Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-15 | Execute task với valid workflow | Task và workflow hợp lệ | Status `COMPLETED` |
| TC-16 | Execute task, step times out | Step vượt timeout | Retry rồi lỗi `EXEC_004` |
| TC-17 | Execute task, cancel midway | Cancel signal giữa chừng | Status `CANCELLED` |
| TC-18 | Execute task, runtime context immutable | Task cố gắng mutate context | Không có side effects |

### Group 5: Capability Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-19 | Invoke `harness.file.read` với valid path | Path tồn tại | Nội dung file |
| TC-20 | Invoke capability chưa đăng ký | Tên capability không tồn tại | Lỗi `CAP_001` |
| TC-21 | Invoke capability với invalid input | Input sai schema | Lỗi `CAP_002` |
| TC-22 | Invoke capability thiếu permission | Chưa grant permission | Lỗi `CAP_004` |

### Group 6: Governance Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-23 | Create proposal | Proposal mới | Status `DRAFT` |
| TC-24 | Submit proposal không có evidence | Submit khi `evidence` rỗng | Lỗi `GOV_004` |
| TC-25 | AI agent cố approve proposal | AI agent gọi approve | FAIL — permission denied |
| TC-26 | Human approves proposal | Human reviewer approve | Status `APPROVED` |

### Group 7: CLI Tests

| Test ID | Mô tả | Input | Expected Output |
|---|---|---|---|
| TC-27 | `harness doctor` trên healthy system | Hệ thống OK | Exit code `0` |
| TC-28 | `harness validate` trên invalid repository | Repository có lỗi | Exit code `2` |
| TC-29 | `harness run` với task description | Task mô tả hợp lệ | Exit code `0` khi thành công |
| TC-30 | `harness version` | — | Version string, exit code `0` |

---

## 7. Conformance Report Schema

Kết quả test phải được xuất ra theo schema JSON sau:

```json
{
  "conformance_version": "4.0",
  "timestamp": "2026-07-11T16:58:00Z",
  "implementation": {
    "name": "string",
    "version": "string",
    "type": "Runtime | CLI | MCP | SDK"
  },
  "compliance_level": "Level 1 | Level 2 | Level 3",
  "summary": {
    "total_rules": 30,
    "passed": 28,
    "failed": 0,
    "skipped": 2
  },
  "results": [
    {
      "test_id": "TC-01",
      "status": "PASS | FAIL | PARTIAL | N/A | SKIP",
      "duration_ms": 12,
      "message": "string"
    }
  ]
}
```

**Lưu ý về schema:**
- `conformance_version` phải khớp với version của spec này (hiện tại: `"4.0"`)
- `timestamp` theo chuẩn ISO 8601 UTC
- `type` xác định loại implementation đang được test
- `compliance_level` là level cao nhất mà implementation đạt được (tất cả tests trong level đó đều PASS)
- Mỗi phần tử trong `results` tương ứng với một test case trong Section 6

---

## 8. Certification Model

### Quy trình cấp chứng nhận

```
1. Self-Validate
   └── Chạy conformance test suite nội bộ
   └── Tạo conformance-report.json

2. Submit
   └── Nộp conformance-report.json lên Harness Spec Board
   └── Kèm theo thông tin implementation (name, version, type)

3. Independent Audit
   └── Board chạy bộ test độc lập
   └── Xác minh kết quả khớp với report

4. Certification
   └── Cấp chứng nhận nếu audit pass
   └── Hợp lệ 1 năm kể từ ngày cấp
```

### Vòng đời chứng nhận

| Trạng thái | Điều kiện | Hành động |
|---|---|---|
| **Active** | Audit pass, còn trong hạn | Được phép tuyên bố "Harness-conformant" |
| **Expired** | Hết 1 năm | Phải retest với version spec mới nhất |
| **Revoked** | Implementation vi phạm contract | Mất chứng nhận, phải fix và retest |

### Điều kiện revoke

Chứng nhận bị thu hồi nếu implementation:
- Thay đổi hành vi đã được chứng nhận mà không retest
- Vi phạm backward compatibility trong cùng major version
- Có lỗ hổng bảo mật nghiêm trọng liên quan đến core spec behaviors

---

## 9. Version Compatibility Matrix

| Spec Version | Runtime Level | Trạng thái |
|---|---|---|
| 4.0 | Level 1 | ✅ Supported |
| 4.0 | Level 2 | ✅ Supported |
| 4.0 | Level 3 | ✅ Supported |
| 1.1 | Level 1 | ⚠️ Legacy — không còn được test |

> **Lưu ý:** Các implementation dựa trên spec 1.1 vẫn hoạt động nhưng không được hỗ trợ chính thức. Khuyến nghị nâng cấp lên spec 4.0.

---

## 10. Cross References

| Tài liệu | Nội dung liên quan |
|---|---|
| `01_OVERVIEW.md` | Tổng quan kiến trúc hệ thống |
| `02_MANIFEST.md` | Schema và validation rules cho `harness.yaml` |
| `03_ASSETS.md` | Cấu trúc và front matter của Assets |
| `04_RUNTIME.md` | Runtime Engine — context, execution, capabilities |
| `05_CONTEXT.md` | Context filter / rank / budget pipeline |
| `06_CAPABILITIES.md` | Danh sách 29 built-in capabilities |
| `07_ERROR_CODES.md` | Toàn bộ error codes theo nhóm |
| `08_CLI.md` | CLI commands và exit codes |
| `09_MCP.md` | MCP Server adapter specification |
| `10_GOVERNANCE.md` | Proposal lifecycle và Governance engine |
| `11_AUDIT.md` | Audit logging format và requirements |
| `12_PLUGINS.md` | Plugin model và custom capabilities |
| `13_REPOSITORY.md` | Harness Repository publish/install |
| `16_GLOSSARY.md` | Định nghĩa thuật ngữ |

---

*Tài liệu này là thành phần của Harness Operator System Specification v4.0.*
*Mọi thay đổi phải qua quy trình Proposal và được Human Reviewer phê duyệt.*
