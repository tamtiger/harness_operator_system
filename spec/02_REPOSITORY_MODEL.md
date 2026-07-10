# 02. REPOSITORY MODEL

> **Version:** 1.1
> **Status:** Draft

---

# 1. Purpose

Tài liệu này định nghĩa cách Harness tổ chức và quản lý Repository Knowledge.

Repository Model chuẩn hóa các Artifact được lưu trữ trong Repository để AI và con người cùng sử dụng một nguồn tri thức thống nhất.

Repository Model chỉ định nghĩa dữ liệu lâu dài của Repository.

Execution, Governance và Toolkit được định nghĩa trong các tài liệu khác.

---

# 2. Repository Principles

Repository Model tuân thủ các nguyên tắc sau.

- **Repository First** — Repository là nguồn dữ liệu chính thức.
- **Git Native** — Repository Knowledge được quản lý bằng Git.
- **Platform Independent** — Không phụ thuộc AI Platform.
- **Long-term Memory** — Chỉ lưu thông tin có giá trị lâu dài.
- **Single Responsibility** — Mỗi Artifact chỉ có một mục đích.

---

# 3. Repository Types

Đặc tả Harness phân chia và chuẩn hóa cấu trúc của 3 loại Repository trong hệ sinh thái:

### 1. Harness Source Code Repository
- **Purpose**: Lưu trữ mã nguồn phát triển và đóng gói các công cụ vận hành cốt lõi (CLI, Runtime, SDK).
- **Responsibilities**: Bảo trì mã nguồn, chạy Conformance Test Suite cho các bản phát hành.
- **Owner**: Core Platform Team.
- **Lifecycle**: Chịu sự quản lý chặt chẽ của quy trình phát triển Core.
- **Required Directories**:
  - `cli/`: Mã nguồn của CLI.
  - `runtime/`: Bộ máy thực thi Runtime.
  - `sdk/`: SDK thư viện API.
  - `tests/`: Bộ conformance test suite.
- **Optional Directories**: `generators/`, `integrations/`, `mcp/`, `docs/`.
- **Generated Outputs**: CLI binary, SDK package, MCP Server container image.

### 2. Shared Harness Repository
- **Purpose**: Kho lưu trữ các tài sản tri thức dùng chung (Shared Assets) để phân phối cho nhiều dự án trong tổ chức.
- **Responsibilities**: Đóng gói các Skills, Rules, Prompts, Templates, Workflows có thể tái sử dụng.
- **Ownership**: Platform Team hoặc Domain Experts.
- **Publishing**: Đóng gói dạng nén `.tar.gz` hoặc phân phối qua Git repository.
- **Versioning**: Sử dụng Semantic Versioning (`Major.Minor.Patch`).
- **Compatibility**: Cam kết tương thích ngược đối với các Minor cập nhật.
- **Shared Harness Layout chuẩn**:
  - `skills/`: Chứa các custom capabilities / scripts mở rộng (Required).
  - `hooks/`: Các script chạy tự động trước/sau task (Optional).
  - `templates/`: Markdown templates cho các artifact (Required).
  - `prompts/`: System prompts chuẩn hóa (Optional).
  - `workflows/`: Cấu hình workflow thực thi task (Optional).
  - `rules/`: Bộ quy tắc code chung của tổ chức (Required).
  - `knowledge/`: Tài liệu kiến thức dùng chung (Optional).
  - `policies/`: Quy định phê duyệt (Optional).

### 3. Project Repository
- **Purpose**: Repository chứa mã nguồn phần mềm của ứng dụng thực tế.
- **Responsibilities**: Áp dụng quy chuẩn phát triển và cập nhật tri thức dự án thông qua Local Harness.
- **Required Files**: `AGENTS.md` (tại thư mục gốc), `.harness/harness.yaml`.
- **Optional Files**: `.harness/repository-map.md`, `.harness/rules/`, `.harness/knowledge/`, `.harness/adr/`, `.harness/proposals/`, `.harness/logs/`.
- **Repository Layout**:
  - `src/`: Mã nguồn ứng dụng.
  - `AGENTS.md`: Entry point cho AI.
  - `.harness/`: Thư mục Local Harness của dự án.
- **Supported Languages**: Bất kỳ ngôn ngữ lập trình nào của dự án ứng dụng.
- **Local Harness Scope**: Chỉ lưu trữ tri thức, quyết định kiến trúc, logs, và quy tắc phát triển dành riêng cho dự án này. Nghiêm cấm commit mã nguồn hoặc assets dùng chung của Shared Harness vào đây.

---

# 4. Local Harness Cấu trúc & Phân vai

Thư mục `.harness/` (Local Harness) chứa các Artifact cụ thể của dự án:

| Artifact | Purpose | Required/Optional | Owner | Created By | Updated By | Consumed By | Validation Rules |
|----------|---------|-------------------|-------|------------|------------|-------------|------------------|
| **harness.yaml** | Manifest khai báo cấu hình. | **Required** | Project Owner | Human | Human | Runtime / CLI | Đúng schema phiên bản hiện hành. |
| **repository-map.md** | Bản đồ cấu trúc logic code. | **Required** | Project Team | Human / AI | Human / AI | AI / Runtime | Phải phản ánh đúng cấu trúc đĩa thực tế. |
| **rules/** | Thư mục chứa quy tắc phát triển cục bộ. | **Required** | Project Lead | Human / AI | Human | AI / Runtime | Viết theo template Rule. |
| **knowledge/** | Thư mục lưu kiến thức nghiệp vụ. | Optional | Project Team | AI / Human | AI / Human | AI / Runtime | Viết theo template Knowledge. |
| **adr/** | Quyết định kiến trúc cục bộ. | Optional | Architect | Human | Human | AI / Human | Phải có Rationale và Context. |
| **proposals/** | Đề xuất thay đổi tri thức đang chờ duyệt. | Optional | AI Agent | AI Agent | AI Agent | Human | Không được tự động merge. |
| **logs/** | Nhật ký thực thi task của AI. | Optional | Runtime | Runtime | Runtime | Human / AI | Phải ghi lại đầy đủ các bước đã chạy. |

---

# 5. Harness Dependency Model

Project Repository khai báo Shared Harness thông qua trường `sources` trong manifest:

- **Khai báo imports**:
  ```yaml
  sources:
    - id: shared-core
      type: git
      uri: "https://github.com/my-org/shared-harness.git"
      version: "v1.2.0" # Version Pinning
  ```
- **Dependency Resolution Flow**:
  1. CLI đọc tệp `harness.yaml`.
  2. CLI kiểm tra cache trong `Tool Global Workspace` (ví dụ: `~/.kiro/`).
  3. Nếu phiên bản yêu cầu chưa được cài đặt, CLI tự động tải từ nguồn `uri` tương ứng và cache lại.
- **Version Resolution**: Luôn ưu tiên phiên bản được khai báo tường minh (Pinning). Nếu không ghi version, CLI mặc định nạp bản stable mới nhất của channel được chọn.
- **Compatibility Rules**: Shared Harness phải tương thích với version của Harness Specification khai báo trong manifest.
- **Conflict Rules**: Nếu hai external sources định nghĩa hai Rule trùng ID, nguồn khai báo trước trong manifest được ưu tiên nạp, nguồn sau sẽ bị bỏ qua và ghi cảnh báo (warning).

---

# 6. Repository Discovery & Loading

Harness Runtime và CLI thực hiện tìm kiếm cấu trúc Repository theo thứ tự cố định nghiêm ngặt (Discovery Order):

```text
Tìm thư mục Root (chứa .git) ──► Đọc AGENTS.md ──► Đọc .harness/harness.yaml ──► Resolve Sources ──► Tải Artifacts
```

1. **Tìm kiếm Repository Root**: Quét ngược lên từ thư mục làm việc hiện tại để tìm thư mục chứa `.git` hoặc thư mục `.harness/`.
2. **Đọc Entry Point**: Kiểm tra sự hiện diện của tệp `AGENTS.md` tại thư mục gốc như một tài liệu hướng dẫn (human-readable context), Runtime không thực hiện parse cấu trúc của tệp này.
3. **Nạp Manifest**: Đọc tệp `.harness/harness.yaml` tại đường dẫn cố định. Nếu thiếu, trả về lỗi `ManifestNotFound`.
4. **Phân giải Dependency**: Khám phá các external sources được cấu hình trong manifest và kiểm tra bộ đệm `Tool Global Workspace`.
5. **Nạp Artifacts**: Đọc lần lượt `repository-map.md`, các file trong `rules/`, `knowledge/`, và `adr/` để build context.

---

# 7. Repository Validation & Lifecycle

## Validation Checklist

Để được coi là hợp lệ (Compliant), Repository phải vượt qua các bước kiểm tra sau:
- [x] Có tệp `AGENTS.md` ở root.
- [x] Có tệp `.harness/harness.yaml`.
- [x] Tệp manifest parse thành công YAML và khớp version schema.
- [x] Tất cả các relative path khai báo trong manifest đều tồn tại thực tế trên đĩa.
- [x] Không tồn tại ID của Rule hoặc ADR trùng lặp trong hệ thống.
- [x] Không có broken links (tham chiếu chéo đến tệp tin không tồn tại).

Nếu vi phạm bất kỳ checklist nào, Runtime phải dừng thực thi ngay lập tức và trả về mã lỗi thích hợp.

## Repository Lifecycle

Vòng đời của Project Repository được quản lý qua các giai đoạn sau:

- **Init (Khởi tạo)**: CLI thực hiện lệnh `harness init` để tạo cấu trúc thư mục `.harness/`, sinh file manifest mặc định và tệp `AGENTS.md` ở root. (Chịu trách nhiệm: CLI).
- **Import (Tải nguồn ngoài)**: CLI nạp các gói Shared Harness khai báo trong manifest về máy trạm. (Chịu trách nhiệm: CLI).
- **Sync (Đồng bộ)**: Đồng bộ hóa các thay đổi của Local Harness với mã nguồn phần mềm qua Git commit. (Chịu trách nhiệm: Human/AI).
- **Upgrade (Nâng cấp)**: CLI chạy lệnh `harness upgrade` để cập nhật cấu trúc thư mục và manifest schema lên phiên bản mới. (Chịu trách nhiệm: CLI).
- **Archive (Lưu trữ)**: Đóng băng các proposal cũ, lưu trữ log thực thi cũ vào thư mục lưu trữ để tối ưu hóa context window. (Chịu trách nhiệm: Runtime/CLI).

---

# 8. Repository Ownership & Constraints

## Ownership Model

- **Project Owner (Human)**: Sở hữu toàn quyền quyết định đối với cấu hình manifest, rules, adr và chấp thuận các proposal.
- **AI Agent**: Có quyền đọc mọi Artifact, đề xuất tạo mới hoặc cập nhật thông qua việc tạo file trong `proposals/`. AI **không bao giờ** được phép tự động merge hoặc sửa đổi trực tiếp các file rules, map hay adr đã được approved của dự án.
- **Harness Runtime**: Chỉ có quyền ghi vào thư mục `logs/` và tạo tệp tin nháp ở `proposals/` khi có yêu cầu.

## Repository Constraints

- **Repository MUST**: Có tệp `AGENTS.md` hợp lệ tại thư mục gốc.
- **Repository MUST NOT**: Commit cache của Tool Global Workspace vào hệ thống kiểm soát phiên bản Git.
- **Runtime MUST**: Từ chối thực thi Task nếu phát hiện lỗi manifest hoặc trùng lặp ID artifact.
- **CLI MUST**: Đảm bảo tính toàn vẹn của thư mục cache toàn cục trước khi cho phép Runtime chạy.

---

# 9. Repository Processing & Consistency Rules

## Repository Processing Rules

Để đảm bảo mọi Harness Runtime phát hiện và nạp dữ liệu một cách nhất quán, Runtime phải tuân thủ các quy tắc xử lý sau:

- **Thứ tự quét Repository (Traversal Order)**: Quét từ thư mục gốc (Root), đọc và xác thực Manifest tại `.harness/harness.yaml` trước khi phân tích các thư mục con.
- **Duyệt đệ quy (Recursive Directory Traversal)**: Runtime phải quét đệ quy các thư mục được chỉ định trong Manifest (ví dụ: `rules/`, `knowledge/`).
- **File/Thư mục ẩn**: Runtime mặc định bỏ qua toàn bộ file và thư mục ẩn (bắt đầu bằng dấu chấm `.`), ngoại trừ thư mục `.harness/`.
- **Ignore Rules**: Runtime phải tuân thủ các quy tắc loại trừ trong file `.gitignore` và cấu hình bỏ qua của Platform để tránh đọc hoặc phân tích các file sinh tự động (như `node_modules/`, `bin/`, `obj/`).
- **Xử lý Symbolic Link**: Không đi theo (do không đệ quy) các Symbolic Link trỏ ra ngoài phạm vi Repository để tránh loop vô hạn hoặc rò rỉ bảo mật.
- **Xử lý file Binary**: Bỏ qua toàn bộ các file binary không phải text.
- **Mã hóa ký tự**: Toàn bộ Artifact phải được mã hóa theo chuẩn UTF-8.
- **Giới hạn dung lượng**: Giới hạn dung lượng phân tích tối đa cho mỗi file text đơn lẻ là 1MB để bảo vệ dung lượng context.
- **Trùng lặp Artifact**: Nếu phát hiện hai file Artifact có cùng loại và tên trùng nhau, Runtime phải báo lỗi trùng lặp và dừng xử lý.
- **Hành vi khi Repository không hợp lệ**: Runtime phải lập tức trả về lỗi `ValidationFailed` và không cho phép AI thực hiện Task nếu cấu trúc Repository vi phạm các ràng buộc bắt buộc.

## Repository Consistency Rules

Harness Runtime phải đảm bảo tính nhất quán của dữ liệu theo các quy tắc sau:

- **Khi thiếu Manifest (`harness.yaml`)**: Runtime phải báo lỗi `ManifestNotFound` và dừng xử lý. Không được tự động giả định cấu trúc mặc định.
- **Repository hợp lệ một phần (Partially Valid)**: Nếu một Artifact bị lỗi schema nhưng các Artifact khác vẫn đúng, Runtime phải đánh dấu Repository ở trạng thái `Non-Compliant` và từ chối chạy Task để đảm bảo an toàn.
- **Trùng lặp Artifact ID**: Nếu định nghĩa ID của các Artifact (như ADR ID, Rule ID) bị trùng nhau trong toàn bộ hệ thống, Runtime phải báo lỗi và dừng thực thi.
- **Tham chiếu vòng (Circular References)**: Cấm các tham chiếu vòng giữa các Artifact (ví dụ: Rule A tham chiếu Rule B, Rule B trỏ ngược lại Rule A). Runtime phải phát hiện và trả về lỗi cấu trúc nếu có loop.
- **Phân cấp Artifact không hợp lệ**: Các Artifact phải nằm đúng thư mục chức năng được khai báo trong Manifest. Mọi file nằm sai vị trí đều bị coi là không hợp lệ.

## Harness Source Resolution

Để tránh việc phụ thuộc vào môi trường máy cục bộ và đảm bảo tính nhất quán trên mọi môi trường chạy của AI Platform (IDE, CI Runner, CLI), quy trình nạp tài nguyên Harness tuân thủ cơ chế phân giải tài nguyên động được khai báo tường minh:

- **Local Harness**: Nguồn tri thức lưu trữ trực tiếp trong thư mục `.harness/` của Repository hiện tại. Đây là nguồn mặc định và có độ ưu tiên cao nhất.
- **External Harness Sources**: Các nguồn tri thức dùng chung được khai báo bên ngoài Repository (ví dụ: một Git repository chứa bộ Rule chung của dự án, hoặc một gói tài nguyên nén chứa tài liệu business knowledge chung). Mọi nguồn ngoài đều phải được khai báo tường minh trong Manifest (`harness.yaml`).
- **Harness Source Declaration**: Cách thức khai báo trong Manifest sử dụng thuộc tính `sources` (xem chi tiết ở Manifest Specification). Cấu hình gồm `id`, `type` (git, local_path, registry...), và `uri`.
- **Source Resolution Flow**: Khi khởi chạy, Runtime thực hiện phân giải tài nguyên theo các bước:
  1. Đọc Manifest cục bộ và lấy danh sách các External Harness Sources được khai báo.
  2. Runtime tiến hành tải và cache các nguồn ngoài này vào thư mục cache an toàn của Runtime (không commit vào Repository hiện tại).
  3. Xác thực tính toàn vẹn (checksum) và cấu trúc của từng nguồn ngoài.
- **Unified Harness Workspace (Không gian làm việc hợp nhất)**: Runtime tổ chức merge (hợp nhất) Local Harness và các External Sources đã giải quyết thành một cấu trúc ảo duy nhất để AI truy cập.
- **Source Precedence (Thứ tự ưu tiên nạp)**: Khi xảy ra trùng lặp tệp tin hoặc Rule trùng lặp ID giữa các nguồn:
  1. `Local Harness` ghi đè toàn bộ `External Sources`.
  2. Các `External Sources` ghi đè lẫn nhau theo thứ tự khai báo từ trên xuống dưới trong Manifest.
- **Validation Rules**:
  - Cấm khai báo nguồn ngoài vòng lặp (circular source reference - ví dụ: Repo A khai báo nguồn Repo B, Repo B khai báo nguồn Repo A).
  - Runtime không được tự động tải bất kỳ cấu hình hay thư viện Global Harness nào nằm ngoài khai báo của Manifest.

---

# 5. Repository Artifact Classification

Repository Knowledge được tổ chức thành các loại Artifact khác nhau.

Mỗi loại Artifact có một mục đích riêng và không nên chứa thông tin thuộc trách nhiệm của loại khác.

| Artifact Type | Artifact | Purpose |
|---------------|----------|---------|
| Entry Point | AGENTS.md | Điểm vào để AI bắt đầu làm việc với Repository |
| Structural Knowledge | Repository Map | Mô tả cấu trúc logic của Repository |
| Normative Knowledge | Repository Rule | Định nghĩa các quy tắc của Repository |
| Descriptive Knowledge | Knowledge | Lưu trữ tri thức nghiệp vụ và kỹ thuật |
| Decision Record | ADR | Ghi lại các quyết định kiến trúc |

Các Artifact cùng nhau tạo thành Repository Knowledge của Repository.

---

# 6. Artifact Specifications

## 6.1 AGENTS.md

### Purpose

Là điểm vào (Entry Point) để AI bắt đầu làm việc với Repository.

### Definition

AGENTS.md cung cấp hướng dẫn giúp AI hiểu cách sử dụng Harness và tìm Repository Knowledge.

### Responsibilities

- Giới thiệu Repository.
- Chỉ dẫn Repository Knowledge.
- Định nghĩa hướng dẫn làm việc của AI.

### Required Contents

- Repository Overview
- Working Instructions
- Repository Knowledge References

### Lifecycle

```text
Create
    │
    ▼
Update
```

### Constraints

- Phải ngắn gọn.
- Không chứa tri thức chi tiết.
- Không thay thế Repository Knowledge.

### Related Components

- Repository Map
- Repository Rule
- Knowledge

---

## 6.2 Repository Map

### Purpose

Mô tả cấu trúc logic của Repository.

### Definition

Repository Map là Artifact mô tả cấu trúc, thành phần và mối quan hệ bên trong Repository.

### Responsibilities

- Mô tả cấu trúc Repository.
- Hỗ trợ AI định vị mã nguồn.
- Hỗ trợ Repository Scan.

### Required Contents

- Repository Structure
- Module Overview
- Entry Points
- Dependencies

### Lifecycle

```text
Generate
     │
     ▼
Review
     │
     ▼
Approved
     │
     ▼
Update
```

### Constraints

- Không chứa Business Knowledge.
- Không mô tả Implementation Detail.
- Phải phản ánh cấu trúc hiện tại của Repository.

### Related Components

- Repository
- Knowledge
- Bootstrap

---

## 6.3 Repository Rule

### Purpose

Định nghĩa các quy tắc mà AI và con người phải tuân thủ khi làm việc với Repository.

### Definition

Repository Rule là tập hợp các quy tắc về coding, kiến trúc và quy trình phát triển của Repository.

### Responsibilities

- Chuẩn hóa cách làm việc.
- Giảm quyết định mang tính chủ quan.
- Hỗ trợ AI đưa ra quyết định nhất quán.

### Required Contents

- Rule
- Scope
- Rationale
- Examples *(optional)*

### Lifecycle

```text
Draft
   │
   ▼
Review
   │
   ▼
Approved
   │
   ▼
Update
```

### Constraints

- Phải có lý do rõ ràng.
- Không được mâu thuẫn với Rule khác.
- Chỉ được thay đổi thông qua Governance.

### Related Components

- Evidence
- Proposal
- Governance

---

## 6.4 Knowledge

### Purpose

Lưu trữ tri thức lâu dài của Repository.

### Definition

Knowledge là các thông tin có giá trị tái sử dụng giúp AI và con người hiểu Repository tốt hơn.

### Responsibilities

- Chia sẻ tri thức.
- Giảm phụ thuộc vào Conversation History.
- Hỗ trợ AI hiểu Repository.

### Required Contents

- Topic
- Content
- References *(optional)*

### Lifecycle

```text
Draft
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

### Constraints

- Chỉ lưu thông tin có giá trị lâu dài.
- Không lưu trạng thái tạm thời.
- Không trùng lặp với Repository Rule.

### Related Components

- Repository Rule
- Evidence
- Proposal

---

## 6.5 Architecture Decision Record (ADR)

### Purpose

Lưu trữ các quyết định kiến trúc quan trọng.

### Definition

Architecture Decision Record (ADR) ghi lại bối cảnh, quyết định và lý do của các thay đổi kiến trúc.

### Responsibilities

- Ghi lại quyết định kiến trúc.
- Giải thích lý do của quyết định.
- Hỗ trợ bảo trì và phát triển lâu dài.

### Required Contents

- Context
- Decision
- Rationale
- Consequences
- Alternatives *(optional)*

### Lifecycle

```text
Draft
   │
   ▼
Review
   │
   ▼
Approved
```

### Constraints

- Không sửa đổi lịch sử quyết định.
- Quyết định mới phải tạo ADR mới.
- Phải có Context và Rationale.

### Related Components

- Knowledge
- Governance
- Architecture

---

# 7. Repository Ownership

Repository là chủ sở hữu của toàn bộ Repository Knowledge.

Điều này đảm bảo:

- Repository Knowledge luôn đi cùng Repository.
- Clone hoặc Fork Repository vẫn giữ đầy đủ tri thức.
- Không phụ thuộc AI Platform hoặc tài khoản người dùng.

Repository luôn là **Single Source of Truth**.

---

# 8. Relationship to Other Specifications

| Document | Responsibility |
|----------|----------------|
| 03. EXECUTION MODEL | Định nghĩa cách AI thực hiện Task |
| 04. GOVERNANCE MODEL | Định nghĩa cách Repository Knowledge được đánh giá và phát triển |
| 05. PLATFORM MODEL | Định nghĩa cách Repository Knowledge được triển khai và quản lý |

Repository Model định nghĩa cấu trúc và các Artifact của Repository Knowledge.

Các quy trình tạo, cập nhật và quản trị các Artifact được định nghĩa trong các tài liệu tiếp theo.

## Related Components

- [07_ARTIFACT_TEMPLATES.md](../spec/07_ARTIFACT_TEMPLATES.md) (Repository Rule Template)