# 197. Milestone M7 — Planning Engine

## Goal

Planning Engine chịu trách nhiệm:

- nhận kế hoạch từ AI;
- kiểm tra tính hợp lệ;
- đánh giá rủi ro;
- xác định phạm vi ảnh hưởng;
- quyết định kế hoạch có được phép thực thi hay không.

Planning Engine không sinh Plan.

AI sinh Plan.

Planning Engine là bộ phận kiểm duyệt.

---

# 198. Responsibilities

Planning Engine chịu trách nhiệm:

- Plan Validation
- Risk Assessment
- Impact Analysis
- Scope Validation
- Approval Workflow
- Versioning

Không chịu trách nhiệm:

- Code Generation
- Verification
- Context Building

---

# 199. High-Level Workflow

```
AI

↓

Plan

↓

Schema Validation

↓

Semantic Validation

↓

Risk Analysis

↓

Impact Analysis

↓

Approval Decision

↓

Approved Plan
```

---

# 200. Inputs

Planning Engine nhận:

- Task
- Plan
- Repository Metadata
- Code Index
- Knowledge Bundle

Không đọc source code trực tiếp.

---

# 201. Outputs

Planning Engine chỉ trả về:

```text
APPROVED

REJECTED

AWAITING_APPROVAL
```

kèm theo:

- reason
- diagnostics
- warnings

---

# 202. Plan Schema

Phase 1.

Plan phải gồm:

- summary
- steps
- files
- rollback
- test strategy

Không chấp nhận Plan thiếu bất kỳ trường bắt buộc nào.

---

# 203. Validation Pipeline

```
JSON Schema

↓

Business Rules

↓

Repository Rules

↓

Scope Rules

↓

Approval Rules
```

Mỗi bước fail sẽ dừng pipeline.

---

# 204. Schema Validation

Kiểm tra:

- field
- enum
- duplicate step
- missing file
- invalid action

Hoàn toàn deterministic.

---

# 205. Semantic Validation

Kiểm tra:

- step order
- dependency
- rollback
- orphan step
- duplicated file

Ví dụ.

Không được:

```
Delete

↓

Update
```

cùng một file.

---

# 206. Scope Validation

So sánh:

Plan

↓

Repository

↓

Task

Ví dụ.

Task:

```
Fix Login
```

Plan:

```
Update Payment Module
```

↓

Reject.

---

# 207. Impact Analysis

Planning Engine hỏi Code Index.

Ví dụ.

```
Update Interface

↓

Bao nhiêu implementation?

↓

Bao nhiêu caller?

↓

Bao nhiêu project?
```

Kết quả dùng để tính Risk.

---

# 208. Risk Assessment

Risk không chỉ dựa trên số file.

Nên chấm điểm theo nhiều yếu tố.

Ví dụ.

| Factor | Weight |
|----------|---------|
| Files | 15 |
| Public API | 30 |
| Database | 25 |
| Security | 25 |
| Build Config | 20 |
| Breaking Change | 40 |

Điểm cuối cùng được chuẩn hóa thành:

LOW

MEDIUM

HIGH

CRITICAL

---

# 209. Approval Workflow

```
LOW

↓

Auto

MEDIUM

↓

Configurable

HIGH

↓

Human

CRITICAL

↓

Human + Reviewer
```

Không AI nào tự approve.

---

# 210. Plan Versioning

Mỗi lần AI sửa Plan.

↓

Version tăng.

Ví dụ.

```
v1

↓

Rejected

↓

v2

↓

Approved
```

Không ghi đè.

---

# 211. Diagnostics

Planning Engine phải trả lỗi rõ ràng.

Ví dụ.

```
Step 4

↓

Update file ngoài scope

↓

Rejected
```

Không trả:

```
Invalid Plan
```

---

# 212. Warnings

Warning không block.

Ví dụ.

```
Bạn đang sửa 18 file.

Risk tăng.

```

AI vẫn có thể tiếp tục nếu Approval cho phép.

---

# 213. Plan Graph

Planning Engine chuyển Plan thành DAG.

```
Step

↓

Dependency

↓

Execution Graph
```

Điều này sẽ phục vụ Runtime Engine.

---

# 214. Parallelism

Phase 1.

Chỉ hỗ trợ:

```
Sequential Execution
```

DAG chỉ để validate.

Phase 2.

Mới hỗ trợ:

```
Parallel Step
```

---

# 215. Rollback Validation

Rollback phải kiểm tra:

- có strategy
- có checkpoint
- có target

Không chấp nhận:

```
Rollback:

Undo changes
```

---

# 216. Public APIs

```
Validate()

AssessRisk()

AnalyzeImpact()

Approve()

Reject()

GetPlan()
```

---

# 217. Storage

Plan Store:

```
SQLite
```

Lưu:

- versions
- diagnostics
- approvals
- timestamps

---

# 218. Metrics

Theo dõi:

- approval rate
- rejection rate
- retry count
- average risk
- approval latency

---

# 219. Testing

Unit Test.

- schema
- validation
- risk
- approval

Integration Test.

- feature
- bug
- refactor

Golden Test.

- risk stability

---

# 220. Acceptance Criteria

Hoàn thành khi:

- Validation đúng.
- Scope đúng.
- Impact đúng.
- Risk đúng.
- Approval đúng.
- Versioning đúng.

---

# 221. Out of Scope

Không implement.

- AI Planning
- Multi-Agent Planning
- Cost Estimation
- Timeline Prediction

---

# 222. Risks

Sai lầm phổ biến:

Planning Engine bắt đầu "thông minh".

Đây là hướng sai.

Planning Engine phải:

```
Predictable
```

không phải:

```
Creative
```

---

# 223. Exit Criteria

Sau M7.

Harness có khả năng:

```
AI

↓

Submit Plan

↓

Governance

↓

Approved Plan
```

Đây là cột mốc đầu tiên biến Harness thành **governance layer**, thay vì chỉ là một tập hợp công cụ.

---

# 224. Architectural Refinement

## Tách Validation thành Rule Pipeline

Thay vì:

```
Planning Engine

↓

Validate()
```

Nên:

```
Planning Engine

↓

Rule Pipeline

↓

Schema Rule

↓

Scope Rule

↓

Impact Rule

↓

Approval Rule
```

Mỗi Rule độc lập và có thể mở rộng.

Điều này giúp:

- thêm Rule mới không sửa Engine;
- bật/tắt Rule theo project;
- plugin có thể bổ sung Rule riêng (ví dụ ABP Rule, Clean Architecture Rule).

---

# 225. Future Extension Points

Phase 2 có thể thêm:

- Cost Rule
- Performance Rule
- AI Confidence Rule
- Security Rule
- Compliance Rule

Tất cả chỉ là Rule mới trong Pipeline.

Không thay đổi kiến trúc.

---

# 226. Definition of Success

Một Planning Engine tốt không phải là Engine reject nhiều nhất.

Một Planning Engine tốt là Engine **ngăn được các kế hoạch nguy hiểm nhưng không cản trở các thay đổi hợp lệ**.

Tiêu chí quan trọng nhất là:

- ít false positive;
- ít false negative;
- hành vi ổn định và có thể giải thích.

---
