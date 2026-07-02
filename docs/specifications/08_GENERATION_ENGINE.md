

# Generation Engine Specification

## 1. Purpose

Generation Engine chịu trách nhiệm tạo **khung code chuẩn hóa và bị khóa một phần (locked structure)** trước khi AI viết business logic.

Mục tiêu chính:

> Biến kiến trúc thành constraint vật lý trong code.

---

## 2. Design Goals

Generation Engine được thiết kế để:

* ép AI đi đúng architecture;
* loại bỏ khả năng “tự sáng tạo cấu trúc sai”;
* chuẩn hóa pattern theo plugin;
* giảm burden cho Planning Engine;
* tăng consistency giữa các team/agent;
* hỗ trợ deterministic code generation.

---

## 3. Core Responsibility

Generation Engine chịu trách nhiệm:

* sinh file structure;
* sinh class/interface skeleton;
* inject dependency patterns;
* tạo locked regions;
* tạo TODO regions;
* map plan step → code structure.

Không chịu trách nhiệm:

* viết business logic;
* validate logic;
* chạy test;
* quyết định architecture.

---

## 4. Trigger Condition

Generation Engine chỉ chạy khi:

```text id="trigger"
PlanStep.action == "create"
```

Không áp dụng cho:

* update
* delete
* move

---

## 5. Output Model

```typescript id="sc_output"
interface GenerationOutput {

    file_path: string

    template_id: string

    content: string

    locked_regions: LockedRegion[]

    todo_regions: TodoRegion[]

}
```

---

## 6. Protected Region Model

```typescript id="locked"
interface LockedRegion {

    start_line: number

    end_line: number

    reason: string

}
```

---

## 7. TODO Region Model

```typescript id="todo"
interface TodoRegion {

    start_line: number

    end_line: number

    instruction: string

}
```

---

## 8. Generation Flow

```text id="flow"
PlanStep (create)

↓

Plugin Template Resolver

↓

Pattern Selection

↓

Scaffold Generator

↓

Protected Region Injection

↓

TODO Region Injection

↓

Output File Structure
```

---

## 9. Template Resolution Strategy

Thứ tự resolve template:

1. Project-level template
2. Plugin-level template
3. Default fallback template

---

## 10. Pattern System

Generation Engine không generate từ zero.

Nó dựa vào Pattern Registry:

| Pattern      | Example              |
| ------------ | -------------------- |
| CQRS Handler | .NET Command Handler |
| Controller   | REST API Controller  |
| Service      | Domain Service       |
| Repository   | Data Access Layer    |

---

## 11. Locked Structure Rule

Generation Engine MUST lock:

* constructor
* dependency injection
* interface signature
* class declaration

AI is NOT allowed to modify these parts.

---

## 12. Scaffold Example

```text id="example"
// ===== Protected Region (Generation Engine) =====

public class CreateUserHandler
{
    private readonly IUserRepository _repo;

    public CreateUserHandler(IUserRepository repo)
    {
        _repo = repo;
    }

    public Task Execute(CreateUserCommand cmd)
    {
        // ===== TODO REGION (AI) =====

        throw new NotImplementedException();
    }
}
```

---

## 13. Enforcement Model

Generation Engine itself không enforce runtime.

Enforcement được thực hiện bởi:

* Runtime Engine (diff check)
* Verification Engine (post-check)

---

## 14. Integration with Planning Engine

Planning Engine decides:

* file path
* action type
* dependency

Generation Engine decides:

* structure inside file
* pattern mapping
* locked boundaries

---

## 15. Integration with Context Pack

Context Pack provides:

* architecture hints
* pattern recommendation
* similar files

Generation Engine consumes this to choose template.

---

## 16. Determinism Rule

Same input:

* PlanStep
* Plugin
* Pattern

→ must produce identical scaffold.

No randomness allowed.

---

## 17. Multi-Plugin Support

Each plugin defines generation templates:

* DotNet → CQRS, DI-heavy structure
* Node → service/controller pattern
* Python → module-based structure

Plugin is source of truth for scaffold style.

---

## 18. Validation Rules

Scaffold is rejected if:

* missing Protected Region
* missing TODO region
* incorrect pattern mapping
* invalid dependency injection structure
* mismatch with plugin rules

---

## 19. Performance Targets

| Operation           |  Target |
| ------------------- | ------: |
| Template resolve    |  < 20ms |
| Pattern selection   |  < 50ms |
| Generation | < 100ms |
| Full output         | < 150ms |

---

## 20. Failure Modes

* no matching pattern → fallback template
* plugin missing → default scaffold only
* invalid context → minimal scaffold
* ambiguous step → reject generation

---

## 21. Testing Strategy

* deterministic scaffold test
* Protected Region integrity test
* plugin variation test
* template fallback test
* pattern mapping correctness test

---

## 22. Definition of Done

Generation Engine hoàn thành khi:

* tạo đúng structure theo plugin;
* Protected Region không thể bị AI sửa mà không bị detect;
* deterministic output;
* mapping plan → code structure ổn định;
* fallback hoạt động khi thiếu context;
* tích hợp đầy đủ với Runtime Engine.

---

## 23. Architectural Notes

Generation Engine là **cơ chế biến architecture thành code constraint**.

Nếu Planning Engine là “luật”, Runtime Engine là “thi hành”, thì Generation Engine là:

> “kiến trúc được đóng băng vào cấu trúc code”

Đây là lớp giúp giảm 70–90% lỗi kiến trúc do AI tự suy diễn.

---

**End of Part 18**