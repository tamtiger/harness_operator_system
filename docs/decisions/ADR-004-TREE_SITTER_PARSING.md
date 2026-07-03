# ADR 004: Phân tích AST bằng Tree-sitter

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Để AI hiểu được cấu trúc của codebase (Class nào gọi Class nào, params của method là gì), hệ thống (Repository Analyzer) cần phân tích mã nguồn. Regex quá yếu, còn các Compiler API thì quá cồng kềnh và phụ thuộc chặt vào toolchain (vd Roslyn cho C#).

## Quyết định
Sử dụng **Tree-sitter** làm công cụ chính để parse AST (Abstract Syntax Tree) đa ngôn ngữ.
Sẽ build các query `.scm` để extract Outline của file (class, function, method signature).

## Hậu quả
* **Tích cực:** Hỗ trợ hầu hết ngôn ngữ, parse nhanh, có khả năng phục hồi khi gặp code lỗi (error recovery).
* **Tiêu cực:** Cần maintain các AST Queries cho từng ngôn ngữ được hỗ trợ.
