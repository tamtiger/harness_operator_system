# M6 — Platform Orchestration

**Milestone:** M6  
**Effort:** 3 ngày  
**Prerequisite:** M5  
**Spec:** `09_PLATFORM_SPECIFICATION.md`

---

## Objective

Implement Control Plane — wire tất cả domains, implement install/update/sync/publish/doctor. Sau milestone này `harness run` chạy full pipeline và `harness doctor` hoạt động.

---

## Vertical Slice

```bash
# Full run pipeline
harness run "create a README.md with project description"
# Output: full orchestration log + result

# Health check
harness doctor
# Output:
# ✓ shared_installed     Shared Harness v2.1.0 found
# ✓ shared_checksum      Integrity check passed
# ✓ local_manifest       harness.yaml valid
# ✓ agents_md            AGENTS.md found
# ✓ asset_ids_unique     No duplicate IDs
# ✓ capability_registry  27 capabilities available
# Overall: healthy
```

---

## Package Structure

```
src/platform/
  install/
    SharedHarnessInstaller.ts   ← T6.1
  update/
    SharedHarnessUpdater.ts     ← T6.2
  sync/
    SharedHarnessSynchronizer.ts ← T6.3
  publish/
    AssetPublisher.ts           ← T6.4
  doctor/
    DiagnosticsEngine.ts        ← T6.5
  orchestration/
    PlatformOrchestrator.ts     ← T6.6
  service.ts                   ← T6.7
```

---

## Tasks

### T6.1 — Shared Harness Installer

**File:** `src/platform/install/SharedHarnessInstaller.ts`

```typescript
export class SharedHarnessInstaller {
  async install(config: InstallConfig): Promise<InstallResult>
}
```

Flow (từ `09_PLATFORM_SPECIFICATION.md §5`):
1. Validate config: `source` URI required, `version` optional
2. Throw `pltError('PLT_001')` nếu source unreachable (với retry)
3. Download package → throw `pltError('PLT_007')` on network error
4. Compute SHA-256 checksum của download
5. Verify checksum → throw `pltError('PLT_002')` nếu mismatch
6. Check `targetPath` writable → throw `pltError('PLT_003')` nếu không
7. Unpack vào `{targetPath}/shared/`
8. Write `{targetPath}/metadata/installed.yaml`
9. Write `{targetPath}/metadata/checksum.yaml`
10. Run `doctor()` → return với status

`installed.yaml` content:
```yaml
version: "2.1.0"
source: "https://github.com/my-org/shared-harness.git"
installedAt: "2026-07-11T16:58:00Z"
checksum: "sha256:abc123..."
specificationVersion: "4.0"
```

---

### T6.2 — Shared Harness Updater

**File:** `src/platform/update/SharedHarnessUpdater.ts`

```typescript
export class SharedHarnessUpdater {
  async update(config: UpdateConfig): Promise<UpdateResult>
}
```

Flow:
1. Read `installed.yaml` → get current version
2. Fetch version info từ source
3. If `current === latest` → return `{ status: 'up_to_date' }`
4. Download new version
5. Backup current: rename `shared/` → `shared.bak/`
6. Unpack mới vào `shared/`
7. Update `installed.yaml` + `checksum.yaml`
8. Run `doctor()` → if fail: restore backup, throw
9. Remove backup, return `{ status: 'updated', from, to }`

---

### T6.3 — Sync

```typescript
export class SharedHarnessSynchronizer {
  async sync(config: SyncConfig): Promise<SyncResult>
}
```

Sync (incremental, không thay đổi version):
1. Check remote cho changes since installed version
2. If none → return `{ status: 'no_changes' }`
3. Apply incremental changes (chỉ update changed files)
4. Recompute + update `checksum.yaml`
5. Invalidate Context Cache: `contextService.invalidateCache(key)`
6. Return `{ status: 'synced', filesUpdated: number }`

---

### T6.4 — Asset Publisher

```typescript
export class AssetPublisher {
  async publish(request: PublishRequest): Promise<PublishResult>
}
```

Flow:
1. `governance.listProposals({ status: ProposalStatus.PROMOTED })`
2. Nếu rỗng → return `{ status: 'nothing_to_publish' }`
3. Với mỗi promoted proposal:
   a. Đọc promoted asset content
   b. Package as diff/commit
   c. Push lên Harness Repository via `harness.git.commit` capability
   d. Log audit record
4. Return `{ published: AssetId[], failedCount: number }`

---

### T6.5 — Diagnostics Engine

**File:** `src/platform/doctor/DiagnosticsEngine.ts`

```typescript
export class DiagnosticsEngine {
  async runChecks(): Promise<DiagnosticReport>
}
```

6 checks (từ `09_PLATFORM_SPECIFICATION.md §9`):

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| `shared_installed` | `~/.harness/shared/` exists | fail |
| `shared_checksum` | all checksums match | fail |
| `local_manifest` | harness.yaml valid | fail |
| `agents_md` | AGENTS.md exists at root | fail |
| `asset_ids_unique` | 0 duplicate IDs | fail |
| `capability_registry` | all manifest capabilities registered | warn |

Overall: `critical` nếu có fail, `warning` nếu có warn, `healthy` nếu tất cả pass.

---

### T6.6 — Platform Orchestrator

**File:** `src/platform/orchestration/PlatformOrchestrator.ts`

```typescript
export class PlatformOrchestrator {
  constructor(
    private repo: RepositoryService,
    private ctx: ContextService,
    private exec: ExecutionService,
    private gov: GovernanceService,
    private registry: CapabilityRegistry,
    private installer: SharedHarnessInstaller,
    private updater: SharedHarnessUpdater,
    private sync: SharedHarnessSynchronizer,
    private publisher: AssetPublisher,
    private doctor: DiagnosticsEngine,
  ) {}

  async run(request: TaskRequest): Promise<ExecutionResult> {
    // 10-step pipeline (09_PLATFORM_SPECIFICATION.md §4):
    const root = this.repo.discover(process.cwd())
    const manifest = this.repo.loadManifest(root)
    const sharedPath = getDefaultSharedPath()
    const shared = this.repo.loadSharedAssets(sharedPath)
    const local = this.repo.loadLocalAssets(root, manifest)
    const assets = this.repo.resolveAssets(shared, local)
    const metadata: RepositoryMetadata = { root, manifest }
    const repoCtx = this.repo.buildContext(assets, metadata)
    const runtimeCtx = this.ctx.buildRuntimeContext(repoCtx, request)
    return this.exec.execute(runtimeCtx, request)
  }
}
```

Platform không chứa business logic — chỉ delegation theo thứ tự.

---

### T6.7 — Platform Service

**File:** `src/platform/service.ts`

```typescript
export class PlatformServiceImpl implements PlatformService {
  constructor(private orchestrator: PlatformOrchestrator) {}

  run(request) { return this.orchestrator.run(request) }
  install(config) { return this.orchestrator.installer.install(config) }
  update(config) { return this.orchestrator.updater.update(config) }
  sync(config) { return this.orchestrator.sync.sync(config) }
  publish(req) { return this.orchestrator.publisher.publish(req) }
  doctor() { return this.orchestrator.doctor.runChecks() }
  validate(root) { return this.repo.validate(root) }
  submitProposal(req) { return this.orchestrator.gov.submitProposal(req) }
  listProposals(f) { return this.orchestrator.gov.listProposals(f) }
  approveProposal(id, r) { return this.orchestrator.gov.approve(id, r, '') }
  status() { /* aggregate status from all domains */ }
}
```

---

## Acceptance Scenarios — M6

**Scenario 1 — Full run:**
```bash
harness run "search for TODO comments in src/"
# Expected: COMPLETED, list of TODO locations
```

**Scenario 2 — doctor healthy:**
```bash
harness doctor
# Expected: all 6 checks pass, overall: healthy, exit 0
```

**Scenario 3 — doctor critical:**
```bash
# Remove shared harness
harness doctor
# Expected: shared_installed FAIL, overall: critical, exit 2
```

**Scenario 4 — install + doctor:**
```bash
harness install --source https://github.com/org/shared --version v2.0.0
harness doctor
# Expected: all pass after install
```

---

## Unit Tests — M6

| Test | Expected |
|------|----------|
| `run()` 10 steps executed in order | verified by mock call order |
| `run()` domain error propagates | PLT_005 wraps domain error |
| `doctor()` all pass | overall = 'healthy' |
| `doctor()` shared_installed fail | overall = 'critical' |
| `doctor()` capability warn | overall = 'warning' |
| `install()` source unreachable | throw PLT_001 |
| `install()` checksum fail | throw PLT_002 |
| `update()` already up-to-date | status = 'up_to_date' |
| `update()` rollback on doctor fail | backup restored |
| Platform không chứa business logic | no logic in service.ts beyond delegation |

---

## Definition of Done — M6

- [ ] `run()` pipeline đúng 10 bước, đúng thứ tự
- [ ] `doctor()` 6 checks, correct overall status
- [ ] `install()` + `update()` + `sync()` hoạt động
- [ ] Error codes PLT_001–008 có test
- [ ] Platform không import `capability` trực tiếp
- [ ] `harness run` + `harness doctor` pass end-to-end
- [ ] dependency-cruiser: `platform` không import `capability`

## Review Gate — M6

```
AI self-review: run() pipeline đúng 10 bước, platform không có business logic
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Unit + integration tests pass
      ↓
Human review
      ↓
Merge to main
```
