# Requirements Document

## Introduction

This feature integrates selected skills from the vibecode-pro-max-kit repository into the harness-os skill library, creates a spec-driven workflow skill combining RIPER-5 mental model with harness-os session lifecycle, and extends the verify pipeline with security_audit and simplify steps. The goal is to expand harness-os agent capabilities in security auditing, edge-case generation, autonomous optimization, parallel coordination, and structured spec-driven development — without duplicating the 23 existing skills.

## Glossary

- **Harness_OS**: The local MCP server providing structured guardrails for AI coding agents
- **Skill**: A YAML-frontmatter + markdown document in `skills/<name>/SKILL.md` that teaches agents a reusable workflow or pattern
- **Verify_Pipeline**: The `verify_run` tool that executes sequential pipeline steps (install, build, test, lint) defined in `.harness/verify.yaml`
- **Verify_Config**: The `.harness/verify.yaml` file defining runtime, commands, and timeouts for the verification pipeline
- **RIPER_5**: A five-phase mental model (Research → Innovate → Plan → Execute → Review) for structured development
- **Session_Lifecycle**: The harness-os tools for managing work sessions: `session_start`, `task_create`, `verify_run`, `session_handoff`
- **STRIDE**: A threat modeling framework covering Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege
- **OWASP_Top_10**: The Open Web Application Security Project's list of critical web application security risks
- **Vibecode_Source**: The vibecode-pro-max-kit repository at https://github.com/withkynam/vibecode-pro-max-kit containing 32 skills
- **Frontmatter_Schema**: The required YAML fields for harness-os skills: name, version, updated, applies_to, triggers, description

## Requirements

### Requirement 1: Cherry-Pick Complementary Skills from Vibecode Source

**User Story:** As an AI coding agent, I want access to specialized skills for security auditing, edge-case generation, autonomous optimization, and parallel coordination, so that I can handle a broader range of development tasks with structured guidance.

#### Acceptance Criteria

1. WHEN the `skill_list` tool is called, THE Harness_OS SHALL return entries for between 5 and 7 new skills sourced from Vibecode_Source.
2. THE Harness_OS SHALL include each new skill as a `skills/<skill-name>/SKILL.md` file conforming to the Frontmatter_Schema.
3. THE Harness_OS SHALL select skills that do not substantially duplicate the functionality of any of the 23 existing skills (architecture-review, caveman-mode, continuous-learning, csharp-baseline, csharp-bugfix, csharp-code-review, csharp-feature, csharp-repair, design-grilling, goal-driven-execution, harness-workflow, karpathy-guidelines, prototype-first, search-first, strategic-compact, systematic-diagnosis, tdd-workflow, to-prd, triage, verification-loop, vertical-slicing, write-a-skill, zoom-out).
4. THE Harness_OS SHALL include a security-audit skill implementing STRIDE threat modeling and OWASP_Top_10 checklist patterns.
5. THE Harness_OS SHALL include an edge-case-generation skill that systematically produces boundary conditions, failure scenarios, and adversarial inputs for a given feature.
6. THE Harness_OS SHALL include a parallel-coordination skill that guides agents in decomposing work into independent parallel tracks with dependency management.
7. IF a candidate skill from Vibecode_Source overlaps more than 70% in purpose with an existing skill, THEN THE Harness_OS SHALL exclude that candidate and select an alternative.

### Requirement 2: Skill Format Compliance

**User Story:** As a harness-os maintainer, I want all new skills to follow the established format, so that the `skill_load` and `skill_list` tools work without modification.

#### Acceptance Criteria

1. THE Harness_OS SHALL include valid YAML frontmatter in each new skill with all required fields: name, version, updated, applies_to, triggers, description.
2. THE Harness_OS SHALL set the `name` field to match the skill directory name exactly.
3. THE Harness_OS SHALL set the `version` field to "1.0" for all newly created skills.
4. THE Harness_OS SHALL set the `updated` field to the ISO date of creation.
5. THE Harness_OS SHALL set the `applies_to` field to `["*"]` unless the skill is stack-specific.
6. THE Harness_OS SHALL set the `triggers` field to one or more relevant tool names that indicate when the skill should be suggested.
7. WHEN the `skill_load` tool is called with a new skill name, THE Harness_OS SHALL return the full skill content without errors.

### Requirement 3: Spec-Driven Workflow Skill

**User Story:** As an AI coding agent, I want a structured workflow skill that combines RIPER-5 phases with harness-os session lifecycle tools, so that I can follow a disciplined spec-driven development process from research through review.

#### Acceptance Criteria

1. THE Harness_OS SHALL include a skill named `spec-driven-workflow` in `skills/spec-driven-workflow/SKILL.md`.
2. THE spec-driven-workflow skill SHALL define five phases: Research, Innovate, Plan, Execute, Review.
3. WHEN the Research phase is active, THE spec-driven-workflow skill SHALL instruct the agent to use `session_start` and context-gathering tools before making decisions.
4. WHEN the Plan phase is active, THE spec-driven-workflow skill SHALL instruct the agent to use `task_create` to decompose work into trackable units.
5. WHEN the Execute phase is active, THE spec-driven-workflow skill SHALL instruct the agent to use `verify_run` after each significant code change.
6. WHEN the Review phase is active, THE spec-driven-workflow skill SHALL instruct the agent to use `session_handoff` to persist context and findings.
7. THE spec-driven-workflow skill SHALL define explicit transition criteria between each phase.
8. THE spec-driven-workflow skill SHALL integrate with `progress_log` for tracking phase transitions.

### Requirement 4: Extend Verify Pipeline with Security Audit Step

**User Story:** As a developer, I want the verify pipeline to include a security audit step, so that common security issues are caught automatically during verification.

#### Acceptance Criteria

1. THE Verify_Config SHALL support a `security_audit` command entry in the `commands` section of `verify.yaml`.
2. WHEN `security_audit` is defined in Verify_Config and `verify_run` is called without explicit steps, THE Verify_Pipeline SHALL execute the security_audit step after the lint step.
3. WHEN `security_audit` is set to `null` in Verify_Config, THE Verify_Pipeline SHALL skip the security audit step.
4. THE Verify_Pipeline SHALL report security_audit results in the same `StepResult` format as other pipeline steps (name, passed, output, duration_ms).
5. IF the security_audit step fails, THEN THE Verify_Pipeline SHALL mark the overall verification as failed.
6. THE Verify_Config template (`templates/verify.yaml.tpl`) SHALL include a commented-out `security_audit` entry showing the expected format.

### Requirement 5: Extend Verify Pipeline with Simplify Step

**User Story:** As a developer, I want the verify pipeline to include a simplify step that checks for unnecessary complexity, so that code quality is maintained through automated verification.

#### Acceptance Criteria

1. THE Verify_Config SHALL support a `simplify` command entry in the `commands` section of `verify.yaml`.
2. WHEN `simplify` is defined in Verify_Config and `verify_run` is called without explicit steps, THE Verify_Pipeline SHALL execute the simplify step after the security_audit step.
3. WHEN `simplify` is set to `null` in Verify_Config, THE Verify_Pipeline SHALL skip the simplify step.
4. THE Verify_Pipeline SHALL report simplify results in the same `StepResult` format as other pipeline steps.
5. IF the simplify step fails, THEN THE Verify_Pipeline SHALL mark the overall verification as failed.
6. THE Verify_Config template (`templates/verify.yaml.tpl`) SHALL include a commented-out `simplify` entry showing the expected format.

### Requirement 6: Verify Pipeline Step Ordering

**User Story:** As a developer, I want verify pipeline steps to execute in a predictable order, so that faster checks run first and expensive checks run last.

#### Acceptance Criteria

1. WHEN `verify_run` is called without explicit steps, THE Verify_Pipeline SHALL execute steps in this order: install → build → test → lint → typecheck → security_audit → simplify.
2. WHEN `verify_run` is called with explicit steps via the `steps` parameter, THE Verify_Pipeline SHALL execute only those steps in the order provided.
3. THE Verify_Pipeline SHALL skip any step whose command value is `null` or undefined in Verify_Config.

### Requirement 7: Backward Compatibility

**User Story:** As an existing harness-os user, I want the new features to not break my current setup, so that I can adopt new skills and verify steps incrementally.

#### Acceptance Criteria

1. WHEN a Verify_Config file does not contain `security_audit` or `simplify` entries, THE Verify_Pipeline SHALL execute the same steps as before this feature (install, build, test, lint, typecheck).
2. THE Harness_OS SHALL not modify the Frontmatter_Schema or the `skill_load`/`skill_list` tool interfaces.
3. THE Harness_OS SHALL not modify existing skill files in the `skills/` directory.
4. WHEN the existing 23 skills are loaded via `skill_load`, THE Harness_OS SHALL return identical content as before this feature.
