# Kế hoạch cải tiến hệ thống (v1.5.4)

Mục tiêu: Triển khai 5 cải tiến cốt lõi cho hệ thống `harness-os` nhằm tăng cường độ bảo mật, khả năng debug, hiệu năng của verify/scope check và tối ưu hóa cơ chế rotate log.

## Proposed Changes

---

### 1. 🛡️ Sensitive Data Filtering (Lọc bỏ thông tin nhạy cảm trong Logs)
- **File mới**: `src/lib/redact.ts`
  - Hàm `redactSecrets(obj: any): any` để đệ quy đi qua các object/array/value.
  - Phát hiện các keys khớp regex `/token|secret|password|auth|jwt|cookie|key|passphrase/i` và thay thế giá trị của chúng bằng `"[REDACTED]"`.
- **File sửa đổi**: `src/lib/wrapper.ts`
  - Áp dụng lọc sạch dữ liệu `args` và `result` trước khi đưa vào hàm `auditLog`.

---

### 2. 🐛 Error Stack Tracing (Ghi nhận Stack Trace khi lỗi)
- **File sửa đổi**: `src/lib/wrapper.ts`
  - Trong catch block của `wrapTool`, trích xuất `err.stack` (nếu là `Error`) và đưa vào trường `stack` của audit event `tool_error`.

---

### 3. 🔄 Log Rotation Refactoring (Standard Rotation)
- **File sửa đổi**: `src/db/audit.ts`
  - Thay đổi cơ chế rotate từ "cumulative compression" sang "Standard Rotation" (rename file hiện tại thành backup `.gz`, sau đó xóa trắng file chính để ghi mới khi đạt giới hạn dung lượng).

---

### 4. ⚡ Verify Run Caching (Caching kết quả Verification)
- **File sửa đổi**: `src/tools/verify.ts`
  - Lưu trữ kết quả verify gần nhất vào file `.harness/verify_cache.json` chứa: `commit_hash`, `changed_files`, `changed_files_hashes`, `options`, và `result`.
  - Trực tiếp trả về kết quả cache nếu không có thay đổi nào về code hay options.

---

### 5. 🚀 Scope Check Optimization (Caching compilation picomatch & scope.yaml)
- **File sửa đổi**: `src/tools/scope.ts`
  - Caching `scope.yaml` file dựa trên `mtimeMs`.
  - Caching compiled picomatch matcher functions trong một `Map` cache để tránh compile lại glob pattern.
