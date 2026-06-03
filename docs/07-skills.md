# Skills

[← Mục lục](./README.md) | [← CLI Reference](./cli-reference.md) | [Instincts →](./instincts.md)

---

## Skills là gì?

Skills là tài liệu hướng dẫn có cấu trúc mà agent đọc để biết cách làm việc. Mỗi skill là một file `SKILL.md` với YAML frontmatter chứa metadata.

> 📖 Xem [skill-format.md](./skill-format.md) để biết chi tiết đặc tả agentskills.io spec.

---

## Thứ tự ưu tiên

1. **Repo-specific** (`.harness/skills/`) — ưu tiên cao nhất
2. **User global** (`~/.harness/skills/`) — override built-in
3. **Built-in** (`harness-os/skills/`) — mặc định

Skill cùng tên ở level cao hơn sẽ override level thấp hơn.

---

## 30 Built-in Skills

### Tier 1 — Core Workflow (3 skills, luôn gợi ý)

Những skill cốt lõi được gợi ý ở mỗi session_start, không phụ thuộc vào task.

| Skill | Tiếng Việt | Mục đích |
|-------|-----------|----------|
| `karpathy-guidelines` | Nguyên tắc Karpathy | 4 nguyên tắc cơ bản: Suy nghĩ trước, Đơn giản, Phẫu thuật, Hướng mục tiêu |
| `harness-workflow` | Quy trình Harness | Vòng đời session (CTR gate, artifacts, EPCC mapping) |
| `strategic-compact` | Quản lý Context Chiến lược | Quản lý dung lượng context window một cách hiệu quả |

---

### Tier 2 — Contextual Skills (25 skills, gợi ý theo keyword)

Những skill được gợi ý dựa trên từ khóa trong task title/scope. Mỗi skill có keywords tiếng Anh + tiếng Việt.

#### **Thiết kế & Kiến trúc (5 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `design-grilling` | Phản biện Thiết kế | Phản biện thiết kế triệt để, đánh giá trade-off | design, architecture, plan, rfc, proposal, evaluate, tradeoff, thiết kế, kiến trúc, kế hoạch, đề xuất, đánh giá, cân nhắc |
| `prototype-first` | Xây dựng Prototype Trước | Xây dựng bản thử nghiệm để giải đáp câu hỏi thiết kế | prototype, spike, experiment, poc, proof-of-concept, explore, mẫu, thử nghiệm, khám phá |
| `architecture-review` | Đánh giá Kiến trúc | Đánh giá kiến trúc, phát hiện shallow modules, coupling | architecture, module, refactor, deep, shallow, coupling, seam, kiến trúc, mô-đun, tái cấu trúc, liên kết |
| `spec-driven-workflow` | Quy trình Hướng Spec | RIPER-5 phases (Research → Innovate → Plan → Execute → Review) | riper, riper-5, deep-dive, phase-detail, chi tiết pha |
| `brainstorming` | Động não giải pháp | Khung brainstorm giải pháp đa phương án với tradeoff matrix | brainstorm, ideate, explore, approach, tradeoff, ý tưởng, phương án |

#### **Quy trình Phát triển (7 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `tdd-workflow` | Test-Driven Development | Red-Green-Refactor: viết test trước, code sau, tái cấu trúc | test, tdd, red-green, refactor, unit-test, coverage, kiểm thử, bao phủ |
| `read-first` | Đọc Trước | Đọc code trước khi viết, tìm patterns, tránh trùng lặp | search, find, existing, pattern, duplicate, understand, tìm kiếm, mẫu, trùng lặp, hiểu |
| `systematic-diagnosis` | Chẩn đoán Có hệ thống | Chẩn đoán lỗi có hệ thống: tái tạo → nguyên nhân → fix | bug, fix, error, crash, debug, investigate, diagnose, reproduce, regression, lỗi, sửa, sập, gỡ lỗi, điều tra, chẩn đoán, tái tạo, hồi quy |
| `vertical-slicing` | Phân rã Dọc | Phân rã lát cắt dọc (tracer bullets), end-to-end thin slices | slice, vertical, tracer, end-to-end, thin, increment, phân rã, dọc, mỏng, tăng dần |
| `parallel-coordination` | Phối hợp Song song | Phân rã công việc thành track độc lập, quản lý dependencies | parallel, concurrent, decompose, independent, fan-out, stage, song song, độc lập, giai đoạn |
| `edge-case-generation` | Sinh Test Biên | Sinh hệ thống test case biên (boundary, failure, adversarial) | edge-case, boundary, adversarial, fuzz, negative, overflow, biên, đối kháng, tràn |
| `subagent-driven-development` | Phát triển qua Subagent | Điều phối và ủy thác công việc cho các agent con qua tool | subagent, parallel, worker, delegate, dispatch, phân công |

#### **Chất lượng & Bảo mật (4 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `security-audit` | Kiểm toán Bảo mật | STRIDE threat modeling + OWASP Top 10 security audit | security, vulnerability, owasp, stride, auth, injection, xss, bảo mật, lỗ hổng, xác thực, tiêm |
| `deep-research` | Nghiên cứu Sâu | Nghiên cứu có cấu trúc với xác thực nguồn và tổng hợp | research, investigate, compare, evaluate, benchmark, literature, nghiên cứu, so sánh, đánh giá, chuẩn mực |
| `autonomous-optimizer` | Tối ưu Tự động | Tối ưu hóa code tự động với measurement loops | optimize, performance, benchmark, measure, improve, profile, tối ưu, hiệu năng, đo lường, cải thiện |
| `code-review-workflow` | Quy trình Code Review | Khung tự đánh giá chất lượng code và viết PR template | code-review, review, pr, pull-request, merge-request, đánh giá code |

#### **Yêu cầu & Lập kế hoạch (4 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `to-prd` | Tổng hợp PRD | Tổng hợp thông tin thành PRD tiêu chuẩn | prd, requirements, product, feature, user-story, acceptance, yêu cầu, sản phẩm, tính năng, chấp nhận |
| `triage` | Phân loại Issues | Triage state machine cho issues/tasks, tự sinh Agent Brief | triage, priority, severity, classify, assign, backlog, phân loại, ưu tiên, mức độ, gán |
| `continuous-learning` | Học tập Liên tục | Ghi nhận và phát triển instincts thành skills lâu dài | learn, pattern, instinct, capture, evolve, học, mẫu, bắt giữ, phát triển |
| `finishing-a-development-branch` | Hoàn thành Nhánh | Checklist dọn dẹp branch, cập nhật changelog trước khi bàn giao | finish, branch, cleanup, git, worktree, dọn dẹp |

#### **C# / .NET Stack (5 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `csharp-baseline` | C# Baseline | C# / .NET / ABP baseline conventions và architecture | csharp, dotnet, abp, entity, repository, appservice, c#, .net, thực thể, kho, dịch vụ |
| `csharp-bugfix` | Fix Bug C# | Quy trình fix bug trong C# / ABP | csharp, dotnet, bug, fix, exception, null, ef-core, c#, .net, ngoại lệ, null |
| `csharp-feature` | Tính năng C# | Quy trình implement feature trong C# / ABP | csharp, dotnet, feature, implement, service, controller, c#, .net, dịch vụ, bộ điều khiển |
| `csharp-code-review` | Code Review C# | Code review checklist cho C# / ABP | csharp, dotnet, review, code-review, pr, merge-request, c#, .net, đánh giá, yêu cầu hợp nhất |
| `csharp-repair` | Sửa chữa C# | Sửa compile errors, runtime errors, test failures | csharp, dotnet, hotfix, repair, patch, urgent, c#, .net, vá, khẩn cấp |

#### **PHP / XAMPP Stack (3 skills)**

| Skill | Tiếng Việt | Mục đích | Keywords |
|-------|-----------|----------|----------|
| `php-baseline` | PHP Baseline | PHP conventions: Composer, PSR standards, PHPUnit, PHPStan, XAMPP stack | php, composer, psr, phpunit, phpstan, xampp, strict_types |
| `php-codeigniter-3-workflow` | CI3 Workflow | CodeIgniter 3: HMVC, routing, database, migrations, form validation | codeigniter, ci3, hmvc, mx_controller, xampp |
| `php-codeigniter-4-workflow` | CI4 Workflow | CodeIgniter 4: PSR-4, Spark CLI, entities, Shield auth, migrations | codeigniter, ci4, spark, psr-4, shield, entities |

---

### Tier 3 — On-Demand Skills (2 skills, không bao giờ tự động gợi ý)

Những skill chỉ load khi agent explicit request, không được gợi ý tự động.

| Skill | Tiếng Việt | Mục đích |
|-------|-----------|----------|
| `write-a-skill` | Viết Skill | Meta-skill: hướng dẫn tạo skill mới |
| `verification-loop` | Vòng Xác thực | Luồng xác thực liên tục (embedded trong harness-workflow) |

---

## Skill Suggestion (Tiered Keyword Matching)

### Cách hoạt động

Khi agent tạo task, harness-os tự động gợi ý skills phù hợp dựa trên:
- **Tier 1 (Core):** Luôn gợi ý 3 skill cốt lõi (`karpathy-guidelines`, `harness-workflow`, `strategic-compact`)
- **Tier 2 (Contextual):** Gợi ý 2-4 skills dựa trên keyword match với task title/scope
- **Tier 3 (On-demand):** Không bao giờ tự động gợi ý, chỉ load khi explicit

### Ví dụ

```
Task: "Fix null reference in PaymentService.Process()"
→ Tier 1: karpathy-guidelines, harness-workflow, strategic-compact
→ Tier 2: systematic-diagnosis (match: "fix", "bug"), csharp-bugfix (match: "fix", "dotnet")
→ Total: 5 skills gợi ý
```

```
Task: "Design event-driven architecture for notification system"
→ Tier 1: karpathy-guidelines, harness-workflow, strategic-compact
→ Tier 2: design-grilling (match: "design", "architecture"), architecture-review (match: "architecture")
→ Total: 5 skills gợi ý
```

### API

```
skill_suggest(
  task_title: string,
  task_scope?: string,
  stack?: string,
  max_results?: number
) → { suggested_skills: [...], total_available: 30 }
```

---

## YAML Frontmatter Format

```yaml
---
name: my-custom-skill
version: "1.0"
updated: 2026-05-26
applies_to: ["node", "typescript"]    # hoặc ["*"] cho tất cả stacks
triggers: ["session_start", "task_create"]
description: Mô tả ngắn gọn skill làm gì.
metadata:
  tier: 2                              # 1 (core), 2 (contextual), 3 (on-demand)
  keywords: ["keyword1", "keyword2"]   # Dùng cho tier 2 matching
---
```

| Field | Type | Mô tả |
|-------|------|--------|
| `name` | string | Tên skill (dùng để load) |
| `version` | string | Version (so sánh khi update) |
| `updated` | string | Ngày cập nhật (YYYY-MM-DD) |
| `applies_to` | string[] | Stacks áp dụng: `*`, `node`, `dotnet`, `python`, `go`, `rust` |
| `triggers` | string[] | Khi nào suggest: `session_start`, `task_create`, `task_update`, `session_end` (deprecated, dùng tier + keywords) |
| `description` | string | Mô tả ngắn |
| `metadata.tier` | number | 1 (core), 2 (contextual), 3 (on-demand) — default: 2 |
| `metadata.keywords` | string[] | Keywords cho tier 2 matching — default: [] |

---

## Tạo Custom Skill

**Bước 1:** Tạo thư mục skill

```bash
# Repo-specific
mkdir -p .harness/skills/my-skill

# Hoặc global
mkdir -p ~/.harness/skills/my-skill
```

**Bước 2:** Tạo `SKILL.md`

```markdown
---
name: my-skill
version: "1.0"
updated: 2026-05-26
applies_to: ["node"]
triggers: ["task_create"]
description: Custom workflow cho project này.
---

# My Custom Skill

## Khi nào áp dụng
- Khi tạo task mới trong project Node.js

## Quy trình
1. Kiểm tra existing tests trước
2. Viết test mới theo pattern có sẵn
3. Implement code
4. Verify

## Anti-patterns
- Không viết test sau khi code xong
- Không copy-paste test từ file khác mà không hiểu
```

**Bước 3:** Verify

```bash
harness skills --show my-skill
```

---

## Skill từ Session (auto-generate)

Agent có thể tạo skill draft từ patterns trong session:

```json
{ "session_id": "a3f1b2c4-...", "theme": "error-handling" }
```

Tool `skill_create_from_session` phân tích audit log → sinh SKILL.md draft. User review và lưu thủ công.

---

## Glossary — Thuật ngữ Kỹ thuật

### Skill & Learning

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **Skill** | Kỹ năng | Tài liệu hướng dẫn có cấu trúc giúp agent biết cách làm việc |
| **Tier** | Tầng | Mức độ ưu tiên của skill (1=core, 2=contextual, 3=on-demand) |
| **Keyword matching** | Khớp từ khóa | Quá trình tìm skills phù hợp dựa trên từ khóa trong task |
| **Instinct** | Bản năng | Pattern được học từ session, có thể phát triển thành skill |
| **Frontmatter** | Phần đầu | Metadata YAML ở đầu file SKILL.md |

### Quy trình Phát triển

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **TDD** | Phát triển hướng test | Test-Driven Development: viết test trước, code sau |
| **Red-Green-Refactor** | Đỏ-Xanh-Tái cấu trúc | Chu kỳ TDD: test fail (đỏ) → code pass (xanh) → cải thiện (tái cấu trúc) |
| **Vertical slicing** | Phân rã dọc | Chia tính năng thành các lát cắt mỏng, end-to-end |
| **Tracer bullet** | Viên đạn theo dõi | Prototype đơn giản để kiểm tra hướng đi |
| **Edge case** | Trường hợp biên | Tình huống ở ranh giới của logic (boundary conditions) |
| **Regression** | Hồi quy | Lỗi cũ xuất hiện lại sau khi fix |

### Thiết kế & Kiến trúc

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **Architecture** | Kiến trúc | Cấu trúc tổng thể của hệ thống |
| **Module** | Mô-đun | Thành phần độc lập của hệ thống |
| **Coupling** | Liên kết | Mức độ phụ thuộc giữa các mô-đun (cao = xấu) |
| **Cohesion** | Kết dính | Mức độ liên quan giữa các phần trong mô-đun (cao = tốt) |
| **Shallow module** | Mô-đun nông | Mô-đun có interface phức tạp nhưng logic đơn giản |
| **Deep module** | Mô-đun sâu | Mô-đun có interface đơn giản nhưng logic phức tạp (tốt) |
| **Seam** | Điểm nối | Nơi có thể thay đổi hành vi mà không sửa code |
| **Trade-off** | Cân nhắc | Sự đánh đổi giữa các lựa chọn (tốc độ vs bộ nhớ) |

### Bảo mật

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **STRIDE** | STRIDE | Mô hình đe dọa: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege |
| **OWASP** | OWASP | Open Web Application Security Project: top 10 lỗ hổng web |
| **Injection** | Tiêm | Lỗ hổng cho phép chèn code độc hại (SQL injection, command injection) |
| **XSS** | XSS | Cross-Site Scripting: chèn script vào trang web |
| **Authentication** | Xác thực | Xác minh danh tính người dùng |
| **Authorization** | Phân quyền | Xác định quyền hạn của người dùng |
| **Vulnerability** | Lỗ hổng | Điểm yếu có thể bị khai thác |

### Kiểm thử

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **Unit test** | Kiểm thử đơn vị | Test một hàm/method riêng lẻ |
| **Integration test** | Kiểm thử tích hợp | Test nhiều thành phần làm việc cùng nhau |
| **Coverage** | Bao phủ | Phần trăm code được kiểm thử |
| **Boundary condition** | Điều kiện biên | Giá trị ở ranh giới của input (0, -1, max value) |
| **Adversarial input** | Input đối kháng | Input được thiết kế để phá vỡ logic |
| **Fuzz testing** | Kiểm thử mờ | Gửi random input để tìm lỗi |

### C# / .NET

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **ABP** | ABP | ASP.NET Boilerplate: framework cho .NET |
| **Entity** | Thực thể | Class đại diện cho bảng trong database |
| **Repository** | Kho | Pattern để truy cập dữ liệu |
| **AppService** | Dịch vụ ứng dụng | Lớp logic nghiệp vụ |
| **Controller** | Bộ điều khiển | Xử lý HTTP requests |
| **EF Core** | EF Core | Entity Framework Core: ORM cho .NET |
| **Null reference** | Tham chiếu null | Lỗi khi truy cập thuộc tính của object null |
| **Exception** | Ngoại lệ | Lỗi runtime |

### Quy trình & Quản lý

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **Triage** | Phân loại | Sắp xếp issues theo ưu tiên |
| **Priority** | Ưu tiên | Mức độ quan trọng (P0, P1, P2, P3) |
| **Severity** | Mức độ | Mức độ ảnh hưởng (Critical, High, Medium, Low) |
| **Backlog** | Danh sách chờ | Tập hợp tasks chưa được thực hiện |
| **Sprint** | Vòng lặp | Chu kỳ phát triển (thường 2 tuần) |
| **Burndown** | Giảm dần | Biểu đồ theo dõi tiến độ sprint |
| **PRD** | Tài liệu yêu cầu sản phẩm | Product Requirements Document |
| **User story** | Câu chuyện người dùng | Mô tả tính năng từ góc nhìn người dùng |
| **Acceptance criteria** | Tiêu chí chấp nhận | Điều kiện để task được coi là hoàn thành |

### Hiệu năng & Tối ưu

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|-----------|-----------|
| **Benchmark** | Chuẩn mực | Đo lường hiệu năng để so sánh |
| **Profile** | Phân tích | Đo lường thời gian/bộ nhớ của từng phần code |
| **Optimization** | Tối ưu | Cải thiện hiệu năng |
| **Measurement loop** | Vòng đo lường | Chu kỳ: đo → cải thiện → đo lại |
| **Bottleneck** | Nút thắt | Phần code chậm nhất |

---

## Tham khảo thêm

- 📖 [skill-format.md](./skill-format.md) — Đặc tả agentskills.io
- 📖 [glossary.md](./glossary.md) — Glossary đầy đủ
- 📖 [instincts.md](./instincts.md) — Học tập liên tục
