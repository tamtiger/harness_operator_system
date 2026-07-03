# Failure Handling & Recovery Model

Hệ thống AI dễ bị lỗi do các yếu tố bên ngoài (LLM provider) và bên trong (parse lỗi). Tài liệu này mô tả cách Harness xử lý lỗi.

## 1. Failure Categories

### AI Failures
* **Timeout:** Gọi LLM quá 60s không phản hồi -> **Retry (Exponential Backoff)** tối đa 3 lần.
* **Hallucination (Format error):** AI trả về JSON/Markdown sai cấu trúc -> **Parse fallback** hoặc báo lỗi `GenerationError` yêu cầu AI sinh lại với error message.

### System & Environment Failures
* **Tool Crash:** Một sub-process hoặc plugin bị crash -> **Isolate & Restart**. Không làm sập main thread của Harness.
* **SQLite Locked:** Xung đột khi đọc/ghi đồng thời -> Áp dụng **Retry & Timeout** (Busy timeout).
* **Git Conflict / Partial Write:** Khi AI sửa file và apply thất bại -> Rollback dựa trên checkpoint/snapshot trước đó.

## 2. Recovery Strategies

* **Checkpointing:** Mọi thay đổi về source code đều được lưu snapshot/git stash trước khi apply.
* **Circuit Breaker:** Ngừng gọi LLM nếu provider liên tục báo lỗi 5xx.
* **Graceful Degradation:** Nếu Vector Store lỗi, fallback về Keyword Search cơ bản.

> *Lưu ý: Chi tiết các mã lỗi (Error Taxonomy) xem tại `contracts/ERRORS.md`.*
