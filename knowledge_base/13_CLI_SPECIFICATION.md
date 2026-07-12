# 13. CLI SPECIFICATION

**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Cập nhật lần cuối:** 2026-07-11

---

## Tóm tắt

CLI là **adapter layer** thuần túy. Mọi command chỉ nhận input từ terminal, chuyển tiếp đến `PlatformService`, và format kết quả để hiển thị. CLI **không chứa business logic**, **không gọi domain services trực tiếp**.

---

## 1. Purpose

CLI là adapter layer trong kiến trúc Harness Operator System.

Luồng xử lý cơ bản:
```
User Input → CLI → PlatformService → CLI → Formatted Output
```

Trách nhiệm của CLI:
- **Nhận** user input từ terminal (arguments, flags, options)
- **Gọi** PlatformService với các tham số đã parse
- **Format** kết quả trả về từ PlatformService thành text/JSON hiển thị cho người dùng

CLI **không được phép**:
- Chứa business logic
- Gọi trực tiếp domain services (WorkflowService, ProposalService, v.v.)
- Thực hiện side effects ngoài việc format output

---

## 2. CLI Architecture

```
User
  ↓ terminal input
CLI Argument Parser
  ↓ parsed args
CLI Command Router
  ↓ command + options
CLI Command Handler
  ↓ PlatformService calls
PlatformService
  ↓ result
CLI Output Formatter
  ↓ formatted text
Terminal Output
```

### Mô tả các thành phần

| Thành phần | Trách nhiệm |
|---|---|
| **CLI Argument Parser** | Parse `argv`, validate syntax, extract flags và positional args |
| **CLI Command Router** | Map command string sang Command Handler tương ứng |
| **CLI Command Handler** | Nhận parsed args, gọi đúng method trên PlatformService |
| **PlatformService** | Toàn bộ business logic nằm ở đây (ngoài phạm vi CLI) |
| **CLI Output Formatter** | Chuyển PlatformService result thành text hoặc JSON cho terminal |

> **Nguyên tắc cốt lõi:** CLI không chứa business logic. CLI chỉ là cầu nối giữa terminal và PlatformService.

---

## 3. Command Reference

### harness init

```
harness init [path] [--source <uri>] [--version <ver>] [--force]
```

**Mô tả:** Initialize `.harness/` structure trong project directory.

**Hành động:**
- Tạo `.harness/harness.yaml`
- Tạo `.harness/AGENTS.md` template
- Tạo `.harness/rules/` directory

**Options:**
| Flag | Mô tả |
|------|-------|
| `path` | Đường dẫn project (mặc định: current directory) |
| `--source <uri>` | URI của Shared Harness source |
| `--version <ver>` | Version của Shared Harness |
| `--force` | Override nếu đã initialized |

**Gọi:** `Platform.init()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `1` | Already initialized (dùng `--force` để override) |
| `2` | Error |

---

### harness install

```
harness install [--source <uri>] [--version <ver>] [--verify]
```

**Mô tả:** Install Shared Harness vào `~/.harness/`.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--source <uri>` | URI nguồn cài đặt |
| `--version <ver>` | Version cụ thể cần cài |
| `--verify` | Xác minh tính toàn vẹn sau khi cài |

**Gọi:** `Platform.install()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `1` | Already installed at same version |
| `2` | Error |

---

### harness update

```
harness update [--version <ver>] [--dry-run] [--yes]
```

**Mô tả:** Update Shared Harness lên version mới hơn.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--version <ver>` | Version cụ thể cần update lên |
| `--dry-run` | Chỉ hiển thị thay đổi sẽ xảy ra, không thực hiện |
| `--yes` | Tự động confirm, không hỏi lại |

**Gọi:** `Platform.update()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Updated successfully |
| `1` | Already up-to-date |
| `2` | Error |

---

### harness sync

```
harness sync [--check] [--verbose]
```

**Mô tả:** Sync Shared Harness với remote source.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--check` | Chỉ hiển thị diff, không apply thay đổi |
| `--verbose` | Hiển thị chi tiết quá trình sync |

**Gọi:** `Platform.sync()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Synced successfully |
| `1` | No changes needed |
| `2` | Error |

---

### harness run

```
harness run <task-description> [--workflow <id>] [--dry-run] [--verbose]
```

**Mô tả:** Execute một task thông qua Harness workflow.

**Arguments:**
| Argument | Mô tả |
|----------|-------|
| `<task-description>` | (Bắt buộc) Mô tả task cần thực hiện |

**Options:**
| Flag | Mô tả |
|------|-------|
| `--workflow <id>` | Chỉ định workflow ID cụ thể |
| `--dry-run` | Mô phỏng task, không thực thi thật |
| `--verbose` | Hiển thị chi tiết quá trình thực thi |

**Gọi:** `Platform.run()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `2` | Execution error |
| `3` | Verification failed |

---

### harness validate

```
harness validate [path] [--strict]
```

**Mô tả:** Validate cấu trúc repository theo Harness specification.

**Arguments:**
| Argument | Mô tả |
|----------|-------|
| `path` | Đường dẫn cần validate (mặc định: current directory) |

**Options:**
| Flag | Mô tả |
|------|-------|
| `--strict` | Bật strict mode, treat warnings as errors |

**Gọi:** `Platform.validate()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Valid, no issues |
| `1` | Warnings only |
| `2` | Errors found |

---

### harness doctor

```
harness doctor [--json] [--fix]
```

**Mô tả:** Kiểm tra sức khỏe toàn bộ hệ thống Harness.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--json` | Output JSON thay vì text |
| `--fix` | Tự động sửa các vấn đề có thể sửa được |

**Gọi:** `Platform.doctor()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Healthy, no issues |
| `1` | Warnings detected |
| `2` | Critical issues found |

---

### harness publish

```
harness publish [--dry-run] [--yes]
```

**Mô tả:** Publish các promoted assets lên Harness Repository.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--dry-run` | Hiển thị những gì sẽ được publish, không thực hiện |
| `--yes` | Tự động confirm, không hỏi lại |

**Gọi:** `Platform.publish()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Published successfully |
| `1` | Nothing to publish |
| `2` | Error |

---

### harness conformance run

```
harness conformance run [--level <1|2|3>] [--json]
```

**Mô tả:** Chạy bộ test conformance M10 để đánh giá mức độ tuân thủ của repository và system.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--level <level>` | Mức độ tuân thủ cần kiểm tra (1, 2, hoặc 3). Mặc định là 3. |
| `--json` | Output kết quả dưới dạng JSON (Compliance Report) thay vì text. |

**Gọi:** `Platform.runConformance()` (thông qua CLI command adapter)

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success (Tất cả test passes) |
| `1` | Partial (Có test fail/skip) |
| `2` | Error (Lỗi hệ thống khi chạy test) |

---
### harness proposal list

```
harness proposal list [--status <status>] [--json]
```

**Mô tả:** Liệt kê danh sách proposals.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--status <status>` | Lọc theo trạng thái (`draft`, `submitted`, `approved`, `rejected`) |
| `--json` | Output JSON thay vì text |

**Gọi:** `Platform.listProposals()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `2` | Error |

---

### harness proposal submit

```
harness proposal submit <id> [--message <msg>]
```

**Mô tả:** Submit một draft proposal để chờ approval.

**Arguments:**
| Argument | Mô tả |
|----------|-------|
| `<id>` | (Bắt buộc) Proposal ID cần submit |

**Options:**
| Flag | Mô tả |
|------|-------|
| `--message <msg>` | Ghi chú kèm theo khi submit |

**Gọi:** `Platform.submitProposal()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `2` | Error |

---

### harness proposal approve

```
harness proposal approve <id> [--message <msg>]
```

**Mô tả:** Approve một proposal đã được submit. **Chỉ human mới được thực hiện lệnh này.**

**Arguments:**
| Argument | Mô tả |
|----------|-------|
| `<id>` | (Bắt buộc) Proposal ID cần approve |

**Options:**
| Flag | Mô tả |
|------|-------|
| `--message <msg>` | Ghi chú kèm theo khi approve |

**Gọi:** `Platform.approveProposal()`

> ⚠️ **Human-only action.** AI agents không được phép gọi lệnh này.

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `2` | Error |

---

### harness status

```
harness status [--json]
```

**Mô tả:** Hiển thị trạng thái hiện tại của toàn bộ hệ thống.

**Options:**
| Flag | Mô tả |
|------|-------|
| `--json` | Output JSON thay vì text |

**Gọi:** `Platform.status()`

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Success |
| `2` | Error |

---

### harness version

```
harness version
```

**Mô tả:** Hiển thị CLI version và specification version hiện tại.

**Gọi:** Không gọi PlatformService (thông tin tĩnh).

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Always success |

**Ví dụ output:**
```
harness CLI v4.0.0
Specification: 4.0 (Final)
```

---

### harness help

```
harness help [command]
```

**Mô tả:** Hiển thị help text cho CLI hoặc cho một command cụ thể.

**Arguments:**
| Argument | Mô tả |
|----------|-------|
| `command` | (Tùy chọn) Tên command cần xem help |

**Gọi:** Không gọi PlatformService (thông tin tĩnh).

**Exit codes:**
| Code | Ý nghĩa |
|------|---------|
| `0` | Always success |

---

## 4. Global Flags

Các flags này áp dụng cho **tất cả** commands:

```
--help, -h             Hiển thị help
--version, -v          Hiển thị version
--verbose              Verbose output (chi tiết hơn)
--quiet, -q            Suppress tất cả non-error output
--no-color             Tắt màu ANSI trong output
--json                 Output JSON (ở những command hỗ trợ)
--cwd <path>           Override working directory
--harness-home <path>  Override đường dẫn ~/.harness
```

**Thứ tự ưu tiên (cao → thấp):**
1. CLI flags (cao nhất)
2. Environment variables
3. Config file (`~/.harness/cli.yaml`)
4. Default values (thấp nhất)

---

## 5. Exit Code Standard

| Code | Ý nghĩa |
|------|---------|
| `0` | Success — hoàn thành không có lỗi |
| `1` | Partial success / warnings — hoàn thành nhưng có cảnh báo |
| `2` | General error — lỗi chung |
| `3` | Validation/verification error — lỗi xác thực |
| `4` | Permission error — không đủ quyền |
| `5` | Not found — resource không tồn tại |
| `130` | Interrupted — người dùng nhấn Ctrl+C |

> **Lưu ý:** Exit code `130` là chuẩn Unix cho SIGINT (signal 2 + 128).

---

## 6. Output Format

### Nguyên tắc phân luồng

| Loại output | Stream | Ghi chú |
|-------------|--------|---------|
| Results (kết quả thành công) | `stdout` | Dùng để pipe/redirect |
| Errors (lỗi) | `stderr` | Luôn luôn stderr, kể cả khi `--quiet` |
| Progress (tiến trình) | `stderr` | Spinner, loading indicators |
| Warnings | `stderr` | Kèm exit code 1 |

### Chế độ output

**Default (human-readable text):**
```
✓ Harness initialized at ./my-project/.harness/
  Created: harness.yaml
  Created: AGENTS.md
  Created: rules/
```

**JSON mode (`--json`):**
```json
{
  "status": "success",
  "path": "./my-project/.harness/",
  "created": ["harness.yaml", "AGENTS.md", "rules/"]
}
```

### Màu sắc

- ANSI colors được bật mặc định
- Tắt bằng `--no-color` hoặc biến môi trường `HARNESS_NO_COLOR`
- Tự động tắt khi output không phải TTY (pipe/redirect)

---

## 7. Environment Variables

| Variable | Mô tả | Giá trị mặc định |
|----------|-------|-----------------|
| `HARNESS_HOME` | Đường dẫn cài đặt Shared Harness | `~/.harness` |
| `HARNESS_LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` | `info` |
| `HARNESS_NO_COLOR` | Tắt màu ANSI (tương đương `--no-color`) | *(không set)* |
| `HARNESS_SPEC_VERSION` | Override specification version check | *(không set)* |

> **Lưu ý:** CLI flags có độ ưu tiên cao hơn environment variables.

---

## 8. Configuration File

CLI đọc config từ `~/.harness/cli.yaml` khi khởi động.

**Cấu trúc file:**
```yaml
# ~/.harness/cli.yaml

# URI mặc định khi không cung cấp --source
default_source: "https://github.com/my-org/shared-harness.git"

# Version mặc định khi không cung cấp --version
default_version: "latest"

# Bật verbose output mặc định
verbose: false

# Tắt màu ANSI mặc định
no_color: false

# Định dạng output mặc định: "text" hoặc "json"
output_format: text
```

**Thứ tự load:**
1. Đọc `~/.harness/cli.yaml` (nếu tồn tại)
2. Override với environment variables
3. Override với CLI flags

---

## 9. Error Handling

### Format lỗi (text mode)

```
[ERROR] {code}: {message}
  Remedy: {remediation}
```

**Ví dụ:**
```
[ERROR] NOT_INITIALIZED: No .harness/ directory found in current path.
  Remedy: Run `harness init` to initialize this project.
```

### Format lỗi (JSON mode, `--json`)

```json
{
  "error": {
    "code": "NOT_INITIALIZED",
    "message": "No .harness/ directory found in current path.",
    "remediation": "Run `harness init` to initialize this project."
  }
}
```

### Nguyên tắc

- Errors **luôn luôn** ghi vào `stderr`
- Lỗi phải kèm theo `remediation` (hướng dẫn khắc phục) khi có thể
- Không expose stack traces trong production mode (chỉ trong `--verbose` hoặc `debug` log level)
- Ctrl+C (SIGINT) phải được xử lý gracefully → exit code `130`

---

## 10. MCP Adapter

Ngoài CLI, PlatformService còn được expose thông qua **MCP (Model Context Protocol) Server**, cho phép AI agents tương tác với hệ thống Harness.

### Kiến trúc MCP

```
AI Agent
  ↓ MCP JSON protocol
MCP Server (adapter)
  ↓ PlatformService calls
PlatformService
  ↓ result
MCP Server (adapter)
  ↓ MCP JSON protocol
AI Agent
```

### MCP Tools được expose

| Tool | Tương đương CLI | PlatformService method |
|------|----------------|----------------------|
| `harness_run` | `harness run` | `Platform.run()` |
| `harness_validate` | `harness validate` | `Platform.validate()` |
| `harness_proposal_list` | `harness proposal list` | `Platform.listProposals()` |
| `harness_proposal_submit` | `harness proposal submit` | `Platform.submitProposal()` |

> **Lưu ý:** `harness proposal approve` **không** được expose qua MCP. Approval là human-only action.

### Nguyên tắc MCP Adapter

- MCP Server là **adapter thuần túy**, tương tự CLI
- MCP Server **chỉ gọi PlatformService**, không gọi domain services trực tiếp
- Input/output tuân theo MCP JSON protocol chuẩn
- MCP Server không chứa business logic

---

## 11. Design Rules

Các quy tắc thiết kế này là **bất biến** và phải được tuân thủ trong mọi implementation:

1. **CLI không chứa business logic.**  
   Mọi logic xử lý phải nằm trong PlatformService hoặc các domain services bên dưới.

2. **CLI không gọi domain services trực tiếp.**  
   CLI chỉ được phép gọi `PlatformService`. Không gọi `WorkflowService`, `ProposalService`, hay bất kỳ domain service nào khác.

3. **Mọi command đi qua PlatformService.**  
   Không có ngoại lệ. Kể cả các command đơn giản như `status` hay `validate`.

4. **CLI format lại output từ PlatformService results.**  
   CLI nhận raw result từ PlatformService và chịu trách nhiệm format thành human-readable text hoặc JSON.

5. **CLI xử lý Ctrl+C gracefully.**  
   SIGINT phải được bắt, cleanup phải được thực hiện, exit code phải là `130`.

6. **CLI không tự tạo ra data hay quyết định.**  
   CLI không được tự suy diễn, tự quyết định, hay tự thêm data. CLI chỉ truyền tải.

---

## 12. Cross References

| Tài liệu | Liên quan |
|----------|-----------|
| `01_SYSTEM_OVERVIEW.md` | Kiến trúc tổng thể, vị trí của CLI trong hệ thống |
| `02_PLATFORM_SERVICE.md` | PlatformService API — tất cả methods mà CLI gọi |
| `03_WORKFLOW_ENGINE.md` | Workflow execution (được gọi qua Platform.run()) |
| `08_PROPOSAL_LIFECYCLE.md` | Proposal flow (được gọi qua Platform.*Proposal()) |
| `10_HARNESS_REPOSITORY.md` | Publish flow (được gọi qua Platform.publish()) |
| `12_OPERATOR_RULES.md` | Quy tắc vận hành, bao gồm human-only actions |

---

*Tài liệu này là Final. Mọi thay đổi phải được review và phê duyệt theo quy trình proposal.*
