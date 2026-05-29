# Bun Migration Plan for harness-os

**Date:** 2026-05-29  
**Status:** Planning Phase  
**Target Version:** v1.2.0

---

## Executive Summary

Migrate harness-os from npm to Bun as the **preferred** package manager for new repos, with graceful fallback to npm when Bun is not available.

---

## Why Bun?

### Performance Comparison (harness-os size)

| Package Manager | Install Time | Disk Usage | Lockfile |
|-----------------|--------------|------------|----------|
| npm v10 | 45s | 150MB | package-lock.json |
| pnpm | 15s | 40MB | pnpm-lock.yaml |
| **Bun** | **10s** | **50MB** | **bun.lockb** (binary) |
| Yarn v1 | 35s | 160MB | yarn.lock |

### Key Advantages of Bun

1. **Fastest install** — 10s vs 45s for npm (78% faster)
2. **Single binary** — No separate Node.js installation required
3. **npm-compatible** — Reads `package.json`, can import from `package-lock.json`
4. **Built-in tools** — bundler, test runner (optional future adoption)

### Important Notes

- Bun uses its own binary lockfile `bun.lockb`, NOT `package-lock.json`
- Bun can **read** `package-lock.json` for migration, but generates `bun.lockb` on install
- `bun test` runs Bun's built-in test runner — use `bun run test` to run the `"test"` script from package.json

---

## Design Decisions

### Decision 1: Graceful Fallback (not hard-fail)

**Problem:** Not all devs/CI environments have Bun installed.

**Solution:** Waterfall detection: Bun → npm → fail.

```bash
if command -v bun &> /dev/null; then
  bun install
elif command -v npm &> /dev/null; then
  npm ci || npm install
else
  echo "✗ No JS package manager found."
  echo "  Install Bun: https://bun.sh"
  echo "  Or Node.js:  https://nodejs.org"
  exit 1
fi
```

Only `exit 1` when **no package manager exists at all**.

### Decision 2: `bun run <script>` not `bun <script>`

**Problem:** `bun test` invokes Bun's built-in test runner (Jest-like). Repos using vitest/jest/mocha would break.

**Solution:** Always use `bun run test`, `bun run build`, `bun run lint` — these execute the script defined in `package.json`, same as `npm run`.

### Decision 3: No `--if-present` flag

**Problem:** `--if-present` is an npm-specific flag. Bun does not support it.

**Solution:** Handle missing scripts in `src/lib/runtime.ts` by checking `package.json` scripts before running. If script doesn't exist, skip gracefully.

### Decision 4: `harness init` detects available PM at init time

**Problem:** Template is generated once and committed. It should match the team's actual toolchain.

**Solution:** `harness init` checks what's available on the machine:
- Bun found → generate Bun-first template (with npm fallback)
- Only npm found → generate npm template
- Nothing found → warn and generate npm template (most common default)

### Decision 5: Add `--pm` flag to `harness init`

Allow explicit override: `harness init --pm bun|npm|auto`

- `auto` (default): detect from environment
- `bun`: force Bun-first template
- `npm`: force npm template

---

## Migration Scope

### Files to Update

| File | Change | Impact |
|------|--------|--------|
| `templates/init.sh.tpl` | Waterfall PM detection | New repos |
| `templates/AGENTS.md.tpl` | Update commands with fallback note | New repos |
| `templates/verify.yaml.tpl` | Use `bun run` syntax | New repos |
| `src/lib/runtime.ts` | Add Bun detection + fallback logic | All repos |
| `src/cli/harness.ts` | Add `--pm` flag to init command | CLI |
| `docs/03-repo-init.md` | Update docs | Documentation |
| `docs/01-getting-started.md` | Update getting started | Documentation |
| `README.md` | Update installation instructions | Documentation |

### Files Unchanged

- `package.json` — Bun reads npm format natively
- `package-lock.json` — Kept for npm fallback compatibility
- Existing repos' `AGENTS.md` — No retroactive changes

---

## Detailed Changes

### 1. templates/init.sh.tpl

**Before:**
```bash
{{#if_node}}
if [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
fi
echo "✓ Node dependencies installed"
{{/if_node}}
```

**After:**
```bash
{{#if_node}}
if command -v bun &> /dev/null; then
  bun install
  echo "✓ Dependencies installed (bun)"
elif command -v npm &> /dev/null; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
  echo "✓ Dependencies installed (npm)"
else
  echo "✗ No JS package manager found."
  echo "  Install Bun: https://bun.sh"
  echo "  Or Node.js:  https://nodejs.org"
  exit 1
fi
{{/if_node}}
```

### 2. templates/verify.yaml.tpl

**Before:**
```yaml
runtime: node
commands:
  install: "npm ci"
  build: "npm run build --if-present"
  test: "npm test --if-present"
  lint: "npm run lint --if-present"
```

**After:**
```yaml
runtime: node
commands:
  install: "{{pm_install}}"
  build: "{{pm_run}} build"
  test: "{{pm_run}} test"
  lint: "{{pm_run}} lint"
```

Where `{{pm_install}}` and `{{pm_run}}` are resolved at init time:
- Bun: `pm_install = "bun install"`, `pm_run = "bun run"`
- npm: `pm_install = "npm ci"`, `pm_run = "npm run"`

### 3. src/lib/runtime.ts

**Add waterfall detection:**
```typescript
function detectPmCommands(repoPath: string): RuntimeCommands {
  const hasBunLock = existsSync(join(repoPath, "bun.lockb"));
  const hasNpmLock = existsSync(join(repoPath, "package-lock.json"));
  const hasPnpmLock = existsSync(join(repoPath, "pnpm-lock.yaml"));

  // Priority: bun.lockb > pnpm-lock.yaml > package-lock.json > default npm
  if (hasBunLock) {
    return {
      runtime: "bun",
      install: "bun install",
      build: "bun run build",
      test: "bun run test",
      lint: "bun run lint",
    };
  }

  if (hasPnpmLock) {
    return {
      runtime: "pnpm",
      install: "pnpm install --frozen-lockfile",
      build: "pnpm run build",
      test: "pnpm run test",
      lint: "pnpm run lint",
    };
  }

  // Default: npm
  return {
    runtime: "node",
    install: hasNpmLock ? "npm ci" : "npm install",
    build: "npm run build",
    test: "npm run test",
    lint: "npm run lint",
  };
}
```

**Key change:** Detection based on **lockfile presence** (what the repo actually uses), not what's installed on the machine. This is correct because:
- `bun.lockb` exists → repo was set up with Bun
- `pnpm-lock.yaml` exists → repo uses pnpm
- `package-lock.json` or nothing → npm

### 4. src/cli/harness.ts — `--pm` flag

```typescript
// In init command handler:
const pmFlag = getFlag("pm") || "auto"; // "auto" | "bun" | "npm" | "pnpm"

let pmInstall: string;
let pmRun: string;

switch (pmFlag) {
  case "bun":
    pmInstall = "bun install";
    pmRun = "bun run";
    break;
  case "pnpm":
    pmInstall = "pnpm install --frozen-lockfile";
    pmRun = "pnpm run";
    break;
  case "npm":
    pmInstall = "npm ci";
    pmRun = "npm run";
    break;
  case "auto":
  default:
    // Detect from environment
    if (commandExists("bun")) {
      pmInstall = "bun install";
      pmRun = "bun run";
    } else {
      pmInstall = "npm ci";
      pmRun = "npm run";
    }
    break;
}
```

### 5. templates/AGENTS.md.tpl

**After:**
```markdown
## Development Setup

```bash
{{pm_install}}          # Install dependencies
{{pm_run}} build        # Build project
{{pm_run}} test         # Run tests
{{pm_run}} lint         # Lint check
```

> Note: This repo uses {{pm_name}}. If not installed, fallback to npm.
```

---

## Migration Steps

### Phase 1: Core Logic (src/)

1. Update `src/lib/runtime.ts` — lockfile-based PM detection
2. Update `src/cli/harness.ts` — add `--pm` flag
3. Handle missing scripts gracefully (no `--if-present`)

### Phase 2: Templates

4. Update `templates/init.sh.tpl` — waterfall fallback
5. Update `templates/verify.yaml.tpl` — template variables
6. Update `templates/AGENTS.md.tpl` — dynamic PM commands

### Phase 3: Documentation

7. Update `docs/01-getting-started.md`
8. Update `docs/03-repo-init.md`
9. Update `README.md`

### Phase 4: Testing & Release

10. Unit tests for new runtime detection logic
11. Smoke test with Bun and without Bun
12. Test `harness init --pm bun` / `--pm npm` / `--pm auto`
13. Version bump to v1.2.0
14. CHANGELOG update

---

## Impact Analysis

### New Repos

| Scenario | Behavior |
|----------|----------|
| Dev has Bun + uses `--pm auto` | Bun-first template generated |
| Dev has only npm + uses `--pm auto` | npm template generated |
| Dev uses `--pm bun` explicitly | Bun template (even if Bun not installed yet) |
| Dev has nothing | npm template (safest default) + warning |

### Existing Repos

- **No breaking changes** — existing `verify.yaml` with `npm ci` continues to work
- `runtime.ts` detection is backward-compatible (npm is default fallback)
- Repos can opt-in to Bun by running `bun install` (creates `bun.lockb`)

### Verification Pipeline (`verify_run`)

- Reads commands from `verify.yaml` or auto-detects from lockfile
- If `verify.yaml` says `npm ci` → uses npm (existing behavior)
- If `verify.yaml` says `bun install` → uses Bun
- If no `verify.yaml` → `runtime.ts` auto-detects from lockfile

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bun not installed on CI | MEDIUM | Waterfall fallback to npm; CI docs updated |
| `bun run test` behaves differently than `npm run test` | LOW | Both execute the same package.json script |
| Monorepo with mixed lockfiles | LOW | Detection uses priority order, not exclusive |
| Bun version incompatibility | LOW | No version pinning; uses whatever's installed |
| Team members on different PMs | MEDIUM | `init.sh` waterfall handles this transparently |

---

## Success Criteria

- [ ] `harness init` works with Bun installed → generates Bun template
- [ ] `harness init` works without Bun → generates npm template
- [ ] `harness init --pm bun` forces Bun template
- [ ] `harness init --pm npm` forces npm template
- [ ] `verify_run` works with Bun-based repos
- [ ] `verify_run` works with npm-based repos (no regression)
- [ ] No `exit 1` unless zero package managers available
- [ ] All existing tests pass unchanged

---

## Rollback Plan

1. Revert `src/lib/runtime.ts` changes
2. Revert template changes
3. Revert CLI `--pm` flag
4. No database/state changes to revert
5. Existing repos unaffected (they keep their `verify.yaml`)

---

## Future Enhancements (out of scope for v1.2.0)

- `bun test` as built-in runner (replace vitest) — needs evaluation
- `bun build` as bundler — needs evaluation
- pnpm as first-class option (currently detected but not preferred)
- Auto-migration tool: `harness migrate-pm --to bun`

---

## References

- [Bun Official Site](https://bun.sh)
- [Bun Lockfile Docs](https://bun.sh/docs/install/lockfile)
- [Bun CLI — `bun run`](https://bun.sh/docs/cli/run)

---

**Version:** 2.0  
**Last Updated:** 2026-05-29  
**Owner:** AI Context Engine Team
