# Bắt đầu với harness-os

[← Mục lục](./README.md)

---

## 1. Giới thiệu

### harness-os là gì?

harness-os là một hệ thống có cấu trúc giúp kiểm soát AI coding agent khi làm việc trên bất kỳ repo nào, qua bất kỳ IDE nào, ở local machine. Nó hoạt động như một "operator system" — cung cấp quy tắc, bộ nhớ, và cơ chế xác minh cho agent.

**Stack:** TypeScript · better-sqlite3 · @modelcontextprotocol/sdk · Node 20+

**Đặc điểm:**
- **MCP-first** — giao tiếp qua Model Context Protocol (stdio transport)
- **Cross-IDE** — hỗ trợ 7 IDE (Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode + instruction-only cho Codex, Copilot)
- **Multi-repo** — một harness-os phục vụ nhiều repo cùng lúc
- **26 MCP tools** trải đều 6 subsystems
- **29 built-in skills** cho workflow chuẩn

### 4 vấn đề harness-os giải quyết

| # | Vấn đề | Giải pháp |
|---|--------|-----------|
| 1 | Agent tuyên bố "done" khi chưa verify | `verify_run` bắt buộc chạy pipeline (build + test + lint) trước khi đánh dấu hoàn thành |
| 2 | Agent edit file ngoài scope | `scope_check` chặn truy cập vào forbidden paths, giới hạn file theo task |
| 3 | Agent mất context giữa các session | `session_handoff` + `progress_log` lưu trạng thái, session sau đọc lại ngay |
| 4 | Agent lặp lại sai lầm đã từng phạm | `instinct_add/get` capture pattern đã học, surface đúng lúc cho task tương tự |

---

## 2. Yêu cầu hệ thống

| Yêu cầu | Chi tiết |
|----------|----------|
| **Node.js** | ≥ 20.0.0 (bắt buộc) |
| **Bun** | ≥ 1.0.0 (khuyến nghị) |
| **OS** | Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+) |
| **Disk** | ~100MB cho dependencies + SQLite data |
| **IDE** | Bất kỳ IDE hỗ trợ MCP (xem [Cấu hình IDE](./ide-setup.md)) |

### Kiểm tra nhanh

```bash
node --version   # Phải >= v20.0.0
npm --version    # Phải >= 9.x
```

---

## 3. Cài đặt

### Bước 1: Clone repo

```bash
git clone <repo-url> harness-os
cd harness-os
```

### Bước 2: Cài dependencies (dùng Bun)

```bash
bun install
```

> **Lưu ý:** Dự án này dùng Bun thay cho npm. Nếu chưa cài Bun, xem [hướng dẫn cài Bun](https://bun.sh).

### Bước 3: Build

```bash
bun run build
```

Kết quả: thư mục `dist/` chứa compiled JavaScript.

### Bước 4: Verify cài đặt

```bash
bun run dev -- doctor
```

Output mong đợi:

```
=== harness doctor ===

  ✓ Node.js v20.x.x
  ✓ better-sqlite3 loadable
  ✓ /home/user/.harness writable
  ✓ 29 skills parseable

  ✅ All checks passed
```

### Bước 5 (tuỳ chọn): Link CLI globally

```bash
npm link
```

Sau đó có thể gọi `harness` trực tiếp thay vì `node dist/cli/harness.js`.

---

## Bước tiếp theo

→ [Cấu hình IDE](./ide-setup.md) — kết nối harness-os với IDE của bạn
