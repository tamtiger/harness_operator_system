**End of Part 7**
# 111. Planning Engine

## Purpose

Planning Engine chịu trách nhiệm kiểm tra và quản lý kế hoạch thực hiện do AI Agent đề xuất.

Planning Engine không tạo kế hoạch.

Planning Engine không thay AI suy nghĩ.

Nhiệm vụ của Planning Engine là:

* kiểm tra;
* chuẩn hóa;
* đánh giá;
* phê duyệt;
* quản lý vòng đời của Plan.

Planning Engine đóng vai trò là "governance layer" giữa AI và quá trình thực thi.

---

# 112. Responsibilities

Planning Engine chịu trách nhiệm:

* validate Plan;
* kiểm tra schema;
* kiểm tra tính đầy đủ;
* tính Risk Level;
* phát hiện scope vượt giới hạn;
* điều phối Approval Workflow;
* quản lý version của Plan.

Planning Engine không chịu trách nhiệm:

* context retrieval;
* Generation;
* verification;
* code generation.

---

# 113. Inputs

Planning Engine nhận:

```text
Submitted Plan

Repository Metadata

Project Configuration
```

Không nhận source code.

Không nhận prompt.

---

# 114. Outputs

Planning Engine sinh:

```text
Approved Plan
```

hoặc

```text
Rejected Plan
```

hoặc

```text
Awaiting Approval
```

Không có trạng thái khác.

---

# 115. Planning Pipeline

```text
Plan Submission

↓

Schema Validation

↓

Semantic Validation

↓

Risk Evaluation

↓

Approval Policy

↓

Persist Plan
```

Pipeline luôn chạy theo đúng thứ tự.

---

# 116. Schema Validation

Bước đầu tiên là kiểm tra schema.

Ví dụ:

* thiếu Step;
* thiếu Rollback;
* thiếu Test Strategy;
* sai enum.

Nếu schema sai.

Pipeline dừng ngay.

---

# 117. Semantic Validation

Sau khi schema hợp lệ.

Planning Engine kiểm tra:

* file có tồn tại không;
* module có hợp lệ không;
* action có phù hợp không;
* scope có hợp lý không.

Semantic Validation không đọc nội dung source code.

Nó sử dụng Repository Metadata và Code Index.

---

# 118. Risk Evaluation

Risk được tính hoàn toàn bởi Harness.

Không sử dụng giá trị AI gửi lên.

Planning Engine gọi Risk Evaluator để xác định:

* LOW
* MEDIUM
* HIGH
* CRITICAL

Chi tiết thuật toán được mô tả trong tài liệu Policy Engine.

---

# 119. Approval Workflow

Planning Engine không tự quyết định Approval Policy.

Nó chỉ thực thi policy.

Ví dụ:

```text
LOW

↓

Auto Approve
```

```text
HIGH

↓

Human Review
```

Approval Policy có thể thay đổi theo project.

---

# 120. Plan Versioning

Mỗi lần AI gửi lại kế hoạch.

Planning Engine tạo version mới.

Ví dụ:

```text
v1

↓

Rejected

↓

v2

↓

Approved
```

Không ghi đè version cũ.

Lịch sử phải được giữ nguyên để phục vụ audit.

---

# 121. Public API

Planning Engine cung cấp:

* Submit Plan
* Get Plan
* List Plan Versions
* Cancel Plan

Không subsystem nào được ghi trực tiếp vào Plan Store.

---

# 122. Performance Targets

| Operation           |   Target |
| ------------------- | -------: |
| Schema Validation   |  < 10 ms |
| Semantic Validation | < 100 ms |
| Risk Evaluation     |  < 20 ms |
| Approval Decision   |  < 10 ms |

---

# 123. Testing Strategy

Planning Engine cần:

* Unit Test cho validator.
* Unit Test cho approval policy.
* Integration Test với Runtime Engine.
* Golden Test cho nhiều loại Plan.

---

# 124. Definition of Done

Planning Engine được xem là hoàn thành khi:

* Chỉ chấp nhận Plan hợp lệ.
* Tính đúng Risk Level.
* Quản lý đầy đủ lịch sử version.
* Thực thi Approval Policy chính xác.
* Không phụ thuộc AI Model cụ thể.

---

## Architectural Notes

Planning Engine là **validator**, không phải **planner**.

Mọi quyết định sáng tạo (creative reasoning) thuộc về AI Agent.

Mọi quyết định quản trị (governance) thuộc về Planning Engine.

Ranh giới này cần được giữ ổn định trong suốt vòng đời của dự án.

---


# Planning Engine Specification

## 1. Purpose

Planning Engine là thành phần chuyển đổi từ **Context Pack → Execution Plan**.

Đây là nơi mọi ý tưởng của AI bị “đóng khung lại” thành các bước có thể kiểm soát, verify, rollback.

Planning Engine là **gate bắt buộc trước khi có bất kỳ thay đổi code nào**.

---

## 2. Design Goals

Planning Engine được thiết kế để:

* biến ý tưởng tự do thành plan có cấu trúc;
* kiểm soát scope ngay từ đầu;
* phát hiện rủi ro trước khi code;
* giảm ambiguity của AI;
* chuẩn hóa execution flow;
* hỗ trợ rollback-aware planning.

---

## 3. Core Responsibility

Planning Engine chịu trách nhiệm:

* validate plan structure;
* tính risk level;
* phân tách task thành steps;
* xác định impact;
* từ chối plan không hợp lệ;
* đảm bảo plan deterministic.

Không chịu trách nhiệm:

* execute code;
* generate scaffold;
* chạy test;
* review code.

---

## 4. Input / Output

### Input

```typescript id="pe_input"
interface PlanningInput {

    context: ContextPack

    task_description: string

}
```

---

### Output

```typescript id="pe_output"
interface Plan {

    id: string

    task_id: string

    version: number

    status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'

    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    steps: PlanStep[]

    impact: ImpactAnalysis

    rollback_plan: string

    test_strategy: string

}
```

---

## 5. PlanStep Model

```typescript id="plan_step"
interface PlanStep {

    id: string

    order: number

    action: 'create' | 'update' | 'delete' | 'move'

    file_path?: string

    description: string

    dependencies: string[]

}
```

---

## 6. Impact Analysis

```typescript id="impact"
interface ImpactAnalysis {

    files_to_change: string[]

    interfaces_affected: string[]

    breaking_changes: boolean

    db_schema_change: boolean

    public_api_change: boolean

}
```

---

## 7. Planning Flow

```text id="pf_flow"
Context Pack

↓

AI Draft Plan

↓

Planning Engine Validation

↓

Risk Scoring

↓

Impact Analysis

↓

Approval Gate

↓

Final Plan
```

---

## 8. Validation Rules

Planning Engine reject plan nếu:

* thiếu steps;
* step không có file_path (với action update/create);
* risk_level không khớp impact;
* scope quá lớn không chia nhỏ;
* dependency cycle giữa steps;
* không có rollback plan.

---

## 9. Risk Scoring Model

```text id="risk"
LOW:
- <5 files
- no interface change

MEDIUM:
- multiple files
- internal refactor

HIGH:
- public API change
- DB schema change

CRITICAL:
- auth/payment/security
- production data migration
```

Planning Engine override AI-provided risk.

---

## 10. Deterministic Rule

Plan phải deterministic:

Cùng Context Pack + Task → cùng Plan structure (hoặc gần như identical).

Không phụ thuộc:

* prompt variation
* AI model randomness

---

## 11. Step Ordering Rules

Planning Engine enforce:

* dependency-first ordering
* no orphan step
* no circular dependency
* create → update → verify order preference

---

## 12. Rollback Plan

Mỗi Plan phải có rollback strategy:

Ví dụ:

```text id="rollback"
- request rollback via Runtime Engine
- git reset --hard to git_checkpoint_commit
- re-run verification
```

Nếu không có rollback → reject plan nếu risk ≥ MEDIUM.

---

## 13. Test Strategy Generation

Planning Engine phải define:

* unit test scope
* integration test scope
* affected modules
* regression risk areas

---

## 14. Approval Gate

| Risk     | Behavior                        |
| -------- | ------------------------------- |
| LOW      | auto approve                    |
| MEDIUM   | require confirmation            |
| HIGH     | human approval required         |
| CRITICAL | blocked until explicit override |

---

## 15. Interaction with Other Engines

```text id="interaction"
Context Engine → Planning Engine → Runtime Engine → Verification Engine
```

Planning Engine is:

* downstream of Context Engine
* upstream of Runtime Engine

Không được skip Planning Engine.

---

## 16. Failure Modes

Planning Engine failure nếu:

* plan không executable;
* steps không consistent;
* missing dependency resolution;
* mismatch between risk and impact.

---

## 17. Performance Targets

| Operation           |  Target |
| ------------------- | ------: |
| Plan Validation     | < 100ms |
| Risk Scoring        |  < 50ms |
| Impact Analysis     | < 150ms |
| Full Planning Cycle | < 300ms |

---

## 18. Testing Strategy

* deterministic plan generation test
* invalid plan rejection test
* risk scoring validation
* dependency ordering test
* rollback requirement enforcement test

---

## 19. Definition of Done

Planning Engine hoàn thành khi:

* không thể bypass bằng AI prompt;
* plan luôn structured;
* risk scoring override AI;
* impact analysis consistent;
* rollback required enforced;
* deterministic output;
* integrates với Context Pack và Runtime Engine.

---

## 20. Architectural Notes

Planning Engine là **boundary giữa “thinking” và “execution”**.

Nếu Context Pack là “what AI sees”, thì Planning Engine là “what AI is allowed to do”.

Sai Planning Engine → system mất kiểm soát scope.

---

**End of Part 16**