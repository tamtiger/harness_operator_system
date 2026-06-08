# Tài liệu harness-os

> Hướng dẫn chi tiết sử dụng harness-os v1.5.0 — hệ thống harness operator chạy local cho agentic coding.
> Phiên bản tài liệu khớp với codebase version.

---

## Danh sách tài liệu hướng dẫn

Mọi tài liệu liên kết dưới đây đều sử dụng tiếng Việt để hướng dẫn chi tiết cách thiết lập và vận hành.

| Tài liệu | Nội dung chính |
|---|---|
| 📖 **[01. Bắt đầu](./01-getting-started.md)** | Yêu cầu hệ thống, kiến trúc chung, setup ban đầu. |
| 🛠️ **[02. Cấu hình IDE](./02-ide-setup.md)** | Cấu hình MCP cụ thể cho 8 IDE khác nhau. |
| 🚀 **[03. Khởi tạo repo](./03-repo-init.md)** | Hướng dẫn chạy `harness init`, tạo AGENTS.md. |
| 🔄 **[04. Quy trình làm việc](./04-workflow.md)** | Mô hình Session Lifecycle (Plan → Code → Verify → Handoff). |
| 🧰 **[05. Danh mục Tools](./05-tools-reference.md)** | Hướng dẫn chi tiết 31 tools MCP. |
| 💻 **[06. Lệnh CLI](./06-cli-reference.md)** | Chi tiết cách gọi các lệnh `harness cli` (17 lệnh). |
| 🧠 **[07. Hệ thống Skills](./07-skills.md)** | Phân loại Tier 1 (Core) / Tier 2 (Contextual) / Tier 3. |
| ⚡ **[08. Instincts](./08-instincts.md)** | Cách lưu trữ, tự động tiến hóa pattern (Continuous learning). |
| 📁 **[09. Cấu trúc thư mục](./09-file-structure.md)** | Bố cục các file trạng thái trong `.harness/`. |
| 🩺 **[10. Xử lý sự cố](./10-troubleshooting.md)** | FAQ, lỗi thường gặp, và cách debug. |
| 📝 **[11. Quy chuẩn AGENTS.md](./11-agents-md-spec.md)** | Nội quy hành vi và cách sync chỉ thị cho Agent. |
| 🎨 **[12. Cấu trúc Skill](./12-skill-format.md)** | Quy định định dạng SKILL.md và YAML frontmatter. |
| 📖 **[13. Thuật ngữ](./13-glossary.md)** | Giải nghĩa các khái niệm cốt lõi (CTR, Handoff, Hộp đen,...). |
| 📜 **[14. Rulebooks](./14-rulebooks.md)** | Quy trình thiết lập Rulebook theo stack/dự án. |
| 📄 **[15. Artifacts](./15-artifacts.md)** | Mẫu Plan, Research, và Review Markdown. |
| 📦 **[16. Kiến trúc trạng thái](./16-state-architecture.md)** | Sơ đồ lưu trữ state lai (Hybrid State) & SQLite. |

---

*Tài liệu cập nhật cho harness-os v1.5.0.*

- 📖 [README chính](../README.md) — Tổng quan project
- 🤖 [AGENTS.md](../AGENTS.md) — Hướng dẫn cho AI agent phát triển source
- 📋 [CHANGELOG.md](../CHANGELOG.md) — Lịch sử thay đổi
---
