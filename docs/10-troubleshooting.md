# Troubleshooting & FAQ

[← Mục lục](./README.md) | [← Cấu trúc file](./file-structure.md)

---

## Troubleshooting

### `better-sqlite3` không load được (Windows)

**Triệu chứng:**

```
Error: Cannot find module 'better-sqlite3'
```

hoặc

```
Error: The module was compiled against a different Node.js version
```

**Giải pháp:**

```bash
# Cách 1: Rebuild native module
npm rebuild better-sqlite3

# Cách 2: Xóa node_modules và cài lại
rm -rf node_modules
npm install

# Cách 3: Cài Visual Studio Build Tools (Windows)
# Download từ: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Chọn "Desktop development with C++"
npm install --build-from-source
```

---

### MCP server không connect trong IDE

**Triệu chứng:** IDE không thấy harness tools, hoặc báo "MCP server failed to start".

**Kiểm tra:**

```bash
# 1. Verify server chạy được
node /path/to/harness-os/dist/index.js
# Phải không có output (server chờ stdin)
# Ctrl+C để thoát

# 2. Kiểm tra path trong MCP config
cat ~/.cursor/mcp.json   # hoặc IDE tương ứng
# Đảm bảo path tới dist/index.js đúng

# 3. Kiểm tra Node version
node --version  # Phải >= 20

# 4. Đảm bảo đã build
ls /path/to/harness-os/dist/index.js  # File phải tồn tại
```

**Giải pháp:**
- Đảm bảo path trong MCP config là **absolute path**
- Restart IDE sau khi thay đổi MCP config
- Chạy `pnpm run build` nếu `dist/` chưa có

---

### `harness doctor` báo lỗi skills

**Triệu chứng:**

```
  ✗ Skills parse error: Invalid frontmatter in ...
```

**Giải pháp:**

```bash
# Kiểm tra frontmatter format
harness skills --show <skill-name>

# Đảm bảo YAML frontmatter đúng format:
# - Bắt đầu và kết thúc bằng ---
# - Không có tab (chỉ spaces)
# - Strings có dấu đặc biệt phải quote
```

---

### `verify_run` timeout

**Triệu chứng:**

```json
{ "passed": false, "output": "Command timed out after 120000ms" }
```

**Giải pháp:**

Tăng timeout trong `.harness/verify.yaml`:

```yaml
timeouts:
  build: 300    # 5 phút
  test: 600     # 10 phút
```

---

### Agent bị loop (gọi cùng tool liên tục)

**Triệu chứng:** Agent gọi cùng tool với cùng args > 5 lần.

**Hành vi:** Loop guard tự động phát hiện và trả về warning:

```json
{
  "result": "...",
  "warn": "potential loop: session_start called 6 times in 60s with same args"
}
```

**Giải pháp:** Agent nên đọc warning và thay đổi approach. Nếu vẫn loop, restart session.

---

### `scope_check` luôn trả `in_scope: true`

**Nguyên nhân:** Không có file `.harness/scope.yaml` → permissive mode (mọi file đều allowed).

**Giải pháp:**

```bash
# Tạo scope.yaml
harness init . --force  # Hoặc tạo thủ công
```

---

### Handoff trống khi session_start

**Nguyên nhân:** Session trước không gọi `session_handoff`.

**Giải pháp:** Luôn kết thúc session bằng `session_handoff` (không phải `session_end`). Skill `harness-workflow` enforce rule này.

---

## FAQ

### Q: harness-os có cần internet không?

**A:** Không. Toàn bộ chạy local — SQLite local, skills là file markdown, MCP qua stdio. Không có API call nào ra ngoài.

---

### Q: Một harness-os có phục vụ được nhiều repo không?

**A:** Có. Mỗi repo được identify bằng `repo_hash` (sha256 của absolute path). Database lưu sessions/tasks theo repo. Evidence cũng tách theo `~/.harness/evidence/{repo_hash}/`.

---

### Q: Dữ liệu lưu ở đâu?

**A:**
- **Runtime data** (sessions, tasks, instincts): `~/.harness/harness.sqlite`
- **Audit log**: `~/.harness/audit.jsonl`
- **Per-repo state** (progress, handoff, scope): `<repo>/.harness/` (nên commit vào git)

---

### Q: Có thể dùng harness-os mà không có MCP IDE không?

**A:** Có, nhưng hạn chế. Với Codex/Copilot (instruction-only), agent đọc `AGENTS.md` và `.harness/` files trực tiếp. Không có dynamic tools, nhưng vẫn có state files và verify workflow.

---

### Q: Làm sao reset toàn bộ data?

**A:**

```bash
# Xóa database + audit (mất tất cả sessions, tasks, instincts)
rm ~/.harness/harness.sqlite
rm ~/.harness/audit.jsonl

# Xóa per-repo state
rm .harness/handoff_last.json
rm .harness/progress.md

# Giữ lại scope.yaml và verify.yaml (config, không phải data)
```

---

### Q: harness-os có conflict với MCP servers khác không?

**A:** Không. `install-mcp` merge config (không overwrite). Nhiều MCP servers có thể chạy song song trong cùng IDE.

---

### Q: Tại sao output của `verify_run` bị truncate?

**A:** Output giới hạn 8KB để không vượt context window của agent. Nếu cần full output, chạy verify thủ công qua CLI: `harness verify --repo .`

---

### Q: Có thể share instincts giữa các máy không?

**A:**

```bash
# Export
harness instincts --export > instincts.json

# Import (trên máy khác)
# Hiện tại cần script custom hoặc dùng seed-instincts.ts làm template
```

---

### Q: `session_start` vs `session_resume` khác gì?

**A:** Cùng logic, khác semantics. `session_resume` signal cho agent rằng đây là continuation (nên đọc handoff kỹ hơn). Cả hai đều tạo session mới trong DB.

---

### Q: Làm sao biết agent đang dùng harness đúng cách?

**A:** Kiểm tra:
1. `.harness/progress.md` có entries mới sau mỗi session
2. `.harness/handoff_last.json` được update
3. `harness status` cho thấy active session khi agent đang làm việc
4. Audit log (`~/.harness/audit.jsonl`) ghi lại mọi tool call

---

### Q: harness-os có hỗ trợ monorepo không?

**A:** Có. `harness init` chạy ở root monorepo. `scope.yaml` dùng glob patterns để giới hạn agent vào package/service cụ thể. Ví dụ:

```yaml
allowed_per_task:
  TASK-15:
    - "packages/auth/**"
    - "packages/shared/**"
```

---

### Q: Version hiện tại và roadmap?

**A:** Version 1.1.0. Tất cả các phases cốt lõi đã hoàn thành:
- ✅ Phase 1-3: Core tools (session, task, state, scope, verify, observe)
- ✅ Phase 4: CLI + IDE adapters
- ✅ Phase 5: Continuous learning (instincts)
- ✅ Phase 6: Hardening (wrapper, loop guard, parsers)

Roadmap tương lai: sub-agents, hooks system, multi-repo cross-context, security scan.
