# Versioning Strategy

Để đảm bảo khả năng tương thích khi hệ thống phát triển, các thành phần sau sẽ áp dụng Semantic Versioning (SemVer) một cách nghiêm ngặt.

## 1. Schema Versioning

* **Config Schema (`harness.config.json`):** Có version flag (`"version": "1.0"`). Hệ thống hỗ trợ backward compatibility ít nhất 1 major version.
* **Knowledge / DB Schema (SQLite):** Lưu metadata version. Khi update, chạy các migration scripts tương ứng một cách tự động.

## 2. Event Versioning

Mọi Event payload phát ra trong hệ thống đều chứa field `version`:
```json
{
  "event": "TaskCompleted",
  "version": "v1",
  "data": { ... }
}
```
Khi payload đổi cấu trúc, tăng lên `v2`. Các consumer phải xử lý được multi-version.

## 3. Plugin API Versioning

Hệ thống Harness Core sẽ công bố phiên bản API (`harness-plugin-api@1.x.x`). Các Plugin phải khai báo dải phiên bản API tương thích trong manifest của mình. Nếu Harness Core nâng cấp major version (gây breaking change), các plugin cũ sẽ bị từ chối nạp (fail-fast) cho đến khi được update.
