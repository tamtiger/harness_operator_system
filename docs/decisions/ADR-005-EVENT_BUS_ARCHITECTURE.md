# ADR 005: Kiến trúc Event-Bus cho Engine Communication

## Trạng thái
Được chấp nhận

## Ngữ cảnh
Hệ thống bao gồm nhiều "Engine" độc lập (Context, Planning, Generation, Verification). Nếu gọi trực tiếp (Direct Method Call), code sẽ bị tight-coupling và khó tracking/retry khi một engine gặp lỗi.

## Quyết định
Sử dụng kiến trúc **Event-Driven** nội bộ (Event Bus/Emitter).
Các Engine sẽ emit event (ví dụ: `PlanningCompleted`) và Event Bus sẽ route đến các Handler tiếp theo (ví dụ: `GenerationEngine`).

## Hậu quả
* **Tích cực:** Decoupled architecture, dễ dàng thêm các middleware (ví dụ: Logger, Observability, Policy enforcer) vào giữa các luồng.
* **Tiêu cực:** Khó trace luồng thực thi (execution flow) bằng cách đọc code từ trên xuống dưới. Bắt buộc phải dựa vào log.
