# Technical Design Hub

Tài liệu này đóng vai trò là Mục lục (Index) trỏ đến toàn bộ các tài liệu thiết kế kỹ thuật chi tiết của hệ thống (nằm trong thư mục `specifications/`).
Kiến trúc tổng thể được mô tả tại `ARCHITECTURE_OVERVIEW.md`, trong khi chi tiết triển khai từng module/engine được liệt kê dưới đây.

## 1. Core Modules (MVP Focus)

Đây là các Module cốt lõi cần thiết để tạo thành một Core Execution Loop hoàn chỉnh:

* [00_IMPLEMENTATION_ROADMAP.md](specifications/00_IMPLEMENTATION_ROADMAP.md): Định nghĩa các Phase triển khai.
* [01_CORE_INFRASTRUCTURE.md](specifications/01_CORE_INFRASTRUCTURE.md): Cơ sở hạ tầng chung (Event Bus, Error Handling, Logging).
* [03_REPOSITORY_ANALYZER.md](specifications/03_REPOSITORY_ANALYZER.md): Module phân tích repository ban đầu.
* [06_CONTEXT_ENGINE.md](specifications/06_CONTEXT_ENGINE.md): Engine chịu trách nhiệm tìm kiếm và đóng gói ngữ cảnh.
* [07_PLANNING_ENGINE.md](specifications/07_PLANNING_ENGINE.md): Chịu trách nhiệm lập kế hoạch các bước thực thi.
* [09_RUNTIME_ENGINE.md](specifications/09_RUNTIME_ENGINE.md): Thực thi các thao tác I/O (viết file, chạy command, checkpointing).

## 2. Advanced Modules (Post-MVP)

Các Module này sẽ được hoàn thiện dần sau khi MVP ổn định:

* [02_CAPABILITY_REGISTRY.md](specifications/02_CAPABILITY_REGISTRY.md): Quản lý danh sách các Tool/Action hệ thống có thể làm.
* [04_KNOWLEDGE_ENGINE.md](specifications/04_KNOWLEDGE_ENGINE.md): Cập nhật và lưu trữ Knowledge lâu dài.
* [05_CODE_INDEX.md](specifications/05_CODE_INDEX.md): Index chuyên sâu (AST, Call Graphs).
* [08_GENERATION_ENGINE.md](specifications/08_GENERATION_ENGINE.md): Engine chịu trách nhiệm wrap lời gọi đến LLM và xử lý format.
* [10_VERIFICATION_ENGINE.md](specifications/10_VERIFICATION_ENGINE.md): Kiểm tra, build, chạy test.
* [11_POLICY_ENGINE.md](specifications/11_POLICY_ENGINE.md): Kiểm soát các rules về security và architecture.

## 3. Integration & Extensions

* [12_INTEGRATION_LAYER.md](specifications/12_INTEGRATION_LAYER.md): Giao tiếp với IDE (VSCode, JetBrains) và CLI.
* [13_PLUGIN_SYSTEM.md](specifications/13_PLUGIN_SYSTEM.md): Kiến trúc mở rộng để hỗ trợ đa ngôn ngữ và custom logic.
