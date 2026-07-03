# ADR 003: Sử dụng thuật toán BM25 cho Semantic Search nội bộ

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Để Agent có thể tự tìm kiếm file liên quan (Context Gathering), cần một công cụ search đủ tốt. Nếu dùng Vector Embeddings (OpenAI) sẽ tốn chi phí gọi API và thời gian index rất lâu cho codebase lớn.

## Quyết định
Sử dụng thuật toán **BM25 (Keyword Search + TF-IDF)** chạy hoàn toàn local thông qua SQLite FTS5 (Full-Text Search).
Chỉ fallback sang Vector Embeddings trong Post-MVP nếu BM25 không đạt hiệu quả về semantic matching.

## Hậu quả
* **Tích cực:** Tốc độ index tức thời, không tốn API cost, chạy được offline. Tích hợp sẵn trong SQLite.
* **Tiêu cực:** Không hiểu được semantic meaning (ví dụ: tìm "login" có thể không ra "authenticate" nếu không có keyword).
