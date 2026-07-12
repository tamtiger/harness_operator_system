# M7 — CLI End-to-End

**Milestone:** M7  
**Effort:** 2 ngày  
**Prerequisite:** M6  
**Spec:** `13_CLI_SPECIFICATION.md`

---

## Objective

Implement tất cả 14 CLI commands. Adapters chỉ được gọi `PlatformService`. Sau milestone này mọi CLI command đều hoạt động.

---

## Vertical Slice

```bash
# Tất cả commands hoạt động:
harness version       # → "harness v1.0.0 (spec 4.0)"
harness help          # → help text
harness init          # → init project
harness validate      # → validate
harness status        # → status
harness doctor        # → doctor
harness run <task>    # → execute task
harness install       # → install shared
harness update        # → update shared
harness sync          # → sync
harness publish       # → publish
harness proposal list # → list proposals
harness proposal submit <id>  # → submit
harness proposal approve <id> # → approve
```

---

## Package Structure

```
src/adapters/cli/
  commands/
    init.ts
    validate.ts
    status.ts
    doctor.ts
    run.ts
    install.ts
    update.ts
    sync.ts
    publish.ts
    proposal/
      list.ts
      submit.ts
      approve.ts
    version.ts
    help.ts
  formatter/
    OutputFormatter.ts    ← text vs JSON output
    ErrorFormatter.ts
  config/
    CliConfig.ts          ← load ~/.harness/cli.yaml
  index.ts               ← wire commander
  bin.ts                 ← entry point
```

---

## Tasks

### T7.1 — CLI Entry Point

**File:** `src/adapters/cli/index.ts`

```typescript
import { Command } from 'commander'
const program = new Command()

program.name('harness').version(VERSION)

// Global flags
program
  .option('--verbose', 'Verbose output')
  .option('--quiet, -q', 'Suppress non-error output')
  .option('--json', 'Output JSON')
  .option('--no-color', 'Disable ANSI colors')
  .option('--cwd <path>', 'Override working directory')
  .option('--harness-home <path>', 'Override ~/.harness path')

// Register commands...
program.parse(process.argv)
```

---

### T7.2 — 14 Commands

Mỗi command file có cùng cấu trúc:
1. Parse args/options
2. Build config/request object
3. Call `PlatformService.method()`
4. Format output via `OutputFormatter`
5. `process.exit(exitCode)`

| Command | Platform method | Exit codes |
|---------|----------------|------------|
| `init` | Tạo files trực tiếp (không qua Platform) | 0=ok, 1=already exists, 2=error |
| `install` | `platform.install()` | 0=ok, 2=error |
| `update` | `platform.update()` | 0=updated, 1=up-to-date, 2=error |
| `sync` | `platform.sync()` | 0=synced, 1=no-changes, 2=error |
| `run <task>` | `platform.run()` | 0=completed, 2=failed, 3=verification-failed |
| `validate` | `platform.validate()` | 0=valid, 1=warnings, 2=errors |
| `doctor` | `platform.doctor()` | 0=healthy, 1=warning, 2=critical |
| `publish` | `platform.publish()` | 0=published, 1=nothing, 2=error |
| `proposal list` | `platform.listProposals()` | 0=ok, 2=error |
| `proposal submit <id>` | `platform.submitProposal()` | 0=ok, 2=error |
| `proposal approve <id>` | `platform.approveProposal()` | 0=ok, 2=error |
| `status` | `platform.status()` | 0=ok, 2=error |
| `version` | print VERSION constant | 0 |
| `help` | commander built-in | 0 |

---

### T7.3 — Output Formatter

**File:** `src/adapters/cli/formatter/OutputFormatter.ts`

```typescript
export class OutputFormatter {
  format<T>(data: T, options: FormatOptions): string
}

interface FormatOptions {
  json: boolean
  noColor: boolean
  quiet: boolean
}
```

Rules:
- Results → stdout
- Errors, progress → stderr
- `--json` → `JSON.stringify(data, null, 2)` to stdout
- Default → human-readable formatted text

---

### T7.4 — Error Formatter

```typescript
export class ErrorFormatter {
  formatError(error: HarnessError, options: FormatOptions): string
}
```

Text format:
```
[ERROR] REPO_008: Shared Harness not installed
  Remedy: Run `harness install --source <uri>`
  Details: ~/.harness/shared/ not found
```

JSON format:
```json
{"error":{"code":"REPO_008","domain":"REPOSITORY","message":"...","retryable":false,"remediation":"..."}}
```

---

### T7.5 — Ctrl+C Handler

```typescript
process.on('SIGINT', () => {
  console.error('\nInterrupted')
  process.exit(130)
})
```

---

### T7.6 — Environment Variables

```typescript
// src/adapters/cli/config/CliConfig.ts
export function getSharedPath(): string {
  return process.env.HARNESS_HOME ?? getDefaultSharedPath()
}
export function getLogLevel(): string {
  return process.env.HARNESS_LOG_LEVEL ?? 'info'
}
export function isColorDisabled(): boolean {
  return !!process.env.HARNESS_NO_COLOR
}
```

---

## Acceptance Scenarios — M7

**Scenario 1:** `harness version` → `harness v1.0.0 (spec 4.0)`, exit 0  
**Scenario 2:** `harness doctor` healthy → exit 0  
**Scenario 3:** `harness doctor` critical → exit 2  
**Scenario 4:** `harness run "..."` success → exit 0  
**Scenario 5:** `harness run "..."` fail → exit 2, error to stderr  
**Scenario 6:** `harness doctor --json` → valid JSON, exit code correct  
**Scenario 7:** Ctrl+C during run → exit 130  
**Scenario 8:** `HARNESS_NO_COLOR=1 harness doctor` → no ANSI codes  

---

## Definition of Done — M7

- [ ] 14 commands hoạt động
- [ ] Exit codes đúng theo spec
- [ ] Results → stdout, errors → stderr
- [ ] `--json` output là valid JSON
- [ ] `SIGINT` → exit 130
- [ ] Adapters không import gì ngoài `platform`
- [ ] `harness proposal approve` chỉ có trên CLI (kiểm tra không có trong MCP)
- [ ] Unit + integration tests pass

## Review Gate — M7

```
AI self-review: adapters không import domains trực tiếp
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Tests pass
      ↓
Human review
      ↓
Merge to main
```
