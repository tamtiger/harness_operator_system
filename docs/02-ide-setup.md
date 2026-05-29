# Cấu hình IDE

[← Mục lục](./README.md) | [← Bắt đầu](./getting-started.md) | [Khởi tạo repo →](./repo-init.md)

---

## 4.1 Cursor

**File:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-os/dist/index.js"],
      "env": {
        "HARNESS_HOME": "/home/user/.harness"
      }
    }
  }
}
```

**Cài tự động:**

```bash
harness install-mcp --ide cursor
```

---

## 4.2 Claude Code

**Cài bằng CLI:**

```bash
claude mcp add harness node /path/to/harness-os/dist/index.js
```

**Verify:**

```bash
claude mcp list
# Phải thấy "harness" trong danh sách
```

**Gỡ bỏ:**

```bash
claude mcp remove harness
```

---

## 4.3 Kiro

**File:** `~/.kiro/settings/mcp.json` (global) hoặc `<workspace>/.kiro/settings/mcp.json` (per-project)

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-os/dist/index.js"],
      "disabled": false,
      "autoApprove": [
        "session_start",
        "session_resume",
        "skill_load",
        "skill_list",
        "instinct_get",
        "harness_status",
        "scope_get",
        "scope_check",
        "handoff_read",
        "feature_list_read",
        "task_list"
      ]
    }
  }
}
```

> **Lưu ý:** `autoApprove` cho phép các tool read-only chạy không cần confirm thủ công.

**Cài tự động:**

```bash
harness install-mcp --ide kiro
```

---

## 4.4 VS Code

**File:** `~/.vscode/mcp.json` hoặc `<workspace>/.vscode/mcp.json`

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-os/dist/index.js"],
      "env": {
        "HARNESS_HOME": "/home/user/.harness"
      }
    }
  }
}
```

**Cài tự động:**

```bash
harness install-mcp --ide vscode
```

---

## 4.5 Antigravity

**File:** `~/.antigravity/mcp.json`

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-os/dist/index.js"],
      "env": {
        "HARNESS_HOME": "/home/user/.harness"
      }
    }
  }
}
```

**Cài tự động:**

```bash
harness install-mcp --ide antigravity
```

---

## 4.6 OpenCode

**File:** `~/.config/opencode/opencode.json`

```json
{
  "mcpServers": {
    "harness": {
      "command": "node",
      "args": ["/path/to/harness-os/dist/index.js"]
    }
  }
}
```

**Cài tự động:**

```bash
harness install-mcp --ide opencode
```

---

## 4.7 Codex (instruction-only)

Codex không hỗ trợ MCP. Thay vào đó, `harness init` tạo file `AGENTS.md` tại root repo chứa các quy tắc tương đương:

- Đọc `.harness/progress.md` để biết context
- Đọc `.harness/handoff_last.json` để tiếp tục
- Kiểm tra `.harness/scope.yaml` trước khi edit
- Chạy verify pipeline trước khi claim done

Agent Codex đọc `AGENTS.md` tự động khi mở repo.

---

## 4.8 Copilot (instruction-only)

Copilot không hỗ trợ MCP. Sử dụng file `.github/copilot-instructions.md`:

- Copy nội dung từ `ide-adapters/copilot/copilot-instructions.md` vào repo
- Hoặc `harness init` sẽ tạo `AGENTS.md` mà Copilot cũng đọc được

---

## Bảng tổng hợp IDE

| IDE | Loại | MCP Tools | Auto-approve | Cài tự động |
|-----|------|-----------|--------------|-------------|
| Cursor | MCP | ✅ 26 tools | Không | `harness install-mcp --ide cursor` |
| Claude Code | MCP | ✅ 26 tools | Không | `claude mcp add harness ...` |
| Kiro | MCP | ✅ 26 tools | ✅ 11 tools | `harness install-mcp --ide kiro` |
| VS Code | MCP | ✅ 26 tools | Không | `harness install-mcp --ide vscode` |
| Antigravity | MCP | ✅ 26 tools | Không | `harness install-mcp --ide antigravity` |
| OpenCode | MCP | ✅ 26 tools | Không | `harness install-mcp --ide opencode` |
| Codex | Instruction | ❌ | — | `harness init` (tạo AGENTS.md) |
| Copilot | Instruction | ❌ | — | Copy `copilot-instructions.md` |

> **Placeholder paths:** Thay `"/path/to/harness-os"` bằng đường dẫn tuyệt đối tới thư mục harness-os trên máy bạn.
