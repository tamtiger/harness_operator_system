# M4 — Capability Registry

**Milestone:** M4  
**Effort:** 3 ngày  
**Prerequisite:** M0 *(có thể chạy song song với M2)*  
**Spec:** `07_CAPABILITY_SPECIFICATION.md`

---

## Objective

Implement Capability Registry và toàn bộ 27 built-in capabilities. Đây là extension point chính — mọi thao tác thực tế (đọc file, chạy git, gọi AI) đều qua đây.

---

## Vertical Slice

```bash
harness capability list
# Output:
# Built-in capabilities (27):
#   harness.file.read        — Read file content
#   harness.file.write       — Write content to file
#   harness.file.append      — Append content to file
#   ... (27 total)
```

---

## Package Structure

```
src/capability/
  registry/
    CapabilityRegistry.ts   ← T4.1
  builtin/
    file/
      read.ts               ← T4.3a
      write.ts
      append.ts
      delete.ts
      exists.ts
      list.ts
      move.ts
      copy.ts
    dir/
      create.ts             ← T4.3b
      delete.ts
      list.ts
      exists.ts
    search/
      text.ts               ← T4.3c
      file.ts
      symbol.ts
    git/
      status.ts             ← T4.3d
      diff.ts
      commit.ts
      log.ts
      branch.ts
      checkout.ts
    terminal/
      execute.ts            ← T4.3e
      stream.ts
    ai/
      complete.ts           ← T4.3f
      embed.ts
    repo/
      read_asset.ts         ← T4.3g
      create_proposal.ts
    index.ts                ← register all built-ins
  loader/
    CapabilityLoader.ts     ← T4.4
  validation/
    CapabilityValidator.ts  ← T4.5
  service.ts                ← T4.6
```

---

## Tasks

### T4.1 — Capability Registry

**File:** `src/capability/registry/CapabilityRegistry.ts`

```typescript
export class CapabilityRegistryImpl implements CapabilityRegistry {
  private registrations = new Map<CapabilityId, { def: CapabilityDefinition; impl: CapabilityImpl }>()

  register(def: CapabilityDefinition, impl: CapabilityImpl): void {
    CapabilityValidator.validate(def)  // throw CAP_008 if invalid
    this.registrations.set(def.capabilityId, { def, impl })
  }

  resolve(id: CapabilityId): CapabilityImpl {
    const reg = this.registrations.get(id)
    if (!reg) throw capError('CAP_001', { id })
    return reg.impl
  }

  async invoke(id: CapabilityId, context: RuntimeContext, input: unknown): Promise<CapabilityResult> {
    const start = Date.now()
    // 1. resolve → CAP_001
    // 2. validate input against def.inputSchema (ajv) → CAP_002
    // 3. check permissions → CAP_004
    // 4. execute with timeout → CAP_005
    // 5. validate output against def.outputSchema → CAP_003
    // 6. return CapabilityResult
  }
}
```

**Invocation protocol** (`07_CAPABILITY_SPECIFICATION.md §6`):
1. `resolve(id)` — throw `CAP_001` nếu không tìm thấy
2. Validate `input` bằng `ajv` against `def.inputSchema` — throw `CAP_002`
3. Check `def.permissions` vs allowed permissions trong context — throw `CAP_004`
4. Gọi `impl.execute(context, input)` với timeout (`def.timeout ?? 30000ms`) — throw `CAP_005` nếu timeout
5. Validate output against `def.outputSchema` — throw `CAP_003`
6. Return `CapabilityResult { capabilityId, success: true, output, durationMs }`

**Lưu ý:** `context` được inject bởi Execution, không do Capability tự lấy. Capability nhận context như parameter, không import Repository.

---

### T4.2 — Capability Interface & Base

**File:** `src/capability/registry/types.ts`

```typescript
export interface CapabilityImpl {
  execute(context: RuntimeContext, input: unknown): Promise<unknown>
}

export abstract class BaseCapability implements CapabilityImpl {
  abstract execute(context: RuntimeContext, input: unknown): Promise<unknown>
  protected getRepoRoot(context: RuntimeContext): RepositoryRoot {
    return context.metadata.root
  }
}
```

---

### T4.3 — Built-in Capabilities

Implement 27 built-in capabilities. Mỗi capability là một class implement `CapabilityImpl`.

**File operations (8):** `src/capability/builtin/file/`

| Capability | Input | Output | Notes |
|-----------|-------|--------|-------|
| `harness.file.read` | `{path: string}` | `{content: string}` | path relative to repo root |
| `harness.file.write` | `{path, content: string}` | `{success: boolean}` | atomic write via persistence |
| `harness.file.append` | `{path, content: string}` | `{success: boolean}` | |
| `harness.file.delete` | `{path: string}` | `{success: boolean}` | |
| `harness.file.exists` | `{path: string}` | `{exists: boolean}` | |
| `harness.file.list` | `{directory: string, pattern?: string}` | `{files: string[]}` | glob pattern |
| `harness.file.move` | `{source, destination: string}` | `{success: boolean}` | |
| `harness.file.copy` | `{source, destination: string}` | `{success: boolean}` | |

**Quan trọng:** `file.write`, `file.append`, `file.move`, `file.copy`, `file.delete` phải gọi `FileSystemPersistence` (không ghi filesystem trực tiếp). Inject persistence via constructor.

**Directory operations (4):** `src/capability/builtin/dir/`

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.dir.create` | `{path, recursive?: boolean}` | `{success: boolean}` |
| `harness.dir.delete` | `{path, recursive?: boolean}` | `{success: boolean}` |
| `harness.dir.list` | `{path: string}` | `{entries: {name, type}[]}` |
| `harness.dir.exists` | `{path: string}` | `{exists: boolean}` |

**Search operations (3):** `src/capability/builtin/search/`

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.search.text` | `{pattern, path, recursive?: boolean, caseSensitive?: boolean}` | `{matches: {file, line, content}[]}` |
| `harness.search.file` | `{pattern, root}` | `{files: string[]}` |
| `harness.search.symbol` | `{symbol, root, language?: string}` | `{locations: {file, line, col}[]}` |

**Git operations (6):** `src/capability/builtin/git/`

Gọi `child_process.execSync` hoặc dùng `simple-git` library.

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.git.status` | `{}` | `{staged, unstaged, untracked: string[]}` |
| `harness.git.diff` | `{staged?: boolean, file?: string}` | `{diff: string}` |
| `harness.git.commit` | `{message: string, files?: string[]}` | `{commitHash: string}` |
| `harness.git.log` | `{limit?: number}` | `{commits: {hash, message, author, date}[]}` |
| `harness.git.branch` | `{action: 'list'\|'create'\|'delete', name?: string}` | `{branches?: string[], current?: string}` |
| `harness.git.checkout` | `{ref: string}` | `{success: boolean}` |

**Terminal operations (2):** `src/capability/builtin/terminal/`

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.terminal.execute` | `{command: string, cwd?: string, env?: Record<string,string>, timeout?: Duration}` | `{stdout, stderr: string, exitCode: number}` |
| `harness.terminal.stream` | same | AsyncIterable của output lines |

**AI operations (2):** `src/capability/builtin/ai/`

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.ai.complete` | `{prompt: string, model?: string, maxTokens?: number}` | `{content: string, model: string, tokensUsed: number}` |
| `harness.ai.embed` | `{text: string, model?: string}` | `{embedding: number[], dimensions: number}` |

Implementation: gọi API (OpenAI, Anthropic v.v.) tùy config. Default: stub returning empty response khi no API key.

**Repository operations (2):** `src/capability/builtin/repo/`

| Capability | Input | Output |
|-----------|-------|--------|
| `harness.repo.read_asset` | `{assetId: AssetId}` | `{asset: Asset}` |
| `harness.repo.create_proposal` | `{title, description, type, rationale, evidence[], proposedContent}` | `{proposal: Proposal}` |

Implement bằng cách gọi injected `RepositoryService` và `GovernanceService`. Inject qua constructor, không import trực tiếp.

---

### T4.4 — Built-in Registration

**File:** `src/capability/builtin/index.ts`

```typescript
export function registerBuiltins(registry: CapabilityRegistry, deps: BuiltinDeps): void {
  // File ops
  registry.register(fileReadDef, new FileReadCapability(deps.persistence))
  registry.register(fileWriteDef, new FileWriteCapability(deps.persistence))
  // ... 27 total
}

interface BuiltinDeps {
  persistence: FileSystemPersistence
  repositoryService?: RepositoryService    // for harness.repo.*
  governanceService?: GovernanceService    // for harness.repo.create_proposal
}
```

---

### T4.5 — Capability Loader

**File:** `src/capability/loader/CapabilityLoader.ts`

```typescript
export class CapabilityLoader {
  loadFromManifest(manifest: Manifest, registry: CapabilityRegistry): void
}
```

Đọc `manifest.capabilities[]`:
- `source: 'shared'` → load từ `~/.harness/shared/capabilities/`
- `source: 'local'` → load từ `.harness/capabilities/{id}.yaml`
- `source: 'external'` → load từ npm package (dynamic require)

Custom capability YAML format:
```yaml
id: myorg.custom.deploy
type: capability
version: 1.0.0
name: Custom Deploy
scope: local
input_schema: { ... }
output_schema: { ... }
permissions: [execute_command]
script: "./scripts/deploy.sh"  # local script to run
```

---

### T4.6 — Capability Validator

**File:** `src/capability/validation/CapabilityValidator.ts`

```typescript
export class CapabilityValidator {
  static validate(def: CapabilityDefinition): void
}
```

- Validate `capabilityId` format → throw `capError('CAP_008')`
- Validate `inputSchema` là valid JSON Schema → throw `capError('CAP_008')`
- Validate `outputSchema` là valid JSON Schema → throw `capError('CAP_008')`
- `permissions` phải là valid `Permission[]` values

---

## Acceptance Scenarios — M4

**Scenario 1 — List capabilities:**
```bash
harness capability list
# Expected: 27 built-ins listed
```

**Scenario 2 — Invoke file.read:**
```typescript
registry.invoke('harness.file.read', context, { path: 'src/index.ts' })
// Expected: { content: "// file content..." }
```

**Scenario 3 — Unknown capability:**
```typescript
registry.invoke('unknown.cap', context, {})
// Expected: throw CAP_001
```

**Scenario 4 — Input validation fail:**
```typescript
registry.invoke('harness.file.read', context, { wrongField: 123 })
// Expected: throw CAP_002
```

**Scenario 5 — Permission denied:**
```typescript
// context không có 'execute_command' permission
registry.invoke('harness.terminal.execute', context, { command: 'ls' })
// Expected: throw CAP_004
```

---

## Unit Tests — M4

| Test | Expected |
|------|----------|
| `register` valid capability | registered, `isRegistered` = true |
| `register` invalid capabilityId | throw CAP_008 |
| `resolve` unknown id | throw CAP_001 |
| `invoke` valid input | return CapabilityResult success |
| `invoke` invalid input schema | throw CAP_002 |
| `invoke` missing permission | throw CAP_004 |
| `invoke` timeout | throw CAP_005 |
| `invoke` output schema mismatch | throw CAP_003 |
| `file.read` existing file | return content |
| `file.read` nonexistent file | return error in CapabilityResult |
| `file.write` calls persistence | atomic write used |
| `git.status` mock output | parsed correctly |
| `terminal.execute` exit code 1 | exitCode in output |
| `registerBuiltins` | 27 capabilities registered |

---

## Definition of Done — M4

- [ ] CapabilityRegistry hoạt động đúng invocation protocol
- [ ] Tất cả 27 built-in capabilities implemented và registered
- [ ] Input/output schema validation (ajv)
- [ ] Permission enforcement
- [ ] Timeout enforcement
- [ ] Error codes CAP_001–008 có test
- [ ] Capability không import Repository/Context/Execution/Governance trực tiếp
- [ ] Unit tests pass
- [ ] dependency-cruiser: `capability` chỉ import `shared`

## Review Gate — M4

```
AI self-review: invocation protocol đúng 6 bước spec không?
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Unit tests pass
      ↓
Human review (focus: security — permission check, path traversal trong file ops)
      ↓
Merge to main
```
