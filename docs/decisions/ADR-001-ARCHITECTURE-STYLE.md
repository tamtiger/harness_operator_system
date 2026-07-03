# ADR 001: Phong cách Kiến trúc (Architecture Style)

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Hệ thống Harness Operator cần một kiến trúc với vùng lõi (Core) ổn định, không bị ảnh hưởng bởi những thay đổi liên tục từ các công cụ AI hay ngôn ngữ lập trình bên ngoài. Tuy nhiên, nó cũng cần đủ linh hoạt để liên tục mở rộng qua các Plugin.

## Quyết định
Sử dụng sự kết hợp giữa **Clean Architecture** (Kiến trúc Sạch) và **Pipeline Architecture** (Kiến trúc Đường ống).
* **Clean Architecture:** Tách biệt hoàn toàn Domain Logic (Core) khỏi Infrastructure (AI Providers, File System, Plugins). Giao tiếp hoàn toàn thông qua Contracts/Interfaces.
* **Pipeline Architecture:** Thiết kế quy trình xử lý luồng công việc (Task) dưới dạng chuỗi các bước (Context -> Plan -> Generate -> Verify) nối tiếp nhau.

## Hậu quả
* **Tích cực:** Core được phân tách rõ ràng, dễ dàng Unit Test và thay thế các dependency (ví dụ: đổi từ OpenAI sang Claude mà không ảnh hưởng luồng chính).
* **Tiêu cực:** Đòi hỏi việc định nghĩa và tuân thủ các Interfaces (Contract) một cách nghiêm ngặt. Hệ thống có thể ban đầu trông "dày" và nhiều boilerplate hơn.