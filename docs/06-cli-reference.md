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
| `dashboard` | Xem Observability Dashboard |
| `verify` | Chạy verify pipeline thủ công (hỗ trợ skip/force install) |
| `quick-start` | Khởi tạo session nhanh với task mặc định và '*' scope |
| `skills` | Duyệt skills |
| `tasks` | Liệt kê tasks |
| `instincts` | Duyệt/export instincts |
| `install-mcp` | Cài MCP config cho IDE |
| `orchestrate` | Chạy tự động hóa vòng lặp Ralph |
| `tree` | Sinh directory tree |
| `summary` | Sinh repo summary |
| `reindex` | Force reindex repo |
| `export` | Export harness state |
| `import` | Import harness state |
| `workers` | Quản lý subagent workers chạy nền |
| `hooks` | Kiểm tra và dry-run hook rules |
| `report` | Sinh báo cáo reliability của hệ thống |
| `knowledge` | Quản lý tri thức đã học (lessons, decisions, v.v.) |
| `proposals` | Quản lý và duyệt proposals tối ưu hóa của AEGIS |
| `variants` | Xem so sánh hiệu năng benchmark giữa các cấu hình variants |

---

## `harness init`

Khởi tạo harness cho một repo.

```bash
harness init [path] [--stack auto|node|dotnet|python|go|rust|php] [--force]
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
  ✓ all skills parseable

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

## `harness dashboard`

Hiển thị Observability Dashboard, tính toán các chỉ số Compliance Rate, Verification Rate và Handoff Rate.

```bash
harness dashboard [--repo path]
```

| Flag | Mô tả |
|------|--------|
| `--repo` | Đường dẫn repo (default: tính toán trên toàn bộ sessions toàn cầu) |

**Ví dụ:**

```bash
harness dashboard
harness dashboard --repo ~/projects/my-api
```

**Output ví dụ:**

```
=== Harness-OS Observability Dashboard ===
Scope: Global
------------------------------------------
Total Sessions:        194
Compliance Rate:       79.4% (154/194)
Verification Rate:     99.5% (193/194)
Handoff Rate:          56.2% (109/194)
==========================================
```

---

## `harness verify`

Chạy verify pipeline thủ công.

```bash
harness verify [--repo path] [--skip-install] [--force-install]
```

| Flag | Mô tả |
|------|--------|
| `--repo` | Đường dẫn repo (default: `.`) |
| `--skip-install` | Bỏ qua bước `install` (chạy trực tiếp build/test/lint) |
| `--force-install` | Ép buộc cài đặt dependencies, bỏ qua lockfile cache |

**Ví dụ:**

```bash
harness verify
harness verify --skip-install
harness verify --repo ~/projects/my-api --force-install
```

**Output ví dụ:**

```
=== harness verify: /home/user/my-project ===

  Steps run: pnpm run build, pnpm run test, pnpm run lint (install skipped by request)
  Result: ✅ PASSED
```

---

## `harness quick-start`

Khởi tạo nhanh một phiên làm việc (session) và tự động tạo một task ở trạng thái `in-progress` cùng phạm vi file (`scope`) mặc định là `*`. Hữu ích cho các sửa đổi nhỏ, bỏ qua các bước thiết lập rườm rà.

```bash
harness quick-start [--repo path] [--title "Task Title"]
```

| Flag | Mô tả |
|------|--------|
| `--repo` | Đường dẫn repo (default: `.`) |
| `--title` | Tiêu đề của task được tự động tạo (default: "Quick modification") |

**Ví dụ:**

```bash
harness quick-start
harness quick-start --title "Sửa lỗi chính tả trong ExceptionCode.cs"
```

**Output ví dụ:**

```
=== harness quick-start: /home/user/my-project ===

  ✓ Session started: 5ddccbfc-2f8b-4342-a5e9-69e8605b0ae0
  ✓ Task created: Sửa lỗi chính tả trong ExceptionCode.cs (e794df1f)
  ✓ Scope set to '*'

  Ready for quick modifications! Run 'harness verify' when done.
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

---

## `harness orchestrate`

Khởi chạy quy trình điều phối tự động **Vòng lặp Ralph (Ralph Loop)** cho một nhiệm vụ cụ thể.

```bash
harness orchestrate <title> [--repo path] [--max-loops n] [--steps step1,step2] [--timeout-per-loop 300] [--fail-fast-on "ENOSPC,EACCES,Cannot find module"]
```

| Flag | Mô tả |
|------|--------|
| `title` | Tiêu đề hoặc yêu cầu của nhiệm vụ cần thực hiện |
| `--repo` | Đường dẫn tới repository làm việc (default: `.`) |
| `--max-loops` | Số vòng lặp chạy thử và tự sửa lỗi tối đa (default: 3) |
| `--steps` | Chỉ định các bước verify cụ thể thay vì chạy toàn bộ pipeline |
| `--timeout-per-loop` | Thời gian chạy tối đa cho mỗi vòng (default: 300s) |
| `--fail-fast-on` | Mẫu regex lỗi hạ tầng kích hoạt dừng khẩn cấp |

**Ví dụ:**

```bash
harness orchestrate "Sửa lỗi crash khi load trang chủ" --max-loops 5
harness orchestrate "Thêm API thanh toán" --steps build,test --timeout-per-loop 120
```

---

## `harness workers`

Quản lý tiến trình worker chạy nền của subagent.

```bash
harness workers [--list] [--kill <id>] [--cleanup] [--repo path] [--status running|finished|failed|all]
```

| Flag | Mô tả |
|------|--------|
| `--list` | Liệt kê các workers (mặc định hiển thị workers đang chạy) |
| `--kill` | Dừng (kill) worker với ID cụ thể |
| `--cleanup` | Dừng và dọn dẹp các workers đã hết hạn (timeout) |
| `--status` | Trạng thái lọc: `running`, `finished`, `failed`, `all` |

**Ví dụ:**

```bash
harness workers --list
harness workers --kill a1b2c3d4-e5f6...
harness workers --cleanup
```

---

## `harness hooks`

Quản lý và kiểm tra hệ thống hooks điều khiển.

```bash
harness hooks [--list] [--validate] [--dry-run --tool <tool> [--args <json>]] [--repo path]
```

| Flag | Mô tả |
|------|--------|
| `--list` | Xem danh sách pre-tool block và stop-validation rules hiện tại |
| `--validate` | Kiểm tra cú pháp và độ hợp lệ của file `hooks.yaml` |
| `--dry-run` | Chạy thử nghiệm một tool call xem có bị block bởi hook nào không |

**Ví dụ:**

```bash
harness hooks --list
harness hooks --validate
harness hooks --dry-run --tool verify_run --args '{"repo_path": "."}'
```

---

## `harness report`

Tạo báo cáo độ tin cậy và hiệu năng hoạt động của hệ thống (Reliability Report).

```bash
harness report [--period 7d|30d|all] [--repo path] [--format json|table]
```

| Flag | Mô tả |
|------|--------|
| `--period` | Thời kỳ thống kê (default: `7d`) |
| `--repo` | Chỉ lọc báo cáo theo một repository cụ thể |
| `--format` | Định dạng hiển thị: `table` (mặc định) hoặc `json` |

**Ví dụ:**

```bash
harness report
harness report --period 30d --format json
```

---

## `harness knowledge`

Xem hoặc quản lý tri thức đã tích lũy (lessons, patterns, anti_patterns, decisions, experiments) trong cơ sở dữ liệu SQLite.

```bash
harness knowledge [--type type] [--tags tags] [--list] [--add] <description>
```

| Flag | Mô tả |
|------|--------|
| `--list` | Liệt kê các tri thức (default) |
| `--add` | Thêm tri thức mới thủ công |
| `--type` | Lọc hoặc chỉ định loại tri thức (`lesson`, `pattern`, `decision`, `anti_pattern`, v.v.) |
| `--tags` | Lọc hoặc chỉ định tags (comma-separated) |

**Ví dụ:**

```bash
harness knowledge --list --type decision
harness knowledge --list --tags "windows,podman"
harness knowledge --add --type decision "Sử dụng pnpm thay vì npm cho dự án monorepo" --tags "npm,pnpm,monorepo"

---

## `harness proposals`

Quản lý và duyệt các đề xuất tối ưu hóa tri thức (instincts) tự động từ AEGIS-lite.

```bash
harness proposals [--list] [--approve <id>] [--reject <id>] [--details <id>] [--apply <id>]
```

| Flag | Mô tả |
|------|--------|
| `--list` | Liệt kê tất cả các proposals đang chờ hoặc đã duyệt (default) |
| `--approve` | Phê duyệt và thực thi proposal (tương đương với `--apply`) |
| `--apply` | Phê duyệt và thực thi proposal |
| `--reject` | Từ chối proposal |
| `--details` | Xem chi tiết lập luận (rationale), thay đổi và kết quả Regression Gate của proposal |

**Ví dụ:**

```bash
harness proposals --list
harness proposals --apply prop-1a2b3c4d
harness proposals --details prop-1a2b3c4d
```

---

## `harness variants`

Xem so sánh hiệu năng hoạt động (Pass Rate, Avg Tools, Avg Retries, Avg Duration) giữa các biến thể cấu hình (variants) khác nhau dựa trên scorecards.

```bash
harness variants [--benchmark]
```

| Flag | Mô tả |
|------|--------|
| `--benchmark` | Chạy báo cáo benchmark so sánh (default) |

**Ví dụ:**

```bash
harness variants --benchmark
```
```
