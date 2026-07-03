# Quality Attributes (Non-functional Requirements)

Tài liệu này định nghĩa các thuộc tính chất lượng (NFRs) cốt lõi của Harness Operator System.

## 1. Performance Budgets

Các ngưỡng hiệu năng kỳ vọng trong hệ thống (nhắm tới MVP và Phase 1):

* **Startup Time:** < 2s (Thời gian khởi động CLI và sẵn sàng nhận lệnh)
* **Context Generation:** < 500ms (Cho các truy vấn đơn giản)
* **Planning (AI LLM call excluded):** < 2s (Thời gian xử lý nội bộ của Engine trước khi gọi LLM)
* **Index Update:** < 10s (Thời gian cập nhật chỉ mục khi code thay đổi, với repository ~100k LOC)

## 2. Scalability & Storage Growth

* **Local Storage (`~/.harness`):** Cần duy trì dưới 1GB cho mỗi repository.
* **Vector Store / DB Size:** Không vượt quá 10% kích thước codebase thực tế.
* **Large Repositories:** Có khả năng xử lý repository lên đến 1M LOC bằng cách chia nhỏ index và chỉ load on-demand.

## 3. Availability & Consistency

* **Harness Core:** Hoạt động offline (trừ lúc gọi LLM provider).
* **State Consistency:** Local SQLite DB phải đảm bảo ACID transactions để không bị corrupt khi crash (sử dụng WAL mode).
* **Data Recovery:** Có cơ chế tự build lại index (`harness index rebuild`) nếu phát hiện DB lỗi.
