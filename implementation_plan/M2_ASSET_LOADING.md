# M2 — Asset Loading

**Milestone:** M2  
**Effort:** 3 ngày  
**Prerequisite:** M1  
**Spec:** `04_REPOSITORY_SPECIFICATION.md §6–9`, `02_ASSET_MODEL.md §8–10`, `12_FILESYSTEM_SPECIFICATION.md`

---

## Objective

Load Shared Assets và Local Assets từ filesystem, resolve chúng thành Effective Harness, build RepositoryContext. Sau milestone này có thể chạy `harness status` và thấy assets đã được load.

---

## Vertical Slice

```bash
harness status
# Output:
# Repository: /my-project
# Shared Harness: ~/.harness/shared (v2.1.0)
# Assets loaded:
#   rules:      12 (8 shared, 4 local)
#   knowledge:  6  (4 shared, 2 local)
#   workflows:  2  (2 shared, 0 local)
#   capabilities: 27 (27 shared, 0 local)
# Context: ready
```

Stack:
```
CLI (status)
      ↓
Platform (delegate)
      ↓
Repository (asset loader + resolution + context builder)
```

---

## Package Structure

```
src/repository/
  assets/
    AssetLoader.ts          ← T2.1, T2.2
    FrontMatterParser.ts    ← T2.3
    AssetValidator.ts       ← T2.4
  resolution/
    ResolutionEngine.ts     ← T2.5
    strategies/
      OverrideStrategy.ts
      MergeStrategy.ts
      AppendStrategy.ts
      RegistryStrategy.ts
  context/
    ContextBuilder.ts       ← T2.6
  persistence/
    FileSystemPersistence.ts ← T2.7
  service.ts                ← T2.8 (extend từ M1)
```

---

## Tasks

### T2.1 — Shared Asset Loader

**File:** `src/repository/assets/AssetLoader.ts`

```typescript
loadSharedAssets(sharedPath: string): AssetCollection
```

Steps:
1. Determine shared path: `sharedPath || getDefaultSharedPath()`
   - Linux/macOS: `~/.harness/shared/`
   - Windows: `%APPDATA%\harness\shared\`
2. Check dir exists → throw `repoError('REPO_008')` nếu không có
3. Verify checksums từ `metadata/checksum.yaml` → throw `repoError('REPO_009')` nếu mismatch
4. Traverse subdirs: `capabilities/`, `rules/`, `prompts/`, `templates/`, `workflows/`, `knowledge/`, `hooks/`
5. Load từng file qua `FrontMatterParser`
6. Validate từng asset qua `AssetValidator`
7. Return `AssetCollection`

`getDefaultSharedPath()`:
```typescript
function getDefaultSharedPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? os.homedir(), 'harness', 'shared')
  }
  return path.join(os.homedir(), '.harness', 'shared')
}
```

---

### T2.2 — Local Asset Loader

```typescript
loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection
```

Steps:
1. Lấy danh sách artifact paths từ `manifest.artifacts`
2. Với mỗi artifact path:
   - Nếu là directory: traverse recursively, load tất cả `.md` và `.yaml` files
   - Nếu là file: load trực tiếp
3. Parse qua `FrontMatterParser`
4. Validate qua `AssetValidator`
5. Check duplicate IDs across entire local collection → throw `repoError('REPO_006')`

File traversal rules (`12_FILESYSTEM_SPECIFICATION.md §9`):
- UTF-8 only
- Skip binary files
- Skip hidden files (bắt đầu `.`) ngoại trừ `.harness/`
- Skip symlinks ra ngoài project boundary (dùng `isWithinBoundary`)
- Max file size 1MB → throw `repoError('REPO_013', {path, size})`

---

### T2.3 — Front Matter Parser

**File:** `src/repository/assets/FrontMatterParser.ts`

Parse YAML front matter từ Markdown files:

```typescript
export class FrontMatterParser {
  parse(filePath: string, content: string): { metadata: unknown; body: string }
}
```

Format:
```markdown
---
id: my-rule
type: rule
version: 1.0.0
...
---
# Content
```

- Throw `repoError('REPO_005', {path})` nếu front matter không parse được
- YAML files (`.yaml`): không có front matter, parse toàn bộ file

---

### T2.4 — Asset Validator

**File:** `src/repository/assets/AssetValidator.ts`

```typescript
export class AssetValidator {
  validate(raw: unknown, filePath: string): AssetMetadata
}
```

Required fields cho mọi asset: `id`, `type`, `version`, `name`, `scope`

- Throw `repoError('REPO_007', {path, field})` nếu thiếu required field
- Validate `type` là valid `AssetType` enum value
- Validate `scope` là `shared` hoặc `local`
- Validate `version` match SemVer pattern `/^\d+\.\d+\.\d+$/`
- Validate path traversal trong `source` field

---

### T2.5 — Resolution Engine

**File:** `src/repository/resolution/ResolutionEngine.ts`

```typescript
export class ResolutionEngine {
  resolve(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection
}
```

Resolution strategy per type (từ `02_ASSET_MODEL.md §9`):

| AssetType | Strategy | Logic |
|-----------|----------|-------|
| rule | Override | Local thay thế Shared nếu cùng `id` |
| prompt | Override | Local thay thế Shared nếu cùng `id` |
| template | Override | Local thay thế Shared nếu cùng `id` |
| workflow | Override | Local thay thế Shared nếu cùng `id` |
| knowledge | Merge | Tất cả assets từ cả hai sources giữ lại |
| hook | Append | Shared hooks trước, Local hooks sau |
| capability | Registry | Tất cả đăng ký, Local có priority cao hơn |

Với override: nếu local có asset cùng `id` → log warning, dùng local.

Result là `Readonly<AssetCollection>` — không ai modify được sau khi resolve.

---

### T2.6 — Context Builder

**File:** `src/repository/context/ContextBuilder.ts`

```typescript
export class ContextBuilder {
  build(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext
}
```

Assemble `RepositoryContext`:
```typescript
return Object.freeze({
  metadata,
  assets,
  repositoryMap: loadRepositoryMap(metadata.root),  // optional
  adrs: loadAdrs(metadata.root),                    // optional
  buildTimestamp: nowISO8601(),
})
```

Context phải immutable — dùng `Object.freeze()` recursively.

---

### T2.7 — Filesystem Persistence

**File:** `src/repository/persistence/FileSystemPersistence.ts`

```typescript
export class FileSystemPersistence {
  write(root: RepositoryRoot, relativePath: RelativePath, content: string): void
  read(root: RepositoryRoot, relativePath: RelativePath): string
  exists(absolutePath: string): boolean
}
```

Atomic write protocol (`12_FILESYSTEM_SPECIFICATION.md §13`):
```
1. Validate path không traversal (REPO_014)
2. Validate path nằm trong root boundary
3. Ensure parent directory exists
4. Write to {path}.tmp
5. Verify write (check file exists và size > 0)
6. fs.renameSync({path}.tmp, {path})
7. On any error: cleanup .tmp, throw REPO_015 (retryable)
```

Throw `repoError('REPO_010')` nếu permission denied.

---

### T2.8 — Repository Service (extended)

**File:** `src/repository/service.ts`

Extend từ M1, thêm:
```typescript
loadSharedAssets(sharedPath: string): AssetCollection
loadLocalAssets(root: RepositoryRoot, manifest: Manifest): AssetCollection
resolveAssets(shared: AssetCollection, local: AssetCollection): EffectiveAssetCollection
buildContext(assets: EffectiveAssetCollection, metadata: RepositoryMetadata): RepositoryContext
persist(root: RepositoryRoot, path: RelativePath, data: string): void
```

---

### T2.9 — harness status command

**File:** `src/adapters/cli/commands/status.ts`

```bash
harness status [--json]
```

Flow:
1. discover → loadManifest → loadSharedAssets + loadLocalAssets → resolveAssets → buildContext
2. Print asset counts per type
3. Print shared harness version từ `installed.yaml`
4. Print "Context: ready"

---

## Acceptance Scenarios — M2

**Scenario 1 — Status trên valid project:**
```bash
cd /my-project  # has .harness/, AGENTS.md, some rules
harness status
# Expected: hiển thị asset counts, exit 0
```

**Scenario 2 — Shared not installed:**
```bash
harness status
# Expected: exit 2
# [ERROR] REPO_008: Shared Harness not installed
# Remedy: Run `harness install`
```

**Scenario 3 — Local overrides Shared:**
```
shared/rules/no-any.md  (id: no-any)
local/rules/no-any.md   (id: no-any, different content)
→ Effective rules: local version, with WARNING logged
```

**Scenario 4 — File too large:**
```bash
# Asset file > 1MB
harness status
# Expected: exit 2, REPO_013 error
```

---

## Unit Tests — M2

| Test | Expected |
|------|----------|
| `loadSharedAssets` shared not installed | throw REPO_008 |
| `loadSharedAssets` checksum mismatch | throw REPO_009 |
| `FrontMatterParser` valid markdown | return metadata + body |
| `FrontMatterParser` no front matter | throw REPO_005 |
| `AssetValidator` missing `id` | throw REPO_007 |
| `AssetValidator` invalid AssetType | throw REPO_007 |
| `loadLocalAssets` file > 1MB | throw REPO_013 |
| `loadLocalAssets` duplicate id | throw REPO_006 |
| `loadLocalAssets` path traversal | throw REPO_014 |
| `ResolutionEngine` override: local wins | local version in result |
| `ResolutionEngine` merge: both present | both in knowledge array |
| `ResolutionEngine` append: shared first | shared hooks before local |
| `ContextBuilder` result is frozen | `Object.isFrozen(ctx)` === true |
| `FileSystemPersistence` atomic write | .tmp cleaned up on success |
| `FileSystemPersistence` path traversal | throw REPO_014 |
| `FileSystemPersistence` permission denied | throw REPO_010 |

---

## Definition of Done — M2

- [ ] Shared + Local asset loading hoạt động
- [ ] Front matter parsing đúng cho `.md` và `.yaml` files
- [ ] Asset validation đủ required fields
- [ ] Resolution strategies (Override/Merge/Append/Registry) đúng
- [ ] RepositoryContext là immutable (frozen)
- [ ] Atomic write protocol implement
- [ ] `harness status` hiển thị đúng asset counts
- [ ] Error codes REPO_005–010, REPO_012–015 có test
- [ ] Unit + integration tests pass
- [ ] dependency-cruiser: `repository` chỉ import `shared`

## Review Gate — M2

```
AI self-review: resolution strategies đúng spec không?
      ↓
tsc --noEmit + eslint (0 errors)
      ↓
dependency-cruiser (0 violations)
      ↓
Unit tests pass
      ↓
Integration test: harness status on valid project
      ↓
Human review
      ↓
Merge to main
```
