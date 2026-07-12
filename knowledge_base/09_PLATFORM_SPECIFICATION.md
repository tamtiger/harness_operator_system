# 09 – PLATFORM SPECIFICATION

**Version:** 4.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11  
**Ngôn ngữ:** Tiếng Việt

---

## 1. Purpose

Platform là **Control Plane** của toàn bộ hệ thống Harness Operator.

- Platform là **entry point duy nhất** cho mọi tác vụ của hệ thống.
- CLI và MCP **chỉ là adapters** — chúng không thực hiện logic, chỉ chuyển tiếp lệnh đến Platform.
- Platform điều phối tất cả domain services (Repository, Context, Execution, Governance) để hoàn thành yêu cầu.

```
[CLI Adapter]   [MCP Adapter]   [IDE / Script]
      |               |                |
      +---------------+----------------+
                      |
              [PlatformService]   <-- Control Plane
                      |
      +-------+-------+-------+--------+
      |       |       |       |        |
 [Repo] [Context] [Exec] [Govern] [Shared]
```

---

## 2. Responsibilities vs Non-Responsibilities

### Platform CÓ trách nhiệm (Responsibilities)

| Trách nhiệm | Mô tả |
|-------------|-------|
| Orchestration | Gọi domain services theo đúng thứ tự để hoàn thành TaskRequest |
| Shared Harness Lifecycle | install, update, sync Shared Harness package |
| Publish | Đẩy promoted assets lên Harness Repository |
| Diagnostics | Chạy doctor() kiểm tra toàn bộ trạng thái hệ thống |
| Validation | Validate TaskRequest và cấu trúc harness.yaml |
| Governance Orchestration | submitProposal, listProposals, approveProposal |
| Single Entry Point | Là điểm duy nhất để adapters tương tác |

### Platform KHÔNG có trách nhiệm (Non-Responsibilities)

| Không thuộc Platform | Thuộc về |
|----------------------|----------|
| Discover & load assets từ disk | RepositoryService |
| Build runtime context | ContextService |
| Thực thi capability | ExecutionService |
| Quản lý trạng thái proposal | GovernanceService |
| Parse CLI arguments | CLI Adapter |
| Format MCP response | MCP Adapter |
| Business logic của từng domain | Domain services tương ứng |

**Nguyên tắc:** Platform chỉ orchestrate — không contain business logic.

---

## 3. Public Service Contract

Đây là toàn bộ public interface của `PlatformService`:

```typescript
interface PlatformService {
  run(request: TaskRequest): Promise<ExecutionResult>;
  install(config: InstallConfig): Promise<InstallResult>;
  update(config: UpdateConfig): Promise<UpdateResult>;
  sync(config: SyncConfig): Promise<SyncResult>;
  publish(request: PublishRequest): Promise<PublishResult>;
  doctor(): Promise<DiagnosticReport>;
  validate(root?: string): Promise<ValidationResult>;
  status(): Promise<PlatformStatus>;
  listCapabilities(): Promise<CapabilityDefinition[]>;
  previewContext(request: TaskRequest): Promise<RuntimeContext>;
  invokeCapability(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>;
  cancelTask(taskId: string): Promise<CancelResult>;
  submitProposal(request: ProposalRequest): Promise<Proposal>;
  submitExistingProposal(id: ProposalId): Promise<Proposal>;
  listProposals(filter: ProposalFilter): Promise<Proposal[]>;
  getProposal(id: ProposalId): Promise<Proposal>;
  reviewProposal(id: ProposalId, reviewer: string): Promise<Proposal>;
  approveProposal(id: ProposalId, reviewer: string, comments?: string): Promise<Proposal>;
  rejectProposal(id: ProposalId, reviewer: string, comments: string): Promise<Proposal>;
}
```

### Mô tả các methods

| Method | Mục đích |
|--------|----------|
| `run()` | Thực thi một TaskRequest hoàn chỉnh qua toàn bộ pipeline |
| `install()` | Cài đặt Shared Harness package lần đầu |
| `update()` | Nâng cấp Shared Harness lên phiên bản mới hơn |
| `sync()` | Pull incremental changes mà không thay đổi version |
| `publish()` | Đẩy promoted assets lên Harness Repository |
| `doctor()` | Kiểm tra toàn diện trạng thái hệ thống |
| `validate()` | Validate cấu trúc harness.yaml của một repository |
| `status()` | Trả về trạng thái hiện tại của Platform |
| `listCapabilities()` | Liệt kê tất cả capabilities đã đăng ký |
| `previewContext()` | Preview RuntimeContext cho một request mà không thực thi |
| `invokeCapability()` | Gọi trực tiếp một capability |
| `cancelTask()` | Hủy một task đang chạy |
| `submitProposal()` | Tạo proposal mới cho asset thay đổi |
| `submitExistingProposal()` | Submit proposal đã tồn tại |
| `listProposals()` | Liệt kê proposals theo filter |
| `getProposal()` | Lấy chi tiết một proposal |
| `reviewProposal()` | Bắt đầu review một proposal |
| `approveProposal()` | Approve một proposal (governance) |
| `rejectProposal()` | Reject một proposal |

---

## 4. run() Orchestration Flow

`run()` là method cốt lõi — nó điều phối toàn bộ pipeline từ request đến kết quả.

```
1.  Validate TaskRequest
2.  RepositoryService.discover(cwd)
3.  RepositoryService.loadManifest(root)
4.  RepositoryService.loadSharedAssets(sharedPath)
5.  RepositoryService.loadLocalAssets(root, manifest)
6.  RepositoryService.resolveAssets(shared, local)
7.  RepositoryService.buildContext(assets, metadata)
8.  ContextService.buildRuntimeContext(repoContext, request)
9.  ExecutionService.execute(runtimeContext, request)
10. Return ExecutionResult
```

### Chi tiết từng bước

| Bước | Gọi | Mục đích |
|------|-----|----------|
| 1 | Internal validation | Kiểm tra TaskRequest có đúng schema không |
| 2 | `RepositoryService.discover(cwd)` | Tìm root của repository từ thư mục hiện tại |
| 3 | `RepositoryService.loadManifest(root)` | Đọc `harness.yaml` |
| 4 | `RepositoryService.loadSharedAssets(sharedPath)` | Load assets từ `~/.harness/shared/` |
| 5 | `RepositoryService.loadLocalAssets(root, manifest)` | Load assets local của repo |
| 6 | `RepositoryService.resolveAssets(shared, local)` | Merge & override shared vs local |
| 7 | `RepositoryService.buildContext(assets, metadata)` | Tạo RepoContext |
| 8 | `ContextService.buildRuntimeContext(repoContext, request)` | Tạo RuntimeContext đầy đủ |
| 9 | `ExecutionService.execute(runtimeContext, request)` | Thực thi capability |
| 10 | Return | Trả ExecutionResult cho caller |

> **Quy tắc:** Platform không thực hiện bất kỳ logic nào ngoài orchestration. Mọi logic thực sự nằm trong domain services.

---

## 5. install() Flow

Cài đặt Shared Harness package lần đầu tiên vào máy.

```
1. Validate InstallConfig (source URI, version)
2. Download Shared Harness package from Harness Repository
3. Verify checksum
4. Unpack to ~/.harness/shared/ (via Repository.persist())
5. Write ~/.harness/metadata/installed.yaml
6. Run doctor() to verify installation
7. Return InstallResult
```

### InstallConfig Schema

```yaml
install:
  source: "https://github.com/my-org/harness-shared.git"
  version: "v2.1.0"
  target: "~/.harness"  # optional, default
  verify_checksum: true
```

### InstallResult

```
InstallResult {
  success: boolean
  installedVersion: SemVer
  path: string
  error?: HarnessError
}
```

---

## 6. update() Flow

Nâng cấp Shared Harness từ version hiện tại lên version mới hơn.

```
1. Read installed.yaml để biết current version
2. Check latest version từ source
3. If already latest: return UpToDate result
4. Download new version
5. Backup current installation
6. Replace ~/.harness/shared/ content
7. Update installed.yaml
8. Run doctor() để verify
9. Return UpdateResult
```

### Lưu ý quan trọng

- Bước 5 (Backup) phải hoàn thành trước khi Replace — đảm bảo rollback nếu cần.
- Nếu `doctor()` sau update trả về `critical`, Platform tự động rollback từ backup.
- `UpdateResult` bao gồm `previousVersion` và `newVersion` để audit.

### UpdateResult

```
UpdateResult {
  status: 'updated' | 'already_latest' | 'rolled_back'
  previousVersion: string
  newVersion: string
  backupPath: string | null
  diagnostics: DiagnosticReport
}
```

---

## 7. sync() Flow

Sync là pull incremental changes mà **không thay đổi version**. Dùng khi remote có hotfix hoặc patch nhỏ trong cùng version.

```
1. Check remote for changes since installed version
2. If no changes: return NoChanges result
3. Apply incremental changes (not full replace)
4. Update checksum.yaml
5. Invalidate Context Cache
6. Return SyncResult
```

### Khác biệt giữa sync() và update()

| | `sync()` | `update()` |
|-|----------|------------|
| Version thay đổi | Không | Có |
| Scope | Incremental patch | Full replace |
| Dùng khi | Hotfix trong cùng version | Nâng cấp phiên bản |
| Backup | Không bắt buộc | Bắt buộc |

### SyncResult

```
SyncResult {
  status: 'synced' | 'no_changes'
  changesApplied: number
  updatedFiles: string[]
  cacheInvalidated: boolean
}
```

---

## 8. publish() Flow

Publish đẩy các promoted assets lên Harness Repository trung tâm thông qua Git PR.

```
1. List PROMOTED proposals
2. For each promoted proposal:
   a. Build asset package
   b. Create PR to Harness Repository (via Git)
   c. Record publish action in audit log
3. Return PublishResult (list of published assets)
```

### Điều kiện publish

- Chỉ proposals có status `PROMOTED` mới được publish.
- Mỗi proposal tạo ra một PR độc lập trên Harness Repository.
- Toàn bộ publish actions được ghi vào audit log để traceability.

### PublishResult

```
PublishResult {
  published: PublishedAsset[]
  failed: FailedPublish[]
  auditLogEntry: string
}

PublishedAsset {
  proposalId: string
  assetId: string
  prUrl: string
  publishedAt: ISO8601
}
```

---


## 9. doctor() Diagnostics

`doctor()` kiểm tra toàn diện trạng thái hệ thống và trả về báo cáo chi tiết.

### Danh sách checks

| Check | Description | Pass Condition |
|-------|-------------|----------------|
| `shared_installed` | Shared Harness installed | `~/.harness/shared/` tồn tại |
| `shared_checksum` | Shared Harness integrity | Checksums khớp với `checksum.yaml` |
| `local_manifest` | Local manifest valid | `harness.yaml` parse được và đúng schema |
| `agents_md` | AGENTS.md exists | File tồn tại tại repo root |
| `asset_ids_unique` | No duplicate asset IDs | 0 conflicts giữa shared và local |
| `capability_registry` | All required capabilities available | Tất cả capabilities trong manifest đều có sẵn |

### DiagnosticReport Schema

```
DiagnosticReport {
  timestamp: ISO8601
  overall: 'healthy' | 'warning' | 'critical'
  checks: DiagnosticCheck[]
}

DiagnosticCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  remediation: string | null
}
```

### Quy tắc tính `overall`

| Điều kiện | overall |
|-----------|---------|
| Tất cả checks đều `pass` | `healthy` |
| Có ít nhất 1 check `warn`, không có `fail` | `warning` |
| Có ít nhất 1 check `fail` | `critical` |

### Ví dụ output

```json
{
  "timestamp": "2026-07-11T17:20:07Z",
  "overall": "warning",
  "checks": [
    {
      "name": "shared_installed",
      "status": "pass",
      "message": "Shared Harness found at ~/.harness/shared/",
      "remediation": null
    },
    {
      "name": "agents_md",
      "status": "warn",
      "message": "AGENTS.md not found at repo root",
      "remediation": "Run: harness init --agents-md"
    }
  ]
}
```

---

## 10. Orchestration Model

Platform điều phối theo thứ tự ưu tiên nghiêm ngặt:

```
[Adapters]
    |
    v
[PlatformService]  ← Single entry point
    |
    +---> RepositoryService  (discover, load, resolve)
    |
    +---> ContextService     (build runtime context)
    |
    +---> ExecutionService   (execute capability)
    |
    +---> GovernanceService  (proposals, approvals)
```

### Nguyên tắc orchestration

- **Platform là single entry point:** Không có path nào bypass Platform.
- **Adapters (CLI, MCP) chỉ gọi PlatformService:** Adapters không biết gì về domain services.
- **Platform gọi domain services theo thứ tự cố định:** Thứ tự trong `run()` không được thay đổi tùy ý.
- **Platform không chứa business logic của domains:** Mọi decision logic nằm trong domain service tương ứng.
- **Stateless orchestration:** Platform không lưu trạng thái giữa các calls — mỗi call là độc lập.

---

## 11. Integration Model

### Adapter Integration

| Adapter | Flow |
|---------|------|
| **CLI Adapter** | Parse args → `PlatformService.run()` → Format terminal output |
| **MCP Adapter** | Receive tool call → `PlatformService.run()` → Format MCP response |
| **IDE Integration** | Expose `PlatformService` as library → IDE plugin gọi trực tiếp |
| **Automation Scripts** | Sử dụng SDK wrapper quanh `PlatformService` |

### Quy tắc cứng

> **Không adapter nào được gọi trực tiếp RepositoryService, ContextService, ExecutionService, hoặc GovernanceService.**

Mọi adapter phải đi qua `PlatformService`. Đây là contract không thể vi phạm.

### Ví dụ integration đúng vs sai

```
✅ ĐÚNG:
  CLI → PlatformService.run(request) → ExecutionResult

❌ SAI:
  CLI → ExecutionService.execute(context, request)
  CLI → RepositoryService.loadManifest(root)
  MCP → GovernanceService.submitProposal(request)
```

---

## 12. Compile-time Dependencies

### Platform phụ thuộc vào

```
platform/
  ├── shared/           (types, contracts)
  ├── repository/       (RepositoryService)
  ├── context/          (ContextService)
  ├── execution/        (ExecutionService)
  └── governance/       (GovernanceService)
```

### Quy tắc dependency

| Rule | Chi tiết |
|------|----------|
| Import shared | ✅ Được phép — types và contracts chung |
| Import repository | ✅ Được phép — Platform gọi RepositoryService |
| Import context | ✅ Được phép — Platform gọi ContextService |
| Import execution | ✅ Được phép — Platform gọi ExecutionService |
| Import governance | ✅ Được phép — Platform gọi GovernanceService |
| Import capability trực tiếp | ❌ **Không được phép** |

> **Lý do không import capability trực tiếp:** Capability được load động bởi Platform (qua RepositoryService) nhưng chỉ được gọi thông qua ExecutionService. Platform không bao giờ invoke capability trực tiếp.

---

## 13. Internal Modules

Platform được tổ chức thành các internal modules sau:

```
platform/
  ├── install/
  │     └── SharedHarnessInstaller    # Xử lý toàn bộ install() flow
  ├── update/
  │     └── SharedHarnessUpdater      # Xử lý toàn bộ update() flow
  ├── sync/
  │     └── SharedHarnessSynchronizer # Xử lý toàn bộ sync() flow
  ├── publish/
  │     └── AssetPublisher            # Xử lý toàn bộ publish() flow
  ├── doctor/
  │     └── DiagnosticsEngine         # Chạy tất cả diagnostic checks
  └── orchestration/
        └── PlatformOrchestrator      # Điều phối run() pipeline
```

### Trách nhiệm từng module

| Module | Class | Trách nhiệm |
|--------|-------|-------------|
| `install/` | `SharedHarnessInstaller` | Download, verify, unpack Shared Harness |
| `update/` | `SharedHarnessUpdater` | Check version, backup, replace, rollback |
| `sync/` | `SharedHarnessSynchronizer` | Incremental sync, checksum update, cache invalidation |
| `publish/` | `AssetPublisher` | Build package, create PR, write audit log |
| `doctor/` | `DiagnosticsEngine` | Chạy 6 checks, tổng hợp DiagnosticReport |
| `orchestration/` | `PlatformOrchestrator` | Điều phối run() qua 10 bước |

---

## 14. Error Model

### Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| `PLT_001` | Shared Harness source unreachable | Kiểm tra network và URL trong InstallConfig |
| `PLT_002` | Checksum verification failed | Xóa file tải về và re-download |
| `PLT_003` | Installation directory not writable | Kiểm tra permissions của `~/.harness/` |
| `PLT_004` | Task request invalid | Validate request theo schema trước khi gọi |
| `PLT_005` | Orchestration dependency failed | Kiểm tra domain error trong `cause` field |
| `PLT_006` | Publish failed | Kiểm tra Git access và repository permissions |

### PlatformError Schema

```
PlatformError {
  code: string          # PLT_xxx
  message: string       # Mô tả lỗi
  cause: Error | null   # Domain error gốc (nếu có)
  remediation: string   # Hướng dẫn khắc phục
  timestamp: ISO8601
}
```

### Error propagation

- Lỗi từ domain services được wrap trong `PLT_005` với `cause` chứa domain error gốc.
- Platform **không nuốt lỗi** — mọi lỗi đều được propagate lên caller.
- Adapters chịu trách nhiệm format error message phù hợp với output channel (terminal, MCP response).

---

## 15. Configuration Schema

```yaml
platform:
  shared_harness_path: "~/.harness"  # default — nơi lưu Shared Harness
  auto_sync: false                   # tự động sync khi phát hiện changes
  sync_on_startup: true              # sync khi Platform khởi động
  verify_checksum: true              # luôn verify checksum sau download
  doctor_on_startup: false           # chạy doctor() khi Platform khởi động
```

### Mô tả từng option

| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| `shared_harness_path` | string | `~/.harness` | Đường dẫn cài đặt Shared Harness |
| `auto_sync` | boolean | `false` | Tự động sync khi phát hiện remote changes |
| `sync_on_startup` | boolean | `true` | Chạy `sync()` mỗi lần Platform khởi động |
| `verify_checksum` | boolean | `true` | Verify checksum sau mỗi download |
| `doctor_on_startup` | boolean | `false` | Chạy `doctor()` khi khởi động (tốn thời gian) |

---

## 16. Design Rules

Các quy tắc thiết kế bắt buộc khi làm việc với Platform:

1. **Single Entry Point:** Mọi interaction với hệ thống phải đi qua `PlatformService`. Không có exception.

2. **No Business Logic in Platform:** Platform chỉ orchestrate. Nếu thấy business logic trong Platform code, đó là bug về kiến trúc.

3. **Adapter Isolation:** CLI và MCP adapters không được import bất kỳ domain service nào ngoài `PlatformService`.

4. **Fixed Orchestration Order:** Thứ tự 10 bước trong `run()` là cố định. Không được reorder mà không có impact analysis.

5. **Stateless Between Calls:** Platform không lưu state giữa các `run()` calls. Mỗi call bắt đầu từ đầu.

6. **Fail Fast on Validation:** `PLT_004` phải được raise sớm nhất có thể (bước 1) trước khi gọi bất kỳ domain service nào.

7. **Doctor on Critical Operations:** `install()` và `update()` luôn chạy `doctor()` sau khi hoàn thành để verify.

8. **Audit Everything:** `publish()` phải ghi audit log cho mọi publish action, bất kể thành công hay thất bại.

9. **No Direct Capability Invocation:** Platform không bao giờ gọi capability trực tiếp — luôn qua `ExecutionService`.

10. **Backward Compatible Contract:** Thay đổi `PlatformService` interface phải backward compatible hoặc bump major version.

---

## 17. Cross References

| Tài liệu | Liên quan đến |
|----------|---------------|
| `00_ARCHITECTURE.md` | Kiến trúc tổng thể và vị trí của Platform |
| `04_REPOSITORY_SPECIFICATION.md` | Steps 2–7 trong `run()` flow |
| `05_CONTEXT_SPECIFICATION.md` | Step 8 trong `run()` flow |
| `06_EXECUTION_SPECIFICATION.md` | Step 9 trong `run()` flow |
| `08_GOVERNANCE_SPECIFICATION.md` | `submitProposal()`, `listProposals()`, `approveProposal()` |
| `10_MANIFEST_SPECIFICATION.md` | Shared Harness package structure và `~/.harness/` layout |
| `13_CLI_SPECIFICATION.md` | CLI integration pattern và adapter contract |
| `14_ERROR_MODEL.md` | Danh sách đầy đủ error codes của toàn hệ thống |

---

## 18. Out of Scope

Các vấn đề sau **không thuộc phạm vi** của Platform Specification:

| Out of Scope | Thuộc về |
|--------------|----------|
| Cách CLI parse arguments | `13_CLI_SPECIFICATION.md` |
| Cách MCP format tool responses | MCP adapter specification (riêng) |
| Logic merge assets (shared vs local override rules) | `04_REPOSITORY_SPECIFICATION.md` |
| Cách capability được thực thi | `06_EXECUTION_SPECIFICATION.md` |
| Schema chi tiết của `harness.yaml` | `10_MANIFEST_SPECIFICATION.md` |
| Governance workflow (states, transitions) | `08_GOVERNANCE_SPECIFICATION.md` |
| Authentication và authorization | Security specification (riêng) |
| Logging và observability implementation | Observability specification (riêng) |
| Performance tuning và caching strategy | `05_CONTEXT_SPECIFICATION.md` |

---

*Tài liệu này là phần của Harness Operator System Knowledge Base.*  
*Mọi thay đổi phải được review và approve trước khi merge.*
