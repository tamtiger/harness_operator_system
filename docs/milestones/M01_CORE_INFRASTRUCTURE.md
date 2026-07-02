# Milestone M1 — Core Infrastructure

## 1. Goal

M1 xây dựng toàn bộ **Core Infrastructure** của Harness.

Đây là milestone quan trọng nhất của toàn bộ dự án.

Từ milestone này trở đi.

Mọi module đều phải dựa trên Foundation được tạo ở M0.

M1 không tạo ra tính năng AI.

M1 tạo ra nền tảng để toàn bộ hệ thống có thể mở rộng.

---

## 2. Objectives

Sau M1.

Core phải có khả năng:

- quản lý lifecycle
- dependency injection
- configuration
- logging
- event bus
- service registry
- workspace management

Tất cả đều chưa cần business logic.

---

## 3. Deliverables

Sau khi hoàn thành.

Core phải có:

```
Application Host

↓

Dependency Injection

↓

Configuration

↓

Logger

↓

Event Bus

↓

Workspace

↓

Service Registry
```

Đây là các thành phần mà toàn bộ milestone sau sẽ sử dụng.

---

## 4. Architecture

```
Harness Host
        │
        ▼
Service Registry
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Config Logger EventBus
        │
        ▼
Workspace
```

Host là entrypoint duy nhất.

---

## 5. Application Host

Application Host chịu trách nhiệm:

- startup
- shutdown
- load configuration
- initialize services
- initialize plugins
- graceful shutdown

Không chứa business logic.

---

## 6. Dependency Injection

Chỉ sử dụng một DI container.

Không tạo Service Locator.

Không resolve thủ công.

Mọi dependency đều constructor injection.

---

## 7. Service Registry

Service Registry quản lý toàn bộ service nội bộ.

Ví dụ:

```
Logger

Configuration

Workspace

Capability Registry

Knowledge Engine
```

Các milestone sau chỉ đăng ký service.

Không tự quản lý singleton.

---

## 8. Lifecycle

Mọi service đều có lifecycle thống nhất.

```text
Initialize

↓

Start

↓

Ready

↓

Stop

↓

Dispose
```

Không module nào tự tạo thread nền mà không đăng ký lifecycle.

---

## 9. Configuration Provider

Configuration được load theo thứ tự:

```
Default

↓

Workspace

↓

Project

↓

Environment

↓

CLI Override
```

Ưu tiên từ dưới lên.

Sau khi load xong.

Configuration trở thành immutable.

---

## 10. Logger

Logger hỗ trợ:

- Trace
- Debug
- Information
- Warning
- Error
- Critical

Logger phải hỗ trợ structured payload.

Không log bằng string nối thủ công.

---

## 11. Event Bus

Event Bus là Internal Event Bus.

Không phải Message Queue.

Mục tiêu:

Giảm coupling.

Ví dụ:

```
Workspace Initialized

↓

Knowledge Engine nhận Event

↓

Build Index
```

Không gọi trực tiếp.

---

## 12. Event Rules

Event phải:

- immutable
- versionable
- timestamped
- traceable

Không event nào được sửa sau khi publish.

---

## 13. Workspace Manager

Workspace Manager quản lý:

```
~/.harness
```

bao gồm:

- project
- cache
- artifacts
- logs
- sessions

Các module khác không truy cập filesystem trực tiếp nếu dữ liệu thuộc Workspace.

---

## 14. File System Abstraction

Core không gọi API filesystem trực tiếp.

Thông qua:

```
IFileSystem
```

Lợi ích:

- unit test
- fake filesystem
- future cloud workspace

---

## 15. Clock Abstraction

Không gọi:

```
DateTime.Now
```

trực tiếp.

Thông qua:

```
IClock
```

Điều này giúp:

- deterministic test
- replay
- audit

---

## 16. Identifier Generator

Không tạo Guid trực tiếp.

Thông qua:

```
IIdGenerator
```

Sau này có thể đổi:

- UUIDv7
- ULID
- Snowflake

mà không sửa Core.

---

## 17. Serialization

Thống nhất serializer.

Không để mỗi module chọn thư viện khác nhau.

Mọi serialization phải:

- deterministic
- version-aware
- backward compatible

---

## 18. Package Dependency Rules

Dependency được phép:

```
contracts

↓

shared

↓

core

↓

apps/plugins
```

Không được:

```
plugin

↓

core
```

Core không phụ thuộc Plugin.

---

## 19. Internal Contracts

M1 định nghĩa các interface cốt lõi.

Ví dụ:

```
ILogger

IConfiguration

IWorkspace

IEventBus

IClock

IFileSystem

IHost

IService
```

Chưa implement business logic.

---

## 20. Testing Strategy

M1 tập trung:

Unit Test.

Kiểm tra:

- configuration merge
- event publish
- workspace initialization
- lifecycle transition
- serialization

Chưa cần Integration Test.

---

## 21. Performance Goals

M1 đặt mục tiêu:

| Thành phần | Target |
|------------|--------|
| Host Startup | < 500 ms |
| Configuration Load | < 100 ms |
| Logger Write | < 2 ms |
| Event Publish | < 1 ms |
| Workspace Init | < 500 ms |

Đây là mục tiêu tối ưu, không phải hard requirement.

---

## 22. Acceptance Criteria

M1 hoàn thành khi:

- Host khởi động thành công.
- Configuration load đúng thứ tự.
- Logger hoạt động.
- Event Bus publish/subscribe hoạt động.
- Workspace tạo đúng cấu trúc.
- Lifecycle của service hoạt động.
- Unit test pass.
- CI pass.

---

## 23. Out of Scope

Không implement:

- Planning
- Knowledge
- Repository Analyzer
- Capability Registry
- Verification
- MCP
- AI Integration

Chỉ tạo hạ tầng.

---

## 24. Risks

Rủi ro lớn nhất:

Service boundary không rõ.

Nếu Logger, Workspace hoặc Configuration phụ thuộc lẫn nhau theo vòng.

Toàn bộ hệ thống sẽ khó mở rộng.

Mọi dependency mới phải được kiểm tra để đảm bảo không tạo circular dependency.

---

## 25. Exit Criteria

M1 chỉ hoàn thành khi:

- Có thể khởi động Harness Host.
- Có thể đăng ký và khởi tạo service mới mà không sửa Host.
- Mọi service đều đi qua lifecycle chuẩn.
- Workspace được khởi tạo tự động.
- Không còn dependency vòng giữa các package.

Đây sẽ là nền móng cho tất cả các milestone tiếp theo.

---
