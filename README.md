# Universal Coding Harness

> **AI-independent orchestration layer for reliable AI software engineering.**

Universal Coding Harness là một nền tảng (framework) giúp AI Coding Agents phát triển phần mềm một cách **đúng kiến trúc, nhất quán và có thể kiểm chứng**, không phụ thuộc vào prompt hay một mô hình AI cụ thể.

Thay vì để AI ghi nhớ toàn bộ quy ước của dự án thông qua prompt, Harness lưu trữ toàn bộ kiến thức về dự án dưới dạng tài liệu, contracts, metadata và workflow. AI chỉ chịu trách nhiệm phân tích yêu cầu và triển khai mã nguồn dựa trên những quy tắc đã được định nghĩa.

---

# Vision

Mục tiêu của Universal Coding Harness là xây dựng một lớp điều phối (orchestration layer) độc lập với AI, nơi:

* Engineering knowledge được lưu trữ lâu dài.
* Workflow được kiểm soát bởi Harness.
* AI chỉ là một implementation engine có thể thay thế.
* Kiến trúc không bị thay đổi bởi prompt hoặc model.

Trong kiến trúc này, **Harness là Source of Truth**, không phải AI.

---

# Why This Project?

Các AI Coding Assistant hiện nay hoạt động rất tốt với các tác vụ nhỏ nhưng thường gặp các vấn đề khi dự án phát triển lớn hơn:

* Prompt ngày càng dài và khó quản lý.
* AI quên quy ước sau nhiều vòng hội thoại.
* Kiến trúc bị drift theo thời gian.
* Code không nhất quán giữa các lần sinh.
* Khó chuyển đổi giữa các AI Provider.
* Kiến thức của dự án bị gắn chặt vào prompt thay vì repository.

Universal Coding Harness được xây dựng để giải quyết các vấn đề trên bằng cách đưa toàn bộ engineering knowledge ra khỏi prompt và biến repository thành nguồn chân lý duy nhất.

---

# Design Philosophy

Dự án được xây dựng dựa trên các nguyên tắc sau:

* **Documentation First**
* **Architecture First**
* **Knowledge Driven Development**
* **AI Independent**
* **Deterministic Workflow**
* **Verification Before Completion**
* **Human Approval For Critical Decisions**
* **Long-term Maintainability Over Short-term Convenience**

Mọi quyết định implementation đều phải được dẫn dắt bởi tài liệu thiết kế thay vì suy đoán.

---

# High-Level Architecture

```text
                 Developer
                      │
                      ▼
        CLI / IDE / AI Coding Agent
                      │
                      ▼
         Universal Coding Harness
                      │
 ┌─────────────────────────────────────┐
 │ Repository Analyzer                 │
 │ Knowledge Engine                    │
 │ Context Engine                      │
 │ Planning Engine                     │
 │ Generation Engine                   │
 │ Verification Engine                 │
 │ Runtime                             │
 │ Plugin System                       │
 │ Learning Engine                     │
 └─────────────────────────────────────┘
                      │
                      ▼
                LLM Provider
```

Harness chịu trách nhiệm:

* Chuẩn bị context.
* Lập kế hoạch.
* Kiểm tra kiến trúc.
* Xác minh kết quả.
* Quản lý knowledge.
* Điều phối workflow.

LLM chỉ chịu trách nhiệm sinh nội dung.

---

# Core Features

* AI-independent architecture
* Documentation-driven development
* Knowledge management
* Repository analysis
* Intelligent context generation
* Task planning
* Code generation orchestration
* Verification pipeline
* Plugin architecture
* Multi-language support
* Multi-model support
* Architecture governance

---

# Project Structure

```text
.
├── README.md
├── AGENTS.md
│
├── docs/
│   ├── DOCUMENTATION_INDEX.md
│   ├── ARCHITECTURE_OVERVIEW.md
│   ├── TECHNICAL_DESIGN.md
│   ├── TECHNOLOGY_STACK.md
│   ├── GLOSSARY.md
│   ├── QUALITY_ATTRIBUTES.md
│   ├── FAILURE_HANDLING.md
│   ├── STATE_MACHINE.md
│   ├── PLUGIN_API.md
│   ├── SECURITY_MODEL.md
│   ├── VERSIONING.md
│   ├── adr/
│   └── contracts/
│
├── internal/
├── plugins/
├── runtime/
└── ...
```

---

# Documentation

Universal Coding Harness áp dụng phương pháp **Documentation First**.

Mọi implementation phải được dẫn dắt bởi tài liệu thiết kế.

## Bắt đầu tại đây

Nếu bạn là developer mới:

1. `docs/DOCUMENTATION_INDEX.md`

Đây là bản đồ của toàn bộ hệ thống tài liệu.

2. `docs/ARCHITECTURE_OVERVIEW.md`

Hiểu kiến trúc tổng thể.

3. `docs/TECHNICAL_DESIGN.md`

Hiểu thiết kế chi tiết.

Sau đó đọc các tài liệu liên quan đến module bạn sẽ làm việc.

---

# Documentation Map

## Architecture

* ARCHITECTURE_OVERVIEW.md
* TECHNICAL_DESIGN.md
* TECHNOLOGY_STACK.md
* GLOSSARY.md

Mô tả kiến trúc tổng thể và các thành phần của hệ thống.

---

## Engineering Standards

* QUALITY_ATTRIBUTES.md
* FAILURE_HANDLING.md
* STATE_MACHINE.md
* VERSIONING.md
* SECURITY_MODEL.md
* PLUGIN_API.md

Định nghĩa các tiêu chuẩn kỹ thuật của dự án.

---

## Architecture Decision Records

```
docs/adr/
```

Giải thích lý do của các quyết định kiến trúc.

Nếu implementation và ADR mâu thuẫn, **ADR được ưu tiên**.

---

## Contracts

```
docs/contracts/
```

Bao gồm:

* Interfaces
* Schemas
* Events
* Configuration
* APIs

Contracts là nguồn chân lý cho implementation.

---

## Project Planning

Các tài liệu kế hoạch bao gồm:

* Project Plan
* Milestones
* Roadmap

AI Agent chỉ nên implement trong phạm vi milestone hiện tại.

---

# Development Workflow

Mọi thay đổi đều nên tuân theo quy trình sau:

```text
Understand Requirement

        ↓

Read Related Documentation

        ↓

Create Implementation Plan

        ↓

Implement

        ↓

Verify

        ↓

Review

        ↓

Update Documentation (if required)
```

Không bắt đầu coding trước khi hiểu đầy đủ kiến trúc và tài liệu liên quan.

---

# AI Agent

Repository này được thiết kế để hoạt động cùng nhiều AI Coding Agents như:

* Claude Code
* OpenAI Codex
* Gemini CLI
* Cursor
* Windsurf
* Aider
* và các AI Agent khác

Mọi AI Agent **phải đọc `AGENTS.md` trước khi bắt đầu implementation**.

`AGENTS.md` định nghĩa:

* AI workflow
* Documentation priority
* Architecture rules
* Planning process
* Verification process
* Human approval rules
* Definition of Done

# Usage

Dưới đây là hướng dẫn cài đặt và sử dụng Universal Coding Harness ở chế độ CLI hoặc tích hợp MCP Server.

## 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18+ trở lên.
- **pnpm**: Phiên bản 9+.
- **Git**: Đã cấu hình và khởi tạo repository trong thư mục dự án của bạn.

## 2. Cài đặt và Biên dịch
Cài đặt các dependency và build dự án bằng các lệnh sau:
```bash
# Cài đặt dependency
pnpm install

# Biên dịch toàn bộ các package trong monorepo
pnpm build
```

## 3. Sử dụng qua dòng lệnh (CLI)
Harness cung cấp các lệnh CLI thông qua package `@harness/cli`. Bạn có thể cài đặt toàn cục (global) để sử dụng một cách ngắn gọn:

```bash
# Cài đặt CLI toàn cục từ thư mục cục bộ
npm install -g ./apps/cli
```

### Khởi tạo Harness trong dự án của bạn
Lệnh `init` sẽ đăng ký thông tin định danh của repository vào cơ sở dữ liệu toàn cục của Harness (lưu trữ tại `~/.harness/database/harness.db`) và tự động tạo tệp tin hướng dẫn `AGENTS.md` ngay tại thư mục gốc dự án của bạn:
```bash
harness init
```

### Chạy một tác vụ phát triển (Task)
Lệnh `run` sẽ kích hoạt luồng thực thi Harness cho tác vụ mong muốn:
```bash
harness run "Mô tả task cần làm (Ví dụ: Thêm API đăng nhập)"
```

## 4. Sử dụng qua MCP Server (Model Context Protocol)
MCP Server giúp bạn tích hợp Harness trực tiếp với các IDE hỗ trợ AI (như Cursor, VS Code Claude Desktop, Windsurf).

### Khởi chạy MCP Server qua dòng lệnh
```bash
node apps/mcp/dist/index.js
```

### Cấu hình tích hợp vào Claude Desktop
Thêm đoạn cấu hình sau vào tệp cấu hình của Claude Desktop (thường nằm ở `%APPDATA%/Claude/claude_desktop_config.json` trên Windows hoặc `~/Library/Application Support/Claude/claude_desktop_config.json` trên macOS):
```json
{
  "mcpServers": {
    "harness-operator": {
      "command": "node",
      "args": ["d:/MyProject/harness_operator_system/apps/mcp/dist/index.js"]
    }
  }
}
```
*(Thay thế `d:/MyProject/harness_operator_system` bằng đường dẫn tuyệt đối đến thư mục chứa dự án của bạn).*

---

# Current Status

Dự án đang được phát triển theo hướng **Architecture First**.

Các tài liệu thiết kế được hoàn thiện trước khi bắt đầu implementation nhằm giảm chi phí thay đổi kiến trúc trong các giai đoạn sau.

---

# Contributing

Khi đóng góp vào dự án:

* Không thay đổi kiến trúc chỉ để phù hợp với implementation.
* Không thay đổi contracts nếu chưa đánh giá tác động.
* Không bỏ qua ADR.
* Luôn cập nhật tài liệu khi thay đổi public behavior.
* Ưu tiên tính nhất quán hơn tối ưu cục bộ.

---

# Long-term Goal

Universal Coding Harness hướng tới việc trở thành một nền tảng AI Software Engineering độc lập với mô hình AI.

Trong kiến trúc này:

* AI có thể được thay thế.
* Prompt có thể thay đổi.
* IDE có thể thay đổi.
* Workflow có thể mở rộng.

Nhưng engineering knowledge, architecture và project conventions sẽ luôn được bảo toàn bởi Harness.
