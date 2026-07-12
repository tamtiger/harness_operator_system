# 18_GLOSSARY — Bảng Thuật Ngữ Harness Platform

**Version:** 4.0
**Status:** Final
**Ngôn ngữ:** Tiếng Việt
**Cập nhật lần cuối:** 2026-07-11
**Phân loại:** Single Source of Truth — Terminology

---

> **Lưu ý quan trọng:** Đây là **Single Source of Truth** cho tất cả thuật ngữ trong Harness Platform.
> Mọi tài liệu khác phải tham chiếu tới file này khi cần giải thích khái niệm.
> Thuật ngữ được sắp xếp theo thứ tự **alphabet**. Mỗi mục gồm: định nghĩa ngắn gọn, chính xác và document reference (nếu có).

---

## Mục lục

- [A](#a)
- [B](#b)
- [C](#c)
- [D](#d)
- [E](#e)
- [F](#f)
- [G](#g)
- [H](#h)
- [I](#i)
- [K](#k)
- [L](#l)
- [M](#m)
- [P](#p)
- [R](#r)
- [S](#s)
- [T](#t)
- [V](#v)
- [W](#w)
- [Bảng Migration: v1.1 → v4.0](#bảng-migration-v11--v40)

---

## A

### ADR (Architecture Decision Record)
Tài liệu ghi lại một quyết định kiến trúc quan trọng, bao gồm bối cảnh, các lựa chọn đã xem xét, quyết định được chọn, và hệ quả. ADR được lưu trong `RepositoryContext` và được tải cùng với các assets khác.
> Ref: `05_CONTEXT_SPECIFICATION.md` — RepositoryContext.adrs

### Agent (AI Agent)
Một AI Coding Tool (ví dụ: Cursor, Claude Code, Kiro, Gemini CLI) tiêu thụ knowledge từ Harness Platform để thực thi tasks. Agent không biết về cơ chế nội bộ của Harness — nó chỉ nhận context thông qua CLI hoặc MCP.
> Ref: `00_ARCHITECTURE.md` §1, `09_PLATFORM_SPECIFICATION.md` §1

### AGENTS.md
File văn bản đặt tại root của project repository, cung cấp hướng dẫn vận hành cho AI Agents. Đây là điểm entry đầu tiên mà một AI Agent đọc để hiểu cách làm việc trong project. Là yêu cầu bắt buộc ở Conformance Level 1.
> Ref: `17_CONFORMANCE.md` §3 (Level 1)

### Asset
Đơn vị tri thức cơ bản trong hệ thống — có thể đánh địa chỉ, phiên bản hóa, và tái sử dụng được. Mọi thông tin hệ thống cần để thực thi (rules, prompts, templates, workflows, knowledge, hooks, capabilities) đều được biểu diễn dưới dạng Asset. Một Asset có: danh tính duy nhất (`scope.type.id`), phiên bản SemVer, metadata chuẩn hóa, nội dung, và vòng đời.
> Ref: `02_ASSET_MODEL.md` §2

### Asset Collection
Tập hợp các Assets thuộc về một scope cụ thể (shared hoặc local). Là đơn vị tổ chức trung gian trước khi tạo ra `EffectiveAssetCollection`.
> Ref: `02_ASSET_MODEL.md`, `04_REPOSITORY_SPECIFICATION.md` §8

### Asset ID
Định danh duy nhất của một Asset trong hệ thống, theo format `{scope}.{type}.{id}`. Ví dụ: `shared.rule.coding-standards`, `local.prompt.bug-analysis`.
> Ref: `11_DATA_MODELS.md` §2

### Asset Lifecycle
Vòng đời của một Asset qua các trạng thái: draft → active → deprecated → archived. Lifecycle được quản lý thông qua Governance domain và metadata của Asset.
> Ref: `02_ASSET_MODEL.md`, `08_GOVERNANCE_SPECIFICATION.md`

### Asset Metadata
Phần khai báo chuẩn hóa ở đầu mỗi Asset file (YAML front matter), chứa các trường bắt buộc như: `id`, `type`, `scope`, `version`, `title`, `description`, `author`, `createdAt`, `updatedAt`, `status`, v.v.
> Ref: `02_ASSET_MODEL.md` §4+, `10_MANIFEST_SPECIFICATION.md`

### Asset Scope
Phạm vi tác dụng của một Asset. Có hai giá trị: `shared` (dùng chung toàn hệ thống, lưu trong Shared Harness) và `local` (chỉ dùng trong repository cụ thể, lưu trong Local Harness).
> Ref: `11_DATA_MODELS.md` §3.2

### Asset Type
Phân loại của một Asset, xác định vai trò và cách sử dụng. Các loại được định nghĩa trong enum `AssetType`: `rule`, `prompt`, `template`, `workflow`, `knowledge`, `hook`, `capability`.
> Ref: `11_DATA_MODELS.md` §3.1, `02_ASSET_MODEL.md` §3

### Atomic Write
Thao tác ghi file đảm bảo tính nguyên tử: hoặc ghi thành công hoàn toàn, hoặc không ghi gì cả. Được thực hiện bằng cách ghi vào file tạm rồi rename. Là yêu cầu bắt buộc khi Repository domain persist dữ liệu xuống filesystem.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §10

---

## B

### Budget (Context Budget)
Giới hạn token được phân bổ cho RuntimeContext, kiểm soát tổng lượng context được đưa vào một execution session. Budget được phân chia theo loại asset (rules, knowledge, prompts, v.v.).
> Ref: `05_CONTEXT_SPECIFICATION.md` §3 (BudgetAllocation)

### Budget Strategy
Chiến lược phân bổ token budget giữa các loại asset khác nhau trong RuntimeContext. Xác định tỉ lệ và ưu tiên khi tổng context vượt quá giới hạn cho phép.
> Ref: `05_CONTEXT_SPECIFICATION.md`

---

## C

### Capability
**Executable Asset** — đơn vị thực thi nhỏ nhất trong hệ thống, có thể được Execution Runtime invoke trực tiếp. Mỗi Capability thực hiện một thao tác cụ thể, xác định (đọc file, gọi git, chạy test, v.v.) và expose một `CapabilityDefinition` đầy đủ với input/output schema. Capability là điểm mở rộng duy nhất: mọi chức năng mới được thêm bằng cách đăng ký Capability mới.
> Ref: `07_CAPABILITY_SPECIFICATION.md` §1

### Capability Contract
Cam kết chính thức của một Capability về hành vi của nó, được thể hiện qua `CapabilityDefinition`: input schema, output schema, error codes, permissions, timeout, idempotency. Contract này là bất biến trong một phiên bản.
> Ref: `07_CAPABILITY_SPECIFICATION.md` §3

### Capability ID
Định danh duy nhất của một Capability, theo format `{namespace}.{name}`. Ví dụ: `file.read`, `git.commit`, `ai.generate`.
> Ref: `11_DATA_MODELS.md` §2

### Capability Registry
Thành phần trung tâm quản lý tất cả Capabilities đã được đăng ký. Registry chịu trách nhiệm discover, validate, và invoke Capabilities. Mọi lời gọi capability trong Execution đều phải đi qua Registry.
> Ref: `07_CAPABILITY_SPECIFICATION.md`

### CapabilityDefinition
Interface TypeScript khai báo đầy đủ metadata và contract của một Capability: `id`, `name`, `description`, `version`, `inputSchema`, `outputSchema`, `errorCodes`, `permissions`, `timeout`, `idempotent`.
> Ref: `07_CAPABILITY_SPECIFICATION.md` §3, `11_DATA_MODELS.md`

### CapabilityResult
Kết quả trả về từ một lần invoke Capability, gồm: `success` (boolean), `output` (conform outputSchema nếu success), `error` (với code và message nếu thất bại).
> Ref: `07_CAPABILITY_SPECIFICATION.md` §3, `11_DATA_MODELS.md`

### Checksum
Giá trị hash (thường là SHA-256) dùng để xác minh tính toàn vẹn của file hoặc tập hợp assets. Được dùng khi verify Shared Harness integrity sau khi install hoặc sync.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §6 (R10)

### CLI (Command Line Interface)
Giao diện dòng lệnh là một trong hai adapter chính để tương tác với Harness Platform. CLI parse arguments từ terminal và chuyển tiếp lệnh đến `PlatformService`. CLI không chứa business logic.
> Ref: `09_PLATFORM_SPECIFICATION.md` §1, `13_CLI_SPECIFICATION.md`

### Compile-time Dependency
Phụ thuộc được khai báo tường minh giữa các domain tại thời điểm biên dịch (compile time), ngược với runtime dependency. Harness quy định rõ compile-time dependency graph giữa các domain để tránh circular dependency và đảm bảo separation of concerns.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §14, `07_CAPABILITY_SPECIFICATION.md`

### Context (Domain)
Một trong năm domain chính của hệ thống. Context domain chịu trách nhiệm transform `RepositoryContext` thành `RuntimeContext` thông qua filtering, ranking, và budget allocation. Context không đọc filesystem và không resolve assets — đó là trách nhiệm của Repository domain.
> Ref: `05_CONTEXT_SPECIFICATION.md`

### ContextService
Service công khai của Context domain, cung cấp phương thức `buildRuntimeContext(repositoryContext, taskRequest)` để tạo `RuntimeContext` tối ưu cho một task cụ thể.
> Ref: `05_CONTEXT_SPECIFICATION.md`

---

## D

### Declarative Asset
Loại Asset mô tả *cái gì* (what) — không tự thực thi mà được Runtime đọc và áp dụng. Bao gồm: Rule, Prompt, Template, Workflow, Knowledge, Hook. Đối lập với Executable Asset.
> Ref: `02_ASSET_MODEL.md` §3

### Dependency Resolution
Quá trình xác định và tải các Assets mà một Asset hoặc Workflow phụ thuộc vào. Repository domain thực hiện resolution này khi build EffectiveAssetCollection.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §8

### Domain
Đơn vị tổ chức kiến trúc với trách nhiệm rõ ràng và ranh giới nghiêm ngặt. Hệ thống Harness được chia thành các domain: Repository, Context, Execution, Capability, Governance, Platform. Mỗi domain có Service riêng và chỉ giao tiếp qua interface công khai.
> Ref: `00_ARCHITECTURE.md` §5, `03_SYSTEM_ARCHITECTURE.md`


---

## E

### Effective Asset Collection
Tập hợp Assets cuối cùng sau khi đã áp dụng Resolution Strategy — kết hợp Shared Assets và Local Assets, với Local override Shared khi có xung đột cùng ID. Đây là tập hợp thực tế mà Runtime sử dụng.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §8, `11_DATA_MODELS.md`

### Effective Harness
Biểu diễn in-memory của toàn bộ knowledge sau khi merge Shared Harness và Local Harness theo Resolution Model. Effective Harness **không tồn tại trên filesystem** — nó chỉ tồn tại trong bộ nhớ trong suốt một session. Runtime không bao giờ đọc trực tiếp từ Shared hay Local Harness ở dạng thô.
> Ref: `01_HARNESS_MODEL.md` §5

### ErrorDomain
Enum xác định domain nguồn gốc của một lỗi: `REPOSITORY`, `CONTEXT`, `EXECUTION`, `CAPABILITY`, `GOVERNANCE`, `PLATFORM`, `MANIFEST`. Là một trường bắt buộc trong `HarnessError`.
> Ref: `14_ERROR_MODEL.md` §2

### Evidence
Bằng chứng hỗ trợ một Proposal trong Governance, ví dụ: test results, benchmark data, link tới issue, hoặc ví dụ thực tế. Một Proposal phải có ít nhất 1 evidence item trước khi được SUBMIT.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §8

### Executable Asset
Loại Asset mô tả *cách làm* (how) — có thể được Runtime gọi trực tiếp với input/output contract xác định. Hiện tại chỉ có một loại: Capability. Đối lập với Declarative Asset.
> Ref: `02_ASSET_MODEL.md` §3

### Execution (Domain)
Một trong năm domain chính của hệ thống. Execution là **Stateless Runtime Orchestrator**: nhận `TaskRequest` và `RuntimeContext`, xây dựng `ExecutionPlan`, điều phối các bước thực thi qua Capability Registry, và trả về `ExecutionResult`. Execution không đọc filesystem và không lưu state giữa các tasks.
> Ref: `06_EXECUTION_SPECIFICATION.md` §1

### ExecutionPlan
Kế hoạch thực thi được xây dựng từ Workflow trong RuntimeContext, chứa danh sách `ExecutionStep` đã được sắp xếp theo thứ tự và dependency. ExecutionPlan là immutable sau khi được tạo.
> Ref: `06_EXECUTION_SPECIFICATION.md` §4, `11_DATA_MODELS.md`

### ExecutionResult
Kết quả cuối cùng của một Task execution, bao gồm: trạng thái (success/failure), output tổng hợp từ tất cả các bước, danh sách `CapabilityResult`, và metadata về quá trình thực thi (thời gian, số lần retry, v.v.).
> Ref: `06_EXECUTION_SPECIFICATION.md`, `11_DATA_MODELS.md`

### ExecutionService
Service công khai của Execution domain, cung cấp phương thức `execute(taskRequest, runtimeContext)` và `getStatus(taskId)`.
> Ref: `06_EXECUTION_SPECIFICATION.md`

### ExecutionStep
Một bước đơn lẻ trong `ExecutionPlan`, đại diện cho một lời gọi Capability cụ thể với input xác định. Mỗi step có `capabilityId`, `input`, `dependsOn` (các step phải hoàn thành trước), và `retryPolicy`.
> Ref: `06_EXECUTION_SPECIFICATION.md`, `11_DATA_MODELS.md`

---

## F

### Filtering (Context)
Bước đầu tiên trong quá trình xử lý của Context domain: lọc các assets từ `RepositoryContext` để chỉ giữ lại những assets phù hợp với `TaskRequest` hiện tại (theo type, tags, relevance). Filtering xảy ra trước Ranking và Budget Allocation.
> Ref: `05_CONTEXT_SPECIFICATION.md` §2

---

## G

### Governance (Domain)
Một trong năm domain chính. Governance quản lý **vòng đời của Knowledge**: tiếp nhận Proposals, enforce review gate (chỉ human mới approve/reject), ghi audit logs, và orchestrate promotion từ Local lên Shared Harness. Governance không ghi filesystem trực tiếp — mọi I/O đều qua Repository domain.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §1

### GovernanceService
Service công khai của Governance domain. Cung cấp các phương thức: `submitProposal()`, `reviewProposal()`, `approveProposal()`, `rejectProposal()`, `promoteAsset()`, `listProposals()`, `getAuditLog()`.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §10

---

## H

### Harness
Tên của platform và cũng là khái niệm trung tâm: một **Knowledge Management Platform** quản lý, phân phối, và kiểm soát knowledge cho các AI Coding Tools. "Harness" có thể chỉ: (1) toàn bộ platform, (2) một instance cụ thể (Shared Harness hoặc Local Harness), hoặc (3) trạng thái in-memory (Effective Harness). Ngữ cảnh xác định nghĩa cụ thể.
> Ref: `00_ARCHITECTURE.md` §1, `01_HARNESS_MODEL.md`

### Harness Platform
Toàn bộ hệ thống phần mềm Harness Operator, bao gồm tất cả domains (Repository, Context, Execution, Capability, Governance, Platform), adapters (CLI, MCP), và infrastructure (Shared Harness, Local Harness, Harness Repository).
> Ref: `00_ARCHITECTURE.md`, `03_SYSTEM_ARCHITECTURE.md`

### Harness Repository
**Source of Truth** duy nhất cho toàn bộ hệ thống — một remote Git repository chứa tất cả Assets được chia sẻ giữa các projects và teams. Được quản lý bởi Platform team. Developers tương tác gián tiếp qua sync commands.
> Ref: `01_HARNESS_MODEL.md` §2

### HarnessError
Interface chuẩn cho mọi lỗi trong hệ thống: `{ code, domain, message, details?, retryable, timestamp, stackTrace? }`. Mọi domain đều sử dụng cấu trúc này để báo cáo lỗi, đảm bảo consistency trong error handling.
> Ref: `14_ERROR_MODEL.md` §2

### Hook
Declarative Asset loại `hook` — khai báo một lifecycle event handler được thực thi tự động tại các điểm cụ thể trong execution pipeline (pre-task, post-task, on-error, v.v.). Hook không chứa logic thực thi mà tham chiếu tới một Capability.
> Ref: `02_ASSET_MODEL.md` §4, `11_DATA_MODELS.md`

### HookEvent
Sự kiện lifecycle kích hoạt một Hook, ví dụ: `pre_execution`, `post_execution`, `on_error`, `on_capability_complete`. HookEvent xác định thời điểm Hook được invoke trong execution pipeline.
> Ref: `02_ASSET_MODEL.md`, `06_EXECUTION_SPECIFICATION.md`


---

## I

### Immutable (Context)
Tính chất của `RuntimeContext` sau khi được build: không thể thay đổi trong suốt vòng đời của một execution. Immutability đảm bảo predictability và thread-safety — Execution domain nhận context và không được phép modify nó.
> Ref: `05_CONTEXT_SPECIFICATION.md` §2

### InstallConfig
Cấu hình dùng khi cài đặt Shared Harness, bao gồm: source repository URL, target directory, version/tag, và các tùy chọn install khác. Được Platform domain sử dụng trong quá trình install/update Shared Harness.
> Ref: `09_PLATFORM_SPECIFICATION.md`, `12_FILESYSTEM_SPECIFICATION.md`

---

## K

### Knowledge (Asset Type)
Declarative Asset loại `knowledge` — lưu trữ tri thức miền, nghiệp vụ, hoặc kỹ thuật dưới dạng văn bản có cấu trúc. Knowledge assets được đưa vào RuntimeContext để cung cấp nền tảng hiểu biết cho AI Agent khi thực thi tasks. Ví dụ: domain glossary, architectural decisions, coding conventions.
> Ref: `02_ASSET_MODEL.md` §4, `01_HARNESS_MODEL.md` §2.2

---

## L

### Local Harness
Tầng lưu trữ assets riêng của từng project repository, đặt trong thư mục `.harness/` tại root của project. Local Harness chứa assets chỉ áp dụng cho project đó và có thể override assets từ Shared Harness. Local Harness tồn tại trên filesystem của developer và không được commit vào source control (trừ khi có yêu cầu đặc biệt).
> Ref: `01_HARNESS_MODEL.md` §4, `12_FILESYSTEM_SPECIFICATION.md`

---

## M

### Manifest
File cấu hình chính của một project repository, đặt tại `.harness/harness.yaml`. Manifest khai báo: metadata của project, version spec, dependencies vào Shared Harness packages, local asset overrides, và các cấu hình hệ thống. Là điểm entry để Repository domain load toàn bộ cấu hình.
> Ref: `10_MANIFEST_SPECIFICATION.md`, `01_HARNESS_MODEL.md` §2.2

### MCP Adapter
Adapter implement Model Context Protocol (MCP) để các AI tools tương tác với Harness Platform theo chuẩn MCP. MCP Adapter không chứa business logic — nó chỉ nhận MCP requests, chuyển đổi thành `TaskRequest`, và gọi `PlatformService`.
> Ref: `09_PLATFORM_SPECIFICATION.md` §1, `17_CONFORMANCE.md` §2

### MCP Server
Instance của MCP Adapter đang chạy, lắng nghe kết nối từ AI tools qua Model Context Protocol. MCP Server expose các tools và resources của Harness Platform theo chuẩn MCP.
> Ref: `09_PLATFORM_SPECIFICATION.md` §1, `17_CONFORMANCE.md` §2

---

## P

### Permission
Quyền truy cập mà một Capability yêu cầu để thực thi, ví dụ: `file.read`, `file.write`, `git.commit`, `network.http`. Permissions được khai báo trong `CapabilityDefinition` và được kiểm tra bởi Execution domain trước khi invoke.
> Ref: `07_CAPABILITY_SPECIFICATION.md` §3, `15_SECURITY_MODEL.md`

### Platform (Domain)
**Control Plane** của toàn bộ hệ thống — entry point duy nhất cho mọi tác vụ. Platform orchestrate tất cả domain services theo đúng thứ tự để hoàn thành một request. Platform không chứa business logic của domain nào. CLI và MCP Adapter đều gọi vào PlatformService.
> Ref: `09_PLATFORM_SPECIFICATION.md` §1

### PlatformService
Service công khai của Platform domain, là entry point cho mọi operation: `execute()`, `install()`, `sync()`, `publish()`, `submitProposal()`, `doctor()`, v.v.
> Ref: `09_PLATFORM_SPECIFICATION.md` §2

### Plugin
Thành phần mở rộng có thể được cài đặt vào Harness Platform để thêm Capabilities mới, hooks, hoặc adapters. Plugin được đăng ký vào Capability Registry và phải conform với Plugin contract.
> Ref: `07_CAPABILITY_SPECIFICATION.md`, `09_PLATFORM_SPECIFICATION.md`

### Prompt (Asset Type)
Declarative Asset loại `prompt` — template chỉ thị cho AI model, có thể chứa variables được điền khi runtime. Prompt assets cung cấp cách tương tác nhất quán và được phê duyệt với AI models.
> Ref: `02_ASSET_MODEL.md` §4, `01_HARNESS_MODEL.md` §2.2

### Proposal
Đơn vị trung tâm của Governance domain — đại diện cho một đề xuất thay đổi knowledge (tạo mới, cập nhật, xóa, hoặc promote asset). Proposal phải trải qua quy trình: DRAFT → SUBMITTED → REVIEWING → APPROVED/REJECTED. Chỉ human mới có thể approve hoặc reject.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §3

### ProposalId
Định danh duy nhất của một Proposal, theo format `PROP-YYYY-MM-DD-NNN`. Ví dụ: `PROP-2026-07-11-001`.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §3, `11_DATA_MODELS.md` §2

### ProposalStatus
Trạng thái hiện tại của một Proposal trong lifecycle state machine: `DRAFT`, `SUBMITTED`, `REVIEWING`, `APPROVED`, `REJECTED`, `PROMOTED`, `CANCELLED`.
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §3, `11_DATA_MODELS.md`

### ProposalType
Loại thay đổi mà một Proposal đề xuất: `new_asset` (tạo asset mới), `update_asset` (cập nhật asset đã có), `delete_asset` (xóa asset), `promote_to_shared` (đưa asset từ Local lên Shared Harness).
> Ref: `08_GOVERNANCE_SPECIFICATION.md` §3


---

## R

### Ranking (Context)
Bước thứ hai trong quá trình xử lý của Context domain (sau Filtering): sắp xếp các assets theo độ ưu tiên, mức độ liên quan (relevance), và tính mới (recency). Assets được ranked cao hơn sẽ được ưu tiên giữ lại khi budget bị giới hạn.
> Ref: `05_CONTEXT_SPECIFICATION.md` §2

### Repository (Domain)
Domain **trung tâm và DUY NHẤT** được phép truy cập filesystem trực tiếp. Repository chịu trách nhiệm: discover repository root, load manifest, load Shared và Local assets, resolve assets thành EffectiveAssetCollection, build RepositoryContext immutable, và persist data theo yêu cầu từ Governance/Platform.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §1

### Repository Context
Xem `RepositoryContext`.

### Repository Map
Bản đồ cấu trúc của repository, mô tả các thư mục, modules, và mối quan hệ giữa chúng. Được đưa vào `RepositoryContext` để giúp AI Agent hiểu tổ chức của project.
> Ref: `05_CONTEXT_SPECIFICATION.md` §3 (RepositoryContext.repositoryMap)

### RepositoryContext
Snapshot immutable của toàn bộ knowledge tại một thời điểm, được Repository domain build và cung cấp cho Context domain. Gồm: `metadata`, `assets` (EffectiveAssetCollection), `rules`, `prompts`, `templates`, `workflows`, `knowledge`, `hooks`, `capabilities`, `repositoryMap`, `adrs`.
> Ref: `05_CONTEXT_SPECIFICATION.md` §3, `04_REPOSITORY_SPECIFICATION.md` §9

### RepositoryMetadata
Metadata của repository, bao gồm: tên project, version, owner, description, specification version, và các thông tin định danh khác. Được đọc từ `harness.yaml` và đưa vào `RepositoryContext`.
> Ref: `10_MANIFEST_SPECIFICATION.md`, `11_DATA_MODELS.md`

### RepositoryRoot
Đường dẫn tuyệt đối tới thư mục gốc của project repository — thư mục chứa `.harness/harness.yaml`. Được Repository domain xác định bằng cách traverse up từ working directory.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §4, `11_DATA_MODELS.md` §2

### RepositoryService
Service công khai của Repository domain. Cung cấp các phương thức: `buildContext()`, `persist()`, `validateRepository()`, `getAsset()`, `listAssets()`.
> Ref: `04_REPOSITORY_SPECIFICATION.md` §12

### Resolution Model
Mô hình xác định cách Shared Harness và Local Harness được kết hợp để tạo ra Effective Harness. Nguyên tắc: Local override Shared khi có cùng Asset ID; assets độc nhất từ mỗi tầng đều được giữ lại.
> Ref: `01_HARNESS_MODEL.md` §6

### Resolution Strategy
Chiến lược cụ thể được áp dụng trong Resolution Model để xử lý xung đột và merge assets. Ví dụ: `local-override` (local wins), `merge` (kết hợp nội dung), `strict` (lỗi nếu có xung đột).
> Ref: `04_REPOSITORY_SPECIFICATION.md` §8, `01_HARNESS_MODEL.md` §6

### RetryPolicy
Chính sách retry cho một `ExecutionStep`: số lần retry tối đa, thời gian chờ giữa các lần (backoff), và điều kiện retry (chỉ retry nếu `CapabilityResult.retryable = true`).
> Ref: `06_EXECUTION_SPECIFICATION.md`, `11_DATA_MODELS.md`

### Rule (Asset Type)
Declarative Asset loại `rule` — khai báo ràng buộc mà hệ thống phải tuân thủ khi thực thi. Rule mô tả điều gì *được phép* hoặc *không được phép*, không mô tả cách làm. Rules được áp dụng trong RuntimeContext để hướng dẫn hành vi của AI Agent.
> Ref: `02_ASSET_MODEL.md` §4.1, `01_HARNESS_MODEL.md` §2.2

### RuntimeContext
Context đã được tối ưu hóa cho một task cụ thể, sau khi Context domain thực hiện filtering, ranking, và budget allocation trên `RepositoryContext`. RuntimeContext là **immutable** và được truyền vào Execution domain. Gồm: `taskContext`, `budget`, `rules`, `relevantKnowledge`, `activeWorkflow`, `availableCapabilities`, `repositoryMetadata`.
> Ref: `05_CONTEXT_SPECIFICATION.md` §3, `06_EXECUTION_SPECIFICATION.md` §1

---

## S

### Shared Harness
Tầng lưu trữ assets dùng chung cho toàn hệ thống, đặt tại `~/.harness/shared/` (Linux/macOS) hoặc `%APPDATA%\harness\shared\` (Windows). Shared Harness được install từ Harness Repository và là nguồn knowledge chung cho mọi project trên máy. Developers không sửa Shared Harness trực tiếp.
> Ref: `01_HARNESS_MODEL.md` §3, `12_FILESYSTEM_SPECIFICATION.md`

### SemVer
Semantic Versioning — chuẩn đặt số phiên bản theo format `MAJOR.MINOR.PATCH` (ví dụ: `1.2.3`). Tất cả Assets trong hệ thống sử dụng SemVer cho trường `version`. MAJOR tăng khi có breaking change, MINOR khi thêm tính năng tương thích ngược, PATCH khi fix bug.
> Ref: `16_VERSIONING.md` §2, `11_DATA_MODELS.md` §2

---

## T

### Task
Đơn vị công việc được giao cho Execution domain thực hiện. Một Task có `TaskRequest` (đầu vào), `TaskState` (trạng thái lifecycle), `TaskStatus` (trạng thái hiện tại), và `ExecutionResult` (đầu ra sau khi hoàn thành).
> Ref: `06_EXECUTION_SPECIFICATION.md`, `11_DATA_MODELS.md`

### TaskRequest
Input đầu vào cho Execution domain, chứa: loại task, parameters, constraints, và context bổ sung từ caller. TaskRequest cùng với RuntimeContext là toàn bộ input mà Execution cần để thực thi.
> Ref: `06_EXECUTION_SPECIFICATION.md` §2, `11_DATA_MODELS.md`

### TaskState
Trạng thái lifecycle của một Task trong phạm vi một execution call: `PENDING`, `PLANNING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`. TaskState được duy trì in-memory và không persist sau khi execution kết thúc.
> Ref: `06_EXECUTION_SPECIFICATION.md` §3, `11_DATA_MODELS.md`

### TaskStatus
Giá trị enum biểu thị trạng thái hiện tại của một Task, có thể được query qua `ExecutionService.getStatus()`. Là biểu diễn public-facing của `TaskState`.
> Ref: `06_EXECUTION_SPECIFICATION.md`, `11_DATA_MODELS.md`

### Template (Asset Type)
Declarative Asset loại `template` — khuôn mẫu file hoặc code có thể được điền với dữ liệu cụ thể để sinh ra output. Template assets cung cấp cách tạo files/documents nhất quán theo chuẩn của team.
> Ref: `02_ASSET_MODEL.md` §4, `01_HARNESS_MODEL.md` §2.2

### Trust Boundary
Ranh giới tin cậy xác định phạm vi mà một thành phần có thể tin tưởng input nhận được mà không cần validate thêm. Trong Harness, Trust Boundary quan trọng nhất là giữa Adapter layer (CLI/MCP — không tin tưởng) và Platform/Domain layer (tin tưởng sau khi validate).
> Ref: `15_SECURITY_MODEL.md`

---

## V

### Versioning
Hệ thống quản lý phiên bản trong Harness Platform gồm ba phạm vi độc lập: (1) **Specification Version** (`"4.0"`) — phiên bản của đặc tả kỹ thuật; (2) **Manifest Version** (integer) — cấu trúc của `harness.yaml`; (3) **Asset Version** (SemVer) — phiên bản của từng Asset. Ba loại phối hợp để đảm bảo tính tương thích toàn hệ thống.
> Ref: `16_VERSIONING.md`

---

## W

### Workflow (Asset Type)
Declarative Asset loại `workflow` — định nghĩa luồng thực thi nhiều bước, chỉ định thứ tự và dependency giữa các Capabilities. Workflow là blueprint mà Execution domain dùng để xây dựng `ExecutionPlan`.
> Ref: `02_ASSET_MODEL.md` §4, `06_EXECUTION_SPECIFICATION.md` §4, `01_HARNESS_MODEL.md` §2.2

### WorkflowStep
Một bước trong định nghĩa Workflow, chỉ định: `capabilityId` cần invoke, `input` mapping, `dependsOn` (các bước phải hoàn thành trước), `condition` (điều kiện thực thi tùy chọn), và `retryPolicy`. WorkflowStep trong Workflow definition trở thành `ExecutionStep` trong `ExecutionPlan` khi runtime xử lý.
> Ref: `02_ASSET_MODEL.md`, `06_EXECUTION_SPECIFICATION.md` §4, `11_DATA_MODELS.md`


---

## Bảng Migration: v1.1 → v4.0

Bảng dưới đây ánh xạ các thuật ngữ cũ từ spec v1.1 sang thuật ngữ mới trong spec v4.0, hỗ trợ quá trình migration tài liệu và codebase.

| Old Term (v1.1) | New Term (v4.0) | Note |
|----------------|----------------|------|
| Tool Global Workspace | Shared Harness (local install) | `~/.harness/` trên Linux/macOS, `%APPDATA%\harness\` trên Windows |
| Unified Harness Workspace | Effective Harness | In-memory only — không tồn tại trên filesystem |
| Repository Knowledge | Assets | Tên mới chính xác hơn, phản ánh tính có thể đánh địa chỉ và phiên bản hóa |
| Artifact | Asset | Đổi tên — "Asset" bao hàm đầy đủ hơn khái niệm đơn vị tri thức |
| Agent Configuration | AGENTS.md + Manifest | Tách thành hai khái niệm: hướng dẫn vận hành (AGENTS.md) và cấu hình kỹ thuật (harness.yaml) |
| Runtime Engine | Repository + Context + Execution | Tách thành 3 domain độc lập với trách nhiệm rõ ràng |
| Provider | Capability implementation | Đổi tên — "Capability" nhấn mạnh contract và registry |
| Platform Adapter | CLI Adapter / MCP Adapter | Cụ thể hóa: có hai loại adapter riêng biệt với giao thức khác nhau |

---

*Tài liệu này là **Single Source of Truth** cho thuật ngữ Harness Platform v4.0.*
*Mọi PR cập nhật thuật ngữ phải được review và merge vào file này trước khi cập nhật các tài liệu khác.*
