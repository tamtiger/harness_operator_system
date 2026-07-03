# Event Catalog

Harness Operator System sử dụng kiến trúc Event-Driven nội bộ để các thành phần (Engines) giao tiếp lỏng lẻo (loose coupling) với nhau.

## 1. Event Structure

Mọi event trong hệ thống phải tuân theo cấu trúc cơ bản sau (có versioning):

```json
{
  "event": "EventName",
  "version": "v1",
  "timestamp": "2024-03-24T12:00:00Z",
  "taskId": "task_12345",
  "payload": { ... }
}
```

## 2. Core Events

### Lifecycle Events
* `TaskCreated`: Hệ thống nhận được một yêu cầu mới từ user.
* `TaskStarted`: Bắt đầu tiến trình xử lý.
* `TaskCompleted`: Tác vụ hoàn thành thành công.
* `TaskFailed`: Tác vụ thất bại (chứa `Error Taxonomy` trong payload).

### Engine Events
* `ContextGatheringStarted` / `ContextGatheringCompleted`
* `PlanningStarted` / `PlanningCompleted`: Phát ra khi lập xong kế hoạch, chờ user xác nhận (nếu có).
* `GenerationStarted` / `GenerationCompleted`: AI đã sinh xong mã nguồn.
* `VerificationStarted` / `VerificationFailed` / `VerificationPassed`: Kết quả kiểm tra của Verification Engine.
* `KnowledgeUpdated`: Khi index được làm mới.

## 3. Event Bus Contract

* **Synchronous:** Một số event nhỏ (ví dụ logging) có thể xử lý đồng bộ.
* **Asynchronous:** Các event chuyển trạng thái lớn (State transitions) phải được đẩy vào Event Bus/Queue để đảm bảo thứ tự và khả năng retry.