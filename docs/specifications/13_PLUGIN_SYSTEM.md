**End of Part 11**
# 198. Plugin System

## Purpose

Plugin System là cơ chế mở rộng của Universal Coding Harness.

Core không chứa logic đặc thù của bất kỳ ngôn ngữ lập trình, framework hay nền tảng nào.

Mọi khả năng hỗ trợ một stack đều được cung cấp thông qua Plugin.

Điều này cho phép Harness hỗ trợ nhiều hệ sinh thái mà không làm thay đổi Core.

---

# 199. Design Goals

Plugin System được thiết kế để:

* tách biệt Core và platform-specific logic;
* cho phép bổ sung ngôn ngữ mới mà không sửa Core;
* hỗ trợ versioning;
* hỗ trợ capability discovery;
* hỗ trợ nhiều plugin trong tương lai.

---

# 200. Responsibilities

Plugin chịu trách nhiệm cung cấp các khả năng đặc thù của một stack, bao gồm:

* phân tích cấu trúc project;
* build;
* test;
* lint;
* architecture rules;
* generation templates.

Plugin không chịu trách nhiệm:

* quản lý workflow;
* quản lý runtime state;
* lập kế hoạch;
* quản trị phiên làm việc.

---

# 201. Plugin Architecture

```text
Core Engines
      │
      ▼
Plugin Registry
      │
      ├────────► DotNet Plugin
      ├────────► Java Plugin
      ├────────► Go Plugin
      ├────────► Python Plugin
      └────────► Node Plugin
```

Core chỉ giao tiếp với Plugin Registry.

Không Engine nào phụ thuộc trực tiếp vào một Plugin cụ thể.

---

# 202. Plugin Lifecycle

Một Plugin trải qua các giai đoạn:

1. Discovery
2. Registration
3. Capability Validation
4. Activation
5. Runtime Usage
6. Shutdown

Nếu Plugin không vượt qua bước Validation thì không được kích hoạt.

---

# 203. Plugin Manifest

Mỗi Plugin phải cung cấp một Manifest mô tả:

* tên;
* phiên bản;
* ngôn ngữ;
* framework;
* các capability hỗ trợ;
* phiên bản Harness tối thiểu.

Manifest là cơ sở để Plugin Registry kiểm tra khả năng tương thích.

---

# 204. Plugin Capabilities

Capability là đơn vị chức năng nhỏ nhất mà Plugin cung cấp.

Ví dụ:

| Capability                  | Mô tả                       |
| --------------------------- | --------------------------- |
| Repository Analyzer Adapter | Phân tích cấu trúc project  |
| Builder                     | Build hoặc compile          |
| Tester                      | Chạy test                   |
| Linter                      | Kiểm tra coding style       |
| Rule Provider               | Cung cấp architecture rules |
| Template Provider           | Cung cấp generation templates |

Một Plugin có thể không hỗ trợ toàn bộ capability, nhưng phải khai báo rõ những gì mình cung cấp.

---

# 205. Plugin Registry

Plugin Registry chịu trách nhiệm:

* phát hiện Plugin;
* kiểm tra Manifest;
* đăng ký capability;
* cung cấp Plugin phù hợp cho từng Engine.

Registry không thực thi logic của Plugin.

---

# 206. Capability Resolution

Khi một Engine yêu cầu một capability, Plugin Registry sẽ:

1. xác định project đang sử dụng stack nào;
2. tìm Plugin phù hợp;
3. kiểm tra capability tồn tại;
4. trả về implementation tương ứng.

Nếu không có capability phù hợp, Registry trả lỗi rõ ràng thay vì fallback ngầm.

---

# 207. Version Compatibility

Plugin phải khai báo:

* Plugin Version
* Supported Harness Version

Harness từ chối nạp Plugin nếu không tương thích về phiên bản.

Điều này giúp tránh lỗi do thay đổi interface giữa các phiên bản.

---

# 208. Extension Model

Phase 1 sử dụng plugin trong cùng tiến trình (in-process).

Mọi Plugin chạy trong không gian thực thi của Harness.

Phase 2 có thể mở rộng sang out-of-process hoặc sandbox nếu cần tăng tính cô lập và bảo mật.

---

# 209. Public API

Plugin Registry cung cấp:

* Discover Plugins
* Register Plugin
* Resolve Capability
* Get Plugin Metadata
* List Installed Plugins

Đây là API duy nhất mà Core sử dụng để làm việc với Plugin.

---

# 210. Performance Targets

| Operation             |   Target |
| --------------------- | -------: |
| Plugin Discovery      | < 200 ms |
| Manifest Validation   |  < 20 ms |
| Capability Resolution |   < 5 ms |
| Plugin Initialization | < 100 ms |

---

# 211. Testing Strategy

Plugin System cần:

### Unit Tests

* Manifest validation
* Capability resolution
* Version compatibility

### Integration Tests

* DotNet Plugin
* Plugin Registry

### Contract Tests

Mỗi Plugin phải vượt qua cùng một bộ kiểm thử hợp đồng (contract tests) để đảm bảo tuân thủ interface của Harness.

---

# 212. Definition of Done

Plugin System được xem là hoàn thành khi:

* Core không chứa logic đặc thù của ngôn ngữ hoặc framework.
* DotNet Plugin hoạt động đầy đủ với các capability của Phase 1.
* Plugin Registry có thể phát hiện và đăng ký Plugin.
* Capability được phân giải chính xác.
* Có thể bổ sung Plugin mới mà không cần sửa Core.

---

# 213. Architectural Notes

Plugin System là ranh giới giữa **Core** và **platform-specific implementation**.

Core chỉ làm việc với các interface và capability đã được định nghĩa.

Mọi chi tiết về công cụ build, test, lint, quy ước framework hoặc generation template đều được đóng gói trong Plugin.

Thiết kế này giúp Universal Coding Harness đạt được mục tiêu hỗ trợ nhiều stack khác nhau mà vẫn giữ Core ổn định và độc lập.

---

**End of Part 12**

# Plugin System Specification

## 1. Purpose

Plugin System là lớp mở rộng cho toàn bộ Harness, cho phép:

> hỗ trợ nhiều ngôn ngữ, framework và runtime mà không thay đổi Core Engine.

Plugin là cách Harness đạt được:

* language-agnostic architecture
* framework independence
* execution extensibility
* verification portability

---

## 2. Design Goals

Plugin System được thiết kế để:

* tách Core khỏi language-specific logic;
* cho phép thêm ngôn ngữ mà không sửa Core;
* chuẩn hóa build/test/lint interface;
* đảm bảo deterministic behavior;
* hỗ trợ versioning & backward compatibility;
* sandbox execution an toàn.

---

## 3. Core Principle

> Core Engine không bao giờ biết “ngôn ngữ là gì”.

Core chỉ biết:

* Builder
* Tester
* Linter
* Rule Engine
* Template Provider

Tất cả logic cụ thể nằm trong Plugin.

---

## 4. Plugin Interface

```typescript id="plugin_interface"
interface HarnessPlugin {

    name: string

    version: string

    language: string

    framework?: string

    builder: Builder

    tester: Tester

    linter: Linter

    ruleEngine: RuleEngine

    templateProvider: TemplateProvider

}
```

---

## 5. Builder Interface

```typescript id="builder"
interface Builder {

    build(projectPath: string): BuildResult

}
```

Responsibility:

* compile code
* resolve dependencies
* return build errors structured

---

## 6. Tester Interface

```typescript id="tester"
interface Tester {

    runTests(projectPath: string): TestResult

}
```

Responsibility:

* unit tests
* integration tests (if supported)
* return structured test output

---

## 7. Linter Interface

```typescript id="linter"
interface Linter {

    lint(projectPath: string): LintResult

}
```

Responsibility:

* style rules
* formatting rules
* basic static analysis

---

## 8. Rule Engine Interface (L4)

```typescript id="rule_engine"
interface RuleEngine {

    validate(codebase: Codebase): RuleResult

}
```

Responsibility:

* architecture constraints
* dependency rules
* forbidden patterns
* layering rules

---

## 9. Template Provider

```typescript id="template"
interface TemplateProvider {

    getTemplate(pattern: string): GenerationTemplate

}
```

Responsibility:

* CQRS template
* Controller template
* Service template
* Repository template

---

## 10. Plugin Lifecycle

```text id="lifecycle"
Load Plugin
   ↓
Validate Compatibility
   ↓
Register Capabilities
   ↓
Activate in Runtime
   ↓
Use in Engines
```

---

## 11. Plugin Registry

Core maintains registry:

```text id="registry"
PluginRegistry
├── dotnet
├── node
├── python
├── go
└── java
```

Each plugin is isolated.

---

## 12. Versioning Model

```text id="versioning"
plugin.name = dotnet
plugin.version = 1.2.0
```

Rules:

* minor version = backward compatible
* major version = breaking changes
* Core must support multiple plugin versions

---

## 13. Compatibility Matrix

```text id="matrix"
Core v1 → supports:
    dotnet <= 1.x
    node <= 1.x
```

Core refuses incompatible plugin load.

---

## 14. Sandbox Isolation

Plugin execution must be:

* isolated process OR
* restricted runtime container

Rules:

* no direct filesystem access outside project scope
* no network access (optional config)
* no global state mutation

---

## 15. Plugin Selection Flow

```text id="selection"
Project Config (project.yaml)
        ↓
Detect language/framework
        ↓
Load matching plugin
        ↓
Fallback to default plugin
```

---

## 16. Integration with Engines

| Engine              | Plugin Role                     |
| ------------------- | ------------------------------- |
| Generation Engine     | TemplateProvider                |
| Verification Engine | Builder / Tester / RuleEngine   |
| Context Engine      | (indirect via pattern metadata) |
| Runtime Engine      | no direct dependency            |

---

## 17. Determinism Requirement

Plugin MUST be deterministic:

Same input → same output:

* build result
* test result
* lint result
* rule validation

No randomness allowed.

---

## 18. Failure Handling

Plugin failure modes:

| Failure            | Action          |
| ------------------ | --------------- |
| crash              | fallback plugin |
| timeout            | retry once      |
| missing dependency | escalate        |
| invalid output     | reject result   |

---

## 19. Hot Reload Support (Phase 2)

Future capability:

* reload plugin without restart
* version switch per project
* A/B testing plugins

---

## 20. Metrics Tracking

Plugin system tracks:

* build success rate
* test failure rate
* rule violation frequency
* average execution time
* plugin reliability score

---

## 21. Security Constraints

Plugins MUST NOT:

* execute arbitrary system commands outside sandbox
* access secrets outside project scope
* modify Core state
* bypass verification pipeline

---

## 22. Testing Strategy

* plugin isolation test
* deterministic output test
* compatibility matrix test
* fallback behavior test
* sandbox violation test

---

## 23. Definition of Done

Plugin System hoàn thành khi:

* Core không phụ thuộc language-specific logic;
* plugin có thể thêm mới mà không sửa Core;
* verification pipeline hoạt động qua plugin;
* Generation phụ thuộc template provider;
* deterministic behavior đảm bảo;
* sandbox isolation hoạt động.

---

## 24. Architectural Notes

Plugin System là:

> “boundary between Core Intelligence and Execution Reality”

Nếu Core là não, thì Plugin là tay chân.

Sai Plugin System → hệ thống sẽ bị lock vào 1 stack và mất toàn bộ mục tiêu “universal”.

---

**End of Part 21**