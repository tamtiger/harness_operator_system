# Tài liệu harness-os

> Hướng dẫn chi tiết sử dụng harness-os v1.2.0 — hệ thống harness operator chạy local cho agentic coding.

---

## Mục lục

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 1 | [Bắt đầu](./01-getting-started.md) | Giới thiệu, yêu cầu hệ thống, cài đặt |
| 2 | [Cấu hình IDE](./02-ide-setup.md) | Setup cho Cursor, Claude Code, Kiro, VS Code, Antigravity, OpenCode, Codex, Copilot |
| 3 | [Khởi tạo repo](./03-repo-init.md) | `harness init`, stack detection, files được tạo |
| 4 | [Workflow hàng ngày](./04-workflow.md) | Lifecycle: START → SELECT → EXECUTE → VERIFY → WRAP UP |
| 5 | [MCP Tools Reference](./05-tools-reference.md) | Chi tiết 26 MCP tools (parameters, examples, responses) |
| 6 | [CLI Reference](./06-cli-reference.md) | 13 CLI commands (init, doctor, status, verify, skills, tasks, instincts, install-mcp, tree, summary, reindex, export, import) |
| 7 | [Skills](./07-skills.md) | Hệ thống skills, built-in skills, tạo custom skill |
| 8 | [Instincts](./08-instincts.md) | Continuous learning, confidence scoring, TTL, evolve |
| 9 | [Cấu trúc file](./09-file-structure.md) | Layout `.harness/`, `~/.harness/`, ví dụ nội dung |
| 10 | [Troubleshooting & FAQ](./10-troubleshooting.md) | Xử lý lỗi thường gặp, câu hỏi thường gặp |

---

## Tài liệu chuyên sâu (v1.0)

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 11 | [AGENTS.md Spec](./11-agents-md-spec.md) | Đặc tả AGENTS.md: required sections, harness-os extensions, customization |
| 12 | [Skill Format](./12-skill-format.md) | agentskills.io spec: frontmatter fields, folder structure, migration |
| 13 | [Glossary](./13-glossary.md) | Thuật ngữ harness-os + rulebook concepts + precedence rules |
| 14 | [Rulebooks](./14-rulebooks.md) | Khi nào/cách tạo project rulebooks, scaffolding |
| 15 | [Artifacts](./15-artifacts.md) | 3 artifact types (Plan+CTR, Research, Review), format reference |
| 16 | [State Architecture](./16-state-architecture.md) | Hybrid model, UUID identity, export/import, backup strategy |

---

## Quick Links

- 📖 [README chính](../README.md) — Tổng quan project
- 🤖 [AGENTS.md](../AGENTS.md) — Hướng dẫn cho AI agent phát triển source
- 📋 [CHANGELOG.md](../CHANGELOG.md) — Lịch sử thay đổi
- 🗺️ [HARNESS-OS-PLAN.md](../HARNESS-OS-PLAN.md) — Implementation plan

---

*Tài liệu cập nhật cho harness-os v1.2.0.*
