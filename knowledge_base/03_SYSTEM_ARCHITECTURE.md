# 03_SYSTEM_ARCHITECTURE.md

**Version:** 4.0
**Status:** Final
**Ngày cập nhật:** 2026-07-11

---

# 1. Purpose

Tài liệu này định nghĩa **toàn bộ Domain Architecture, Package Structure, và Dependency Rules** của Harness Operator System.

Đây là tài liệu tham chiếu kỹ thuật bắt buộc cho mọi Engineer khi implement, extend, hoặc review bất kỳ phần nào của hệ thống. Mọi quyết định về package structure, import dependencies, và boundary giữa các domain phải tuân theo tài liệu này.

Mục tiêu của tài liệu:

- Định nghĩa 6 domains và trách nhiệm rõ ràng của mỗi domain.
- Quy định compile-time và runtime dependency giữa các packages.
- Ngăn chặn circular dependency và vi phạm layer boundary.
- Cung cấp interface contracts mà mỗi domain phải expose.
- Mô tả data flow qua các domains cho các operation chính.

Tài liệu này là **Single Source of Truth** cho mọi quyết định liên quan đến architecture và dependency. Nếu có mâu thuẫn giữa tài liệu này và các specification khác, tài liệu này được ưu tiên về dependency rules và package structure.

---

# 2. Domain Overview

Hệ thống được chia thành **6 domains** chính, mỗi domain thuộc một plane kiến trúc và chịu trách nhiệm duy nhất cho một nhóm chức năng:

| Domain | Plane | Responsibility |
|--------|-------|----------------|
| Platform | Control Plane | Entry point, lifecycle management, orchestration toàn bộ hệ thống |
| Repository | Persistence Plane | Filesystem access, manifest loading, asset loading, context building |
| Context | — | Repository context building, filtering, ranking, token budget management |
| Execution | Runtime Plane | Stateless task orchestration, step scheduling, result verification |
| Capability | — | Executable functions, capability registry, built-in capabilities |
| Governance | Knowledge Plane | Proposal management, review process, approval, promotion to Shared |

**Nguyên tắc cốt lõi:**

- Mỗi domain chỉ có **một trách nhiệm duy nhất** (Single Responsibility).
- Không domain nào được làm công việc của domain khác.
- Mọi truy cập filesystem đều phải đi qua **Repository domain**.
- **Platform** là điểm duy nhất điều phối toàn bộ hệ thống.
- **Adapters** (CLI, MCP) chỉ được giao tiếp với Platform, không được gọi domain nào trực tiếp.

---

# 3. Domain Architecture Diagram

Sơ đồ sau mô tả luồng phụ thuộc giữa các domain theo chiều dọc (từ trên xuống = phụ thuộc vào):

```
┌──────────────────────────────────────────────────────────┐
│                     ADAPTERS LAYER                        │
│              CLI Adapter    MCP Adapter                   │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                  PLATFORM (Control Plane)                 │
└──┬────────┬────────┬────────┬────────────────────────────┘
   │        │        │        │
   ▼        ▼        ▼        ▼
REPO     CONTEXT   EXEC    GOVERNANCE
(Persistence) │    │
            ▼    ▼
         CAPABILITY
```

**Giải thích:**

- **Adapters Layer** nằm trên cùng, chỉ giao tiếp với Platform.
- **Platform** là tầng điều phối, gọi xuống tất cả các domains.
- **Repository** là nền tảng persistence — Context, Execution, và Governance đều phụ thuộc vào Repository.
- **Context** và **Execution** sử dụng Capability thông qua registry injection, không import trực tiếp.
- **Capability** nằm ở tầng thấp nhất trong runtime — chỉ phụ thuộc vào Shared.

---

# 4. Package Structure

Cấu trúc package cụ thể của toàn bộ hệ thống. Mọi implementation phải tuân theo đúng layout này:

```
harness/
  shared/              # Common types, interfaces, utilities
    types/             # Shared type definitions (dùng bởi tất cả domains)
    errors/            # Error base classes
    utils/             # Shared utilities

  repository/          # Repository domain — Persistence Plane
    discovery/         # Repository discovery (tìm project root)
    manifest/          # Manifest loading & validation
    assets/            # Asset loading (Shared + Local)
    resolution/        # Asset resolution (build Effective Harness)
    context/           # Context building (build Repository Context)
    persistence/       # File system read/write operations
    validation/        # Repository structure validation

  context/             # Context domain
    builder/           # Context assembly từ Repository Context
    filter/            # Context filtering (relevance, scope)
    ranking/           # Context ranking (priority, recency)
    budget/            # Token budget management
    cache/             # Context cache

  execution/           # Execution domain — Runtime Plane
    runtime/           # Task execution orchestration
    scheduler/         # Step scheduling
    verifier/          # Result verification
    retry/             # Retry logic

  capability/          # Capability domain
    registry/          # Capability registry (lookup, invoke)
    builtin/           # Built-in capabilities
    loader/            # Capability loading
    validation/        # Capability contract validation

  governance/          # Governance domain — Knowledge Plane
    proposal/          # Proposal creation & management
    review/            # Review process
    approval/          # Approval process
    promotion/         # Promotion to Shared Harness
    audit/             # Audit logging

  platform/            # Platform domain — Control Plane
    install/           # Shared Harness installation
    update/            # Shared Harness updates
    sync/              # Synchronization
    publish/           # Publishing
    doctor/            # Health checks
    orchestration/     # Domain orchestration (wires all domains)

  adapters/            # Adapter layer — entry points
    cli/               # CLI adapter (commands → PlatformService)
    mcp/               # MCP adapter (protocol → PlatformService)
```

**Quy tắc đặt tên package:**

- Package names phải là lowercase, không có dấu gạch ngang.
- Sub-packages phản ánh chính xác chức năng, không dùng tên chung chung như `helpers/`, `common/`.
- Mọi public API của một domain được expose qua interface ở root của domain package (ví dụ: `repository/service.go`, `context/service.go`).

---

# 5. Compile-time Dependency Rules

Bảng sau quy định **tuyệt đối** những gì mỗi package được phép import và không được phép import tại compile time. Vi phạm các quy tắc này là lỗi kiến trúc nghiêm trọng.

| Package | Can Import | Cannot Import |
|---------|------------|---------------|
| `shared` | không import gì | tất cả domains |
| `repository` | `shared` | `context`, `execution`, `capability`, `governance`, `platform` |
| `context` | `shared`, `repository` | `execution`, `capability`, `governance`, `platform` |
| `execution` | `shared`, `repository`, `context`, `capability` | `governance`, `platform` |
| `capability` | `shared` | `repository`, `context`, `execution`, `governance`, `platform` |
| `governance` | `shared`, `repository` | `context`, `execution`, `capability`, `platform` |
| `platform` | `shared`, `repository`, `context`, `execution`, `governance` | `capability` (chỉ gián tiếp qua interface) |
| `adapters/cli` | `platform` | tất cả domains khác |
| `adapters/mcp` | `platform` | tất cả domains khác |

**Lưu ý quan trọng:**

- `platform` **không được** import `capability` trực tiếp. Nếu Platform cần invoke capability, phải thực hiện thông qua `ExecutionService` hoặc interface injection.
- `execution` import `capability` để access `CapabilityRegistry` — đây là **trường hợp duy nhất** một domain cấp cao import domain cấp thấp hơn trong layer 1.
- `adapters` import **chỉ và chỉ** `platform`. Không được import `repository`, `context`, hoặc bất kỳ domain nào khác dù "chỉ để lấy một type".

---

# 6. Runtime Dependency Rules

Khác với compile-time, runtime dependency mô tả hành vi thực tế khi hệ thống chạy:

| Domain | Runtime Behavior |
|--------|-----------------|
| **Repository** | Đọc và ghi filesystem trực tiếp. Là domain duy nhất có quyền này. |
| **Context** | Sử dụng dữ liệu do Repository cung cấp. Không truy cập filesystem. |
| **Execution** | Sử dụng RuntimeContext từ Context và CapabilityRegistry từ Capability. |
| **Capability** | Nhận Context qua dependency injection. Không tự load context. |
| **Governance** | Sử dụng Repository persistence để lưu proposals, audits. |
| **Platform** | Điều phối toàn bộ — gọi tất cả domains theo thứ tự quy định. |

**Nguyên tắc runtime:**

- Execution **không bao giờ** đọc filesystem. Mọi dữ liệu cần thiết phải được inject qua Context.
- Capability **không bao giờ** gọi Repository. Context được inject vào capability trước khi invoke.
- Governance persist data bằng cách gọi `Repository.persist()`, không ghi trực tiếp.
- Platform orchestrate theo đúng thứ tự: Repository → Context → Execution → Capability (thông qua Execution).

---

# 7. Circular Dependency Prevention Rules

Hệ thống phải đảm bảo **dependency graph là DAG (Directed Acyclic Graph)**. Mọi cycle đều là lỗi kiến trúc.

**Quy tắc bắt buộc:**

1. **Dependency graph là DAG.** Nếu tồn tại chu trình A → B → A (dù trực tiếp hay gián tiếp), đó là vi phạm nghiêm trọng.

2. **Giao tiếp ngược chiều phải dùng event hoặc callback.** Nếu A cần thông báo cho B nhưng A không được import B:
   - Dùng event bus (publish/subscribe).
   - Dùng callback interface được định nghĩa trong `shared`.
   - Dùng dependency injection: A nhận interface do B implement, interface được khai báo trong `shared`.

3. **Shared package không được import bất kỳ domain nào.** `shared` là nền tảng — nếu `shared` import `repository` hay `context`, toàn bộ layer model sụp đổ.

4. **Không import qua layer.** Adapter không được import Repository để "tiết kiệm code". Execution không được import Platform dù chỉ để log.

**Ví dụ cách xử lý:**

```
Tình huống: Execution cần notify Governance khi task hoàn thành.
Vi phạm: execution import governance — tạo cycle execution → governance → repository → shared
Giải pháp: Định nghĩa interface ExecutionEventHandler trong shared.
           Governance implement interface đó.
           Platform inject GovernanceEventHandler vào ExecutionService khi khởi tạo.
```

---

# 8. Layer Architecture Diagram

Sơ đồ vertical layers cho thấy mức độ phụ thuộc rõ ràng. Layer cao hơn phụ thuộc vào layer thấp hơn — không bao giờ ngược lại:

```
Layer 0: shared          (no dependencies)
         ─────────────────────────────────────────────
Layer 1: repository      (depends on: shared)
         capability      (depends on: shared)
         ─────────────────────────────────────────────
Layer 2: context         (depends on: shared, repository)
         governance      (depends on: shared, repository)
         ─────────────────────────────────────────────
Layer 3: execution       (depends on: shared, repository, context, capability)
         ─────────────────────────────────────────────
Layer 4: platform        (depends on: shared, repository, context, execution, governance)
         ─────────────────────────────────────────────
Layer 5: adapters        (depends on: platform only)
```

**Quy tắc layer:**

- Package ở Layer N **chỉ được** import packages ở Layer 0 đến Layer N-1.
- Package ở Layer N **không được** import package cùng layer (ngoại lệ: `context` và `governance` đều ở Layer 2 nhưng không được import lẫn nhau).
- `capability` và `repository` đều ở Layer 1 và **không được** import lẫn nhau.
- `execution` ở Layer 3 được import `capability` (Layer 1) — điều này hợp lệ vì Layer 3 > Layer 1.

---

# 9. Interface Contracts

Mỗi domain phải expose một public service interface. Các interface này là **contract** giữa domains — implementation có thể thay đổi nhưng contract phải ổn định.

Tất cả interface được khai báo tập trung tại `src/shared/contracts/services.ts`. Đây là single source of truth.

## FileSystemOps

```
interface FileSystemOps {
  read(root: RepositoryRoot, path: RelativePath): string
  write(root: RepositoryRoot, path: RelativePath, data: string): void
  existsFile(root: RepositoryRoot, path: RelativePath): boolean
  existsDir(root: RepositoryRoot, path: RelativePath): boolean
  deleteFile(root: RepositoryRoot, path: RelativePath): void
  moveFile(root: RepositoryRoot, src: RelativePath, dest: RelativePath): void
  copyFile(root: RepositoryRoot, src: RelativePath, dest: RelativePath): void
  listDir(root: RepositoryRoot, path: RelativePath): DirEntry[]
  mkDir(root: RepositoryRoot, path: RelativePath, recursive?: boolean): void
  rmDir(root: RepositoryRoot, path: RelativePath, recursive?: boolean): void
}
```

Interface cho filesystem operations, được inject vào Capability layer để tránh dependency trực tiếp vào Repository domain. `DirEntry = { name: string; type: 'file' | 'dir' }`.

## RepositoryService

```
interface RepositoryService {
  discover(workingDir: string): RepositoryRoot
  loadManifest(root: RepositoryRoot): Manifest
  loadSharedAssets(sharedPath: string): AssetCollection
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext
  persist(root: RepositoryRoot, path: RelativePath, data: string): void
  readFile(root: RepositoryRoot, path: RelativePath): string
  fileExists(root: RepositoryRoot, path: RelativePath): boolean
  dirExists(root: RepositoryRoot, path: RelativePath): boolean
  ensureDir(root: RepositoryRoot, path: RelativePath): void
  readDir(root: RepositoryRoot, path: RelativePath): string[]
  validate(root: RepositoryRoot): ValidationResult
}
```

## ContextService

```
interface ContextService {
  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext
  invalidateCache(key: CacheKey): void
}
```

`ContextService` đã được gọn lại: filter, rank, applyBudget là internal pipeline trong `ContextBuilder`, không expose riêng lẻ. Đầu vào là `RepositoryContext` từ Repository domain + `TaskRequest` → output `RuntimeContext`.

## ExecutionService

```
interface ExecutionService {
  execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult>
  cancel(taskId: string): Promise<CancelResult>
  getStatus(taskId: string): TaskState
}
```

Các method `schedule` và `verify` là internal của `ExecutionRuntime`. `retry` được xử lý trong `RetryManager` nội bộ.

## CapabilityImpl

```
interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>
}
```

`CapabilityImpl` là contract cho mọi capability implementation. Không có interface riêng cho từng capability type — tất cả đều implement chung interface này.

## CapabilityRegistry

```
interface CapabilityRegistry {
  register(def: CapabilityDefinition, impl: CapabilityImpl): void
  unregister(id: CapabilityId): void
  resolve(id: CapabilityId): CapabilityImpl
  getDefinition(id: CapabilityId): CapabilityDefinition
  invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>
  list(): CapabilityDefinition[]
  isRegistered(id: CapabilityId): boolean
}
```

Khác biệt so với thiết kế cũ: `register` nhận cả definition + implementation; thêm `unregister`, `resolve`, `getDefinition`, `isRegistered`; `invoke` nhận `CapabilityId` thay vì `string name`.

## GovernanceService

```
interface GovernanceService {
  submitProposal(request: ProposalRequest): Proposal
  submitExistingProposal(id: ProposalId): Proposal
  listProposals(filter: ProposalFilter): Proposal[]
  getProposal(id: ProposalId): Proposal
  review(id: ProposalId, reviewer: string): Proposal
  approve(id: ProposalId, reviewer: string, comments: string): Proposal
  reject(id: ProposalId, reviewer: string, comments: string): Proposal
  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal
  promote(id: ProposalId): PromotionResult
  getAuditLog(proposalId: ProposalId): AuditRecord[]
}
```

`ProposalId` là branded type (`string & { __brand: 'ProposalId' }`). `submitExistingProposal` dùng cho MCP flow (proposal đã tạo trước đó). `review`/`requestChanges` là các state transition bổ sung.

## PlatformService

```
interface PlatformService {
  run(request: TaskRequest): Promise<ExecutionResult>
  install(config: InstallConfig): Promise<InstallResult>
  update(config: UpdateConfig): Promise<UpdateResult>
  sync(config: SyncConfig): Promise<SyncResult>
  publish(request: PublishRequest): Promise<PublishResult>
  doctor(): Promise<DiagnosticReport>
  validate(root?: string): Promise<ValidationResult>
  status(): Promise<PlatformStatus>
  listCapabilities(): Promise<CapabilityDefinition[]>
  previewContext(request: TaskRequest): Promise<RuntimeContext>
  invokeCapability(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>
  cancelTask(taskId: string): Promise<CancelResult>
  submitProposal(request: ProposalRequest): Promise<Proposal>
  submitExistingProposal(id: ProposalId): Promise<Proposal>
  listProposals(filter: ProposalFilter): Promise<Proposal[]>
  getProposal(id: ProposalId): Promise<Proposal>
  reviewProposal(id: ProposalId, reviewer: string): Promise<Proposal>
  approveProposal(id: ProposalId, reviewer: string, comments?: string): Promise<Proposal>
  rejectProposal(id: ProposalId, reviewer: string, comments: string): Promise<Proposal>
}
```

`PlatformService` là facade duy nhất cho Adapter layer. Nó wrap tất cả domain services và expose operations cho CLI/MCP.

**Quy tắc về Interface Contracts:**

- Mọi interface phải được khai báo trong `src/shared/contracts/services.ts` (duy nhất, không duplicate).
- Parameter types phải là types từ `shared` hoặc từ domain của chính nó — không được dùng types của domain khác làm parameter của interface.
- Trường hợp ngoại lệ: `ContextService.buildRuntimeContext()` nhận `RepositoryContext` từ repository domain — đây được chấp nhận vì dependency `context → repository` là hợp lệ theo Compile-time Rules.
- `FileSystemOps` là ngoại lệ đặc biệt: được định nghĩa trong `shared/contracts/` để capability layer có thể dependency vào interface mà không vi phạm layer rules. Implementation (FileSystemPersistence) nằm ở repository domain.

---

# 10. Data Flow Diagram — Task Execution

Luồng dữ liệu đầy đủ cho một user request thực thi task:

```
User Request
     │
     ▼ CLI/MCP Adapter (chuyển đổi input thành RunRequest)
     │
     ▼ adapters/cli hoặc adapters/mcp
     │
PlatformService.run(RunRequest)
     │
     ├─► RepositoryService.discover(workingDir)
     │         └─► RepositoryService.loadManifest(root)
     │                   └─► RepositoryService.loadAssets(manifest)
     │                             └─► RepositoryService.resolveAssets(assets)
     │                                       └─► RepositoryService.buildContext(assets, metadata)
     │                                                 └─► returns RepositoryContext
     │
     ├─► ContextService.build(repositoryContext, contextRequest)
     │         ├─► filter(context)
     │         ├─► rank(context)
     │         └─► applyBudget(context)
     │                   └─► returns RuntimeContext
     │
     ├─► ExecutionService.execute(runtimeContext, taskRequest)
     │         ├─► scheduler.schedule(steps)
     │         ├─► CapabilityRegistry.invoke(capabilityName, context, params)
     │         │         └─► returns CapabilityResult
     │         └─► verifier.verify(result)
     │                   └─► returns ExecutionResult
     │
     └─► returns RunResult (wraps ExecutionResult)
          │
          ▼ CLI/MCP Adapter (format output cho user)
```

**Điểm quan trọng trong data flow:**

- `RepositoryContext` chỉ chứa dữ liệu đã được load từ filesystem. Không có lazy loading sau bước này.
- `RuntimeContext` là kết quả sau khi filter, rank, và apply budget — đây là input duy nhất của Execution.
- Capability **không bao giờ** nhận raw filesystem path làm input. Chỉ nhận `RuntimeContext` và `CapabilityParams`.
- Mọi error trong chain phải được propagate lên đến Adapter theo kiểu typed errors (không wrap thành generic error).

---

# 11. Shared Harness Management Flow

Luồng quản lý vòng đời Shared Harness:

```
PlatformService.install(source)
     │
     ▼
Validate source URL và credentials
     │
     ▼
Downloads Shared Harness bundle từ Harness Repository
     │
     ▼
RepositoryService.persist(
  path: "~/.harness/shared/",
  data: sharedHarnessBundle
)
     │
     ▼
RepositoryService.persist(
  path: "~/.harness/metadata/installed.yaml",
  data: installMetadata
)
     │
     ▼
returns InstallResult
```

```
PlatformService.update(options)
     │
     ▼
RepositoryService.loadManifest("~/.harness/metadata/installed.yaml")
     │
     ▼ (kiểm tra version hiện tại)
     │
     ▼ (nếu có version mới)
Downloads updated bundle
     │
     ▼
RepositoryService.persist("~/.harness/shared/", updatedBundle)
     │
     ▼
RepositoryService.persist("~/.harness/metadata/installed.yaml", updatedMetadata)
     │
     ▼
returns UpdateResult
```

**Quy tắc:**

- Platform **không được** ghi trực tiếp vào `~/.harness/` mà phải gọi `RepositoryService.persist()`.
- Mọi write operation phải có audit trail — Platform tạo audit entry trước khi gọi persist.
- Rollback phải được hỗ trợ: trước khi overwrite, backup version cũ vào `~/.harness/backup/`.

---

# 12. Domain Responsibilities Matrix

Bảng này quy định **ai làm gì** — không được phép domain khác thực hiện công việc của domain đã được chỉ định:

| Operation | Domain chịu trách nhiệm | Quy tắc bắt buộc |
|-----------|------------------------|-------------------|
| Read filesystem | Repository only | Mọi domain khác phải gọi RepositoryService, không đọc file trực tiếp |
| Write filesystem | Repository only | Mọi domain khác phải gọi RepositoryService.persist(), không ghi file trực tiếp |
| Load assets | Repository | Kể cả Shared Assets và Local Assets |
| Resolve assets (Effective Harness) | Repository | Merge logic nằm trong `repository/resolution/` |
| Build Repository Context | Repository | Output là RepositoryContext — raw data từ filesystem |
| Build Runtime Context | Context | Input phải là RepositoryContext từ Repository. Context lọc, rank, apply budget |
| Execute task | Execution | Execution không được đọc filesystem hay load asset |
| Invoke capability | Execution thông qua CapabilityRegistry | Capability nhận injected Context, không tự load |
| Create/Submit proposal | Governance | Governance tạo proposal objects |
| Persist proposal | Governance gọi Repository.persist() | Governance không ghi filesystem trực tiếp |
| Review/Approve proposal | Governance | |
| Promote to Shared | Governance (gọi Platform) | Promotion flow: Governance → Platform → Repository.persist() |
| Install Shared Harness | Platform | Platform gọi Repository để ghi |
| Update Shared Harness | Platform | Platform gọi Repository để ghi |
| Sync Harness | Platform | Platform gọi Repository để đọc và ghi |
| Health check | Platform (doctor) | Platform kiểm tra state của tất cả domains |
| Orchestrate domains | Platform | Platform là điểm duy nhất biết thứ tự gọi các domains |

---

# 13. Anti-patterns

Những gì **tuyệt đối không được làm**. Mỗi vi phạm dưới đây là bug kiến trúc:

### Anti-pattern 1: Execution import Repository

```
// VI PHẠM — execution/runtime/executor.go
import "harness/repository/persistence"

func execute(task Task) {
  data := persistence.ReadFile(task.ConfigPath) // SAI
}
```

**Đúng:** Execution nhận context đã được build, không đọc file trực tiếp.

---

### Anti-pattern 2: Capability gọi Repository.loadAssets()

```
// VI PHẠM — capability/builtin/analyze.go
import "harness/repository"

func invoke(ctx Context, params Params) CapabilityResult {
  assets := repository.LoadAssets(params.ManifestPath) // SAI
}
```

**Đúng:** Capability nhận `RuntimeContext` đã có đủ thông tin. Không tự load gì thêm.

---

### Anti-pattern 3: Governance ghi filesystem trực tiếp

```
// VI PHẠM — governance/proposal/writer.go
import "os"

func saveProposal(proposal Proposal) {
  os.WriteFile(".harness/proposals/"+proposal.ID+".yaml", data, 0644) // SAI
}
```

**Đúng:** Governance phải gọi `RepositoryService.persist()`.

---

### Anti-pattern 4: Platform implement business logic của domain

```
// VI PHẠM — platform/orchestration/runner.go
func run(request RunRequest) RunResult {
  // Platform tự merge assets thay vì gọi Repository
  merged := mergeSharedAndLocalAssets(request.SharedPath, request.LocalPath) // SAI
  // Platform tự filter context thay vì gọi Context domain
  filtered := filterByRelevance(merged, request.Query) // SAI
}
```

**Đúng:** Platform gọi `RepositoryService.resolveAssets()` và `ContextService.filter()`.

---

### Anti-pattern 5: Adapter gọi domain trực tiếp

```
// VI PHẠM — adapters/cli/commands/run.go
import "harness/repository"
import "harness/execution"

func runCommand(args Args) {
  ctx := repository.BuildContext(args.Dir) // SAI — bypass Platform
  result := execution.Execute(ctx, args.Task) // SAI — bypass Platform
}
```

**Đúng:** Adapter chỉ gọi `PlatformService.run()`. Platform lo việc còn lại.

---

### Anti-pattern 6: Shared import domain

```
// VI PHẠM — shared/utils/helper.go
import "harness/repository" // SAI — shared phải zero dependencies
```

**Đúng:** `shared` không import bất cứ thứ gì ngoài standard library.

---

### Anti-pattern 7: Context import Execution

```
// VI PHẠM — context/builder/assembler.go
import "harness/execution" // SAI — tạo cycle khi execution cũng import context
```

**Đúng:** Dependency chỉ chạy một chiều: `execution → context`.

---

# 14. Cross References

Tài liệu này là một phần của Architecture Document Set. Các tài liệu liên quan:

| Tài liệu | Nội dung |
|---------|----------|
| `00_ARCHITECTURE.md` | Architecture Foundation — Vision, Principles, Design Goals |
| `01_HARNESS_MODEL.md` | Harness Repository, Shared Harness, Local Harness, Effective Harness |
| `02_ASSET_MODEL.md` | Asset taxonomy, metadata model, resolution model |
| `04_REPOSITORY_SPECIFICATION.md` | Chi tiết implementation của Repository domain |
| `05_CONTEXT_SPECIFICATION.md` | Chi tiết implementation của Context domain |
| `06_EXECUTION_SPECIFICATION.md` | Chi tiết implementation của Execution domain |
| `07_CAPABILITY_SPECIFICATION.md` | Chi tiết implementation của Capability domain |
| `08_GOVERNANCE_SPECIFICATION.md` | Chi tiết implementation của Governance domain |
| `09_PLATFORM_SPECIFICATION.md` | Chi tiết implementation của Platform domain |

**Quy tắc tham chiếu:**

- Các specification (04–09) phải tham chiếu tài liệu này cho phần dependency rules, không được tự định nghĩa lại.
- Nếu có xung đột giữa specification domain và tài liệu này về dependency rules, tài liệu này là nguồn truth.

---

# 15. Out of Scope

Tài liệu này **không** định nghĩa:

- Runtime internals của từng domain (xem specification tương ứng).
- Asset taxonomy và resolution logic chi tiết (xem `02_ASSET_MODEL.md`).
- CLI command syntax (xem `adapters/cli` specification).
- MCP protocol details (xem `adapters/mcp` specification).
- Error hierarchy chi tiết của từng domain.
- Testing strategy và test organization.
- Deployment và operational concerns.
- Performance benchmarks và SLA.
- Configuration file formats (xem domain specifications).
- Migration strategy từ version cũ.

Các nội dung trên được định nghĩa trong tài liệu chuyên biệt của từng domain hoặc cross-cutting concern.
