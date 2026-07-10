# 07. ARTIFACT TEMPLATES

> **Version:** 1.1
> **Status:** Draft

---

# 1. Artifact Model & Taxonomy

## 1.1 Purpose
Tài liệu này định nghĩa mô hình Artifact (Artifact Model) thống nhất của Harness Specification. Artifact là một đơn vị tri thức có cấu trúc, có định danh và vòng đời được quản lý chặt chẽ.

## 1.2 Artifact Model Definition
Một Artifact khác biệt hoàn toàn với một file text thông thường:
- **File**: Là đơn vị lưu trữ vật lý trên đĩa.
- **Template**: Là khuôn mẫu cấu trúc logic (cú pháp).
- **Resource**: Là tài nguyên thực thi tĩnh.
- **Knowledge**: Là nội dung tri thức nghiệp vụ (mô tả logic).
- **Artifact**: Là sự kết hợp của **Identity + Type + Version + Metadata + Content + References + Lifecycle**.

Mỗi Artifact bắt buộc phải chứa các thành phần sau:
- **Identity (ID)**: Chuỗi định danh duy nhất (slug) trong hệ thống.
- **Type**: Phân loại chức năng của Artifact.
- **Version**: Phiên bản Semantic Versioning của Artifact.
- **Metadata**: Cấu hình thuộc tính của file.
- **Content**: Nội dung tri thức viết bằng văn bản Markdown.
- **References**: Danh sách liên kết tham chiếu đến các Artifact khác.
- **Lifecycle Status**: Trạng thái vòng đời hiện tại.

## 1.3 Artifact Taxonomy
Đặc tả phân loại toàn bộ Artifact trong hệ thống thành 11 loại chính:

1. **Rule**: Quy tắc phát triển code (Consumer: AI/Human, Producer: Human, Location: `.harness/rules/`).
2. **Knowledge**: Tri thức nghiệp vụ (Consumer: AI/Human, Producer: AI/Human, Location: `.harness/knowledge/`).
3. **Template**: Khuôn mẫu cấu trúc của các artifact (Consumer: CLI/Human, Producer: Human, Location: `.harness/templates/`).
4. **Workflow**: Quy trình tự động hóa task (Consumer: Runtime, Producer: Human, Location: `.harness/workflows/`).
5. **Skill**: Script/Capability tùy biến (Consumer: Runtime, Producer: Human, Location: `.harness/skills/`).
6. **Hook**: Event handler chạy tự động (Consumer: Runtime, Producer: Human, Location: `.harness/hooks/`).
7. **Prompt**: System prompt định hình hành vi AI (Consumer: AI client, Producer: Human, Location: `.harness/prompts/`).
8. **ADR (Architectural Decision Record)**: Quyết định kiến trúc (Consumer: AI/Human, Producer: Human, Location: `.harness/adr/`).
9. **Proposal**: Đề xuất thay đổi tri thức (Consumer: Human, Producer: AI Agent, Location: `.harness/proposals/`).
10. **Repository Map**: Sơ đồ cấu trúc logic dự án (Consumer: AI, Producer: CLI/Human, Location: `.harness/repository-map.md`).
11. **Manifest**: Tệp khai báo cấu hình toàn cục (Consumer: Runtime/CLI, Producer: Human, Location: `.harness/harness.yaml`).

---

# 2. Artifact Metadata Contract & Reference Model

## 2.1 Metadata Contract
Tất cả các Artifact Markdown bắt buộc phải khai báo Metadata ở phần đầu tệp tin (Frontmatter YAML) theo định dạng chuẩn sau:

| Field | Type | Required | Default | Constraint | Validation Rule |
|---|---|---|---|---|---|
| `id` | string | **Yes** | None | Chỉ chứa chữ thường, số, dấu `-` | Regex `^[a-z0-9-]+$` |
| `title` | string | **Yes** | None | Không dài quá 100 ký tự | String length <= 100 |
| `version` | string | **Yes** | `1.0.0` | Theo định dạng SemVer | Cú pháp `X.Y.Z` |
| `status` | string | **Yes** | `draft` | `draft`, `review`, `approved`, `deprecated` | Phải thuộc enum |
| `owner` | string | **Yes** | `human` | `human`, `agent` | Phải thuộc enum |
| `scope` | string | **Yes** | `local` | `local`, `shared` | Phải thuộc enum |
| `created` | string | **Yes** | None | Định dạng ISO 8601 | YYYY-MM-DD |
| `updated` | string | **Yes** | None | Định dạng ISO 8601 | YYYY-MM-DD |
| `references` | array | No | `[]` | Mảng các tệp tin hoặc ID | Phải tồn tại tệp tin đích |

## 2.2 Artifact Reference Model
- **Reference Types**:
  - **Local Reference**: Tham chiếu chéo đến Artifact khác cùng Repository (ví dụ: `rules/naming-rules.md`).
  - **Shared Reference**: Tham chiếu đến Artifact từ Shared Harness (ví dụ: `shared-core::rules/standard-format.md`).
- **Circular Reference**: Cấm tuyệt đối tham chiếu vòng. Runtime MUST build đồ thị tham chiếu và ném ra lỗi `CircularDependency` nếu phát hiện loop.
- **Broken Reference**: Nếu một tham chiếu đích không tồn tại, Runtime ném ra lỗi `InvalidReference` và dừng xử lý.
- **Reference Resolution**: Runtime giải quyết tham chiếu bằng cách quét tệp tin đích, nạp nội dung của nó vào context của tệp tin nguồn trước khi truyền cho AI Client.

### 2.3 Circular Reference Detection Algorithm

Runtime MUST sử dụng thuật toán DFS (Depth-First Search) với tập `visited` và `in_stack`:

1. Với mỗi Artifact, Runtime build một đồ thị có hướng (directed graph) dựa trên trường `references` trong metadata.
2. Chạy DFS từ mỗi node chưa visited.
3. Nếu DFS gặp lại một node đang trong `in_stack` hiện tại → phát hiện cycle.
4. Runtime ném lỗi `CircularDependency` kèm danh sách node tạo thành vòng.

Ví dụ output lỗi:
```json
{
  "error": "CircularDependency",
  "cycle": ["rules/auth-rules.md", "rules/jwt-rules.md", "rules/auth-rules.md"]
}
```

---

# 3. Artifact Lifecycle & Versioning

## 3.1 Artifact Lifecycle State Machine

```text
[Draft] ──► [Review] ──► [Approved] ──► [Deprecated] ──► [Archived] ──► [Removed]
```

- **Draft**: Do AI sinh hoặc con người viết nháp. (Ghi vào thư mục `proposals/`).
- **Review**: Con người xem xét đề xuất.
- **Approved**: Được merge vào thư mục chính thức (`rules/`, `adr/`, `knowledge/`).
- **Deprecated**: Đánh dấu không khuyến khích sử dụng, ghi warning khi nạp.
- **Archived**: Chuyển vào thư mục lưu trữ nén.
- **Removed**: Xóa hẳn khỏi hệ thống Git.

## 3.2 Artifact Versioning Rules
- **Semantic Versioning**: Mọi thay đổi nội dung logic của Artifact bắt buộc phải nâng version.
- **Compatible Update**: Sửa lỗi chính tả, làm rõ câu từ mà không đổi ý nghĩa: Nâng Patch version (`1.0.0` -> `1.0.1`).
- **Breaking Update**: Thay đổi hoàn toàn quy tắc hoặc thêm ràng buộc mới: Nâng Major/Minor version (`1.0.0` -> `1.1.0` hoặc `2.0.0`).
- **Migration & Rollback**: CLI thực hiện checkout phiên bản Git cũ để phục hồi trạng thái cũ của Artifact khi có lệnh rollback.

---

# 4. Artifact Discovery, Validation & Packaging

## 4.1 Discovery Flow
Runtime tìm kiếm Artifact theo thứ tự:
1. Đọc Manifest để lấy danh sách thư mục được mapping.
2. Quét cục bộ thư mục `.harness/rules/`, `.harness/knowledge/`,...
3. Quét Tool Global Workspace để tìm các package Shared Harness imports.
4. Merge thành Unified Workspace. Nếu trùng ID, Local ghi đè Shared.

## 4.2 Validation Matrix
- **Schema Validation**: Check frontmatter YAML xem có đủ các trường bắt buộc và đúng kiểu dữ liệu.
- **Metadata Validation**: Đảm bảo ngày tháng `created` <= `updated`.
- **Reference Validation**: Quét đồ thị dependency, check broken links và circular dependencies.
- **Content Validation**: File markdown không được chứa code block lỗi cú pháp hoặc link trống.

## 4.3 Artifact Packaging
- **Bundle**: Gom toàn bộ file của Shared Harness thành một thư mục đơn nhất.
- **Compression**: Nén thư mục thành file định dạng `.tar.gz`.
- **Integrity check**: CLI tính toán checksum hash SHA256 của file nén trước khi publish và ghi vào metadata.

---

# 5. Core Rules & Logical Templates

... (giữ nguyên phần templates Markdown của Repository Map, Rule, Knowledge, ADR ở phía sau)


# 5. Repository Map

## Purpose

Mô tả cấu trúc logic của Repository.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Overview | Yes | Tổng quan Repository |
| Repository Structure | Yes | Cấu trúc thư mục hoặc module |
| Module Overview | Yes | Mô tả các thành phần chính |
| Entry Points | Yes | Điểm bắt đầu quan trọng |
| Dependencies | Yes | Quan hệ phụ thuộc |
| External Systems | No | Hệ thống bên ngoài |
| Notes | No | Thông tin bổ sung |

### Markdown Template

```markdown
# Repository Map

> Version:
> Status: Draft | Approved
> Last Updated:

---

## Overview

<Tóm tắt ngắn về Repository>

---

## Repository Structure

```
<cấu trúc thư mục>
```

---

## Module Overview

| Module | Path | Description |
|--------|------|-------------|
| ...    | ...  | ...         |

---

## Entry Points

| Name | Path | Description |
|------|------|-------------|
| ...  | ...  | ...         |

---

## Dependencies

| Name | Version | Purpose |
|------|---------|---------|
| ...  | ...     | ...     |

---

## External Systems

<nếu có>

---

## Notes

<nếu có>
```

---

# 6. Repository Rule

## Purpose

Định nghĩa quy tắc của Repository.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Rule | Yes | Nội dung quy tắc |
| Scope | Yes | Phạm vi áp dụng |
| Rationale | Yes | Lý do tồn tại |
| Examples | No | Ví dụ |
| Exceptions | No | Ngoại lệ |
| References | No | Tài liệu liên quan |

### Markdown Template

```markdown
# Rule: <rule title>

> Version:
> Status: Draft | Approved
> Scope: <Global | Module | File type>
> Last Updated:

---

## Rule

<Nội dung quy tắc — viết ngắn gọn, một quy tắc duy nhất>

---

## Rationale

<Lý do quy tắc này tồn tại>

---

## Examples

### ✅ Correct

```<language>
<ví dụ đúng>
```

### ❌ Incorrect

```<language>
<ví dụ sai>
```

---

## Exceptions

<Ngoại lệ nếu có, hoặc "None">

---

## References

- <link hoặc tài liệu liên quan>
```

---

# 7. Knowledge

## Purpose

Lưu trữ tri thức lâu dài.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Topic | Yes | Chủ đề |
| Content | Yes | Nội dung |
| References | No | Tài liệu tham khảo |
| Examples | No | Ví dụ |
| Related Knowledge | No | Kiến thức liên quan |

### Markdown Template

```markdown
# Knowledge: <topic title>

> Version:
> Status: Draft | Approved
> Last Updated:

---

## Topic

<Chủ đề — một câu mô tả ngắn>

---

## Content

<Nội dung tri thức>

---

## Examples

<Ví dụ nếu có>

---

## Related Knowledge

- <link tới Knowledge khác nếu có>

---

## References

- <nguồn tham khảo nếu có>
```

---

# 8. Architecture Decision Record (ADR)

## Purpose

Lưu trữ các quyết định kiến trúc.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Context | Yes | Bối cảnh |
| Decision | Yes | Quyết định |
| Rationale | Yes | Lý do |
| Consequences | Yes | Ảnh hưởng |
| Alternatives | No | Phương án khác |
| References | No | Tài liệu liên quan |

### Markdown Template

```markdown
# ADR-<NNN>: <title>

> Status: Draft | Approved
> Date: <YYYY-MM-DD>

---

## Context

<Bối cảnh dẫn tới quyết định này>

---

## Decision

<Quyết định đã được đưa ra>

---

## Rationale

<Lý do chọn quyết định này>

---

## Consequences

<Ảnh hưởng của quyết định — cả tích cực và tiêu cực>

---

## Alternatives

<Các phương án đã được xem xét và lý do không chọn>

---

## References

- <nguồn tham khảo nếu có>
```

---

# 9. Task

## Purpose

Định nghĩa một đơn vị công việc.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Goal | Yes | Mục tiêu |
| Scope | Yes | Phạm vi |
| Acceptance Criteria | Yes | Tiêu chí hoàn thành |
| Constraints | No | Ràng buộc |
| References | No | Tài liệu liên quan |

### Markdown Template

```markdown
# Task: <title>

> Created: <ISO 8601>

---

## Goal

<Mục tiêu của Task>

---

## Scope

<Phạm vi — những gì nằm trong và ngoài phạm vi>

---

## Acceptance Criteria

- [ ] <tiêu chí 1>
- [ ] <tiêu chí 2>

---

## Constraints

<Ràng buộc nếu có>

---

## References

- <tài liệu liên quan nếu có>
```

---

# 10. Execution Result

## Purpose

Tổng hợp kết quả của một Execution.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Status | Yes | Trạng thái |
| Summary | Yes | Tóm tắt |
| Outputs | Yes | Kết quả tạo ra |
| Verification | No | Kết quả kiểm chứng |
| References | No | Tài liệu liên quan |

---

# 11. Evidence

## Purpose

Lưu bằng chứng phục vụ Governance.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Source | Yes | Nguồn dữ liệu |
| Observation | Yes | Quan sát |
| Reference | Yes | Bằng chứng tham chiếu |
| Notes | No | Ghi chú |

---

# 12. Review

## Purpose

Đánh giá kết quả của Execution.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Findings | Yes | Kết quả đánh giá |
| Supporting Evidence | Yes | Evidence hỗ trợ |
| Recommendation | Yes | Khuyến nghị |
| Risks | No | Rủi ro |
| Notes | No | Ghi chú |

---

# 13. Proposal

## Purpose

Đề xuất thay đổi Repository Knowledge.

### Logical Schema

| Field | Required | Description |
|--------|----------|-------------|
| Target Artifact | Yes | Artifact cần thay đổi |
| Change | Yes | Nội dung thay đổi |
| Rationale | Yes | Lý do |
| Supporting Evidence | Yes | Evidence hỗ trợ |
| Impact | No | Tác động |
| Alternatives | No | Phương án khác |

---

# 14. Markdown Template

Artifact nên sử dụng cấu trúc Markdown thống nhất.

Ví dụ:

```md
# Title

> Version:
> Status:

---

## Overview

...

---

## Content

...

---

## References

...
```

Platform có thể sử dụng định dạng khác miễn là biểu diễn đầy đủ Logical Schema.

---

Một Artifact hợp lệ khi:

- Có đầy đủ các Required Field.
- Không thay đổi ý nghĩa của các Field chuẩn.
- Có cấu trúc rõ ràng.
- Có thể được AI và con người đọc hiểu.
- Có thể được Platform tự động phân tích.

Platform có thể bổ sung Validation Rule nhưng không được làm giảm khả năng tương thích với Specification.

## Metadata Validation

Để các công cụ tự động của Runtime có hành vi kiểm tra nhất quán, quy trình validate metadata của mỗi Artifact bắt buộc phải tuân theo các quy tắc sau:

- **Metadata bắt buộc**: Mọi Artifact phải chứa trường `Version` và `Status` trong Frontmatter hoặc dòng tiêu đề.
- **Tính duy nhất của định danh (Identifier Uniqueness)**: 
  - Các ID của ADR (ví dụ: `ADR-001`) phải là duy nhất trong toàn bộ thư mục `adr/`.
  - Không được tồn tại hai Rule có cùng tiêu đề (`Title`) hoặc Slug trong hệ thống.
- **Quy ước đặt tên (Naming Conventions)**: Tuân thủ nghiêm ngặt quy định đặt tên file bằng chữ thường, dấu gạch ngang (slug-case) được định nghĩa trong Repository Model.
- **Trường dành riêng (Reserved Fields)**: Các trường như `version`, `status`, `scope`, `last-updated` được bảo lưu cho mục đích hệ thống. Runtime không được sử dụng các tên này cho metadata mở rộng của riêng mình.
- **Tính toàn vẹn của tham chiếu (Reference Integrity)**: Mọi tham chiếu chéo bằng liên kết file (ví dụ: Proposal liên kết tới Task Log, Knowledge liên kết tới ADR) phải là các liên kết thực tế tồn tại trên đĩa. Runtime phải kiểm tra và báo lỗi `ValidationFailed` nếu phát hiện broken link.

## Artifact Versioning

Các Artifact của Repository Knowledge được quản lý phiên bản theo quy tắc sau:

- **Phiên bản khởi tạo (Initial Version)**: Phiên bản đầu tiên của một Rule hoặc Knowledge khi tạo mới luôn bắt đầu bằng `1.0`.
- **Cập nhật tương thích (Compatible Updates)**: 
  - Khi bổ sung ví dụ, sửa lỗi chính tả hoặc làm rõ ý nghĩa của Rule/Knowledge hiện tại mà không thay đổi bản chất quy tắc.
  - Tăng Minor version (ví dụ: `1.0` → `1.1`).
- **Thay đổi đột phá (Breaking Changes)**: 
  - Khi thay đổi nội dung cốt lõi của một quy tắc, thu hẹp phạm vi áp dụng, hoặc áp đặt thêm ràng buộc bắt buộc mới.
  - Tăng Major version (ví dụ: `1.1` → `2.0`).
- **Phản đối sử dụng (Deprecation)**: 
  - Khi một quy tắc không còn được khuyến khích áp dụng nhưng chưa thể xóa bỏ ngay do các task cũ vẫn tham chiếu.
  - Đổi trạng thái `Status` của Artifact thành `Deprecated`.
- **Lưu trữ (Archival)**:
  - Các Rule hoặc Knowledge hết hiệu lực hoàn toàn sẽ được đổi trạng thái thành `Retired` (đối với Rule) hoặc `Archived` (đối với Knowledge). 
  - Runtime mặc định bỏ qua các tài liệu này trong quá trình tải Context.

---

# 16. Extensibility

Platform có thể:

- Thêm Metadata.
- Thêm Optional Field.
- Thêm Custom Section.

Platform không được:

- Xóa Required Field.
- Đổi ý nghĩa của Required Field.
- Thay đổi Logical Schema của Artifact.

---

# 17. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Execution Artifact |
| 04. GOVERNANCE MODEL | Định nghĩa Governance Artifact |
| 06. AGENT CONFIGURATION | Định nghĩa cách AI khám phá và sử dụng Artifact |

Artifact Templates chuẩn hóa cả **Template** và **Logical Schema** của Artifact nhằm đảm bảo mọi Platform và Toolkit có thể tạo, đọc, kiểm tra và quản lý Repository Knowledge một cách nhất quán.