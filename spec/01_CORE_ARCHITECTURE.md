# 1. Purpose

Tài liệu này định nghĩa kiến trúc cốt lõi và toàn bộ hệ sinh thái của Harness Specification. Mục tiêu là xác định rõ các thành phần, trách nhiệm, ranh giới, nguyên tắc bất biến và mô hình vòng đời của hệ sinh thái Harness nhằm giúp một đội ngũ độc lập có thể triển khai hệ thống mà không cần suy đoán.

---

# 2. Harness Ecosystem

Hệ sinh thái Harness bao gồm 5 thành phần chính được phân định ranh giới rõ ràng:

### 1. Harness Specification
- **Purpose**: Định nghĩa chuẩn hóa cấu trúc dữ liệu, các hợp đồng hành vi (Capability Contract), máy trạng thái và các tiêu chí conformance của hệ thống.
- **Scope**: Chỉ định nghĩa chuẩn logic và các đặc tả kỹ thuật dạng tài liệu Markdown.
- **Responsibilities**: Đảm bảo tính trung lập, nhất quán và độc lập với công nghệ triển khai.
- **Deliverables**: Bộ tài liệu đặc tả (từ `00_OVERVIEW.md` đến `13_EXAMPLE_REPOSITORY.md`).
- **Out of Scope**: Không chứa mã nguồn thực thi, không chứa Runtime cụ thể và không bao gồm các tài sản dùng chung (Shared Assets).

### 2. Harness Source Code Repository
- **Purpose**: Nơi phát triển mã nguồn của các công cụ cốt lõi phục vụ vận hành Harness.
- **Responsibilities**: Xây dựng CLI, SDK, Runtime Engine và MCP Server tương thích với đặc tả.
- **Ownership**: Đội ngũ kỹ sư Core Platform hoặc Cộng đồng mã nguồn mở duy trì.
- **Lifecycle**: Phát triển, kiểm thử conformance, phát hành phiên bản (Release) theo chuẩn Semantic Versioning.
- **Deliverables**: CLI tool, Runtime package, MCP Server container, SDK thư viện.
- **Directory Structure chuẩn**:
  - `cli/`: Mã nguồn của Harness CLI Command Parser và Router.
  - `runtime/`: Bộ máy Runtime Engine thực thi máy trạng thái và resolve context.
  - `sdk/`: Thư viện API dành cho các bên tích hợp.
  - `mcp/`: MCP Server cung cấp Tool interface cho các AI client.
  - `generators/`: Công cụ sinh mã nguồn và khởi tạo tệp tin mẫu.
  - `integrations/`: Các adapter tích hợp với IDE (Cursor, VS Code...).
  - `tests/`: Bộ Conformance Test Suite độc lập.
  - `docs/`: Tài liệu phát triển công cụ.

### 3. Shared Harness Repository
- **Purpose**: Nơi lưu trữ, đóng gói và chia sẻ các tài sản tri thức dùng chung (Shared Assets) giữa các dự án.
- **Responsibilities**: Đóng gói các skill, rules và template mẫu để phân phối trong tổ chức.
- **Ownership**: Team Platform/DevOps hoặc các Domain Expert chịu trách nhiệm viết và cập nhật.
- **Lifecycle**: Thay đổi phiên bản khi quy chuẩn dự án nâng cấp, phát hành lên hệ thống phân phối chung.
- **Distribution Model**: Đóng gói dưới dạng `.tar.gz` hoặc Git repository độc lập để CLI có thể tải và cài đặt vào Tool Global Workspace.
- **Repository Structure chuẩn**:
  - `skills/`: Chứa các custom capabilities / scripts mở rộng.
  - `hooks/`: Các event hooks tự động hóa trước/sau khi chạy task.
  - `templates/`: Các tệp template markdown mẫu cho ADR, Rule, Proposal.
  - `prompts/`: Các system prompts chuẩn hóa cho Agent.
  - `workflows/`: Cấu hình luồng thực thi task tự động.
  - `rules/`: Bộ quy tắc phát triển chung (ví dụ: lint rules, naming rules).
  - `knowledge/`: Tài liệu kiến thức nghiệp vụ dùng chung.
  - `policies/`: Chính sách phê duyệt và phân xử xung đột.

### 4. Tool Global Workspace
- **Purpose**: Thư mục đệm lưu trữ cục bộ trên máy trạm của Developer, chứa các tài sản từ Shared Harness được CLI tải về.
- **Responsibilities**: Cung cấp môi trường cục bộ để Runtime đọc các tài sản Shared.
- **Lifecycle**: Được quản lý và regenerate hoàn toàn bởi CLI (ví dụ: qua lệnh `harness install` hoặc `harness sync`). Sẵn sàng bị xóa/tạo lại bất kỳ lúc nào.
- **Installation Model**: CLI tải Shared Harness từ xa và giải nén vào thư mục cố định (ví dụ: `~/.kiro/` hoặc `%APPDATA%/harness/`).
- **Cleanup Model**: CLI tự động xóa dọn dẹp thư mục này khi nhận lệnh clean/uninstall hoặc khi đồng bộ lại.
- **Chú ý**: Đây KHÔNG phải là một Git Repository, đây chỉ là deployment target của CLI và không phải source of truth.

### 5. Project Repository
- **Purpose**: Repository chứa mã nguồn ứng dụng thực tế của dự án cần được AI phát triển.
- **Responsibilities**: Định nghĩa tri thức riêng biệt của dự án thông qua Local Harness và AGENTS.md.
- **Ownership**: Team phát triển dự án sở hữu trực tiếp.
- **Lifecycle**: Phát triển liên tục song hành cùng mã nguồn phần mềm qua Git.
- **Repository Structure**:
  - `Source Code`: Mã nguồn ứng dụng.
  - `AGENTS.md` (ở thư mục gốc): Entry point để AI nạp context.
  - `.harness/` (Local Harness): Chứa manifest, map, rules, adr, proposals và logs cụ thể của dự án này.
  - **Local Harness Scope**: Chỉ chứa dữ liệu tri thức của riêng dự án, không được commit code của Shared Harness hay các asset dùng chung vào đây để tránh ô nhiễm dữ liệu.

---

# 3. Ecosystem Relationship & Lifecycle

## Sơ đồ quan hệ và luồng phân phối

```text
 Harness Specification (Định nghĩa chuẩn logic)
         │
         ├──► Harness Source Code Repo ──► Sinh ra ──► Harness CLI / Runtime / SDK
         │
         └──► Shared Harness Repo (Tri thức dùng chung)
                      │ (Publish)
                      ▼
               Shared Packages / Git Sources
                      │ (CLI Install)
                      ▼
             Tool Global Workspace (Cache trên máy trạm)
                      │ (Runtime Resolve)
                      ▼
             Unified Harness Workspace ◄─── (Runtime Resolve) ─── Project Repository
    (Không gian ảo hợp nhất để AI tương tác)                      (Source code & Local .harness)
```

- **Harness Specification**: Định nghĩa luật chơi.
- **Harness Source Code Repo**: Sinh ra công cụ CLI/Runtime (CLI cài đặt Shared Assets, Runtime đọc dữ liệu).
- **Shared Harness Repo**: Nơi phân phối tri thức dùng chung.
- **Project Repo**: Dự án thực tế.
- **Unified Harness Workspace**: Context ảo được Runtime build động bằng cách gộp (merge) dữ liệu từ `Tool Global Workspace` (Shared) và `.harness/` (Local) dựa trên khai báo của Manifest.

## Vòng đời Ecosystem Lifecycle

```text
[Author] ──► [Build] ──► [Publish] ──► [Install] ──► [Sync] ──► [Execute] ──► [Upgrade] ──► [Retire]
```

1. **Author**: Con người soạn thảo Shared Harness (Skills, Rules) hoặc Code.
2. **Build**: CLI đóng gói Shared Harness hoặc compile Runtime tool.
3. **Publish**: Đưa Shared Harness lên registry (hoặc git source); CLI được đóng gói thành release package.
4. **Install**: CLI cài đặt Shared Harness vào Tool Global Workspace; khởi tạo `.harness` trong Project.
5. **Sync**: CLI đồng bộ các bản cập nhật mới nhất của Shared Harness về máy trạm và cập nhật manifest của Project.
6. **Execute**: Runtime nạp Project Repository + Tool Global Workspace để AI thực thi Task và ghi log/result.
7. **Upgrade**: CLI nâng cấp phiên bản manifest, di chuyển (migrate) cấu hình cũ lên schema mới.
8. **Retire**: Đóng băng hoặc lưu trữ (archive) các tri thức/artifact cũ không còn sử dụng.

---

# 4. Architectural Invariants

Đây là những nguyên tắc kiến trúc bất biến, KHÔNG BAO GIỜ được phép thay đổi trong mọi phiên bản nâng cấp của đặc tả:

1. **Shared Harness luôn độc lập với Project Repository**: Mã nguồn và tri thức dùng chung không được lưu cứng trong Project Repo để tránh trùng lặp và phân rã phiên bản.
2. **Runtime không được phép sửa đổi Shared Harness**: Runtime chỉ có quyền Read-only đối với các tài nguyên Shared trong Tool Global Workspace.
3. **Specification không phụ thuộc vào Implementation**: Không có bất kỳ định nghĩa nào của đặc tả được phép gắn cứng với một ngôn ngữ lập trình, một framework, một hệ điều hành hay một IDE cụ thể.
4. **Manifest luôn là điểm khai báo dependency duy nhất**: Mọi tài nguyên ngoài (External Sources) hay yêu cầu capability của Repository đều phải được khai báo tường minh trong tệp `harness.yaml`.
5. **Capability luôn được gọi thông qua Contract**: AI và Runtime giao tiếp thông qua hợp đồng capability chuẩn hóa, cấm việc Runtime tự ý cung cấp back-channel hoặc API không có trong contract.
6. **Project Repository không được sửa đổi installed Shared assets**: Tránh sửa trực tiếp các tệp tin được cache trong Tool Global Workspace. Mọi chỉnh sửa tùy biến phải được viết ở Local Harness và ghi đè (override) qua quy tắc Precedence.

---

# 5. Architecture Decision Record (ADR)

### ADR-01: Tách biệt Shared Harness khỏi Runtime Engine
- **Quyết định**: Tài nguyên tri thức dùng chung (Shared Harness) được phát triển và đóng gói độc lập với mã nguồn của bộ máy thực thi Runtime.
- **Lý do (Rationale)**: Tri thức nghiệp vụ và quy tắc phát triển (Rules) thay đổi liên tục theo yêu cầu của dự án và tổ chức, trong khi logic thực thi của Runtime (State Machine, CLI Router) cần sự ổn định cao. Việc tách biệt giúp cập nhật tri thức mà không cần phân phối lại phiên bản Runtime.

### ADR-02: Sử dụng Tool Global Workspace làm thư mục đệm cục bộ
- **Quyết định**: CLI quản lý một thư mục Workspace toàn cục trên máy trạm để tải và giải nén các Shared Harness thay vì tải động trong mỗi lần Runtime thực thi.
- **Lý do (Rationale)**: Tăng tốc độ nạp (Context Loading Speed) cho AI, giảm thiểu truy vấn mạng (network latency) trong quá trình thực thi Task, và cho phép làm việc ở chế độ ngoại tuyến (offline mode).

### ADR-03: Local Harness chỉ chứa dữ liệu đặc thù của Repository
- **Quyết định**: Thư mục cục bộ `.harness/` trong Project Repository chỉ lưu trữ cấu hình manifest, map cấu trúc code, quyết định kiến trúc cục bộ (ADR), proposals và log thực thi của riêng dự án đó.
- **Lý do (Rationale)**: Giữ cho Project Repository có kích thước gọn nhẹ, dễ bảo trì, và tránh xung đột khi merge source code giữa các nhánh của dự án.

---

# 6. Ecosystem Design Principles

Toàn bộ hệ sinh thái Harness tuân thủ các nguyên tắc sau:
- **Runtime MUST NOT modify Shared Harness**: Runtime chỉ có quyền đọc tài nguyên dùng chung, cấm ghi đè.
- **CLI MUST manage Tool Global Workspace**: CLI chịu trách nhiệm cài đặt, đồng bộ, dọn dẹp và khôi phục workspace toàn cục.
- **Project Repository MUST NOT modify installed Shared assets**: Tri thức dùng chung phải được bảo toàn, các sửa đổi cục bộ phải được thực hiện ở Local Harness.
- **Shared Harness MUST remain tool-agnostic**: Tri thức dùng chung không được chứa mã nguồn phụ thuộc vào công cụ cụ thể.
- **Runtime MUST remain implementation-independent**: Runtime không được phụ thuộc vào AI client.

---

# 7. Architecture Overview

Harness được tổ chức thành năm thành phần chính.

```text
                   +----------------+
                   |   Repository   |
                   +----------------+
                            │
                            ▼
              +---------------------------+
              | Repository Knowledge      |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |     Execution Model       |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |    Governance Model       |
              +---------------------------+
                            │
                            ▼
              +---------------------------+
              |      Platform Model       |
              +---------------------------+
```

Mỗi thành phần có một trách nhiệm rõ ràng và giao tiếp thông qua các Artifact được định nghĩa bởi Harness Specification.

---

# 3. Repository

## Purpose

Là nguồn dữ liệu chính của dự án.

---

## Definition

Repository là nơi lưu trữ toàn bộ Source Code, Project Assets và Repository Knowledge.

Repository là **Single Source of Truth** của Harness.

---

## Responsibilities

- Lưu trữ Source Code.
- Lưu trữ Project Assets.
- Lưu trữ Repository Knowledge.
- Quản lý toàn bộ dữ liệu bằng Git.

---

## Required Contents

- Source Code
- Project Assets
- Repository Knowledge

---

## Lifecycle

```text
Create
    │
    ▼
Develop
    │
    ▼
Maintain
    │
    ▼
Archive
```

---

## Constraints

- Repository phải là nguồn dữ liệu chính thức.
- Không phụ thuộc vào AI Platform.
- Repository Knowledge phải được quản lý cùng Repository.

---

## Related Components

- Repository Knowledge
- Execution Model
- Governance Model

---

# 4. Repository Knowledge

## Purpose

Lưu trữ tri thức lâu dài của Repository.

---

## Definition

Repository Knowledge là tập hợp các Artifact mô tả Repository để AI và con người có thể tái sử dụng qua nhiều phiên làm việc.

---

## Responsibilities

- Lưu trữ tri thức lâu dài.
- Giảm phụ thuộc vào Conversation History.
- Hỗ trợ AI hiểu Repository.
- Phát triển cùng Repository.

---

## Required Contents

- Repository Map
- Repository Rules
- Knowledge
- ADR

---

## Lifecycle

```text
Create
    │
    ▼
Review
    │
    ▼
Approved
    │
    ▼
Update
    │
    ▼
Archive
```

---

## Constraints

- Chỉ lưu thông tin có giá trị lâu dài.
- Không lưu trạng thái tạm thời.
- Không phụ thuộc AI Platform.

---

## Related Components

- Repository
- Governance Model
- Execution Model

---

# 5. Execution Model

## Purpose

Chuẩn hóa cách AI thực hiện một Task.

---

## Definition

Execution Model định nghĩa vòng đời của Task, các Artifact được tạo ra và các điểm kiểm chứng trong quá trình thực hiện.

---

## Responsibilities

- Chuẩn hóa Task Lifecycle.
- Chuẩn hóa Execution Flow.
- Sinh Execution Artifacts.
- Thu thập Evidence.

---

## Required Contents

- Task
- Execution Workflow
- Execution Artifacts
- Evidence

---

## Lifecycle

```text
Task
   │
   ▼
Execution
   │
   ▼
Verification
   │
   ▼
Complete
```

---

## Constraints

- Không cập nhật Repository Knowledge trực tiếp.
- Mọi kết luận phải dựa trên Evidence.
- Phải tạo đủ Artifact theo Specification.

---

## Related Components

- Repository Knowledge
- Governance Model

---

# 6. Governance Model

## Purpose

Quản trị sự phát triển của Repository Knowledge.

---

## Definition

Governance Model đảm bảo Repository Knowledge được cải tiến một cách có kiểm soát và có thể kiểm chứng.

---

## Responsibilities

- Đánh giá Evidence.
- Quản lý Proposal.
- Hỗ trợ Human Review.
- Cập nhật Repository Knowledge.

---

## Required Contents

- Evidence
- Review
- Proposal
- Knowledge Lifecycle

---

## Lifecycle

```text
Evidence
     │
     ▼
Review
     │
     ▼
Proposal
     │
     ▼
Approval
     │
     ▼
Knowledge Update
```

---

## Constraints

- Repository Knowledge chỉ được cập nhật sau khi được phê duyệt.
- AI không được tự phê duyệt Proposal.
- Mọi Proposal phải có Evidence.

---

## Related Components

- Repository Knowledge
- Execution Model

---

# 7. Platform Model

## Purpose

Hiện thực Harness Specification trên các AI Platform.

---

## Definition

Platform Model định nghĩa các Capability cần thiết để AI sử dụng Harness mà không làm thay đổi Specification.

---

## Responsibilities

- Bootstrap Repository.
- Scan Repository.
- Validate Repository.
- Execute Workflow.
- Generate Report.
- Collect Metrics.

---

## Required Contents

- Toolkit
- Platform Adapter
- Capability Implementation

---

## Lifecycle

```text
Install
    │
    ▼
Configure
    │
    ▼
Execute
    │
    ▼
Upgrade
```

---

## Constraints

- Không thay đổi Specification.
- Không phụ thuộc một AI Platform cụ thể.
- Phải hỗ trợ các Capability được Specification yêu cầu.

---

## Related Components

- Repository
- Execution Model
- Governance Model

---

# 8. Information Flow

Harness sử dụng luồng thông tin sau.

```text
Repository
      │
      ▼
Repository Knowledge
      │
      ▼
Execution
      │
      ▼
Evidence
      │
      ▼
Governance
      │
      ▼
Repository Knowledge
```

Sau mỗi Task, Repository Knowledge có thể được cải tiến thông qua Governance Model.

---

# 14. Architecture Principles

Toàn bộ kiến trúc phải tuân thủ các nguyên tắc sau.

- **Repository First** — Repository là nguồn dữ liệu chính thức.
- **Single Source of Truth** — Không tồn tại nguồn tri thức chính thức bên ngoài Repository.
- **Separation of Concerns** — Mỗi thành phần chỉ có một trách nhiệm chính.
- **Evidence First** — Mọi quyết định phải dựa trên Evidence.
- **Platform Independence** — Không phụ thuộc vào AI Platform.
- **Human Governance** — Chỉ con người có quyền phê duyệt Repository Knowledge.

---

# 15. Architecture Boundaries

Harness tập trung vào việc quản trị AI-Assisted Software Development.

Harness không thay thế:

- Software Architecture
- Project Management
- Source Control
- CI/CD
- Issue Tracking
- AI Coding Assistant

Các hệ thống trên có thể tích hợp với Harness nhưng không thuộc phạm vi của Specification.

---

# 16. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 02. REPOSITORY MODEL | Định nghĩa Repository Knowledge và các Repository Artifact |
| 03. EXECUTION MODEL | Định nghĩa Task, Execution và Workflow |
| 04. GOVERNANCE MODEL | Định nghĩa Evidence, Proposal và Repository Evolution |
| 05. PLATFORM MODEL | Định nghĩa Toolkit và Platform Integration |
| 06. AGENT CONFIGURATION | Cách AI khám phá và áp dụng Agent Configuration |
| 07. ARTIFACT_TEMPLATES | Template và Logical Schema của các Artifact |
| 08. MANIFEST SPECIFICATION | Cấu trúc và Schema của Manifest |
| 09. CAPABILITY SPECIFICATION | Runtime Capability Contract |
| 10. ADOPTION GUIDE | Hướng dẫn triển khai Harness |
| 11. GLOSSARY | Thuật ngữ chuẩn |
| 12. CONFORMANCE | Tiêu chí đánh giá tuân thủ Specification |
| 13. EXAMPLE REPOSITORY | Ví dụ Repository minimal hoàn chỉnh |

Mọi tài liệu phía sau phải tuân thủ kiến trúc được định nghĩa trong tài liệu này.