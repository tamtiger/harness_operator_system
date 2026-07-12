# 11_DATA_MODELS

**Version:** 4.0  
**Status:** Final  
**Ngày cập nhật:** 2026-07-11T17:27:12+07:00  
**Ngôn ngữ:** Tiếng Việt

---

## 1. Mục đích (Purpose)

Tài liệu này là **single source of truth** cho tất cả data types, data structures, DTOs, enums và state models được sử dụng trong hệ thống Harness Operator. Mọi domain, module và service đều tham chiếu document này khi cần định nghĩa hoặc sử dụng bất kỳ cấu trúc dữ liệu nào.

**Nguyên tắc:**
- Không được tự ý định nghĩa lại các type đã có trong tài liệu này.
- Khi cần thêm type mới, phải cập nhật tài liệu này trước.
- Mọi thay đổi breaking phải đi kèm với tăng version.

---

## 2. Core Identifiers & Primitives

Các kiểu nguyên thủy và định danh cơ bản được dùng xuyên suốt hệ thống:

```typescript
type RepositoryRoot = string   // Đường dẫn tuyệt đối tới thư mục gốc của repository
type RelativePath = string     // Đường dẫn tương đối so với RepositoryRoot
type SemVer = string           // Định dạng "X.Y.Z" theo Semantic Versioning
type ISO8601 = string          // Định dạng "2026-07-11T16:58:00Z"
type CapabilityId = string     // Định dạng "namespace.name"
type AssetId = string          // Định dạng "{scope}.{type}.{id}"
type ProposalId = string       // Định dạng "PROP-YYYY-MM-DD-NNN"
type Duration = number         // Đơn vị: milliseconds
type JSONSchema = object       // JSON Schema draft-07
```

---

## 3. Asset Types & Enums

### 3.1 AssetType — Loại tài nguyên

```typescript
enum AssetType {
  RULE       = 'rule',
  PROMPT     = 'prompt',
  TEMPLATE   = 'template',
  WORKFLOW   = 'workflow',
  KNOWLEDGE  = 'knowledge',
  HOOK       = 'hook',
  CAPABILITY = 'capability'
}
```

### 3.2 AssetScope — Phạm vi tài nguyên

```typescript
enum AssetScope {
  SHARED = 'shared',  // Dùng chung toàn hệ thống
  LOCAL  = 'local'    // Chỉ dùng trong repository cụ thể
}
```

### 3.3 AssetStatus — Trạng thái vòng đời tài nguyên

```typescript
enum AssetStatus {
  DRAFT      = 'draft',
  REVIEW     = 'review',
  APPROVED   = 'approved',
  PUBLISHED  = 'published',
  DEPRECATED = 'deprecated',
  RETIRED    = 'retired'
}
```

### 3.4 AssetPriority — Mức độ ưu tiên

```typescript
enum AssetPriority {
  CRITICAL = 'critical',
  HIGH     = 'high',
  MEDIUM   = 'medium',
  LOW      = 'low'
}
```

---

## 4. Asset Data Models

### 4.1 AssetMetadata — Metadata chung của mọi tài nguyên

```typescript
interface AssetMetadata {
  id: string               // Định danh duy nhất của asset
  type: AssetType          // Loại asset
  version: SemVer          // Phiên bản của asset
  name: string             // Tên hiển thị
  description?: string     // Mô tả tùy chọn
  scope: AssetScope        // Phạm vi shared hoặc local
  source: RelativePath     // Đường dẫn file nguồn
  createdAt: ISO8601       // Thời điểm tạo
  updatedAt: ISO8601       // Thời điểm cập nhật lần cuối
  tags?: string[]          // Nhãn phân loại
  deprecated?: boolean     // Đánh dấu đã deprecated
  supersededBy?: AssetId   // Asset thay thế nếu bị deprecated
}
```

### 4.2 Asset — Interface gốc của tất cả tài nguyên

```typescript
interface Asset {
  metadata: AssetMetadata
  content: string          // Nội dung raw của asset
}
```

### 4.3 Rule — Quy tắc hành vi

```typescript
interface Rule extends Asset {
  priority: AssetPriority    // Mức độ ưu tiên khi áp dụng
  scopePaths?: string[]      // Giới hạn phạm vi áp dụng theo đường dẫn
}
```

### 4.4 Prompt — Prompt template

```typescript
interface Prompt extends Asset {
  modelHints?: string[]    // Gợi ý model phù hợp để dùng prompt này
  tokenEstimate?: number   // Ước tính số token khi render
}
```

### 4.5 Template — Template sinh artifact

```typescript
interface Template extends Asset {
  artifactType: string              // Loại artifact được sinh ra
  variables?: TemplateVariable[]    // Danh sách biến của template
}

interface TemplateVariable {
  name: string        // Tên biến
  type: string        // Kiểu dữ liệu (string, number, boolean, ...)
  required: boolean   // Bắt buộc hay không
  default?: string    // Giá trị mặc định nếu có
}
```

### 4.6 Workflow — Luồng công việc

```typescript
interface Workflow extends Asset {
  steps: WorkflowStep[]    // Danh sách các bước thực thi
  triggers?: string[]      // Điều kiện kích hoạt workflow
}

interface WorkflowStep {
  id: string                  // Định danh bước
  name: string                // Tên hiển thị của bước
  capabilityId: CapabilityId  // Capability được gọi
  input: object               // Tham số đầu vào
  dependsOn?: string[]        // Danh sách step id phải hoàn thành trước
}
```

### 4.7 Knowledge — Tài liệu tri thức

```typescript
interface Knowledge extends Asset {
  domain?: string                         // Lĩnh vực tri thức
  confidence?: 'high' | 'medium' | 'low' // Mức độ tin cậy của thông tin
}
```

### 4.8 Hook — Móc nối sự kiện

```typescript
enum HookEvent {
  PRE_EXECUTION  = 'pre_execution',
  POST_EXECUTION = 'post_execution',
  PRE_COMMIT     = 'pre_commit',
  POST_COMMIT    = 'post_commit'
}

interface Hook extends Asset {
  triggerEvent: HookEvent     // Sự kiện kích hoạt hook
  order?: number              // Thứ tự thực thi nếu có nhiều hook cùng event
  capabilityId: CapabilityId  // Capability được gọi khi hook kích hoạt
}
```

### 4.9 CapabilityDefinition — Định nghĩa capability

```typescript
interface CapabilityDefinition extends Asset {
  capabilityId: CapabilityId           // ID định danh capability
  inputSchema: JSONSchema              // JSON Schema mô tả input
  outputSchema: JSONSchema             // JSON Schema mô tả output
  errorCodes?: CapabilityErrorCode[]   // Danh sách mã lỗi có thể xảy ra
  permissions?: Permission[]           // Quyền hạn cần thiết
  timeout?: Duration                   // Timeout tối đa (ms)
  idempotent?: boolean                 // Có thể gọi nhiều lần an toàn không
}
```

---


## 5. Collection Types

### 5.1 AssetCollection — Tập hợp tất cả tài nguyên

```typescript
interface AssetCollection {
  rules:        Rule[]
  prompts:      Prompt[]
  templates:    Template[]
  workflows:    Workflow[]
  knowledge:    Knowledge[]
  hooks:        Hook[]
  capabilities: CapabilityDefinition[]
}
```

### 5.2 EffectiveAssetCollection — Tập hợp tài nguyên hiệu lực (read-only)

```typescript
type EffectiveAssetCollection = Readonly<AssetCollection>
```

> **Lưu ý:** `EffectiveAssetCollection` là kết quả sau khi merge shared và local assets, đã resolve conflict. Không thể thay đổi sau khi build.

---

## 6. Repository Models

### 6.1 Manifest — File cấu hình gốc của repository

```typescript
interface Manifest {
  version: number                        // Phiên bản manifest schema
  specification: string                  // URI hoặc tên specification
  repository: RepositoryConfig           // Cấu hình repository
  agent: AgentConfig                     // Cấu hình agent
  sources?: SourceConfig[]               // Nguồn asset bên ngoài
  capabilities?: CapabilityConfig[]      // Danh sách capability đăng ký
  artifacts: ArtifactConfig[]            // Cấu hình artifact đầu ra
  governance?: GovernanceConfig          // Cấu hình quản trị
  vendor?: Record<string, unknown>       // Dữ liệu mở rộng từ vendor
}
```

### 6.2 RepositoryConfig

```typescript
interface RepositoryConfig {
  name?: string        // Tên hiển thị của repository
  root: string         // Đường dẫn thư mục gốc
  description?: string // Mô tả repository
}
```

### 6.3 AgentConfig

```typescript
interface AgentConfig {
  entry_point: string        // File entry point của agent
  context?: ContextConfig   // Cấu hình context window
}

interface ContextConfig {
  token_budget?: number                            // Tổng token budget
  budget_strategy?: 'priority_trim' | 'hard_limit' // Chiến lược khi vượt budget
}
```

### 6.4 SourceConfig — Nguồn asset bên ngoài

```typescript
interface SourceConfig {
  id: string                                  // Định danh nguồn
  type: 'git' | 'local_path' | 'registry'    // Loại nguồn
  uri: string                                 // URI của nguồn
  version?: string                            // Phiên bản cụ thể
  verified?: boolean                          // Đã xác minh chữ ký chưa
}
```

### 6.5 CapabilityConfig — Đăng ký capability

```typescript
interface CapabilityConfig {
  id: CapabilityId                          // ID của capability
  source: 'shared' | 'local' | 'external'  // Nguồn gốc capability
  path?: RelativePath                        // Đường dẫn nếu là local
  package?: string                          // Tên package nếu là external
  version?: string                          // Phiên bản
}
```

### 6.6 ArtifactConfig — Cấu hình artifact đầu ra

```typescript
interface ArtifactConfig {
  type: string   // Loại artifact (e.g., "file", "report")
  path: string   // Đường dẫn lưu artifact
}
```

### 6.7 GovernanceConfig — Cấu hình quản trị

```typescript
interface GovernanceConfig {
  auto_submit_proposals?: boolean  // Tự động submit proposal sau khi tạo
  require_evidence?: boolean      // Bắt buộc có evidence khi submit
  min_evidence_count?: number      // Số lượng evidence tối thiểu
}
```

### 6.8 RepositoryMetadata — Metadata runtime của repository

```typescript
interface RepositoryMetadata {
  root: RepositoryRoot    // Đường dẫn tuyệt đối thư mục gốc
  name?: string           // Tên repository
  manifest: Manifest      // Nội dung manifest đã parse
  gitBranch?: string      // Nhánh git hiện tại
  gitCommit?: string      // Commit hash hiện tại
}
```

---

## 7. Context Models

### 7.1 RepositoryContext — Context tĩnh của repository

```typescript
interface RepositoryContext {
  metadata: RepositoryMetadata          // Metadata của repository
  assets: EffectiveAssetCollection      // Tập hợp asset đã merge
  repositoryMap?: string                // Sơ đồ cấu trúc thư mục
  adrs?: ADR[]                          // Danh sách ADR của repository
  buildTimestamp: ISO8601               // Thời điểm build context
}
```

### 7.2 RuntimeContext — Context đầy đủ trong quá trình thực thi

```typescript
interface RuntimeContext extends RepositoryContext {
  taskContext: TaskContext               // Context của task hiện tại
  budget: BudgetAllocation              // Phân bổ token budget
  rankedRules: Rule[]                   // Rules đã sắp xếp theo priority
  relevantKnowledge: Knowledge[]        // Knowledge liên quan đến task
  activeWorkflow?: Workflow             // Workflow đang thực thi (nếu có)
  availableCapabilities: CapabilityId[] // Danh sách capability khả dụng
}
```

### 7.3 TaskContext — Context của task

```typescript
interface TaskContext {
  taskType?: string          // Loại task (e.g., "code_review", "generate")
  workingDirectory?: string  // Thư mục làm việc của task
  tags?: string[]            // Nhãn phân loại task
}
```

### 7.4 BudgetAllocation — Phân bổ token budget

```typescript
interface BudgetAllocation {
  totalTokens: number   // Tổng token cho phép
  allocated: {
    rules:     number   // Token dành cho rules
    knowledge: number   // Token dành cho knowledge
    prompts:   number   // Token dành cho prompts
    workflows: number   // Token dành cho workflows
    metadata:  number   // Token dành cho metadata
  }
  remaining: number     // Token còn lại chưa phân bổ
}
```

---

## 8. Task & Execution Models

### 8.1 TaskRequest — Yêu cầu thực thi task

```typescript
interface TaskRequest {
  taskId?: string                      // ID tùy chọn, tự sinh nếu không cung cấp
  taskType?: string                    // Loại task
  description: string                  // Mô tả task (bắt buộc)
  workingDirectory?: string            // Thư mục làm việc
  workflowId?: string                  // ID workflow cần thực thi
  parameters?: Record<string, unknown> // Tham số bổ sung
  tags?: string[]                      // Nhãn phân loại
  priority?: 'high' | 'normal' | 'low' // Độ ưu tiên
}
```

### 8.2 TaskStatus — Trạng thái task

```typescript
enum TaskStatus {
  CREATED   = 'CREATED',   // Task vừa được tạo
  PLANNING  = 'PLANNING',  // Đang lập kế hoạch thực thi
  RUNNING   = 'RUNNING',   // Đang thực thi
  VERIFYING = 'VERIFYING', // Đang xác minh kết quả
  COMPLETED = 'COMPLETED', // Hoàn thành thành công
  FAILED    = 'FAILED',    // Thất bại
  CANCELLED = 'CANCELLED'  // Đã hủy
}
```

### 8.3 TaskState — Trạng thái runtime của task

```typescript
interface TaskState {
  taskId: string           // Định danh task
  status: TaskStatus       // Trạng thái hiện tại
  createdAt: ISO8601       // Thời điểm tạo
  startedAt?: ISO8601      // Thời điểm bắt đầu chạy
  completedAt?: ISO8601    // Thời điểm hoàn thành
  currentStep: number      // Bước đang thực thi
  totalSteps: number       // Tổng số bước
  retryCount: number       // Số lần đã retry
  lastError?: HarnessError // Lỗi gần nhất nếu có
}
```

### 8.4 ExecutionPlan — Kế hoạch thực thi

```typescript
interface ExecutionPlan {
  planId: string           // Định danh plan
  taskId: string           // Task tương ứng
  steps: ExecutionStep[]   // Danh sách bước thực thi
  workflow?: Workflow      // Workflow liên kết (nếu có)
}
```

### 8.5 ExecutionStep — Một bước thực thi

```typescript
interface ExecutionStep {
  stepId: string               // Định danh bước
  order: number                // Thứ tự thực thi
  capabilityId: CapabilityId   // Capability được gọi
  input: unknown               // Tham số đầu vào
  dependsOn?: string[]         // Các step phải hoàn thành trước
  retryPolicy?: RetryPolicy    // Chính sách retry
  timeout?: Duration           // Timeout (ms)
}
```

### 8.6 ExecutionResult — Kết quả thực thi

```typescript
interface ExecutionResult {
  taskId: string                 // Task tương ứng
  status: TaskStatus             // Trạng thái cuối
  results: CapabilityResult[]    // Kết quả từng capability
  startedAt: ISO8601             // Thời điểm bắt đầu
  completedAt: ISO8601           // Thời điểm kết thúc
  durationMs: number             // Thời gian thực thi (ms)
  error?: HarnessError           // Lỗi nếu thất bại
}
```

### 8.7 RetryPolicy — Chính sách retry

```typescript
interface RetryPolicy {
  maxAttempts: number                              // Số lần thử tối đa
  backoffStrategy: 'none' | 'linear' | 'exponential' // Chiến lược chờ giữa lần retry
  backoffBaseMs: number                            // Thời gian chờ cơ sở (ms)
  retryOn?: string[]                               // Chỉ retry khi gặp các error code này
  noRetryOn?: string[]                             // Không retry khi gặp các error code này
}
```

---


## 9. Capability Models

### 9.1 CapabilityInput — Đầu vào của capability

```typescript
interface CapabilityInput {
  [key: string]: unknown  // Tham số động, được validate bởi inputSchema
}
```

### 9.2 CapabilityResult — Kết quả trả về từ capability

```typescript
interface CapabilityResult {
  capabilityId: CapabilityId  // ID capability đã thực thi
  success: boolean            // Thành công hay không
  output?: unknown            // Kết quả đầu ra nếu thành công
  error?: HarnessError        // Thông tin lỗi nếu thất bại
  durationMs: number          // Thời gian thực thi (ms)
}
```

### 9.3 CapabilityErrorCode — Mã lỗi của capability

```typescript
interface CapabilityErrorCode {
  code: string        // Mã lỗi (e.g., "CAP_TIMEOUT")
  description: string // Mô tả lỗi
  retryable: boolean  // Có thể retry không
}
```

### 9.4 Permission — Quyền hạn yêu cầu

```typescript
enum Permission {
  READ_FILE        = 'read_file',
  WRITE_FILE       = 'write_file',
  EXECUTE_COMMAND  = 'execute_command',
  NETWORK_ACCESS   = 'network_access',
  GIT_WRITE        = 'git_write'
}
```

---

## 10. Governance Models

### 10.1 ProposalStatus — Trạng thái proposal

```typescript
enum ProposalStatus {
  DRAFT     = 'DRAFT',      // Bản nháp chưa submit
  SUBMITTED = 'SUBMITTED',  // Đã submit, chờ review
  REVIEWING = 'REVIEWING',  // Đang được review
  APPROVED  = 'APPROVED',   // Đã được phê duyệt
  REJECTED  = 'REJECTED',   // Bị từ chối
  PROMOTED  = 'PROMOTED',   // Đã được promote lên shared
  CANCELLED = 'CANCELLED'   // Đã hủy
}
```

### 10.2 ProposalType — Loại proposal

```typescript
enum ProposalType {
  NEW_ASSET        = 'new_asset',        // Đề xuất tạo asset mới
  UPDATE_ASSET     = 'update_asset',     // Đề xuất cập nhật asset
  DELETE_ASSET     = 'delete_asset',     // Đề xuất xóa asset
  PROMOTE_TO_SHARED = 'promote_to_shared' // Đề xuất nâng cấp từ local lên shared
}
```

### 10.3 Proposal — Đề xuất thay đổi

```typescript
interface Proposal {
  id: ProposalId             // Định danh dạng "PROP-YYYY-MM-DD-NNN"
  title: string              // Tiêu đề ngắn gọn
  description: string        // Mô tả chi tiết
  type: ProposalType         // Loại proposal
  status: ProposalStatus     // Trạng thái hiện tại
  targetAsset?: AssetId      // Asset bị ảnh hưởng (nếu có)
  proposedContent: string    // Nội dung đề xuất
  rationale: string          // Lý do đề xuất
  evidence: Evidence[]       // Bằng chứng hỗ trợ
  author: string             // Người tạo proposal
  reviewers: string[]        // Danh sách reviewer
  createdAt: ISO8601         // Thời điểm tạo
  updatedAt: ISO8601         // Thời điểm cập nhật
  reviewedAt?: ISO8601       // Thời điểm review xong
  approvedAt?: ISO8601       // Thời điểm được approve
  promotedAt?: ISO8601       // Thời điểm được promote
  comments: Comment[]        // Danh sách nhận xét
  tags: string[]             // Nhãn phân loại
}
```

### 10.4 Evidence — Bằng chứng hỗ trợ proposal

```typescript
interface Evidence {
  id: string          // Định danh bằng chứng
  type: 'execution_log' | 'test_result' | 'code_change' | 'human_observation'
  source: string      // Nguồn gốc (file path, URL, ...)
  content: string     // Nội dung bằng chứng
  timestamp: ISO8601  // Thời điểm thu thập
}
```

### 10.5 Comment — Nhận xét trong proposal

```typescript
interface Comment {
  id: string          // Định danh comment
  author: string      // Người viết
  content: string     // Nội dung nhận xét
  timestamp: ISO8601  // Thời điểm viết
}
```

### 10.6 AuditRecord — Bản ghi kiểm toán

```typescript
interface AuditRecord {
  id: string                       // Định danh bản ghi
  timestamp: ISO8601               // Thời điểm ghi
  action: string                   // Hành động được thực hiện
  actor: string                    // Người/system thực hiện
  proposalId: string               // Proposal liên quan
  previousStatus?: ProposalStatus  // Trạng thái trước
  newStatus?: ProposalStatus       // Trạng thái sau
  details: string                  // Chi tiết bổ sung
}
```

---

## 11. ADR Model

### 11.1 ADR — Architecture Decision Record

```typescript
interface ADR {
  id: string          // Định dạng "ADR-NNN" (e.g., "ADR-001")
  title: string       // Tiêu đề quyết định
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  context: string     // Bối cảnh và vấn đề dẫn đến quyết định
  decision: string    // Quyết định được đưa ra
  rationale: string   // Lý do chọn quyết định này
  consequences: string // Hệ quả và ảnh hưởng
  alternatives?: string // Các lựa chọn thay thế đã xem xét
  createdAt: ISO8601  // Thời điểm tạo
  updatedAt: ISO8601  // Thời điểm cập nhật
  supersededBy?: string // ID ADR thay thế nếu bị superseded
}
```

---


## 12. Error Model

### 12.1 HarnessError — Cấu trúc lỗi chuẩn

```typescript
interface HarnessError {
  code: string         // Mã lỗi dạng "DOMAIN_NNN" (e.g., "REPO_001")
  domain: ErrorDomain  // Domain phát sinh lỗi
  message: string      // Thông báo lỗi cho người đọc
  details?: unknown    // Chi tiết bổ sung (stack trace, context, ...)
  retryable: boolean   // Có thể retry operation không
  timestamp: ISO8601   // Thời điểm lỗi xảy ra
}
```

### 12.2 ErrorDomain — Domain phát sinh lỗi

```typescript
enum ErrorDomain {
  REPOSITORY  = 'REPOSITORY',  // Lỗi liên quan đến repository
  CONTEXT     = 'CONTEXT',     // Lỗi khi build/load context
  EXECUTION   = 'EXECUTION',   // Lỗi trong quá trình thực thi
  CAPABILITY  = 'CAPABILITY',  // Lỗi từ capability
  GOVERNANCE  = 'GOVERNANCE',  // Lỗi trong quy trình governance
  PLATFORM    = 'PLATFORM',    // Lỗi nền tảng hệ thống
  MANIFEST    = 'MANIFEST'     // Lỗi parse/validate manifest
}
```

**Quy ước đặt mã lỗi:**

| Domain | Prefix | Ví dụ |
|--------|--------|-------|
| REPOSITORY | REPO | REPO_001, REPO_002 |
| CONTEXT | CTX | CTX_001 |
| EXECUTION | EXEC | EXEC_001 |
| CAPABILITY | CAP | CAP_001 |
| GOVERNANCE | GOV | GOV_001 |
| PLATFORM | PLAT | PLAT_001 |
| MANIFEST | MAN | MAN_001 |

---

## 13. Platform & Installation Models

### 13.1 InstalledMetadata — Metadata cài đặt hệ thống

```typescript
interface InstalledMetadata {
  version: SemVer               // Phiên bản harness đã cài đặt
  source: string                // Nguồn cài đặt (URL, registry, ...)
  installedAt: ISO8601          // Thời điểm cài đặt
  checksum: string              // Checksum để xác minh tính toàn vẹn
  specificationVersion: string  // Phiên bản specification tương thích
}
```

### 13.2 DiagnosticReport — Báo cáo chẩn đoán hệ thống

```typescript
interface DiagnosticReport {
  timestamp: ISO8601                      // Thời điểm chạy chẩn đoán
  overall: 'healthy' | 'warning' | 'critical' // Tình trạng tổng thể
  checks: DiagnosticCheck[]              // Chi tiết từng kiểm tra
}

interface DiagnosticCheck {
  name: string          // Tên kiểm tra (e.g., "manifest_valid")
  status: 'pass' | 'warn' | 'fail' // Kết quả
  message: string       // Mô tả kết quả
  remediation?: string  // Hướng dẫn khắc phục nếu fail/warn
}
```

### 13.3 ValidationResult — Kết quả validation

```typescript
interface ValidationResult {
  valid: boolean           // Hợp lệ hay không
  errors: HarnessError[]   // Danh sách lỗi (nếu có)
  warnings: string[]       // Danh sách cảnh báo (nếu có)
}
```

### 13.4 Platform Operation Models

```typescript
interface InstallResult {
  success: boolean
  installedVersion: SemVer
  path: string
  error?: HarnessError
}

interface UpdateResult {
  success: boolean
  fromVersion: SemVer
  toVersion: SemVer
  error?: HarnessError
}

interface SyncResult {
  success: boolean
  syncedAssets: number
  error?: HarnessError
}

interface PublishResult {
  success: boolean
  proposalId?: ProposalId
  publishedUrl?: string
  error?: HarnessError
}

interface PlatformStatus {
  status: 'active' | 'offline' | 'degraded'
  version: SemVer
  uptimeMs: number
}

interface UpdateConfig {
  targetVersion?: SemVer
  force?: boolean
}

interface SyncConfig {
  targetBranch?: string
  dryRun?: boolean
}

interface PublishRequest {
  assetIds: AssetId[]
  commitMessage: string
}
```

---

## 14. Cross References

Bảng tham chiếu chéo giữa các data model và các document liên quan:

| Model / Type | Sử dụng trong | Document tham chiếu |
|---|---|---|
| `Manifest` | Repository loading, agent bootstrap | `01_OVERVIEW.md`, `03_ARCHITECTURE.md` |
| `AssetCollection` / `EffectiveAssetCollection` | Context build, rule ranking | `04_CONTEXT_SYSTEM.md` |
| `RepositoryContext` / `RuntimeContext` | Agent runtime, capability execution | `04_CONTEXT_SYSTEM.md`, `06_CAPABILITIES.md` |
| `Rule`, `AssetPriority` | Rule ranking, context trimming | `05_RULES_SYSTEM.md` |
| `Workflow`, `WorkflowStep` | Workflow execution | `07_WORKFLOWS.md` |
| `Hook`, `HookEvent` | Pre/post execution hooks | `08_HOOKS.md` |
| `Proposal`, `ProposalStatus` | Governance workflow | `09_GOVERNANCE.md` |
| `AuditRecord` | Audit trail | `09_GOVERNANCE.md` |
| `TaskRequest`, `TaskState`, `ExecutionPlan` | Task lifecycle | `06_CAPABILITIES.md` |
| `HarnessError`, `ErrorDomain` | Error handling toàn hệ thống | `10_ERROR_HANDLING.md` |
| `ADR` | Kiến trúc quyết định | `adrs/` directory |
| `DiagnosticReport`, `ValidationResult` | Platform health check | `02_INSTALLATION.md` |
| `BudgetAllocation` | Token budget management | `04_CONTEXT_SYSTEM.md` |
| `Permission` | Security & capability access control | `06_CAPABILITIES.md` |
| `InstalledMetadata` | Installation verification | `02_INSTALLATION.md` |

### Dependency Graph (đơn giản hóa)

```
Primitives (Section 2)
    └──> Enums (Section 3)
            └──> AssetMetadata → Asset → Rule/Prompt/Template/Workflow/Knowledge/Hook/CapabilityDefinition (Section 4)
                    └──> AssetCollection → EffectiveAssetCollection (Section 5)
                            └──> RepositoryContext → RuntimeContext (Section 7)
                                    └──> TaskRequest → ExecutionPlan → ExecutionResult (Section 8)
                                                └──> CapabilityResult (Section 9)
HarnessError (Section 12) ←── được tham chiếu bởi hầu hết các model trên
Proposal → Evidence → AuditRecord (Section 10) — governance lifecycle
ADR (Section 11) — kiến trúc quyết định độc lập
```

---

*Tài liệu này được duy trì bởi team Harness Operator. Mọi thay đổi phải được review và approve trước khi merge.*
