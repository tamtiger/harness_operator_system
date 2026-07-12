# 15_SECURITY_MODEL.md

**Version:** 4.0  
**Status:** Final  
**Ngôn ngữ:** Tiếng Việt  
**Cập nhật lần cuối:** 2026-07-11

---

## 1. Purpose

Security Model định nghĩa các trust boundaries, permission model, và access constraints áp dụng cho toàn bộ Harness Operator System. Tài liệu này xác định rõ ai được phép làm gì, trong phạm vi nào, và các cơ chế bảo vệ nào được áp dụng để đảm bảo tính toàn vẹn và an toàn của hệ thống.

---

## 2. Trust Boundaries

Hệ thống phân chia trust thành các cấp độ rõ ràng. Mỗi thực thể tham gia vào hệ thống chỉ được hoạt động trong phạm vi trust level của mình.

| Boundary | Trust Level | Description |
|----------|-------------|-------------|
| Human Developer | Full Trust | Owner of project, has all permissions |
| CLI Tool | Process Trust | Runs as developer, has same filesystem access |
| AI Agent (Runtime) | Restricted Trust | Can read context, propose changes, invoke capabilities |
| Capability | Function Trust | Can only do what its contract allows |
| Shared Harness | Package Trust | Read-only, content verified by checksum |
| Harness Repository | Remote Trust | Source of shared assets, verified by checksum |

**Nguyên tắc cơ bản:** Trust level cao hơn có thể ủy quyền cho trust level thấp hơn thông qua cơ chế được kiểm soát (Capability invocation, Proposal approval), nhưng trust level thấp hơn không bao giờ được tự nâng cấp quyền của mình.

---

## 3. Permission Model

### 3.1 Định nghĩa Permissions

```typescript
enum Permission {
  READ_FILE = 'read_file',
  WRITE_FILE = 'write_file',
  DELETE_FILE = 'delete_file',
  EXECUTE_COMMAND = 'execute_command',
  NETWORK_ACCESS = 'network_access',
  GIT_READ = 'git_read',
  GIT_WRITE = 'git_write',
  HARNESS_READ = 'harness_read',
  HARNESS_WRITE = 'harness_write',
  PROPOSAL_CREATE = 'proposal_create',
  PROPOSAL_APPROVE = 'proposal_approve'
}
```

### 3.2 Permission Grants theo Role

| Role | Permissions |
|------|-------------|
| Human | All permissions |
| CLI Tool | All permissions (as human process) |
| Runtime (AI execution) | `harness_read`, `proposal_create` |
| Capability `harness.file.read` | `read_file` |
| Capability `harness.file.write` | `write_file` |
| Capability `harness.file.delete` | `delete_file` |
| Capability `harness.git.*` | `git_read`, `git_write` |
| Capability `harness.terminal.execute` | `execute_command` |
| Capability `harness.ai.*` | `network_access` |

**Lưu ý:** Runtime (AI execution) chỉ có `harness_read` và `proposal_create`. Mọi thao tác khác (đọc/ghi file, chạy lệnh, truy cập mạng) đều phải thực hiện thông qua Capability tương ứng, không phải trực tiếp.

---

## 4. Write Constraints

Đây là các ràng buộc quan trọng nhất, bảo vệ cấu hình hệ thống khỏi bị thay đổi trái phép.

### Runtime CANNOT directly write to:

- `.harness/rules/` — chỉ được đề xuất qua Proposal, không được ghi trực tiếp
- `.harness/harness.yaml` — chỉ CLI hoặc Human được phép sửa
- `.harness/adr/` — chỉ Human approve mới được tạo/sửa
- `~/.harness/` — chỉ Platform via install/update được ghi

### Runtime CAN write to (via Capability):

- `.harness/proposals/` — thông qua governance workflow
- `.harness/logs/` — audit logs từ capability execution
- Source code files trong project — thông qua `harness.file.write` capability

### Shared Harness is ALWAYS read-only:

- `~/.harness/shared/` không bao giờ bị Runtime ghi
- Chỉ Platform (install/update) được quyền ghi vào thư mục này
- Bất kỳ attempt nào từ Runtime để ghi vào Shared Harness đều bị từ chối với lỗi REPO_010

---

## 5. Path Security

Ngăn chặn path traversal attacks và directory escape:

- **Validate path** không chứa `..` sequences (cả dạng encoded `%2e%2e`)
- **Validate path** nằm trong allowed directories trước khi thực hiện bất kỳ thao tác nào
- **Resolve canonical path** trước validation để loại bỏ symlink chains và relative components
- **Reject symbolic links** trỏ ra ngoài project boundary
- **Error:** `REPO_014` khi phát hiện path traversal attempt

**Ví dụ bị từ chối:**
```
.harness/../../etc/passwd          → REPO_014
.harness/logs/../rules/custom.yaml → REPO_014
/tmp/evil -> /etc/passwd (symlink) → REPO_014
```

---

## 6. Checksum Verification

Đảm bảo tính toàn vẹn của Shared Harness:

- **SHA-256 checksums** được tính và lưu cho mọi file trong Shared Harness
- **Lưu trong** `~/.harness/metadata/checksum.yaml`
- **Verify khi load:** so sánh actual checksum vs stored checksum
- **Fail with `REPO_009`** nếu checksum mismatch — không tiếp tục load
- **Re-verify on update** — sau mỗi lần update, toàn bộ checksums được tính lại

**Format checksum.yaml:**
```yaml
checksums:
  shared/capabilities/harness.file.read.yaml: sha256:abc123...
  shared/capabilities/harness.file.write.yaml: sha256:def456...
  # ...
generated_at: "2026-07-11T17:37:37Z"
```

---

## 7. Human Approval Gate

Đây là security control quan trọng nhất của toàn bộ hệ thống:

- **AI Agent không bao giờ tự động APPROVE Proposal** — đây là bất biến tuyệt đối
- **APPROVE chỉ có thể bởi Human**, sử dụng lệnh `harness proposal approve <proposal-id>`
- **Promote chỉ xảy ra sau APPROVE** bởi Human — không có đường tắt
- **Audit log ghi lại mọi approval action** với đầy đủ thông tin: timestamp, actor (human username), proposal ID

**Luồng bắt buộc:**
```
AI proposes → Proposal created (PENDING)
                    ↓
            Human reviews manually
                    ↓
            Human runs: harness proposal approve <id>
                    ↓
            Proposal APPROVED → Promote executed
```

Bất kỳ cơ chế nào cố gắng bypass bước Human approval đều phải bị từ chối tại tầng enforcement.

---

## 8. Capability Permission Enforcement

Mọi Capability đều bị kiểm soát chặt chẽ về quyền trước khi được invoke:

- **Mọi Capability khai báo** required permissions trong `CapabilityDefinition`
- **Registry validate permissions** trước invoke — không invoke nếu thiếu quyền
- **Permissions khai báo** trong manifest tại `capabilities[].permissions` hoặc `default`
- **Error: `CAP_004`** khi thiếu permission cần thiết

**Ví dụ CapabilityDefinition:**
```yaml
id: harness.file.write
permissions:
  required:
    - write_file
  optional:
    - read_file
```

---

## 9. Sensitive Data Handling

Bảo vệ thông tin nhạy cảm khỏi bị lộ lọt:

- **Không store secrets** trong `.harness/` (passwords, API keys, tokens, private keys)
- **Không log sensitive data** — passwords, tokens, keys không được xuất hiện trong bất kỳ log nào
- **Audit logs chỉ ghi** actions và metadata, không ghi file contents hay secret values
- **Log files phải được gitignored** — xem `12_FILESYSTEM_SPECIFICATION.md` để biết danh sách đầy đủ

**Cách đúng để cung cấp credentials:**
```bash
# Sử dụng environment variables, không hardcode vào harness.yaml
export HARNESS_REPO_TOKEN=ghp_xxx
harness sync
```

---

## 10. Input Validation

Mọi input đều phải được validate trước khi xử lý:

- **Mọi input từ user** (CLI args, MCP tool calls) được validate về type, format, và allowed values
- **Capability input được validate** against JSONSchema trước khi execute
- **Manifest được validate** against schema trước khi use
- **Asset metadata được validate** khi load

**Validation layers:**
```
CLI Input → CLI Argument Validator
                ↓
MCP Tool Call → MCP Input Validator
                ↓
Capability Invoke → JSONSchema Validator (per capability)
                ↓
Manifest Load → Schema Validator (harness.schema.yaml)
```

---

## 11. Network Security

Kiểm soát mọi kết nối mạng của hệ thống:

- **HTTPS required** cho tất cả remote sources — HTTP bị từ chối
- **Certificate validation enabled** by default — không được tắt trong production
- **No credentials stored** trong `harness.yaml` — sử dụng environment variables
- **Source URIs được validate** là HTTPS URLs hoặc SSH git URLs trước khi connect

**URIs được chấp nhận:**
```
https://github.com/org/repo.git   ✓
git@github.com:org/repo.git       ✓
http://example.com/repo.git       ✗ (HTTP không được phép)
file:///local/path                ✗ (file scheme bị từ chối cho remote sources)
```

---

## 12. Audit Trail

Ghi lại đầy đủ mọi hành động quan trọng trong hệ thống:

- **Mọi Proposal state change** được log vào `audit.jsonl`
- **Audit record bao gồm:** timestamp, actor, action, proposal ID
- **Audit log là append-only** — không được sửa hoặc xóa entries đã ghi
- **Per-task execution logs** ghi lại các capability được invoke trong mỗi task

**Format audit record:**
```json
{
  "timestamp": "2026-07-11T17:37:37.709+07:00",
  "actor": "human:developer",
  "action": "proposal.approve",
  "proposal_id": "prop-2026-001",
  "result": "success"
}
```

---

## 13. Security Invariants

Các bất biến này không bao giờ được vi phạm, bất kể điều kiện nào:

1. **Shared Harness luôn read-only với Runtime** — không có exception
2. **Human approval luôn required cho promote** — không có auto-approve
3. **Path traversal luôn bị reject** — không có bypass
4. **Checksums luôn được verify khi load Shared Harness** — không được skip

Nếu bất kỳ invariant nào bị vi phạm, đây là dấu hiệu của security compromise và phải được điều tra ngay lập tức.

---

## 14. Cross References

| Tài liệu | Liên quan |
|----------|-----------|
| `01_SYSTEM_OVERVIEW.md` | Kiến trúc tổng thể, vị trí Security Model trong hệ thống |
| `03_CAPABILITY_SYSTEM.md` | Chi tiết Capability permission enforcement |
| `07_GOVERNANCE_WORKFLOW.md` | Human Approval Gate workflow đầy đủ |
| `10_ERROR_CODES.md` | REPO_009, REPO_014, CAP_004 error definitions |
| `12_FILESYSTEM_SPECIFICATION.md` | Gitignore rules cho log files, path structure |
| `14_AUDIT_LOGGING.md` | Chi tiết Audit Trail format và retention |

---

*Tài liệu này là một phần của Harness Operator System Knowledge Base. Mọi thay đổi phải tuân theo governance workflow được định nghĩa trong `07_GOVERNANCE_WORKFLOW.md`.*
