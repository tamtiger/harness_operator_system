# 00_ARCHITECTURE.md — Architecture Foundation

**Version:** 4.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11  
**Phân loại:** Single Source of Truth — Architecture Layer  

---

## Mục lục

1. [Purpose](#1-purpose)
2. [Problem Statement](#2-problem-statement)
3. [Vision](#3-vision)
4. [Design Principles](#4-design-principles)
5. [Core Architecture](#5-core-architecture)
6. [Core Concepts Table](#6-core-concepts-table)
7. [Architecture Planes](#7-architecture-planes)
8. [Knowledge Lifecycle](#8-knowledge-lifecycle)
9. [Tool Compatibility](#9-tool-compatibility)
10. [Independence Model](#10-independence-model)
11. [Specification Hierarchy](#11-specification-hierarchy)
12. [Architecture Invariants](#12-architecture-invariants)
13. [Out of Scope](#13-out-of-scope)

---

## 1. Purpose

### Harness là gì

**Harness** là một **Knowledge Management Platform** được thiết kế để quản lý, phân phối và kiểm soát knowledge (kiến thức vận hành) cho các AI Coding Tools trong môi trường phát triển phần mềm.

Harness hoạt động như một **lớp trung gian chuẩn hóa** giữa tổ chức (người sở hữu knowledge) và các AI tools (người tiêu thụ knowledge). Nó đảm bảo rằng mọi AI tool đều hoạt động dựa trên cùng một nền tảng kiến thức nhất quán, được phê duyệt, và có thể kiểm soát được.

### Harness làm gì

- **Quản lý Knowledge Repository**: Lưu trữ, version hóa, và phân phối knowledge dưới dạng files có cấu trúc
- **Merge Shared + Local**: Kết hợp knowledge dùng chung (shared) với knowledge tùy chỉnh (local) thành Effective Harness
- **Cung cấp Repository Context**: Tạo ra snapshot immutable của knowledge tại thời điểm execution
- **Orchestrate Execution Runtime**: Điều phối việc AI tools tiêu thụ knowledge để thực thi capabilities
- **Governance & Lifecycle Management**: Kiểm soát toàn bộ vòng đời của knowledge từ tạo ra đến promote

### Harness không làm gì

- Harness **không** viết code thay cho AI tools
- Harness **không** là một AI model hay inference engine
- Harness **không** thay thế IDE, debugger, hay build system
- Harness **không** quản lý source code của project (chỉ quản lý knowledge về cách làm việc)
- Harness **không** execute business logic trực tiếp — nó chỉ cung cấp context để AI tools thực thi
- Harness **không** lưu trữ state của execution — mỗi execution là stateless

---

## 2. Problem Statement

### Bối cảnh

Trong môi trường phát triển phần mềm hiện đại, các team sử dụng nhiều AI Coding Tools khác nhau (Cursor, Claude Code, Kiro, Gemini CLI, v.v.). Mỗi tool có cơ chế riêng để nhận context và knowledge. Điều này tạo ra một loạt vấn đề nghiêm trọng:

### Vấn đề 1: AI Tools thiếu Shared Knowledge

Mỗi AI tool hoạt động trong "bong bóng" của riêng nó. Khi một engineer viết một convention mới trong Cursor, engineer khác dùng Claude Code không biết gì về convention đó. Không có cơ chế nào để knowledge được **chia sẻ một cách có hệ thống** giữa các tools.

**Hệ quả**: Cùng một team nhưng các AI tools đưa ra output khác nhau cho cùng một vấn đề.

### Vấn đề 2: Inconsistency giữa các Tools

Không có Single Source of Truth cho các quy tắc, conventions, và patterns. Mỗi tool có thể có file config riêng (`CLAUDE.md`, `.cursorrules`, v.v.) với nội dung mâu thuẫn nhau.

**Hệ quả**: Code được tạo ra không nhất quán. Review tốn nhiều thời gian hơn. Technical debt tăng nhanh.

### Vấn đề 3: Không có Governance

Không có quy trình nào kiểm soát **ai được phép thay đổi knowledge** và **knowledge nào đã được phê duyệt**. Bất kỳ engineer nào cũng có thể sửa `.cursorrules` mà không qua review.

**Hệ quả**: Knowledge chất lượng thấp, chưa được kiểm chứng, lẫn vào cùng với knowledge tốt. Không có audit trail.

### Vấn đề 4: Không Reuse được Knowledge

Khi một team phát hiện một pattern tốt, không có cơ chế nào để **promote pattern đó lên shared level** để toàn bộ tổ chức hưởng lợi. Knowledge bị "chết" trong local config của từng project.

**Hệ quả**: Tổ chức không học được từ kinh nghiệm. Cùng một vấn đề được giải quyết nhiều lần theo nhiều cách khác nhau.

### Tóm tắt Impact

| Vấn đề | Impact | Mức độ |
|--------|--------|--------|
| Thiếu Shared Knowledge | AI tools hoạt động không nhất quán | Cao |
| Inconsistency | Technical debt, review overhead tăng | Cao |
| Không có Governance | Knowledge chất lượng thấp, không có audit | Nghiêm trọng |
| Không Reuse được | Tổ chức không cải thiện theo thời gian | Cao |

---

## 3. Vision

### Self-Improving Knowledge Platform

Harness được xây dựng với tầm nhìn trở thành một **Self-Improving Knowledge Platform** — nền tảng tự cải thiện knowledge theo thời gian thông qua quy trình có kiểm soát.

### Knowledge Lifecycle Vision

Knowledge trong Harness PHẢI đi qua toàn bộ vòng đời sau:

```
CREATE → REVIEW → APPROVE → VERSION → PUBLISH → REUSE → IMPROVE → PROMOTE
  │         │        │          │         │         │        │         │
  │         │        │          │         │         │        │         └─→ Quay về Repository
  │         │        │          │         │         │        └─→ Cải thiện dựa trên thực tế
  │         │        │          │         │         └─→ AI Tools tiêu thụ knowledge
  │         │        │          │         └─→ Knowledge có thể dùng
  │         │        │          └─→ Snapshot immutable
  │         │        └─→ Human gate bắt buộc
  │         └─→ Peer review
  └─→ Engineer đề xuất knowledge mới
```

### Ý nghĩa của từng bước

| Bước | Ý nghĩa | Người thực hiện |
|------|---------|-----------------|
| **Create** | Engineer tạo ra knowledge mới (rule, pattern, convention) | Engineer |
| **Review** | Peer review để đảm bảo chất lượng và tính đúng đắn | Senior Engineer / Tech Lead |
| **Approve** | Human gate — người có thẩm quyền phê duyệt chính thức | Tech Lead / Architect |
| **Version** | Gán version, tạo snapshot immutable | Platform (automated) |
| **Publish** | Knowledge được đưa vào Repository và có thể dùng | Platform (automated) |
| **Reuse** | AI Tools tiêu thụ knowledge qua Repository Context | AI Tools |
| **Improve** | Dựa trên thực tế sử dụng, đề xuất cải thiện | Engineer / AI Tools |
| **Promote** | Knowledge tốt được promote từ Local lên Shared | Governance process |

### Kết quả mong đợi

Sau mỗi vòng lặp, knowledge base trở nên **phong phú hơn, chính xác hơn, và có giá trị hơn**. Tổ chức tích lũy được "institutional knowledge" có thể tái sử dụng và kiểm soát được.

---

## 4. Design Principles

Các nguyên tắc thiết kế sau đây là **bất biến** — mọi quyết định kiến trúc và implementation PHẢI tuân theo.

### P01 — KISS (Keep It Simple, Stupid)

Độ phức tạp là kẻ thù của adoption. Harness phải đơn giản đến mức một engineer mới có thể hiểu và sử dụng trong vòng 30 phút. Mỗi khái niệm phải có một mục đích rõ ràng. Tránh abstraction không cần thiết.

> **Áp dụng**: Khi có hai thiết kế đều đúng, chọn cái đơn giản hơn.

### P02 — Repository First

Mọi knowledge PHẢI đi qua Repository. Không có "in-memory only knowledge", không có "temporary knowledge", không có "undocumented conventions". Nếu một piece of knowledge không ở trong Repository, nó không tồn tại với Harness.

> **Áp dụng**: Mọi rule, pattern, convention đều phải được commit vào Repository trước khi dùng.

### P03 — Knowledge as Code

Knowledge được quản lý như source code: có version control, có review process, có CI/CD, có rollback. Mỗi thay đổi về knowledge phải có commit message, author, và timestamp.

> **Áp dụng**: Knowledge files được lưu trong Git repository, tuân theo same workflow như application code.

### P04 — Shared as Foundation

Shared Harness là nền tảng chung cho toàn bộ tổ chức. Nó chứa các conventions, patterns, và rules áp dụng cho tất cả projects. Shared Harness phải stable, well-reviewed, và high quality.

> **Áp dụng**: Thay đổi Shared Harness cần approval process nghiêm ngặt hơn Local Harness.

### P05 — Local as Customization

Local Harness chỉ được dùng để **mở rộng hoặc override** Shared Harness cho nhu cầu cụ thể của project. Local không được contradct Shared mà không có lý do rõ ràng và được documented.

> **Áp dụng**: Local Harness KHÔNG được duplicate nội dung từ Shared. Chỉ chứa delta.

### P06 — Effective Harness

Effective Harness là kết quả merge của Shared + Local. Đây là **view cuối cùng** mà Execution Runtime thấy. Effective phải deterministic — cùng input (Shared + Local) luôn tạo ra cùng output.

> **Áp dụng**: Merge algorithm phải được defined rõ ràng, không có ambiguity.

### P07 — Runtime Uses Repository Context

Execution Runtime KHÔNG đọc trực tiếp từ Repository hay filesystem khi đang chạy. Nó chỉ được phép sử dụng Repository Context — snapshot đã được prepared và frozen trước khi execution bắt đầu.

> **Áp dụng**: Mọi I/O của Execution Runtime phải thông qua Repository Context interface.

### P08 — Repository Context is Immutable

Một khi Repository Context đã được tạo ra cho một execution session, nó KHÔNG được thay đổi trong suốt session đó. Mọi thay đổi về knowledge chỉ có hiệu lực ở execution session tiếp theo.

> **Áp dụng**: Repository Context phải được lock/freeze ngay sau khi tạo.

### P09 — Runtime is Stateless

Execution Runtime không lưu trữ state giữa các executions. Mỗi execution nhận đủ context từ Repository Context để hoạt động. Không có "session state", không có "cached knowledge" giữa executions.

> **Áp dụng**: Sau khi execution kết thúc, tất cả runtime state phải bị discard.

### P10 — Platform as Control Plane

Platform là **orchestrator duy nhất** của toàn bộ hệ thống. Platform quyết định khi nào tạo Repository Context, khi nào khởi động Execution Runtime, khi nào kết thúc session. Không có component nào được bypass Platform.

> **Áp dụng**: Direct access vào Repository Context hoặc Execution Runtime mà không qua Platform là violation.

### P11 — Governance Manages Knowledge, Not Execution

Governance chịu trách nhiệm về **chất lượng và lifecycle của knowledge**, không phải về cách knowledge được sử dụng trong execution. Governance không can thiệp vào Execution Runtime.

> **Áp dụng**: Governance chỉ có quyền approve/reject knowledge changes, không có quyền control runtime behavior.

### P12 — Separation of Concerns

Mỗi layer (Repository, Runtime, Governance, Platform) có trách nhiệm riêng và không overlap. Changes trong một layer không được yêu cầu changes trong layer khác (trừ trường hợp interface change).

> **Áp dụng**: Dependency chỉ được phép theo chiều: Platform → Repository, Platform → Runtime, Governance → Repository.

### P13 — Single Responsibility

Mỗi component, file, và concept trong Harness phải có **một và chỉ một** trách nhiệm rõ ràng. Nếu một component đang làm hai việc, đó là dấu hiệu cần tách ra.

> **Áp dụng**: Mỗi specification document chỉ describe một domain concern.

### P14 — Explicit Dependency

Mọi dependency giữa các components PHẢI được declared rõ ràng. Không có implicit dependency, không có "magic imports", không có undocumented coupling.

> **Áp dụng**: Dependency graph phải được maintain và documented trong architecture docs.

### P15 — No Circular Dependency

Dependency graph của Harness PHẢI là một DAG (Directed Acyclic Graph). Không có circular dependency giữa bất kỳ components nào.

> **Áp dụng**: Nếu circular dependency xuất hiện, đó là dấu hiệu thiết kế sai — cần refactor.

### P16 — Convention over Configuration

Harness cung cấp sensible defaults cho mọi thứ. Engineer chỉ cần configure khi muốn override defaults. Điều này giảm thiểu friction và tăng adoption.

> **Áp dụng**: Mọi configurable parameter phải có documented default value.

### P17 — Human Approval Gate

Bất kỳ thay đổi nào ảnh hưởng đến Shared Harness hoặc promote knowledge từ Local lên Shared PHẢI có human approval. Không có automated promotion mà không qua human review.

> **Áp dụng**: CI/CD pipeline phải enforce approval gate — không được merge mà không có approval từ người có thẩm quyền.

---


## 5. Core Architecture

### Layered Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE PLANE                         │
│           (Knowledge Lifecycle Management)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ manages
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PLATFORM (Control Plane)                 │
│              Orchestrates all other components              │
└──────┬──────────────────────────────────────────────────────┘
       │ reads / writes
       ▼
┌─────────────────────────────────────────────────────────────┐
│                 REPOSITORY PLANE (Persistence)              │
│                                                             │
│   ┌─────────────────────┐                                   │
│   │  Harness Repository │  ← Git-backed, versioned storage  │
│   └──────────┬──────────┘                                   │
│              │ contains                                     │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │   Shared Harness    │  ← Organization-wide knowledge    │
│   └──────────┬──────────┘                                   │
│              │ merged with                                  │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │   Local Harness     │  ← Project-specific customization │
│   └──────────┬──────────┘                                   │
│              │ produces                                     │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │  Effective Harness  │  ← Merged, ready-to-use knowledge │
│   └──────────┬──────────┘                                   │
│              │ snapshot into                                │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │ Repository Context  │  ← Immutable execution snapshot   │
│   └─────────────────────┘                                   │
└──────────────┬──────────────────────────────────────────────┘
               │ consumed by
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   RUNTIME PLANE (Execution)                 │
│                                                             │
│   ┌─────────────────────┐                                   │
│   │  Execution Runtime  │  ← Stateless, context-driven      │
│   └──────────┬──────────┘                                   │
│              │ produces                                     │
│              ▼                                              │
│   ┌─────────────────────┐                                   │
│   │     Capability      │  ← Delivered output / result      │
│   └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

### Simplified Flow

```
Harness Repository
      ↓
Shared Harness
      ↓
Local Harness
      ↓
Effective Harness
      ↓
Repository Context
      ↓
Execution Runtime
      ↓
Capability
```

### 4 Architecture Planes

| Plane | Tên | Vai trò chính |
|-------|-----|---------------|
| **Control Plane** | Platform | Orchestrates toàn bộ hệ thống |
| **Persistence Plane** | Repository | Owns và manages filesystem |
| **Runtime Plane** | Execution | Stateless execution, chỉ dùng Context |
| **Knowledge Plane** | Governance | Manages knowledge lifecycle |

---

## 6. Core Concepts Table

| Concept | Definition | Document Reference |
|---------|------------|-------------------|
| **Harness Repository** | Kho lưu trữ Git-backed chứa toàn bộ knowledge assets của Harness. Đây là nguồn sự thật duy nhất cho tất cả knowledge. Repository bao gồm cả Shared Harness và các Local Harness của từng project. | `01_REPOSITORY.md` |
| **Shared Harness** | Tập hợp knowledge dùng chung cho toàn bộ tổ chức. Chứa conventions, patterns, rules áp dụng cho mọi project. Được quản lý tập trung và cần approval nghiêm ngặt để thay đổi. | `01_REPOSITORY.md` |
| **Local Harness** | Tập hợp knowledge tùy chỉnh cho một project cụ thể. Chỉ chứa delta so với Shared Harness — extensions và overrides. Không được duplicate nội dung từ Shared. | `01_REPOSITORY.md` |
| **Effective Harness** | Kết quả merge của Shared Harness + Local Harness. Đây là view hoàn chỉnh và cuối cùng của knowledge mà Execution Runtime sử dụng. Deterministic: cùng input luôn tạo cùng output. | `02_EFFECTIVE_HARNESS.md` |
| **Asset** | Đơn vị cơ bản nhất của knowledge trong Harness. Một Asset là một file có cấu trúc chứa một piece of knowledge (rule, pattern, template, prompt, v.v.) với metadata đầy đủ. | `01_REPOSITORY.md` |
| **Repository Context** | Snapshot immutable của Effective Harness tại một thời điểm cụ thể, được tạo ra trước khi Execution Runtime bắt đầu. Không thay đổi trong suốt execution session. | `03_RUNTIME.md` |
| **Execution Runtime** | Môi trường stateless nơi AI tool thực thi capabilities bằng cách tiêu thụ Repository Context. Runtime không có state riêng — tất cả knowledge đến từ Context. | `03_RUNTIME.md` |
| **Capability** | Output hoặc kết quả được tạo ra bởi Execution Runtime khi tiêu thụ một Asset từ Repository Context. Ví dụ: generated code, analysis report, review comments. | `03_RUNTIME.md` |
| **Governance** | Quy trình và công cụ quản lý lifecycle của knowledge: từ Create đến Review, Approve, Version, Publish, Reuse, Improve, và Promote. Governance đảm bảo chất lượng và traceability của knowledge. | `09_GOVERNANCE.md` |
| **Platform** | Control Plane của Harness. Orchestrates toàn bộ hệ thống: quản lý Repository, tạo Repository Context, khởi động/kết thúc Execution Runtime, và enforce governance policies. | `00_ARCHITECTURE.md` (tài liệu này) |

---

## 7. Architecture Planes

### 7.1 Control Plane — Platform

**Vai trò**: Platform là **orchestrator duy nhất** của toàn bộ Harness system.

**Trách nhiệm**:
- Nhận requests từ AI Tools và Engineers
- Resolve Effective Harness từ Shared + Local
- Tạo Repository Context (snapshot + freeze)
- Khởi động và kết thúc Execution Runtime
- Enforce governance policies
- Provide APIs/interfaces cho tất cả các plane khác
- Monitor health của toàn bộ system

**Quyền hạn**:
- Đọc/ghi Repository
- Tạo và hủy Repository Context
- Start/stop Execution Runtime
- Enforce approval gates

**Giới hạn**:
- Không quyết định nội dung knowledge (đó là việc của Governance)
- Không can thiệp vào logic execution của AI Tools
- Không store business state

**Interaction pattern**:
```
AI Tool → Platform (request capability)
Platform → Repository (load Effective Harness)
Platform → Repository Context (create snapshot)
Platform → Execution Runtime (start with Context)
Execution Runtime → Capability (produce output)
Platform → AI Tool (return result)
```

### 7.2 Persistence Plane — Repository

**Vai trò**: Repository là **nguồn sự thật duy nhất** cho tất cả knowledge trong Harness.

**Trách nhiệm**:
- Lưu trữ tất cả Assets (knowledge files)
- Quản lý versioning của knowledge
- Tổ chức Shared và Local Harness theo cấu trúc chuẩn
- Cung cấp read interface cho Platform
- Maintain audit trail của mọi thay đổi

**Cấu trúc filesystem**:
```
harness-repository/
├── shared/                    # Shared Harness — tổ chức-wide
│   ├── conventions/
│   ├── patterns/
│   ├── templates/
│   └── rules/
└── projects/
    └── {project-name}/        # Local Harness — project-specific
        ├── conventions/
        ├── overrides/
        └── extensions/
```

**Nguyên tắc**:
- Filesystem là ground truth — không có in-memory-only knowledge
- Mọi thay đổi phải qua version control (Git)
- Cấu trúc thư mục là convention — không thay đổi tùy tiện

### 7.3 Runtime Plane — Execution

**Vai trò**: Execution Runtime là môi trường nơi AI Tools tiêu thụ knowledge để tạo ra Capabilities.

**Trách nhiệm**:
- Nhận Repository Context từ Platform
- Cung cấp knowledge context cho AI Tools
- Execute capabilities dựa trên knowledge
- Return results về Platform

**Nguyên tắc cốt lõi**:

1. **Stateless hoàn toàn**: Runtime không giữ state giữa các executions. Session kết thúc → tất cả runtime state bị discard.

2. **Context-only**: Runtime chỉ đọc từ Repository Context. Không direct filesystem access, không network calls để lấy thêm knowledge.

3. **Deterministic**: Cùng Repository Context + cùng request → cùng behavior (trong điều kiện AI model giống nhau).

4. **Isolated**: Mỗi execution session có Context riêng, không share state với session khác.

**Điều Runtime KHÔNG được làm**:
- Đọc trực tiếp từ filesystem Repository
- Modify Repository Context trong khi đang chạy
- Lưu state để dùng cho session tiếp theo
- Bypass Platform để access Repository

### 7.4 Knowledge Plane — Governance

**Vai trò**: Governance quản lý **lifecycle và chất lượng** của knowledge trong Repository.

**Trách nhiệm**:
- Define quy trình review và approval cho knowledge changes
- Enforce quality standards cho Assets
- Manage promotion process (Local → Shared)
- Maintain knowledge versioning strategy
- Audit và trace mọi changes

**Governance KHÔNG làm**:
- Can thiệp vào Execution Runtime behavior
- Control cách AI Tools sử dụng knowledge
- Override Platform orchestration decisions

**Governance workflow**:
```
Propose Change → Peer Review → Tech Lead Approval → Version Bump → Merge → Publish
                     ↑                                                        │
                     └────────────────── Reject ───────────────────────────┘
```

---

## 8. Knowledge Lifecycle

### Overview

Knowledge lifecycle trong Harness là một vòng tròn liên tục. Knowledge không bao giờ "chết" — nó được cải thiện và evolve theo thời gian.

### Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE LIFECYCLE                          │
│                                                                     │
│  1. CREATE          2. REVIEW         3. APPROVE                   │
│  ┌──────────┐       ┌──────────┐      ┌──────────┐                 │
│  │ Engineer │──────▶│  Peers   │─────▶│Tech Lead │                 │
│  │ proposes │       │ review   │      │ approves │                 │
│  │ knowledge│       │ for      │      │ (Human   │                 │
│  │ asset    │       │ quality  │      │ Gate)    │                 │
│  └──────────┘       └──────────┘      └────┬─────┘                 │
│                                            │                        │
│  4. VERSION         5. PUBLISH             │                        │
│  ┌──────────┐       ┌──────────┐           │                        │
│  │ Platform │◀──────│ Platform │◀──────────┘                        │
│  │ assigns  │       │ merges   │                                    │
│  │ version  │       │ to repo  │                                    │
│  └────┬─────┘       └──────────┘                                    │
│       │                                                             │
│       ▼                                                             │
│  6. REUSE           7. IMPROVE         8. PROMOTE                  │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐                │
│  │ AI Tools │──────▶│ Feedback │──────▶│ Local →  │───▶ Repository │
│  │ consume  │       │ gathered │       │ Shared   │                │
│  │ via      │       │ from     │       │ promote  │                │
│  │ Context  │       │ usage    │       │ process  │                │
│  └──────────┘       └──────────┘       └──────────┘                │
│       ▲                                     │                       │
│       └─────────────────────────────────────┘                       │
│                  (cycle continues)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Chi tiết từng bước

**Bước 1 — CREATE**
- Actor: Engineer
- Trigger: Phát hiện pattern mới, cần mới, hoặc cải thiện existing knowledge
- Output: Draft Asset file (chưa committed vào main branch)
- Location: Feature branch hoặc Local Harness của project

**Bước 2 — REVIEW**
- Actor: Peer Engineers / Senior Engineers
- Trigger: Pull Request / Merge Request được tạo
- Checklist: Tính đúng đắn, tính nhất quán với existing knowledge, completeness, clarity
- Output: Review comments, approval/rejection

**Bước 3 — APPROVE (Human Approval Gate)**
- Actor: Tech Lead hoặc Architect
- Trigger: Peer review passed
- Đây là **mandatory human gate** — không thể automated
- Output: Formal approval với signature/timestamp
- Note: Đây là điểm duy nhất có thể block promotion lên Shared

**Bước 4 — VERSION**
- Actor: Platform (automated sau khi approval)
- Trigger: Approval granted
- Action: Assign version number theo SemVer, tạo changelog entry
- Output: Versioned Asset với metadata đầy đủ

**Bước 5 — PUBLISH**
- Actor: Platform (automated)
- Trigger: Version assigned
- Action: Merge vào main branch, update index, invalidate existing Contexts nếu cần
- Output: Knowledge available trong Repository

**Bước 6 — REUSE**
- Actor: AI Tools (qua Execution Runtime)
- Trigger: Engineer request một capability
- Action: Platform tạo Repository Context chứa knowledge mới, Runtime tiêu thụ
- Output: Capabilities được tạo ra dựa trên knowledge

**Bước 7 — IMPROVE**
- Actor: Engineers + AI Tools
- Trigger: Feedback từ thực tế sử dụng (knowledge outdated, incomplete, incorrect)
- Action: Tạo improvement proposal (quay về Bước 1)
- Output: Draft improvement asset

**Bước 8 — PROMOTE**
- Actor: Governance process
- Trigger: Local knowledge đã được validated qua nhiều projects
- Action: Propose move từ Local Harness lên Shared Harness
- Process: Đi qua toàn bộ lifecycle từ đầu (Review → Approve → Version → Publish)
- Output: Knowledge trở thành organization-wide standard

---


## 9. Tool Compatibility

### Danh sách Tools Harness PHẢI Hỗ Trợ

Harness được thiết kế để hoạt động với **bất kỳ AI Coding Tool nào** hiện tại và tương lai. Dưới đây là danh sách tools đã được xác nhận:

| Tool | Type | Integration Mechanism |
|------|------|-----------------------|
| **Cursor** | IDE with AI | `.cursorrules`, context files |
| **Claude Code** | CLI AI Tool | `CLAUDE.md`, context injection |
| **Gemini CLI** | CLI AI Tool | Context files, prompt injection |
| **Codex CLI** | CLI AI Tool | Context files, prompt injection |
| **Kiro** | IDE/CLI AI Tool | `.kiro/` specs, steering files |
| **OpenCode** | CLI AI Tool | Context files, system prompts |
| **MCP Clients** | Protocol-based | MCP tools, resources, prompts |
| **Future AI Tools** | Any | Standard context injection |

### Tool Integration Model

Harness không phụ thuộc vào bất kỳ tool-specific format nào. Thay vào đó, Harness:

1. **Maintains canonical knowledge** trong Repository (format-agnostic)
2. **Generates tool-specific output** khi cần (transformation layer)
3. **Injects context** theo cơ chế của từng tool

```
Repository (canonical)
        │
        ▼
Transformation Layer
        │
        ├──→ Cursor format (.cursorrules)
        ├──→ Claude format (CLAUDE.md)
        ├──→ Kiro format (.kiro/steering)
        ├──→ MCP format (tools/resources)
        └──→ Generic format (any future tool)
```

### Compatibility Guarantee

Harness PHẢI đảm bảo:
- **Không có tool lock-in**: Switching từ Cursor sang Claude Code không mất knowledge
- **Consistent behavior**: Cùng knowledge, cùng task → tương đương output dù dùng tool nào
- **Future-proof**: Khi có AI tool mới, chỉ cần thêm transformation adapter — không rebuild core

---

## 10. Independence Model

### Harness PHẢI Độc Lập Với

Đây là **design constraint bất biến**. Harness core KHÔNG được có hard dependency vào bất kỳ thứ nào sau đây:

#### 10.1 IDE Independence

Harness không phụ thuộc vào:
- VS Code, JetBrains, Vim, Emacs, hay bất kỳ IDE nào
- IDE extensions hay plugins
- IDE-specific configuration formats

**Rationale**: Engineers có thể dùng bất kỳ IDE nào. Knowledge không nên bị tied to editor preference.

#### 10.2 AI Model Independence

Harness không phụ thuộc vào:
- GPT-4, Claude, Gemini, Llama, hay bất kỳ AI model nào
- Model-specific prompt formats
- Model-specific APIs hay SDKs

**Rationale**: AI models thay đổi nhanh. Knowledge phải survive khi team switch từ model này sang model khác.

#### 10.3 Programming Language Independence

Harness không phụ thuộc vào:
- Python, TypeScript, Go, Rust, Java, hay bất kỳ language nào
- Language-specific package managers
- Language-specific toolchains

**Rationale**: Một tổ chức có thể có nhiều tech stacks. Harness core phải serve tất cả.

#### 10.4 AI Coding Tool Independence

Harness không phụ thuộc vào:
- Cursor, Claude Code, Kiro, hay bất kỳ AI Coding Tool nào
- Tool-specific APIs
- Tool-specific file formats (ở core layer)

**Rationale**: AI Coding Tool landscape đang thay đổi nhanh. Knowledge phải portable.

### Independence Implementation

```
┌─────────────────────────────────────────┐
│         HARNESS CORE                    │
│  (IDE-agnostic, Model-agnostic,         │
│   Language-agnostic, Tool-agnostic)     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Knowledge Repository        │    │
│  │     (Pure Markdown/YAML/JSON)   │    │
│  └─────────────────────────────────┘    │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  Tool Adapter   │  │  Tool Adapter   │
│  Layer (Cursor) │  │  Layer (Kiro)   │
└─────────────────┘  └─────────────────┘
```

Adapters là **thin wrappers** — không chứa business logic, chỉ transform format.

---

## 11. Specification Hierarchy

### Overview

Knowledge Base của Harness được tổ chức thành 3 layers theo độ trừu tượng:

```
┌─────────────────────────────────────────────────────────────┐
│              ARCHITECTURE LAYER (00-03)                     │
│         Foundation — Ai cũng phải đọc trước                │
├─────────────────────────────────────────────────────────────┤
│           DOMAIN SPECIFICATION LAYER (04-09)                │
│      Core domains — Đọc khi implement domain đó            │
├─────────────────────────────────────────────────────────────┤
│         CROSS-CUTTING CONCERNS LAYER (10-19)                │
│    Horizontal concerns — Đọc khi implement concern đó      │
└─────────────────────────────────────────────────────────────┘
```

### Document Registry

#### Architecture Layer (00-03) — Foundation

| File | Responsibility |
|------|---------------|
| `00_ARCHITECTURE.md` | **[Tài liệu này]** Architecture Foundation — Single Source of Truth. System overview, design principles, core concepts, architecture planes. Mọi engineer đọc đây trước. |
| `01_REPOSITORY.md` | Repository Specification — Cấu trúc filesystem, Asset format, Shared/Local Harness layout, naming conventions, versioning scheme. |
| `02_EFFECTIVE_HARNESS.md` | Effective Harness Specification — Merge algorithm (Shared + Local), conflict resolution rules, determinism guarantees, output format. |
| `03_RUNTIME.md` | Runtime Specification — Execution Runtime lifecycle, Repository Context creation/freezing, stateless execution model, AI Tool integration interface. |

#### Domain Specification Layer (04-09) — Core Domains

| File | Responsibility |
|------|---------------|
| `04_ASSETS.md` | Asset Specification — Asset types, schema definitions, metadata requirements, validation rules, asset lifecycle. |
| `05_PLATFORM.md` | Platform Specification — Control Plane APIs, orchestration workflows, Platform CLI commands, integration points. |
| `06_GOVERNANCE.md` | Governance Specification — Review process, approval workflows, quality standards, audit requirements, promotion criteria. |
| `07_VERSIONING.md` | Versioning Specification — Version scheme (SemVer), changelog format, compatibility rules, migration paths. |
| `08_CONTEXT.md` | Repository Context Specification — Context structure, snapshot algorithm, immutability enforcement, Context lifecycle. |
| `09_CAPABILITY.md` | Capability Specification — Capability types, output formats, quality criteria, capability registry. |

#### Cross-cutting Concerns Layer (10-19) — Horizontal Concerns

| File | Responsibility |
|------|---------------|
| `10_SECURITY.md` | Security Specification — Access control, secrets management, audit logging, threat model. |
| `11_OBSERVABILITY.md` | Observability Specification — Logging standards, metrics, tracing, alerting, dashboards. |
| `12_TESTING.md` | Testing Specification — Test strategy, test types, coverage requirements, test data management. |
| `13_MIGRATION.md` | Migration Specification — Version migration procedures, backward compatibility, deprecation policy. |
| `14_CONFIGURATION.md` | Configuration Specification — Configuration schema, environment-specific overrides, secrets injection. |
| `15_ERROR_HANDLING.md` | Error Handling Specification — Error taxonomy, error codes, recovery procedures, error reporting. |
| `16_PERFORMANCE.md` | Performance Specification — Performance budgets, benchmarks, optimization guidelines, caching strategy. |
| `17_EXTENSIBILITY.md` | Extensibility Specification — Plugin model, adapter interface, extension points, custom asset types. |
| `18_DEPLOYMENT.md` | Deployment Specification — Deployment models, infrastructure requirements, rollout strategy. |
| `19_GLOSSARY.md` | Glossary — Canonical definitions for all terms used across all documents. |

### Document Dependencies

```
00_ARCHITECTURE (root)
        │
        ├──→ 01_REPOSITORY
        │         └──→ 04_ASSETS
        │         └──→ 07_VERSIONING
        │
        ├──→ 02_EFFECTIVE_HARNESS
        │         └──→ 01_REPOSITORY
        │
        ├──→ 03_RUNTIME
        │         └──→ 02_EFFECTIVE_HARNESS
        │         └──→ 08_CONTEXT
        │         └──→ 09_CAPABILITY
        │
        └──→ 06_GOVERNANCE
                  └──→ 07_VERSIONING
                  └──→ 05_PLATFORM

Cross-cutting (10-19) → Any of the above (no upward dependency)
```

**Quy tắc**: Documents ở layer thấp hơn (số nhỏ hơn) KHÔNG được import/reference documents ở layer cao hơn (số lớn hơn) trong cùng tier. Cross-cutting concerns có thể reference bất kỳ document nào nhưng không được tạo circular dependency.

---

## 12. Architecture Invariants

Đây là danh sách các **nguyên tắc KHÔNG BAO GIỜ được vi phạm**, bất kể hoàn cảnh hay áp lực nào. Vi phạm một trong các điều này đồng nghĩa với việc hệ thống không còn là Harness.

### INV-01: Repository là Single Source of Truth

**Tuyên bố**: Không bao giờ có knowledge tồn tại ngoài Repository mà Harness phải biết đến.

**Vi phạm**: In-memory knowledge, hardcoded knowledge trong code, knowledge chỉ tồn tại trong AI tool config mà không có trong Repository.

### INV-02: Repository Context là Immutable

**Tuyên bố**: Một khi Repository Context được tạo ra cho một execution session, nó KHÔNG được thay đổi trong suốt session đó.

**Vi phạm**: Bất kỳ code nào modify Context sau khi đã freeze, bất kỳ cơ chế nào cho phép "dynamic knowledge injection" vào running session.

### INV-03: Execution Runtime là Stateless

**Tuyên bố**: Execution Runtime không giữ state giữa các executions. Khi session kết thúc, mọi runtime state bị discard.

**Vi phạm**: Caching knowledge giữa sessions, persisting runtime decisions, sharing state giữa concurrent sessions.

### INV-04: Platform là Sole Orchestrator

**Tuyên bố**: Tất cả interactions với Repository và Execution Runtime PHẢI đi qua Platform. Không có direct access.

**Vi phạm**: AI Tool đọc trực tiếp từ Repository filesystem, AI Tool tạo Repository Context mà không qua Platform API.

### INV-05: Human Approval Gate là Bắt Buộc

**Tuyên bố**: Bất kỳ thay đổi nào promote knowledge lên Shared Harness PHẢI có human approval. Không có exception.

**Vi phạm**: Automated scripts promote knowledge mà không có human review, CI/CD bypass approval requirement, emergency hotfix mà không có approval (dù sau đó có retroactive review).

### INV-06: Shared và Local KHÔNG Được Circular Reference

**Tuyên bố**: Không có circular dependency giữa bất kỳ Assets nào trong Repository.

**Vi phạm**: Asset A depends on Asset B, và Asset B depends on Asset A.

### INV-07: Effective Harness PHẢI Deterministic

**Tuyên bố**: Cùng input (Shared + Local) PHẢI luôn tạo ra cùng Effective Harness output.

**Vi phạm**: Bất kỳ randomness, time-dependency, hay environment-dependency trong merge algorithm.

### INV-08: Local KHÔNG Được Exist Mà Không Có Shared

**Tuyên bố**: Local Harness luôn phải có Shared Harness làm nền tảng. Một project không thể chỉ có Local mà không kế thừa Shared.

**Vi phạm**: Project với Local Harness nhưng không reference bất kỳ Shared Harness nào.

### INV-09: Governance KHÔNG Can Thiệp Runtime

**Tuyên bố**: Governance process chỉ quản lý knowledge lifecycle. Governance không có khả năng can thiệp vào Execution Runtime đang chạy.

**Vi phạm**: Governance có API để inject knowledge vào running session, Governance có kill-switch cho Execution Runtime.

### INV-10: Knowledge Phải Versioned

**Tuyên bố**: Mọi Asset trong Shared Harness PHẢI có version number theo SemVer. Không có "unversioned knowledge" trong Shared.

**Vi phạm**: Asset trong Shared không có version, version không theo SemVer schema.

---

## 13. Out of Scope

Harness là một **focused platform**. Những gì dưới đây là explicitly out of scope và Harness KHÔNG làm:

### Không phải IDE hay Code Editor

Harness không cung cấp giao diện để viết code. Harness không có editor, syntax highlighting, hay debugging UI. Engineers dùng IDE của họ.

### Không phải AI Model hay Inference Engine

Harness không chứa AI model. Harness không perform inference. Harness không train model. Harness chỉ cung cấp **knowledge context** cho external AI models.

### Không quản lý Application Code

Harness quản lý **knowledge về cách làm việc**, không quản lý code của applications mà teams đang build. Application code ở trong repos riêng của từng project.

### Không phải Build System hay CI/CD Pipeline

Harness không build, test, hay deploy application code. Harness có thể **tích hợp** với CI/CD để enforce governance, nhưng không phải là CI/CD system.

### Không phải Issue Tracker hay Project Management Tool

Harness không track bugs, features, hay sprints. Harness không thay thế Jira, Linear, hay GitHub Issues.

### Không phải Documentation Platform

Harness không thay thế Confluence, Notion, hay Wiki. Harness knowledge là **operational knowledge cho AI tools**, không phải documentation cho humans (dù humans có thể đọc).

### Không phải Secret Management System

Harness không lưu trữ secrets, API keys, hay credentials. Secrets management là trách nhiệm của external systems (Vault, AWS Secrets Manager, v.v.).

### Không Execute Business Logic

Harness không chứa business logic của applications. Harness không perform data transformations, không call external APIs (ngoài AI tools), không process business events.

### Không phải Data Platform

Harness không lưu trữ, process, hay analyze business data. Harness chỉ lưu trữ knowledge metadata và asset content.

### Không Guarantee AI Output Quality

Harness cung cấp knowledge context tốt nhất có thể, nhưng Harness **không guarantee** rằng AI tools sẽ tạo ra output tốt. Chất lượng của AI output phụ thuộc vào nhiều yếu tố ngoài tầm kiểm soát của Harness (AI model quality, prompt engineering, task complexity, v.v.).

---

## Phụ lục: Glossary Nhanh

| Term | Định nghĩa ngắn |
|------|----------------|
| Asset | Đơn vị knowledge cơ bản — một file có cấu trúc chứa một piece of knowledge |
| Capability | Output được tạo ra bởi AI Tool khi tiêu thụ knowledge |
| Effective Harness | Merge kết quả của Shared + Local Harness |
| Governance | Quy trình quản lý lifecycle của knowledge |
| Harness | Knowledge Management Platform này |
| Knowledge | Thông tin có cấu trúc giúp AI tools hoạt động hiệu quả hơn |
| Local Harness | Knowledge tùy chỉnh cho một project cụ thể |
| Platform | Control Plane — orchestrator của toàn bộ Harness |
| Repository | Kho lưu trữ Git-backed chứa tất cả knowledge |
| Repository Context | Snapshot immutable của knowledge tại thời điểm execution |
| Runtime | Môi trường stateless nơi AI Tool thực thi capabilities |
| Shared Harness | Knowledge dùng chung cho toàn tổ chức |

---

*Tài liệu này là Single Source of Truth cho Harness Architecture. Mọi conflict giữa tài liệu này và bất kỳ tài liệu nào khác, tài liệu này được ưu tiên. Báo cáo conflict tại governance process.*

**Document ID**: `00_ARCHITECTURE`  
**Version**: 4.0  
**Status**: Final  
**Owner**: Platform Architect  
**Last Updated**: 2026-07-11  
**Next Review**: 2026-10-11
