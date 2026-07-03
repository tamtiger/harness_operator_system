# ADR 002: Sử dụng SQLite làm Knowledge Store

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Harness cần lưu trữ metadata, thông tin AST (class, method, signature) và checksum của các file trong workspace để phục vụ truy vấn nhanh (Context Engine). Giải pháp lưu trữ cần nhẹ, không yêu cầu cài đặt dịch vụ ngoài và hỗ trợ transaction tốt.

## Quyết định
Sử dụng **SQLite** lưu trực tiếp trong thư mục `.harness/knowledge.db` của workspace.
* Bật chế độ WAL (Write-Ahead Logging) để hỗ trợ đọc/ghi đồng thời.
* Cấu hình Busy Timeout để xử lý lock contention.

## Hậu quả
* **Tích cực:** Setup zero-config, ACID compliant, tốc độ query local cực nhanh.
* **Tiêu cực:** Không scale được nếu share context qua mạng (nhưng hệ thống thiết kế ưu tiên local first nên chấp nhận được).
