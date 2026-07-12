# 16. VERSIONING

**Version:** 4.0 | **Status:** Final | **Ngôn ngữ:** Tiếng Việt

---

## 1. Purpose

Định nghĩa các loại versioning trong Harness Platform và cách chúng liên quan đến nhau. Tài liệu này mô tả ba phạm vi versioning độc lập, chính sách tương thích ngược/xuôi, quy trình thay đổi breaking, và cách sử dụng công cụ migration.

---

## 2. Versioning Scopes

Harness có 3 loại versioning, mỗi loại quản lý một phạm vi khác nhau:

| Scope | Format | Managed By | Location |
|-------|--------|-----------|----------|
| Specification Version | `"X.Y"` string | Harness Spec Board | harness.yaml `specification` field |
| Manifest Version | Integer (1, 2, 3) | Repository | harness.yaml `version` field |
| Asset Version | SemVer `X.Y.Z` | Asset authors | Asset metadata `version` field |

Ba loại versioning này hoạt động **độc lập** nhưng phải phối hợp để đảm bảo tính tương thích của toàn hệ thống.

---

## 3. Specification Version

Specification Version phản ánh phiên bản của đặc tả kỹ thuật Harness Platform do Harness Spec Board quản lý.

- **Format:** `"Major.Minor"` — ví dụ: `"4.0"`
- **Major:** Breaking changes to architecture or core contracts
- **Minor:** Backward-compatible additions
- **Current:** `"4.0"`

### Lịch sử Specification Version

| Version | Key Changes |
|---------|-------------|
| 1.0 | Initial release |
| 1.1 | Added Shared Harness, manifest schema |
| 4.0 | Architecture redesign: Domain separation, stateless execution, Governance independence |

---

## 4. Manifest Version

Manifest Version là số nguyên tăng dần, xác định cấu trúc của file `harness.yaml`.

- **Format:** Integer tăng dần: `1`, `2`, `3`, ...
- **Tăng khi:** Cấu trúc manifest thay đổi breaking
- **Current:** `2`
- **Migration required** khi upgrade manifest version

### Chính sách tương thích

- **Backward compatibility:** Runtime mới đọc được manifest version cũ, tự động apply defaults cho các optional fields mới
- **Forward compatibility:** Runtime cũ ignore unknown fields trong manifest version mới

### Lịch sử Manifest Version

| Version | Key Changes |
|---------|-------------|
| 1 | Initial format with `version`, `specification`, `agent.repository`, `requirements.capabilities` |
| 2 | Renamed `agent.repository` → `agent.entry_point`; moved capabilities to top-level array; added `governance` section |

### Ví dụ harness.yaml (Manifest v2)

```yaml
version: 2
specification: "4.0"

agent:
  entry_point: "./agent/main.py"

capabilities:
  - code_execution
  - file_access

governance:
  policy: default
```

---

## 5. Asset Version

Asset Version là phiên bản của từng asset riêng lẻ, do asset author quản lý.

- **Format:** SemVer `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking change to asset content/contract
- **MINOR:** Backward-compatible addition
- **PATCH:** Bug fix, correction
- **Khai báo trong asset metadata:** `version: "1.2.0"`
- **Asset version là independent per asset** — mỗi asset có vòng đời versioning riêng

### Ví dụ asset metadata

```yaml
asset:
  id: data-fetcher
  version: "1.2.0"
  description: "Fetch external data sources"
  deprecated: false
```

---

## 6. Backward Compatibility Policy

Chính sách tương thích ngược đảm bảo hệ thống không bị gián đoạn khi nâng cấp phiên bản.

| Scope | Chính sách |
|-------|-----------|
| **Specification Minor** | Implementations phải support ít nhất **2 previous minor versions** |
| **Specification Major** | Migration guide **bắt buộc** được cung cấp |
| **Manifest** | Runtime phải đọc manifest version cũ, apply defaults cho new optional fields |
| **Asset** | Deprecated assets phải giữ `deprecated: true` metadata nhưng **không xóa ngay** |

---

## 7. Forward Compatibility Policy

Chính sách tương thích xuôi đảm bảo Runtime cũ không bị lỗi khi gặp manifest mới hơn.

- Runtime **MUST** ignore unknown fields trong manifest (trừ required fields)
- Runtime phải dùng `specification` field để quyết định behavior
- **Reject** nếu manifest version > max supported version của Runtime
- **Report warning** nếu specification version mới hơn version mà Runtime biết

---

## 8. Breaking Change Process

Quy trình 6 bước để đưa breaking change vào production một cách an toàn:

1. **Announce** in changelog with migration guide
2. **Deprecate** old field/behavior (1 minor version period)
3. **Implement** new version
4. **Provide migration tooling** (`harness upgrade`)
5. **Release** with new version number
6. **Remove** deprecated behavior in next major

---

## 9. Deprecation Policy

Chính sách deprecation áp dụng cho cả asset lẫn field trong specification:

- Mark asset/field as `deprecated: true`
- Keep in specification for **1 minor version**
- Remove in **next major version**
- Provide `supersededBy` reference để người dùng biết thay thế bằng gì
- Runtime: **show warning** khi sử dụng deprecated assets

### Ví dụ deprecated asset metadata

```yaml
asset:
  id: legacy-fetcher
  version: "0.9.0"
  deprecated: true
  supersededBy: data-fetcher@1.2.0
```

---

## 10. Version Compatibility Matrix

Định nghĩa các tổ hợp hợp lệ giữa Specification Version và Manifest Version:

| Spec Version | Manifest Version | Status |
|-------------|-----------------|--------|
| 4.0 | 2 | **Current** (Supported) |
| 4.0 | 1 | **Supported** (auto-migrate) |
| 1.1 | 1 | **Legacy** (no longer maintained) |

---

## 11. `harness upgrade` Command

CLI command để tự động migrate manifest từ version cũ lên version mới.

**Mục đích:** Migrate manifest v1 → v2

**Chuỗi thực thi:**

1. Read current `harness.yaml`
2. Apply field renames (`agent.repository` → `agent.entry_point`)
3. Move capabilities to new format (top-level array)
4. Bump `version` field
5. Bump `specification` field
6. Write updated `harness.yaml`
7. Print migration report

**Ví dụ sử dụng:**

```bash
harness upgrade
```

**Ví dụ migration report:**

```
Harness Manifest Migration Report
==================================
From: version=1, specification="1.1"
To:   version=2, specification="4.0"

Changes applied:
  [RENAMED] agent.repository -> agent.entry_point
  [MOVED]   requirements.capabilities -> capabilities (top-level)
  [ADDED]   governance section (default policy)
  [BUMPED]  version: 1 -> 2
  [BUMPED]  specification: "1.1" -> "4.0"

Migration completed successfully.
Backup saved to: harness.yaml.bak
```

---

## 12. Cross References

| Tài liệu | Liên quan |
|----------|-----------|
| `01_OVERVIEW.md` | Kiến trúc tổng quan Harness Platform |
| `02_MANIFEST.md` | Chi tiết cấu trúc `harness.yaml` và các fields |
| `03_SPECIFICATION.md` | Harness Specification contract |
| `15_GOVERNANCE.md` | Governance section trong manifest v2 |
| `17_MIGRATION.md` | Hướng dẫn migration chi tiết giữa các version |

---

*Tài liệu này là thành phần của Harness Operator System Knowledge Base. Specification Version: 4.0 — Final.*
