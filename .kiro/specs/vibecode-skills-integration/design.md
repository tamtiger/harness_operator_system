# Design Document: Vibecode Skills Integration

## Overview

This feature integrates selected skills from vibecode-pro-max-kit into harness-os, creates a spec-driven workflow skill combining RIPER-5 with harness-os session lifecycle, and extends the verify pipeline with `security_audit` and `simplify` steps. All changes are additive — no existing files are modified, no schema changes, full backward compatibility.

## Architecture

This feature adds three capabilities to harness-os:

1. **New skills** — 5–7 complementary skills ported from vibecode-pro-max-kit into `skills/`
2. **Spec-driven workflow skill** — A RIPER-5 + harness-os session lifecycle skill
3. **Verify pipeline extension** — Two new optional steps (`security_audit`, `simplify`) in the verify pipeline

All changes are additive. No existing files are modified. The `skill_load`/`skill_list` tools and `parseFrontmatter` already support arbitrary skill directories — new skills are discovered automatically.

## Components and Interfaces

### Component 1: New Skill Files

**Location:** `skills/<skill-name>/SKILL.md`

Each new skill is a standalone markdown file with YAML frontmatter. The existing `skillList()` and `skillLoad()` functions in `src/tools/skill.ts` scan the `skills/` directory and parse frontmatter — no code changes needed for discovery.

**Selected skills (6 total):**

| Skill Name | Source (vibecode) | Purpose |
|---|---|---|
| `security-audit` | vc-security | STRIDE threat modeling + OWASP Top 10 checklist |
| `edge-case-generation` | vc-scenario | Systematic boundary/failure/adversarial input generation |
| `parallel-coordination` | vc-team | Decompose work into parallel tracks with dependency management |
| `autonomous-optimizer` | vc-predict | Self-improving code optimization with measurement loops |
| `deep-research` | vc-autoresearch | Structured research with source validation and synthesis |
| `spec-driven-workflow` | (new, RIPER-5 based) | Five-phase structured development with harness-os tools |

**Exclusion rationale:**
- `vc-debugger` → overlaps with `systematic-diagnosis` (>70%)
- `vc-xia` → overlaps with `design-grilling` + `architecture-review` (>70%)

### Component 2: Spec-Driven Workflow Skill

**Location:** `skills/spec-driven-workflow/SKILL.md`

This skill combines the RIPER-5 mental model with harness-os session lifecycle tools. It defines five phases with explicit transition criteria and tool mappings:

```
Research → Innovate → Plan → Execute → Review
   │           │         │        │         │
   ▼           ▼         ▼        ▼         ▼
session_start  (thinking) task_create verify_run session_handoff
search_context             progress_log          progress_log
repo_summary
```

**Phase transitions** are gated by explicit criteria (e.g., "Research → Innovate" requires documented understanding of the problem space).

### Component 3: Verify Pipeline Extension

**Location:** `src/tools/verify.ts` (modify existing)

The verify pipeline gains two new optional steps inserted after the existing steps:

```
install → build → test → lint → typecheck → security_audit → simplify
                                              ▲ NEW            ▲ NEW
```

**Design decisions:**
- Steps are **opt-in**: if `security_audit` or `simplify` is not present in `verify.yaml`, they are skipped (backward compatible)
- Steps use the same `StepResult` interface as existing steps
- Step ordering is hardcoded in the pipeline logic (not configurable)
- The `VerifyConfig` interface gains two optional fields

## Interfaces

### VerifyConfig (extended)

```typescript
interface VerifyConfig {
  runtime?: string;
  commands?: {
    install?: string | null;
    build?: string | null;
    test?: string | null;
    lint?: string | null;
    typecheck?: string | null;
    security_audit?: string | null;  // NEW
    simplify?: string | null;        // NEW
  };
  timeouts?: {
    build?: number;
    test?: number;
  };
}
```

### Step Ordering Logic

```typescript
// Canonical step order (hardcoded)
const STEP_ORDER = [
  "install",
  "build",
  "test",
  "lint",
  "typecheck",
  "security_audit",
  "simplify",
] as const;
```

When `verify_run` is called without explicit `steps`:
1. Iterate `STEP_ORDER`
2. For each step, check if `commands[step]` is defined and not null
3. If defined, add to execution queue
4. Execute queue sequentially, respecting `fail_fast`

When `verify_run` is called with explicit `steps`:
- Execute only those steps in the provided order (unchanged behavior)

### Skill Frontmatter (new skills)

```yaml
---
name: security-audit
version: "1.0"
updated: 2026-05-29
applies_to: ["*"]
triggers: ["verify_run", "session_start"]
description: STRIDE threat modeling and OWASP Top 10 security audit workflow.
---
```

All new skills use the existing `SkillFrontmatter` interface. No schema changes.

## Data Models

No new database tables or schema changes. Skills are file-based (no persistence layer). The verify pipeline reads config from `.harness/verify.yaml` (existing mechanism).

### Verify YAML Template Extension

The `templates/verify.yaml.tpl` file gains commented-out entries for the new steps:

```yaml
# security_audit: "npm audit --audit-level=moderate"
# simplify: null
```

This shows users the expected format without enabling the steps by default.

## Error Handling

### Verify Pipeline

- If `security_audit` or `simplify` command fails (non-zero exit), the step is marked `passed: false`
- If `fail_fast` is true (default), pipeline stops at the failed step
- If `fail_fast` is false, all steps run and overall `passed` reflects any failure
- Command timeout uses `DEFAULT_TIMEOUT` (120s) — no custom timeout for new steps

### Skill Loading

- New skills follow the same error path as existing skills
- If a skill file is malformed, `skillLoad()` returns `{ error: "..." }` (existing behavior)
- `parseFrontmatter()` returns `{ meta: null, content: raw }` for unparseable frontmatter

## Implementation Strategy

### Changes to `src/tools/verify.ts`

1. Add `security_audit` and `simplify` to the `VerifyConfig.commands` type
2. Extract step ordering into a `STEP_ORDER` constant
3. Refactor the "use verify.yaml config" branch to iterate `STEP_ORDER` instead of hardcoding individual steps
4. Export `parseVerifyYaml` for unit testability (currently unexported)
5. No changes to the explicit-steps branch or the auto-detect fallback

### Changes to `templates/verify.yaml.tpl`

1. Add commented-out `security_audit` and `simplify` entries to each runtime template section

### New files (skills)

6 new directories under `skills/`:
- `skills/security-audit/SKILL.md`
- `skills/edge-case-generation/SKILL.md`
- `skills/parallel-coordination/SKILL.md`
- `skills/autonomous-optimizer/SKILL.md`
- `skills/deep-research/SKILL.md`
- `skills/spec-driven-workflow/SKILL.md`

### Files NOT modified

- `src/lib/frontmatter.ts` — no schema changes
- `src/tools/skill.ts` — no interface changes
- `src/index.ts` — no new tool registrations
- Any existing `skills/*/SKILL.md` files
- `src/db/client.ts` — no schema changes

## Testing Strategy

### Unit Tests (vitest)

- **Verify pipeline**: Test `parseVerifyYaml()` with configs containing new fields, test step ordering logic with various combinations of null/defined commands
- **Skill frontmatter**: Test that all 6 new skills parse correctly via `parseFrontmatter()`
- **Backward compatibility**: Test that legacy configs (without new fields) produce identical behavior

### Property-Based Tests (fast-check)

- Generate random verify configs with various combinations of null/defined commands for the 7 steps
- Verify ordering invariant holds across all generated configs
- Verify null-skipping invariant holds across all generated configs

### Smoke Test

- Update expected skill count assertion in `scripts/smoke-test.ts` from `< 13` to `< 29` (23 existing + 6 new = 29 minimum)
- Verify `skill_list` returns all new skills
- Verify `skill_load` succeeds for each new skill

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Frontmatter compliance for all new skills

*For any* new skill file in the set {security-audit, edge-case-generation, parallel-coordination, autonomous-optimizer, deep-research, spec-driven-workflow}, parsing its frontmatter SHALL produce a non-null result with: `name` matching the directory name, `version` equal to "1.0", `updated` matching YYYY-MM-DD format, `applies_to` being a non-empty string array, `triggers` being a non-empty string array, and `description` being a non-empty string.

**Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

### Property 2: Skill load round-trip

*For any* new skill name in the set of added skills, calling `skillLoad(name)` SHALL return an object with `name`, `content`, and `meta` fields (not an error object), and the returned `meta.name` SHALL equal the input name.

**Validates: Requirements 2.7**

### Property 3: Verify config parsing supports new fields

*For any* valid verify.yaml content containing `security_audit` and/or `simplify` entries in the commands section, `parseVerifyYaml()` SHALL include those entries in the returned `commands` object with their correct string or null values.

**Validates: Requirements 4.1, 5.1**

### Property 4: Canonical step ordering

*For any* verify config where all seven commands (install, build, test, lint, typecheck, security_audit, simplify) are defined with non-null values, calling `verifyRun()` without explicit steps SHALL execute them in exactly this order: install → build → test → lint → typecheck → security_audit → simplify.

**Validates: Requirements 4.2, 5.2, 6.1**

### Property 5: Null steps are skipped

*For any* verify config where a command entry is set to `null` or is absent, that step SHALL NOT appear in the `steps_run` array of the verify result.

**Validates: Requirements 4.3, 5.3, 6.3**

### Property 6: Step failure propagates to overall result

*For any* verify run where any step (including security_audit or simplify) returns a non-zero exit code, the overall `VerifyResult.passed` SHALL be `false`.

**Validates: Requirements 4.5, 5.5**

### Property 7: Explicit steps override canonical order

*For any* explicit `steps` array passed to `verifyRun()`, the `steps_run` in the result SHALL contain exactly those steps in exactly the provided order, regardless of the canonical step order.

**Validates: Requirements 6.2**

### Property 8: Backward compatibility — legacy configs produce unchanged behavior

*For any* verify config that does NOT contain `security_audit` or `simplify` entries, calling `verifyRun()` SHALL produce the same `steps_run` as the current implementation (install, build, test, lint, typecheck — with null entries skipped).

**Validates: Requirements 7.1, 7.4**

### Property 9: Existing skills remain unchanged

*For any* skill name in the set of 23 existing skills, calling `skillLoad(name)` after this feature is deployed SHALL return identical `content` and `meta` as before.

**Validates: Requirements 7.3, 7.4**
