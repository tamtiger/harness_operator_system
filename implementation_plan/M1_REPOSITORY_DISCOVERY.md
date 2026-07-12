# M1 — Repository Discovery

**Milestone:** M1  
**Effort:** 3 ngày  
**Prerequisite:** M0 (approved)  
**Spec:** `04_REPOSITORY_SPECIFICATION.md`, `10_MANIFEST_SPECIFICATION.md`, `12_FILESYSTEM_SPECIFICATION.md`

---

## Objective

Implement khả năng tìm repository, đọc và validate manifest. Sau milestone này có thể chạy `harness init` và `harness validate`.

---

## Vertical Slice

Sau M1, hai commands sau hoạt động được:

```bash
# Khởi tạo project mới
harness init
# Output: Tạo .harness/harness.yaml, .harness/rules/, AGENTS.md

# Validate cấu trúc repository
harness validate
# Output: ✓ AGENTS.md found / ✗ harness.yaml not found ...
```

Stack cho slice này:
```
CLI (init, validate)
      ↓
Platform (stub — chỉ delegate, không có logic)
      ↓
Repository (discovery + manifest + validation)
```

---

## Package Structure

```
src/repository/
  discovery/
    RepositoryDiscovery.ts
  manifest/
    ManifestLoader.ts
    ManifestValidator.ts
    manifest-schema.ts      ← zod schema
  validation/
    RepositoryValidator.ts
  service.ts                ← implements RepositoryService (partial)
```

---

## Tasks

### T1.1 — Repository Discovery

**File:** `src/repository/discovery/RepositoryDiscovery.ts`

```typescript
export class RepositoryDiscovery {
  discover(workingDir: string): RepositoryRoot
}
```

**Algorithm** (từ `04_REPOSITORY_SPECIFICATION.md §4`):
1. Start tại `workingDir`
2. Check `.harness/harness.yaml` exists → return as root
3. Traverse up: `path.dirname(current)`
4. Repeat đến khi `current === path.dirname(current)` (filesystem root)
5. Max 50 levels — không vô hạn
6. Not found → throw `repoError('REPO_001')`

Secondary signal: nếu `.git` tồn tại nhưng `.harness/` chưa có → suggest `harness init`.

---

### T1.2 — Manifest Schema

**File:** `src/repository/manifest/manifest-schema.ts`

Dùng `zod` để define schema từ `10_MANIFEST_SPECIFICATION.md §2`:

```typescript
export const ManifestSchema = z.object({
  version: z.literal(2),
  specification: z.literal('4.0'),
  repository: z.object({
    name: z.string().regex(/^[a-z0-9-]+$/).max(64).optional(),
    root: z.string(),
    description: z.string().optional(),
  }),
  agent: z.object({
    entry_point: z.string(),
    context: z.object({
      token_budget: z.number().int().positive().optional(),
      budget_strategy: z.enum(['priority_trim', 'hard_limit']).optional(),
    }).optional(),
  }),
  sources: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['git', 'local_path', 'registry']),
    uri: z.string(),
    version: z.string().optional(),
    verified: z.boolean().optional(),
  })).optional(),
  capabilities: z.array(z.object({
    id: z.string(),
    source: z.enum(['shared', 'local', 'external']),
    path: z.string().optional(),
    package: z.string().optional(),
    version: z.string().optional(),
  })).optional(),
  artifacts: z.array(z.object({
    type: z.enum(['repository-map', 'rule', 'prompt', 'template', 'workflow', 'knowledge', 'hook', 'adr']),
    path: z.string(),
  })).min(1),
  governance: z.object({
    auto_submit_proposals: z.boolean().optional(),
    require_evidence: z.boolean().optional(),
    min_evidence_count: z.number().int().optional(),
  }).optional(),
  vendor: z.record(z.unknown()).optional(),
})
```

---

### T1.3 — Manifest Loader

**File:** `src/repository/manifest/ManifestLoader.ts`

```typescript
export class ManifestLoader {
  load(root: RepositoryRoot): Manifest
}
```

Steps:
1. Build path: `path.join(root, '.harness', 'harness.yaml')`
2. Check exists → throw `mftError('MFT_001')` nếu không có
3. Read UTF-8 content
4. Parse YAML với `js-yaml` → throw `mftError('MFT_002', {line, col})` nếu syntax error
5. Pass raw object vào `ManifestValidator`
6. Return typed `Manifest`

---

### T1.4 — Manifest Validator

**File:** `src/repository/manifest/ManifestValidator.ts`

```typescript
export class ManifestValidator {
  validate(raw: unknown, root: RepositoryRoot): Manifest
}
```

Validation order (throw ngay khi gặp lỗi đầu tiên):
1. Zod parse → MFT_003 (missing required), MFT_004 (wrong version), MFT_005 (wrong spec)
2. `agent.entry_point` file exists → MFT_007
3. `repository.root` path exists → MFT_006
4. Mỗi `artifacts[].path` exists → MFT_006
5. Source IDs unique → MFT_008
6. Source types valid → MFT_009 (đã handle bởi zod)
7. Artifact types valid → MFT_010 (đã handle bởi zod)
8. Artifact array không rỗng → MFT_011 (đã handle bởi zod `.min(1)`)
9. Capabilities IDs format `namespace.name` → MFT_016
10. Custom fields bên ngoài `vendor:` → MFT_012

---

### T1.5 — Repository Validator

**File:** `src/repository/validation/RepositoryValidator.ts`

```typescript
export class RepositoryValidator {
  validate(root: RepositoryRoot): ValidationResult
}
```

Checklist 10 items (từ `04_REPOSITORY_SPECIFICATION.md §11`):

| ID | Check | Error nếu fail |
|----|-------|----------------|
| V01 | `AGENTS.md` tồn tại tại root | REPO_011 |
| V02 | `.harness/harness.yaml` tồn tại | REPO_002 |
| V03 | harness.yaml là valid YAML | REPO_003 |
| V04 | harness.yaml pass schema | REPO_004 |
| V05 | Tất cả paths trong manifest tồn tại | MFT_006 |
| V06 | Không duplicate asset IDs | REPO_006 |
| V07 | Không circular references | REPO_012 |
| V08 | AGENTS.md size < 50KB | warning (không fail) |
| V09 | Encoding UTF-8 | warning (không fail) |
| V10 | Không path traversal trong asset paths | REPO_014 |

**Lưu ý:** Validator dùng `strict` mode (fail on first error) hoặc `lenient` mode (collect all). Default: lenient.

---

### T1.6 — harness init command (stub)

**File:** `src/adapters/cli/commands/init.ts`

```bash
harness init [path] [--force]
```

Actions:
1. Check `.harness/` chưa tồn tại (nếu có → error trừ khi `--force`)
2. Tạo cấu trúc thư mục:
   - `.harness/harness.yaml` (template mặc định)
   - `.harness/rules/` (empty dir)
   - `AGENTS.md` (template mặc định)
3. Print: `✓ Initialized .harness/ in {path}`

Template `harness.yaml` tối thiểu:
```yaml
version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
```

---

### T1.7 — harness validate command (stub)

**File:** `src/adapters/cli/commands/validate.ts`

```bash
harness validate [path] [--strict]
```

Flow:
1. `RepositoryDiscovery.discover(cwd)`
2. `RepositoryValidator.validate(root)`
3. Format và print ValidationResult
4. Exit 0 nếu valid, exit 2 nếu errors, exit 1 nếu warnings only

---

### T1.8 — Platform stub

**File:** `src/platform/service.ts`

Chỉ implement 2 methods cần cho M1:
```typescript
class PlatformServiceImpl implements PlatformService {
  validate(root: string): Promise<ValidationResult>  // → RepositoryValidator
  // Tất cả methods khác: throw new Error('Not implemented yet')
}
```

---

## Acceptance Scenarios — M1

**Scenario 1 — Init mới:**
```bash
mkdir /tmp/test-project && cd /tmp/test-project
git init
harness init
# Expected:
# ✓ Created AGENTS.md
# ✓ Created .harness/harness.yaml
# ✓ Created .harness/rules/
harness validate
# Expected: exit 0, all checks pass
```

**Scenario 2 — Validate lỗi:**
```bash
cd /tmp/empty-dir
harness validate
# Expected: exit 2
# [ERROR] REPO_001: Repository root not found
```

**Scenario 3 — Manifest sai:**
```bash
# harness.yaml với field sai kiểu: version: "2" (string thay vì int)
harness validate
# Expected: exit 2
# [ERROR] MFT_003: Missing required field: version (expected integer)
```

**Scenario 4 — Missing entry point:**
```bash
# harness.yaml với agent.entry_point: "MISSING.md"
harness validate
# Expected: exit 2
# [ERROR] MFT_007: Entry point missing: MISSING.md
```

---

## Unit Tests — M1

| Test | Expected |
|------|----------|
| `discover('/project/src')` khi root là `/project` | return `/project` |
| `discover('/tmp/nowhere')` không tìm thấy | throw REPO_001 |
| `discover()` max 50 levels | không vô hạn |
| `ManifestLoader` file not found | throw MFT_001 |
| `ManifestLoader` invalid YAML | throw MFT_002 với line/col |
| `ManifestValidator` version = 1 | throw MFT_004 |
| `ManifestValidator` specification ≠ "4.0" | throw MFT_005 |
| `ManifestValidator` missing `artifacts` | throw MFT_011 |
| `ManifestValidator` duplicate source IDs | throw MFT_008 |
| `ManifestValidator` capability id "noDot" | throw MFT_016 |
| `ManifestValidator` vendor custom field OK | no error |
| `ManifestValidator` custom field outside vendor | throw MFT_012 |
| `RepositoryValidator` V01 fails | REPO_011 in errors |
| `RepositoryValidator` V10 path traversal | REPO_014 in errors |

---

## Integration Tests — M1

- `harness init` trên empty dir → validate pass
- `harness init` trên existing → error (no `--force`)
- `harness init --force` trên existing → overwrite
- `harness validate` trên valid project → exit 0

---

## Definition of Done — M1

- [ ] `RepositoryDiscovery` tìm root đúng, max 50 levels
- [ ] `ManifestLoader` load + parse YAML
- [ ] `ManifestValidator` validate tất cả 16 MFT error conditions
- [ ] `RepositoryValidator` check đủ 10 items
- [ ] `harness init` tạo đúng file structure
- [ ] `harness validate` exit codes đúng (0/1/2)
- [ ] Tất cả error codes REPO_001–004, REPO_011–012, REPO_014, MFT_001–016 có test
- [ ] Unit + integration tests pass
- [ ] `tsc --noEmit` pass
- [ ] dependency-cruiser: `repository` không import ngoài `shared`

## Review Gate — M1

```
AI self-review: spec compliance (discovery algorithm, all MFT errors)
      ↓
tsc --noEmit (0 errors)
      ↓
eslint (0 errors)
      ↓
dependency-cruiser (0 violations)
      ↓
Unit tests pass
      ↓
Integration tests pass (harness init + validate)
      ↓
Human review
      ↓
Merge to main
```
