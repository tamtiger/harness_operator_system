# Implementation Plan: Vibecode Skills Integration

## Overview

This plan implements three capabilities: 6 new skill files ported from vibecode-pro-max-kit, a verify pipeline extension with `security_audit` and `simplify` steps, and updates to the template and smoke test. All changes are additive — no existing files are modified except `src/tools/verify.ts`, `templates/verify.yaml.tpl`, and `scripts/smoke-test.ts`.

## Tasks

- [x] 1. Create new skill files
  - [x] 1.1 Create `skills/security-audit/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=security-audit, version="1.0", applies_to=["*"], triggers=["verify_run", "session_start"]
    - Body: STRIDE threat modeling workflow + OWASP Top 10 checklist patterns
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.2 Create `skills/edge-case-generation/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=edge-case-generation, version="1.0", applies_to=["*"], triggers=["task_create", "verify_run"]
    - Body: Systematic boundary conditions, failure scenarios, adversarial inputs generation
    - _Requirements: 1.2, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Create `skills/parallel-coordination/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=parallel-coordination, version="1.0", applies_to=["*"], triggers=["task_create", "session_start"]
    - Body: Decompose work into independent parallel tracks with dependency management
    - _Requirements: 1.2, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.4 Create `skills/autonomous-optimizer/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=autonomous-optimizer, version="1.0", applies_to=["*"], triggers=["verify_run"]
    - Body: Self-improving code optimization with measurement loops
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.5 Create `skills/deep-research/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=deep-research, version="1.0", applies_to=["*"], triggers=["session_start"]
    - Body: Structured research with source validation and synthesis
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.6 Create `skills/spec-driven-workflow/SKILL.md` ✅ COMPLETED
    - YAML frontmatter: name=spec-driven-workflow, version="1.0", applies_to=["*"], triggers=["session_start", "task_create"]
    - Body: Five RIPER-5 phases (Research → Innovate → Plan → Execute → Review) with harness-os tool mappings (session_start, task_create, verify_run, progress_log, session_handoff) and explicit transition criteria
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 2. Extend verify pipeline in `src/tools/verify.ts`
  - [x] 2.1 Add `STEP_ORDER` constant and extend `VerifyConfig` interface ✅ COMPLETED
    - Add `security_audit?: string | null` and `simplify?: string | null` to `VerifyConfig.commands`
    - Add `const STEP_ORDER = ["install", "build", "test", "lint", "typecheck", "security_audit", "simplify"] as const`
    - _Requirements: 4.1, 5.1, 6.1_

  - [x] 2.2 Refactor step iteration to use `STEP_ORDER` ✅ COMPLETED
    - Replace the hardcoded if-chain in the "Use verify.yaml config" branch with a loop over `STEP_ORDER`
    - For each step in `STEP_ORDER`, check if `commands[step]` is defined and not null, then push to `stepsToRun`
    - Preserve existing behavior for explicit-steps branch and auto-detect fallback
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1_

  - [x] 2.3 Write unit tests for verify pipeline extension ✅ COMPLETED
    - Test `parseVerifyYaml()` with configs containing `security_audit` and `simplify` fields (note: export `parseVerifyYaml` for testability or test via `verifyRun` integration)
    - Test step ordering: all 7 steps defined → executes in canonical order
    - Test null-skipping: steps set to null are excluded from `steps_run`
    - Test backward compatibility: config without new fields produces same behavior
    - Test explicit steps override: provided steps array executes in given order
    - Create `src/tools/verify.test.ts`
    - _Requirements: 4.2, 4.3, 4.4, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 7.1_

  - [x] 2.4 Write property tests for verify pipeline with fast-check ✅ COMPLETED
    - **Property 4: Canonical step ordering** — For any config with all 7 commands non-null, steps_run order matches STEP_ORDER
    - **Property 5: Null steps are skipped** — For any config where a command is null/absent, that step is not in steps_run
    - **Property 6: Step failure propagates** — For any step that fails, overall passed is false
    - **Property 7: Explicit steps override** — For any explicit steps array, steps_run matches exactly
    - **Property 8: Backward compatibility** — Config without security_audit/simplify produces same steps as legacy
    - **Validates: Requirements 4.2, 4.3, 4.5, 5.2, 5.3, 5.5, 6.1, 6.2, 6.3, 7.1**

- [x] 3. Checkpoint - Verify pipeline changes ✅ COMPLETED
  - All tests pass (251 total, 27 new verify.test.ts tests)

- [x] 4. Update template and smoke test ✅ COMPLETED
  - [x] 4.1 Update `templates/verify.yaml.tpl` with commented-out entries ✅ COMPLETED
    - Add `# security_audit: "npm audit --audit-level=moderate"` and `# simplify: null` to each runtime section (node, dotnet, python, go)
    - _Requirements: 4.6, 5.6_

  - [x] 4.2 Update `scripts/smoke-test.ts` expected skill count ✅ COMPLETED
    - Change `skillListData.skills.length < 13` assertion to `< 29` (23 existing + 6 new = 29 minimum)
    - _Requirements: 1.1, 2.7_

- [x] 5. Validate skill loading ✅ COMPLETED
  - [x] 5.1 Write unit tests for new skill frontmatter parsing ✅ COMPLETED
    - **Property 1: Frontmatter compliance** — For each of the 6 new skills, parseFrontmatter returns non-null meta with correct name, version="1.0", valid date, non-empty applies_to and triggers arrays
    - **Property 2: Skill load round-trip** — For each new skill name, skillLoad returns content and meta (not error)
    - Create `src/tools/skill-integration.test.ts`
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 6. Final checkpoint - Full verification ✅ COMPLETED
  - All tests pass (251 total)
  - Verification results: `bun run build` (0 errors) && `bun test` (251 pass) && `bun run smoke` (PASSED)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP (property tests only — unit tests are mandatory)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation language is TypeScript (ES2022, NodeNext) matching the existing codebase
- No existing skill files are modified — all changes are additive
- The `skill_load`/`skill_list` tools auto-discover new skills from the `skills/` directory

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1"] },
    { "id": 1, "tasks": ["2.2", "4.1"] },
    { "id": 2, "tasks": ["2.3", "2.4", "4.2"] },
    { "id": 3, "tasks": ["5.1"] }
  ]
}
```
