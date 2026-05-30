# CLI Reference

[← Mục lục](./README.md) | [← Tools Reference](./tools-reference.md) | [Skills →](./skills.md)

---

## Tổng quan

```bash
harness <command> [options]
```

| Command | Mô tả |
|---------|--------|
| `init` | Khởi tạo harness cho repo |
| `doctor` | Health check hệ thống |
| `status` | Snapshot trạng thái hiện tại |
| `verify` | Chạy verify pipeline thủ công |
| `skills` | Duyệt skills |
| `tasks` | Liệt kê tasks |
| `instincts` | Duyệt/export instincts |
| `install-mcp` | Cài MCP config cho IDE |
| `tree` | Sinh directory tree |
| `summary` | Sinh repo summary |
| `reindex` | Force reindex repo |
| `export` | Export harness state |
| `import` | Import harness state |

---

## `harness init`

Khởi tạo harness cho một repo.

```bash
harness init [path] [--stack auto|node|dotnet|python|go] [--force]
```

| Flag | Mô tả |
|------|--------|
| `path` | Đường dẫn repo (default: `.`) |
| `--stack` | Chỉ định stack (default: `auto` — tự detect) |
| `--force` | Overwrite files đã tồn tại |

**Ví dụ:**

```bash
harness init
harness init ~/projects/my-api --stack dotnet
harness init . --force
```

---

## `harness doctor`

Kiểm tra sức khỏe hệ thống.

```bash
harness doctor
```

**Checks:** Node.js ≥ 20, better-sqlite3 loadable, ~/.harness/ writable, skills parseable.

**Output ví dụ:**

```
=== harness doctor ===

  ✓ Node.js v20.11.0
  ✓ better-sqlite3 loadable
  ✓ /home/user/.harness writable
  ✓ 8 skills parseable

  ✅ All checks passed
```

---

## `harness status`

Xem trạng thái hiện tại.

```bash
harness status [--repo path] [--format json|table]
```

| Flag | Mô tả |
|------|--------|
| `--repo` | Đường dẫn repo (default: `.`) |
| `--format` | Output format: `table` (default) hoặc `json` |

**Ví dụ:**

```bash
harness status
harness status --format json
harness status --repo ~/projects/my-api
```

---

## `harness verify`

Chạy verify pipeline thủ công.

```bash
harness verify [--repo path]
```

**Ví dụ:**

```bash
harness verify
harness verify --repo ~/projects/my-api
```

**Output ví dụ:**

```
=== harness verify: /home/user/my-project ===

  Steps run: pnpm install, pnpm run build, pnpm run test, pnpm run lint
  Result: ✅ PASSED
```

---

## `harness skills`

Duyệt và xem skills.

```bash
harness skills [--list] [--show <name>] [--stack <filter>]
```

| Flag | Mô tả |
|------|--------|
| `--list` | Liệt kê tất cả skills (default) |
| `--show <name>` | Hiển thị nội dung skill cụ thể |
| `--stack <filter>` | Filter theo stack |

**Ví dụ:**

```bash
harness skills --list
harness skills --show tdd-workflow
harness skills --list --stack node
```

---

## `harness tasks`

Liệt kê tasks.

```bash
harness tasks [--repo path] [--status pending|in-progress|done|blocked]
```

**Ví dụ:**

```bash
harness tasks
harness tasks --status pending
harness tasks --repo ~/projects/my-api --status done
```

**Output ví dụ:**

```
=== Tasks ===

  → [in-progress] Add payment validation (t-7f8a9b)
  ○ [pending] Fix timeout in checkout (t-abc123)
  ✓ [done] Setup CI pipeline (t-def456)
```

---

## `harness instincts`

Duyệt và export instincts.

```bash
harness instincts [--list] [--export]
```

| Flag | Mô tả |
|------|--------|
| `--list` | Liệt kê instincts (default) |
| `--export` | Export JSON (cho backup/import) |

**Ví dụ:**

```bash
harness instincts --list
harness instincts --export > instincts-backup.json
```

---

## `harness install-mcp`

Cài MCP config cho IDE.

```bash
harness install-mcp --ide <cursor|claude-code|kiro|vscode|antigravity|opencode>
```

**Ví dụ:**

```bash
harness install-mcp --ide cursor
harness install-mcp --ide kiro
harness install-mcp --ide claude-code
```

> **Lưu ý:** `install-mcp` merge config vào file hiện có (không overwrite toàn bộ). An toàn nếu đã có MCP servers khác.

---

## `harness tree`

Sinh directory tree cho repo.

```bash
harness tree [--path .] [--depth 4] [--exclude PATTERN] [--output FILE]
```

| Flag | Mô tả |
|------|--------|
| `--path` | Đường dẫn repo (default: `.`) |
| `--depth` | Độ sâu tối đa (default: 4) |
| `--exclude` | Patterns loại trừ (comma-separated) |
| `--output` | Ghi ra file thay vì stdout |

**Ví dụ:**

```bash
harness tree
harness tree --depth 2 --exclude node_modules,dist
harness tree --output tree.txt
```

---

## `harness summary`

Sinh repo summary (tree + stack info + key files).

```bash
harness summary [--path .] [--force]
```

| Flag | Mô tả |
|------|--------|
| `--path` | Đường dẫn repo (default: `.`) |
| `--force` | Force regenerate (bỏ qua cache) |

**Ví dụ:**

```bash
harness summary
harness summary --force
```

---

## `harness reindex`

Force reindex repo (invalidate cache + regenerate summary).

```bash
harness reindex [--path .]
```

| Flag | Mô tả |
|------|--------|
| `--path` | Đường dẫn repo (default: `.`) |

**Ví dụ:**

```bash
harness reindex
harness reindex --path ~/projects/my-api
```

---

## `harness export`

Export harness state ra file JSON.

```bash
harness export [--repo .] [--output FILE]
```

| Flag | Mô tả |
|------|--------|
| `--repo` | Đường dẫn repo (default: `.`) |
| `--output` | File output (default: `harness-export-{timestamp}.json`) |

**Ví dụ:**

```bash
harness export
harness export --output backup.json
harness export --repo ~/projects/my-api --output my-api-state.json
```

---

## `harness import`

Import harness state từ file JSON.

```bash
harness import <file.json>
```

**Ví dụ:**

```bash
harness import backup.json
harness import ~/backups/harness-export-1234567890.json
```

> **Lưu ý:** Import ghi đè files trong `.harness/` của repo hiện tại. Backup trước nếu cần.
