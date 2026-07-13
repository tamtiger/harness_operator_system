# AGENTS.md

> **Harness Version:** {{HARNESS_VERSION}}
>
> **Template Version:** {{TEMPLATE_VERSION}}
>
> **Generated Time:** {{GENERATED_TIME}}
>
> **Purpose:** Operational Contract for all AI Agents working in this repository.
>
> **Scope:** This document applies to the entire repository.

---

# 1. Mission

This repository is managed by the **Harness Platform**.

Your responsibility is **not only to write code**, but to work according to the Harness development model.

For every task you must:

- Understand the repository before changing it.
- Follow the project architecture.
- Reuse existing knowledge before creating new solutions.
- Keep implementation and knowledge synchronized.
- Produce deterministic, reviewable changes.

---

# 2. About Harness

Harness is an AI-first development platform.

Instead of relying only on source code, Harness manages repository knowledge explicitly.

The `.harness/` directory contains the operational knowledge that guides AI Agents.

Typical contents include:

- Repository Manifest
- Architecture Knowledge
- Coding Rules
- Workflows
- Prompts
- Specifications
- Governance Rules
- Validation Rules

Always treat the Harness Knowledge as the primary source of repository-specific guidance.

---

# 3. Read Order (Knowledge First)

Before implementing any task, always follow this order.

```
Task
    │
    ▼
.harness/harness.yaml
    │
    ▼
Repository Manifest
    │
    ▼
Relevant Knowledge
    │
    ▼
Repository Rules
    │
    ▼
Source Code
```

Never start implementation before understanding the relevant knowledge.

When documentation conflicts with implementation:

```
Architecture
    ↓
Specifications
    ↓
Repository Rules
    ↓
Documentation
    ↓
Source Code
```

Knowledge takes precedence over implementation.

---

# 4. Repository Overview

**Project**

{{PROJECT_NAME}}

**Domain**

{{PROJECT_DOMAIN}}

**Architecture**

{{PROJECT_ARCHITECTURE}}

**Primary Language**

{{PRIMARY_LANGUAGE}}

**Entry Point**

{{PROJECT_ENTRY_POINT}}

---

# 5. Development Workflow

Every task should follow this workflow.

```
Explore
    │
    ▼
Read Harness Knowledge
    │
    ▼
Understand Architecture
    │
    ▼
Plan
    │
    ▼
Implement
    │
    ▼
Validate
    │
    ▼
Update Knowledge
    │
    ▼
Review
```

Never skip the knowledge phase.

---

# 6. Harness CLI Workflow

Use Harness CLI throughout development.

## Before Implementation

Verify repository health.

```bash
harness doctor
```

---

## During Development

Check repository status.

```bash
harness status
```

---

## Before Review

Validate the repository.

```bash
harness validate
```

---

## When Updating Repository Knowledge

Submit a governance proposal.

```bash
harness proposal submit --file <proposal.md>
```

Knowledge changes should follow the repository governance process.

---

# 7. Repository Commands

Generated automatically during `harness init`.

## Restore

```bash
{{BUILD_COMMAND_RESTORE}}
```

## Build

```bash
{{BUILD_COMMAND_BUILD}}
```

## Test

```bash
{{BUILD_COMMAND_TEST}}
```

## Lint

```bash
{{LINT_COMMAND}}
```

## Format

```bash
{{FORMAT_COMMAND}}
```

Always validate the repository before requesting review.

---

# 8. Decision Authority

## AI MAY

- Refactor internal implementation.
- Improve readability.
- Improve documentation.
- Add or improve tests.
- Optimize implementation without changing observable behavior.

---

## AI MUST REQUEST APPROVAL BEFORE

- Changing architecture.
- Changing public APIs.
- Changing database schema.
- Introducing new dependencies.
- Changing repository structure.
- Modifying governance rules.
- Changing Harness assets.
- Breaking backward compatibility.

---

# 9. Knowledge & Asset Rules

Whenever implementation changes, verify whether related knowledge must also be updated.

| Change | Update Required |
|----------|----------------|
| Public API | Documentation |
| Architecture | Architecture Documents |
| Workflow | Workflow Assets |
| Coding Rules | Rule Assets |
| Prompt Behavior | Prompt Assets |
| Capability | Capability Specification |
| Governance | Governance Proposal |
| Repository Metadata | Manifest |

Implementation and knowledge must remain synchronized.

---

# 10. Repository Rules

Always:

- Follow the project architecture.
- Reuse existing patterns.
- Keep changes focused.
- Update documentation when behavior changes.
- Explain assumptions explicitly.
- Report remaining risks honestly.

Never:

- Guess missing requirements.
- Invent APIs or contracts.
- Ignore repository knowledge.
- Skip validation.
- Remove tests to make builds pass.
- Hide failures.
- Introduce unnecessary complexity.

---

# 11. Expected Deliverables

For non-trivial tasks, provide:

1. Requirement Analysis
2. Implementation Plan
3. Implementation
4. Validation Results
5. Knowledge Updates
6. Summary
7. Remaining Risks

Do not jump directly into implementation.

---

# 12. Validation Checklist

Before requesting review, ensure:

- Build succeeds.
- Tests pass.
- Lint passes.
- Documentation matches implementation.
- Repository knowledge is synchronized.
- Harness validation succeeds.
- No unintended breaking changes exist.

If validation fails:

1. Stop.
2. Analyze the cause.
3. Fix the issue.
4. Validate again.
5. Report unresolved problems.

Never ignore validation failures.

---

# 13. Definition of Done

A task is complete only when:

- Implementation is complete.
- Validation succeeds.
- Tests pass.
- Documentation is updated.
- Related Harness knowledge is updated.
- Repository passes `harness validate`.
- Human review is completed.

---

# 14. Guiding Principles

When making decisions:

- Knowledge before Code.
- Architecture before Implementation.
- Correctness before Speed.
- Consistency before Creativity.
- Maintainability before Complexity.

If required knowledge is missing, stop and request clarification instead of making assumptions.

---

# 15. Final Reminder

Harness is a **knowledge-driven development system**, not just a source code repository.

Your responsibility is to maintain the consistency between:

```
Knowledge
      │
      ▼
Architecture
      │
      ▼
Implementation
      │
      ▼
Validation
      │
      ▼
Documentation
```

A successful task updates both the implementation and the repository knowledge whenever necessary.