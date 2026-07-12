# 14. Error Model — Harness Platform

**Version:** 4.0 | **Status:** Final | **Ngôn ngữ:** Tiếng Việt
**Cập nhật lần cuối:** 2026-07-11

---

## 1. Mục Đích (Purpose)

Tài liệu này là **single source of truth** cho toàn bộ error codes của Harness Platform.

Mọi domain (Repository, Manifest, Context, Execution, Capability, Governance, Platform) đều sử dụng các error codes được định nghĩa tại đây. Không được tự ý tạo error codes ngoài danh sách này. Khi cần thêm code mới, phải cập nhật tài liệu này trước.

---

## 2. Cấu Trúc Lỗi (Error Structure)

```typescript
interface HarnessError {
  code: string          // e.g. "REPO_001"
  domain: ErrorDomain   // enum
  message: string       // human-readable
  details?: unknown     // structured context
  retryable: boolean
  timestamp: ISO8601
  stackTrace?: string   // debug mode only
}

enum ErrorDomain {
  REPOSITORY = 'REPOSITORY',
  CONTEXT    = 'CONTEXT',
  EXECUTION  = 'EXECUTION',
  CAPABILITY = 'CAPABILITY',
  GOVERNANCE = 'GOVERNANCE',
  PLATFORM   = 'PLATFORM',
  MANIFEST   = 'MANIFEST'
}
```

---

## 3. Quy Ước Error Code (Error Code Convention)

- **Format:** `{DOMAIN_PREFIX}_{NNN}`
- **Domain prefixes:**

| Domain | Prefix |
|--------|--------|
| Repository | `REPO` |
| Context | `CTX` |
| Execution | `EXEC` |
| Capability | `CAP` |
| Governance | `GOV` |
| Platform | `PLT` |
| Manifest | `MFT` |

- **NNN:** Số 3 chữ số, phạm vi `001–099` theo từng category.
- **Categories theo domain:**

| Phạm vi | Category |
|---------|----------|
| 001–009 | Discovery |
| 010–019 | Loading |
| 020–029 | Validation |
| 030–039 | Runtime |
| 040–049 | Integration |

---

## 4. Repository Errors (REPO_)

| Code | Message | Retryable | Recovery | Category |
|------|---------|-----------|----------|----------|
| REPO_001 | Repository root not found | No | Run from within a project directory | Discovery |
| REPO_002 | harness.yaml not found | No | Run `harness init` to initialize | Loading |
| REPO_003 | Invalid YAML syntax in harness.yaml | No | Fix YAML syntax at line {line} | Loading |
| REPO_004 | Manifest schema validation failed: {field} | No | Check required fields in harness.yaml | Validation |
| REPO_005 | Asset file parse error: {path} | No | Fix markdown front matter in {path} | Loading |
| REPO_006 | Duplicate asset ID: {id} | No | Make asset IDs unique within type+scope | Validation |
| REPO_007 | Asset metadata invalid: {path} | No | Check metadata fields in {path} | Validation |
| REPO_008 | Shared Harness not installed | No | Run `harness install` | Discovery |
| REPO_009 | Shared Harness integrity check failed | No | Run `harness install --force` | Validation |
| REPO_010 | File write permission denied: {path} | No | Check directory write permissions | Runtime |
| REPO_011 | AGENTS.md not found at repository root | No | Create AGENTS.md at project root | Validation |
| REPO_012 | Circular asset reference detected | No | Remove circular references | Validation |
| REPO_013 | Asset file exceeds size limit: {path} ({size}) | No | Reduce file size to under 1MB | Validation |
| REPO_014 | Asset path traversal detected: {path} | No | Use paths within project directory only | Security |
| REPO_015 | Atomic write failed: {path} | Yes | Retry write operation | Runtime |

---

## 5. Manifest Errors (MFT_)

| Code | Message | Retryable | Recovery | Category |
|------|---------|-----------|----------|----------|
| MFT_001 | Manifest not found: .harness/harness.yaml | No | Run `harness init` | Discovery |
| MFT_002 | Invalid YAML: {error} at line {line} col {col} | No | Fix YAML syntax | Loading |
| MFT_003 | Missing required field: {field} | No | Add required field | Validation |
| MFT_004 | Unsupported manifest version: {version} | No | Run `harness upgrade` | Validation |
| MFT_005 | Specification version mismatch: got {got}, need {need} | No | Update specification field | Validation |
| MFT_006 | Path not found: {path} | No | Create the referenced path | Validation |
| MFT_007 | Entry point missing: {file} | No | Create {file} at repository root | Validation |
| MFT_008 | Duplicate source ID: {id} | No | Make source IDs unique | Validation |
| MFT_009 | Invalid source type: {type} | No | Use: git, local_path, or registry | Validation |
| MFT_010 | Invalid artifact type: {type} | No | Use valid artifact type | Validation |
| MFT_011 | No artifacts declared | No | Add at least one artifact | Validation |
| MFT_012 | Custom field outside vendor namespace: {field} | No | Move to vendor.{field} | Validation |
| MFT_013 | Circular dependency detected: {cycle} | No | Remove circular source references | Validation |
| MFT_014 | Dependency conflict: {package} requires {v1} and {v2} | No | Resolve version conflict manually | Validation |
| MFT_015 | Dependency depth exceeded: max 3 levels | No | Reduce transitive dependency depth | Validation |
| MFT_016 | Invalid capability ID format: {id} | No | Use format: namespace.name | Validation |

---

## 6. Context Errors (CTX_)

| Code | Message | Retryable | Recovery |
|------|---------|-----------|----------|
| CTX_001 | Context build failed: {reason} | No | Check Repository Context validity |
| CTX_002 | Filter configuration invalid: {field} | No | Check filter config |
| CTX_003 | Budget exceeded hard limit: {tokens} > {limit} | No | Increase token budget or reduce assets |
| CTX_004 | Budget configuration invalid: distribution sum != 1.0 | No | Fix budget distribution |
| CTX_005 | Cache invalidation failed | Yes | Clear cache and retry |

---

## 7. Execution Errors (EXEC_)

| Code | Message | Retryable | Recovery |
|------|---------|-----------|----------|
| EXEC_001 | Workflow not found: {id} | No | Check workflow ID in manifest |
| EXEC_002 | Invalid execution plan: {reason} | No | Fix workflow definition |
| EXEC_003 | Capability invocation failed: {capId} - {reason} | Depends | Check capability error |
| EXEC_004 | Step timeout: {stepId} exceeded {timeout}ms | Yes | Increase timeout or retry |
| EXEC_005 | Task cancelled by user | No | Restart task if needed |
| EXEC_006 | Verification failed: {rule} | No | Fix issues then retry |
| EXEC_007 | Max retries exceeded: {capId} after {attempts} attempts | No | Check capability availability |
| EXEC_008 | Runtime context expired or invalid | No | Rebuild context and retry |
| EXEC_009 | Step dependency not resolved: {stepId} depends on {dep} | No | Fix step dependencies |
| EXEC_010 | Invalid state transition: {from} -> {to} | No | Check allowed transitions |

---

## 8. Capability Errors (CAP_)

| Code | Message | Retryable | Recovery |
|------|---------|-----------|----------|
| CAP_001 | Capability not found: {id} | No | Check capability ID is registered |
| CAP_002 | Input validation failed: {field} - {reason} | No | Fix input schema compliance |
| CAP_003 | Output validation failed: {reason} | No | Capability returned invalid output |
| CAP_004 | Permission denied: {capability} requires {permission} | No | Grant required permission |
| CAP_005 | Capability execution timeout: {id} after {ms}ms | Yes | Increase timeout or retry |
| CAP_006 | Transient error: {id} - {reason} | Yes | Retry after backoff |
| CAP_007 | Capability unavailable: {id} | Yes | Wait and retry |
| CAP_008 | Registration failed: {id} - {reason} | No | Fix capability definition |

---

## 9. Governance Errors (GOV_)

| Code | Message | Retryable | Recovery |
|------|---------|-----------|----------|
| GOV_001 | Proposal not found: {id} | No | Check proposal ID |
| GOV_002 | Invalid state transition: {from} -> {to} | No | Check allowed transitions |
| GOV_003 | Proposal locked by reviewer: {reviewer} | No | Wait for review or contact reviewer |
| GOV_004 | Proposal has no evidence | No | Add evidence before submitting |
| GOV_005 | Promotion failed: {reason} | No | Check Repository write permissions |
| GOV_006 | Concurrent modification: stale version | Yes | Reload and retry |
| GOV_007 | Reviewer not authorized | No | Use authorized reviewer account |
| GOV_008 | Proposal content exceeds limit: {size} > 500KB | No | Reduce proposal content size |
| GOV_009 | Evidence type invalid: {type} | No | Use valid evidence type |
| GOV_010 | Audit log write failed | Yes | Check logs directory permissions |

---

## 10. Platform Errors (PLT_)

| Code | Message | Retryable | Recovery |
|------|---------|-----------|----------|
| PLT_001 | Shared Harness source unreachable: {uri} | Yes | Check network and source URI |
| PLT_002 | Checksum verification failed: {file} | No | Re-download with `harness install --force` |
| PLT_003 | Installation directory not writable: {path} | No | Check write permissions for {path} |
| PLT_004 | Task request invalid: {reason} | No | Fix task request format |
| PLT_005 | Orchestration failed in domain {domain}: {code} | No | Check domain-specific error |
| PLT_006 | Publish failed: {reason} | No | Check Harness Repository access |
| PLT_007 | Update source unreachable: {uri} | Yes | Check network connectivity |
| PLT_008 | Backup creation failed during update | No | Check disk space and permissions |

---

## 11. Quy Tắc Lan Truyền Lỗi (Error Propagation Rules)

- **Domain errors bubble up through Platform:** Lỗi từ các domain cụ thể (REPO, CTX, EXEC, CAP, GOV, MFT) đều được lan truyền lên tầng Platform.
- **Platform wraps domain errors:** Platform bọc các lỗi domain trong `PLT_005` (Orchestration failed) khi cần trình bày ở tầng trên.
- **CLI formats error for human display:** CLI hiển thị lỗi ở dạng text thân thiện với người dùng (xem mục 12).
- **MCP formats error as JSON response:** MCP trả lỗi ở định dạng JSON chuẩn (xem mục 12).
- **Retryable errors:** CLI có thể cung cấp flag `--retry` cho người dùng.
- **Non-retryable errors:** Hiển thị hướng dẫn khắc phục (remediation) và thoát chương trình.

---

## 12. Định Dạng Output Lỗi (Error Output Formats)

### Text Format (CLI)

```
[ERROR] REPO_008: Shared Harness not installed
  Remedy: Run `harness install --source <uri>`
  Details: ~/.harness/shared/ directory not found
```

### JSON Format (MCP)

```json
{
  "error": {
    "code": "REPO_008",
    "domain": "REPOSITORY",
    "message": "Shared Harness not installed",
    "retryable": false,
    "remediation": "Run harness install --source <uri>",
    "details": {
      "expected_path": "~/.harness/shared/"
    },
    "timestamp": "2026-07-11T16:58:00Z"
  }
}
```

---

## 13. Tham Chiếu Chéo (Cross References)

| Tài liệu | Liên quan |
|----------|-----------|
| `01_HARNESS_OVERVIEW.md` | Kiến trúc tổng quan Platform |
| `02_REPOSITORY_CONTEXT.md` | Chi tiết Repository domain, dùng REPO_ codes |
| `03_MANIFEST_SPEC.md` | Chi tiết Manifest domain, dùng MFT_ codes |
| `05_CONTEXT_ASSEMBLY.md` | Chi tiết Context domain, dùng CTX_ codes |
| `06_WORKFLOW_EXECUTION.md` | Chi tiết Execution domain, dùng EXEC_ codes |
| `07_CAPABILITY_SYSTEM.md` | Chi tiết Capability domain, dùng CAP_ codes |
| `09_GOVERNANCE_WORKFLOW.md` | Chi tiết Governance domain, dùng GOV_ codes |
| `10_PLATFORM_OPERATIONS.md` | Chi tiết Platform domain, dùng PLT_ codes |

> **Lưu ý:** Tài liệu này là nguồn duy nhất và chính thức (single source of truth). Mọi thay đổi về error codes phải được cập nhật tại đây trước khi áp dụng vào code.
