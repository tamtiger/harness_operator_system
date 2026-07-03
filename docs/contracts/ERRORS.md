# Error Taxonomy

Tài liệu này định nghĩa hệ thống phân loại mã lỗi (Error Codes) của Harness Operator System. Việc có một Taxonomy rõ ràng giúp tracing lỗi dễ dàng và cấu trúc hóa log.

## 1. Hierarchy

```text
HarnessError (Base)
├── ConfigError
├── PlanningError
├── GenerationError
├── VerificationError
├── KnowledgeError
└── RepositoryError
```

## 2. Error Definitions

### ConfigError (`ERR_CFG_*`)
* `ERR_CFG_001`: Thiếu cấu hình bắt buộc trong `harness.config.json`.
* `ERR_CFG_002`: Sai định dạng file cấu hình.

### PlanningError (`ERR_PLN_*`)
* `ERR_PLN_001`: Không thể parse output của Planning LLM.
* `ERR_PLN_002`: Kế hoạch vi phạm chính sách bảo mật (Policy Engine reject).
* `ERR_PLN_003`: Không tìm thấy capability tương ứng cho task.

### GenerationError (`ERR_GEN_*`)
* `ERR_GEN_001`: LLM sinh ra file có format không hợp lệ.
* `ERR_GEN_002`: LLM Timeout (quá thời gian sinh code).
* `ERR_GEN_003`: Xung đột khi apply code (Git conflict).

### VerificationError (`ERR_VRF_*`)
* `ERR_VRF_001`: Compilation failed (Lỗi biên dịch).
* `ERR_VRF_002`: Unit test failed.
* `ERR_VRF_003`: Linter phát hiện lỗi nghiêm trọng.

### KnowledgeError (`ERR_KNW_*`)
* `ERR_KNW_001`: SQLite DB bị khóa (Locked).
* `ERR_KNW_002`: Index corrupt.
* `ERR_KNW_003`: Lỗi truy vấn Vector Search (BM25).

## 3. Usage Pattern

Khi throw lỗi trong code, sử dụng định dạng chuẩn:
```json
{
  "code": "ERR_GEN_002",
  "name": "GenerationError",
  "message": "LLM Provider timeout after 60s",
  "details": {
    "provider": "OpenAI",
    "taskId": "task_12345"
  },
  "recoverable": true
}
```
