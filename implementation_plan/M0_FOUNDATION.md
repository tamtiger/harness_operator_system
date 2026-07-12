# M0 — Foundation

**Milestone:** M0  
**Effort:** 2 ngày  
**Prerequisite:** Không có  
**Spec:** `11_DATA_MODELS.md`, `14_ERROR_MODEL.md`, `03_SYSTEM_ARCHITECTURE.md §9`

---

## Objective

Ổn định toàn bộ contracts — types, interfaces, error model, ID conventions — **trước khi bất kỳ domain nào được implement**.

Đây là milestone duy nhất mà Human **phải review và approve** trước khi tiếp tục. Nếu interface sai ở đây, refactor sẽ lan toàn bộ dự án.

---

## Vertical Slice

Sau M0, không có gì chạy được cả — đây là trade-off có chủ ý.

Deliverable duy nhất: **`tsc --noEmit` pass trên toàn bộ shared package**, mọi interface mock được compile.

---

## Package Structure

```
src/shared/
  types/
    primitives.ts       ← T0.1
    enums.ts            ← T0.2
    assets.ts           ← T0.3
    repository.ts       ← T0.4
    execution.ts        ← T0.5
    capability.ts       ← T0.5
    governance.ts       ← T0.6
    platform.ts         ← T0.6
  contracts/
    services.ts         ← T0.7  ★ quan trọng nhất
  errors/
    HarnessError.ts     ← T0.8
    factories.ts        ← T0.8
  utils/
    path.ts             ← T0.9
    date.ts             ← T0.9
    id.ts               ← T0.9
    semver.ts           ← T0.9
  index.ts              ← T0.10
```

---

## Tasks

### T0.1 — Core Primitives

**File:** `src/shared/types/primitives.ts`

```typescript
export type RepositoryRoot = string   // absolute path
export type RelativePath = string     // relative to RepositoryRoot
export type SemVer = string           // "X.Y.Z"
export type ISO8601 = string          // "2026-07-11T16:58:00Z"
export type CapabilityId = string     // "namespace.name"
export type AssetId = string          // "{scope}.{type}.{id}"
export type ProposalId = string       // "PROP-YYYY-MM-DD-NNN"
export type Duration = number         // milliseconds
export type JSONSchema = object       // JSON Schema draft-07
export type CacheKey = string
```

---

### T0.2 — Enums

**File:** `src/shared/types/enums.ts`

Implement đầy đủ từ `11_DATA_MODELS.md §3`:

- `AssetType`: rule, prompt, template, workflow, knowledge, hook, capability
- `AssetScope`: shared, local
- `AssetStatus`: draft, review, approved, published, deprecated, retired
- `AssetPriority`: critical, high, medium, low
- `TaskStatus`: CREATED, PLANNING, RUNNING, VERIFYING, COMPLETED, FAILED, CANCELLED
- `ProposalStatus`: DRAFT, SUBMITTED, REVIEWING, APPROVED, REJECTED, PROMOTED, CANCELLED
- `ProposalType`: new_asset, update_asset, delete_asset, promote_to_shared
- `HookEvent`: pre_execution, post_execution, pre_commit, post_commit
- `Permission`: read_file, write_file, delete_file, execute_command, network_access, git_read, git_write, harness_read, harness_write, proposal_create, proposal_approve
- `ErrorDomain`: REPOSITORY, CONTEXT, EXECUTION, CAPABILITY, GOVERNANCE, PLATFORM, MANIFEST

---

### T0.3 — Asset Interfaces

**File:** `src/shared/types/assets.ts`

Implement từ `11_DATA_MODELS.md §4–5`:

```typescript
interface AssetMetadata {
  id: string
  type: AssetType
  version: SemVer
  name: string
  description?: string
  scope: AssetScope
  source: RelativePath
  createdAt: ISO8601
  updatedAt: ISO8601
  tags?: string[]
  deprecated?: boolean
  supersededBy?: AssetId
}

interface Asset { metadata: AssetMetadata; content: string }

// Subtypes: Rule (+ priority, scopePaths), Prompt (+ modelHints, tokenEstimate),
// Template (+ artifactType, variables), Workflow (+ steps, triggers),
// Knowledge (+ domain, confidence), Hook (+ triggerEvent, order, capabilityId),
// CapabilityDefinition (+ capabilityId, inputSchema, outputSchema, permissions, timeout, idempotent)

interface AssetCollection {
  rules: Rule[]; prompts: Prompt[]; templates: Template[]
  workflows: Workflow[]; knowledge: Knowledge[]
  hooks: Hook[]; capabilities: CapabilityDefinition[]
}
type EffectiveAssetCollection = Readonly<AssetCollection>
```

---

### T0.4 — Repository & Context Models

**File:** `src/shared/types/repository.ts`

Implement từ `11_DATA_MODELS.md §6–7`:

```typescript
// Manifest và sub-configs: RepositoryConfig, AgentConfig, ContextConfig,
// SourceConfig, CapabilityConfig, ArtifactConfig, GovernanceConfig

interface RepositoryMetadata {
  root: RepositoryRoot; name?: string; manifest: Manifest
  gitBranch?: string; gitCommit?: string
}

interface RepositoryContext {
  metadata: RepositoryMetadata
  assets: EffectiveAssetCollection
  repositoryMap?: string
  adrs?: ADR[]
  buildTimestamp: ISO8601
}

interface RuntimeContext extends RepositoryContext {
  taskContext: TaskContext
  budget: BudgetAllocation
  rankedRules: Rule[]
  relevantKnowledge: Knowledge[]
  activeWorkflow?: Workflow
  availableCapabilities: CapabilityId[]
}
```

---

### T0.5 — Execution & Capability Models

**Files:** `src/shared/types/execution.ts`, `src/shared/types/capability.ts`

Implement từ `11_DATA_MODELS.md §8–9`:

```typescript
// execution.ts
interface TaskRequest { taskId?: string; description: string; workflowId?: string; ... }
interface TaskState { taskId: string; status: TaskStatus; createdAt: ISO8601; ... }
interface ExecutionPlan { planId: string; taskId: string; steps: ExecutionStep[] }
interface ExecutionStep { stepId: string; order: number; capabilityId: CapabilityId; input: unknown; dependsOn?: string[]; retryPolicy?: RetryPolicy; timeout?: Duration }
interface ExecutionResult { taskId: string; status: TaskStatus; results: CapabilityResult[]; ... }
interface RetryPolicy { maxAttempts: number; backoffStrategy: 'none'|'linear'|'exponential'; backoffBaseMs: number; retryOn?: string[]; noRetryOn?: string[] }
interface CancelResult { taskId: string; status: 'CANCELLED'; cancelledAt: ISO8601 }

// capability.ts
interface CapabilityResult { capabilityId: CapabilityId; success: boolean; output?: unknown; error?: HarnessError; durationMs: number }
```

---

### T0.6 — Governance & Platform Models

**Files:** `src/shared/types/governance.ts`, `src/shared/types/platform.ts`

Từ `11_DATA_MODELS.md §10–13`:

```typescript
// governance.ts
interface Proposal { id: ProposalId; title: string; type: ProposalType; status: ProposalStatus; evidence: Evidence[]; ... }
interface Evidence { id: string; type: 'execution_log'|'test_result'|'code_change'|'human_observation'; source: string; content: string; timestamp: ISO8601 }
interface AuditRecord { id: string; timestamp: ISO8601; action: string; actor: string; proposalId: string; previousStatus?: ProposalStatus; newStatus?: ProposalStatus; details: string }
interface ADR { id: string; title: string; status: 'proposed'|'accepted'|'deprecated'|'superseded'; context: string; decision: string; rationale: string; consequences: string }

// platform.ts
interface DiagnosticCheck { name: string; status: 'pass'|'warn'|'fail'; message: string; remediation?: string }
interface DiagnosticReport { timestamp: ISO8601; overall: 'healthy'|'warning'|'critical'; checks: DiagnosticCheck[] }
interface ValidationResult { valid: boolean; errors: HarnessError[]; warnings: string[] }
interface InstalledMetadata { version: SemVer; source: string; installedAt: ISO8601; checksum: string; specificationVersion: string }
interface InstallConfig { source: string; version?: string; targetPath?: string; verifyChecksum?: boolean }
interface ProposalRequest { title: string; description: string; type: ProposalType; rationale: string; evidence: Evidence[]; proposedContent: string; targetAsset?: AssetId }
interface ProposalFilter { status?: ProposalStatus; type?: ProposalType; author?: string }
interface PromotionResult { proposalId: ProposalId; promotedAssetPath: RelativePath; promotedAt: ISO8601 }
```

---

### T0.7 — Domain Service Interfaces ★

**File:** `src/shared/contracts/services.ts`

Đây là file quan trọng nhất M0. Phải được Human approve trước khi bắt đầu M1.

```typescript
export interface RepositoryService {
  discover(workingDir: string): RepositoryRoot
  loadManifest(root: RepositoryRoot): Manifest
  loadSharedAssets(sharedPath: string): AssetCollection
  loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection
  resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection
  buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext
  persist(root: RepositoryRoot, path: RelativePath, data: string): void
  validate(root: RepositoryRoot): ValidationResult
}

export interface ContextService {
  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext
  invalidateCache(key: CacheKey): void
}

export interface ExecutionService {
  execute(context: RuntimeContext, request: TaskRequest): Promise<ExecutionResult>
  cancel(taskId: string): Promise<CancelResult>
  getStatus(taskId: string): TaskState
}

export interface CapabilityRegistry {
  register(def: CapabilityDefinition, impl: CapabilityImpl): void
  unregister(id: CapabilityId): void
  resolve(id: CapabilityId): CapabilityImpl
  invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult>
  list(): CapabilityDefinition[]
  isRegistered(id: CapabilityId): boolean
}

export interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>
}

export interface GovernanceService {
  submitProposal(request: ProposalRequest): Proposal
  listProposals(filter: ProposalFilter): Proposal[]
  getProposal(id: ProposalId): Proposal
  review(id: ProposalId, reviewer: string): Proposal
  approve(id: ProposalId, reviewer: string, comments: string): Proposal
  reject(id: ProposalId, reviewer: string, comments: string): Proposal
  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal
  promote(id: ProposalId): PromotionResult
  getAuditLog(proposalId: ProposalId): AuditRecord[]
}

export interface PlatformService {
  run(request: TaskRequest): Promise<ExecutionResult>
  install(config: InstallConfig): Promise<InstallResult>
  update(config: UpdateConfig): Promise<UpdateResult>
  sync(config: SyncConfig): Promise<SyncResult>
  publish(request: PublishRequest): Promise<PublishResult>
  doctor(): Promise<DiagnosticReport>
  validate(root: string): Promise<ValidationResult>
  status(): Promise<PlatformStatus>
  submitProposal(request: ProposalRequest): Promise<Proposal>
  listProposals(filter: ProposalFilter): Promise<Proposal[]>
  approveProposal(id: ProposalId, reviewer: string): Promise<Proposal>
}
```

---

### T0.8 — Error Model

**Files:** `src/shared/errors/HarnessError.ts`, `src/shared/errors/factories.ts`

`HarnessError.ts`:
```typescript
export class HarnessError extends Error {
  readonly timestamp: ISO8601
  constructor(
    public readonly code: string,
    public readonly domain: ErrorDomain,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'HarnessError'
    this.timestamp = new Date().toISOString()
  }
}
```

`factories.ts` — typed factory per domain:
```typescript
// Error message map lấy từ 14_ERROR_MODEL.md
const REPO_ERRORS = {
  REPO_001: { message: 'Repository root not found', retryable: false },
  REPO_002: { message: 'harness.yaml not found', retryable: false },
  // ... REPO_003 đến REPO_015
}

export function repoError(
  code: keyof typeof REPO_ERRORS,
  details?: unknown
): HarnessError {
  const e = REPO_ERRORS[code]
  return new HarnessError(code, ErrorDomain.REPOSITORY, e.message, e.retryable, details)
}
// Tương tự: mftError, ctxError, execError, capError, govError, pltError
```

---

### T0.9 — Shared Utilities

**File:** `src/shared/utils/path.ts`
```typescript
export function isWithinBoundary(base: string, target: string): boolean
// resolve canonical paths, return false nếu target không nằm trong base
// block: "../", absolute paths khác base, symlinks ra ngoài
```

**File:** `src/shared/utils/id.ts`
```typescript
export function generateProposalId(): ProposalId  // PROP-YYYY-MM-DD-NNN
export function validateCapabilityId(id: string): boolean  // must match /^\w+\.\w+$/
export function validateAssetId(id: string): boolean       // must match /^(shared|local)\.\w+\.\S+$/
```

**File:** `src/shared/utils/date.ts`
```typescript
export function nowISO8601(): ISO8601
export function diffMs(a: ISO8601, b: ISO8601): Duration
```

**File:** `src/shared/utils/semver.ts`
```typescript
export function compareSemVer(a: SemVer, b: SemVer): -1 | 0 | 1
export function isCompatible(required: SemVer, actual: SemVer): boolean
```

---

### T0.10 — Barrel Export

**File:** `src/shared/index.ts`

Export tất cả từ `types/`, `contracts/`, `errors/`, `utils/`.  
Mọi domain dùng: `import { ... } from '../shared'`.

---

## Unit Tests — M0

| Test | Expected |
|------|----------|
| `HarnessError` fields | code, domain, message, retryable, timestamp đều set |
| `repoError('REPO_001')` | code='REPO_001', domain=REPOSITORY, retryable=false |
| `repoError('REPO_015')` | retryable=true (atomic write) |
| `capError('CAP_005')` | retryable=true (timeout) |
| `isWithinBoundary('/p', '/p/../etc')` | false |
| `isWithinBoundary('/p', '/p/sub/file')` | true |
| `validateCapabilityId('harness.file.read')` | true |
| `validateCapabilityId('noDot')` | false |
| `validateCapabilityId('.leading')` | false |
| `generateProposalId()` | match `/^PROP-\d{4}-\d{2}-\d{2}-\d{3}$/` |
| Mock `RepositoryService` compiles | 0 TS errors |
| Mock `PlatformService` compiles | 0 TS errors |

---

## Acceptance Scenarios — M0

**Scenario A — Contract compilation check:**
```bash
tsc --noEmit
# Expected: exit 0, no errors
```

**Scenario B — Mock implementation compiles:**
```typescript
// Viết mock class implement từng interface trong services.ts
// Expected: tsc không báo lỗi
class MockRepositoryService implements RepositoryService { ... }
class MockPlatformService implements PlatformService { ... }
```

---

## Definition of Done — M0

- [ ] Tất cả types trong `11_DATA_MODELS.md` được implement
- [ ] 6 domain service interfaces đầy đủ trong `services.ts`
- [ ] 71 error codes có factory function với đúng message và retryable flag
- [ ] `tsc --noEmit` pass, 0 errors
- [ ] Mọi utility function có unit test pass
- [ ] Mock implementation của mỗi interface compile được
- [ ] Không có import nào trỏ ra ngoài `shared/`
- [ ] **Human review và approve `services.ts`** trước khi bắt đầu M1

## Review Gate — M0

```
AI self-review: interfaces đủ để implement tất cả 6 domains không?
      ↓
tsc --noEmit (0 errors)
      ↓
Unit tests pass
      ↓
★ Human review services.ts — approve interfaces trước khi M1 bắt đầu
      ↓
Merge to main
```
