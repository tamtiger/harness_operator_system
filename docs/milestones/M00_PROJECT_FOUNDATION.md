# Milestone M0 — Project Foundation

## 1. Goal

Tạo nền tảng phát triển ổn định cho toàn bộ dự án.

M0 **không tạo ra bất kỳ tính năng người dùng nào**.

Giá trị của M0 là:

- chuẩn hóa cấu trúc;
- giảm technical debt;
- giảm refactor sau này.

---

## 2. Deliverables

Sau M0 phải có:

- monorepo structure
- build được
- test được
- lint được
- format được
- CLI khởi động được
- logging hoạt động
- configuration load được

Không cần Knowledge.

Không cần MCP.

Không cần Planning.

---

## 3. Folder Structure

```
harness/

docs/

packages/

apps/

plugins/

tests/

scripts/

examples/

.github/
```

---

Trong packages:

```
core/

cli/

shared/

contracts/
```

---

Trong plugins:

```
dotnet/
```

duy nhất.

Không tạo Java.

Không tạo Go.

---

## 4. Core Packages

M0 chỉ tạo package.

Không implement logic.

Ví dụ:

```
packages/

core/

contracts/

shared/

cli/
```

Mỗi package chỉ cần:

- build
- unit test
- publish reference

---

## 5. Shared Library

Shared chỉ chứa:

- Result
- Error
- Logger
- Config
- Utility

Không chứa business logic.

---

## 6. Configuration

Ngay từ M0 phải thống nhất:

```
config/

↓

project.yaml

↓

workspace.yaml

↓

user.yaml
```

Configuration phải immutable sau khi load.

Không module nào được sửa config runtime.

---

## 7. Logging

Sử dụng structured logging.

Không log text thuần.

Ví dụ:

```
timestamp

level

category

message

payload
```

Không sử dụng Console.WriteLine trong Core.

---

## 8. Error Model

Thống nhất Error ngay từ đầu.

Ví dụ:

```
ValidationError

ConfigurationError

PluginError

VerificationError

PlanningError
```

Không throw Exception tùy tiện.

---

## 9. Result Model

Mọi API nội bộ trả về:

```
Result<T>
```

hoặc

```
Error
```

Không trả:

```
null

undefined

magic value
```

---

## 10. CLI Bootstrap

CLI chỉ cần hỗ trợ:

```
harness --version

harness doctor

harness init
```

Tất cả command khác.

Chưa implement.

Chỉ tạo placeholder.

---

## 11. Testing

M0 chỉ cần:

Unit Test.

Không Integration Test.

Không E2E.

---

## 12. Acceptance Criteria

M0 hoàn thành khi:

- build pass;
- test pass;
- lint pass;
- format pass;
- CLI chạy được;
- configuration load được;
- logging hoạt động;
- package dependency đúng;
- CI pass.

---

## 13. Out of Scope

Không làm:

- MCP
- Plugin
- Repository Analyzer
- Knowledge
- Planning
- Runtime
- Verification
- AI

Nếu xuất hiện nhu cầu.

Đưa về backlog.

---

## 14. Risks

Rủi ro lớn nhất của M0:

Thiết kế package sai.

Nếu package boundary sai.

Chi phí refactor toàn bộ dự án sẽ rất lớn.

Do đó.

Ưu tiên review package structure hơn là viết code nhanh.

---

## 15. Exit Criteria

Sau khi hoàn thành M0.

Developer phải có khả năng:

```
git clone

↓

install

↓

build

↓

test

↓

run CLI
```

trong dưới 5 phút.

Nếu chưa đạt.

M0 chưa hoàn thành.

---
