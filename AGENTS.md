# AGENTS.md — Harness Platform

> **Harness Version:** 0.0.15
>
> **Purpose:** Operational Contract for all AI Agents contributing to the Harness Platform.
>
> **Scope:** This document applies to the entire Harness repository.

---

# 1. Mission

You are contributing to the **Harness Platform**.

Harness is not a normal software project.

It is an **AI-first development platform** whose purpose is to help AI Agents understand repositories, execute work consistently, validate changes, and evolve project knowledge over time.

Your responsibility is not only to write code, but to preserve the consistency between:

- Knowledge
- Architecture
- Implementation
- Validation
- Governance

Always prioritize long-term maintainability over short-term implementation speed.

---

# 2. Core Principles

Harness follows these principles:

1. **Knowledge First** — Understand repository knowledge before changing code.
2. **Architecture Before Implementation** — Follow architecture instead of creating new patterns.
3. **Single Source of Truth** — Knowledge Base defines expected behavior.
4. **Governance Over Assumptions** — Structural changes require review.
5. **Continuous Validation** — Every change must be validated before completion.

If implementation conflicts with documentation, treat the Knowledge Base as the authoritative source unless instructed otherwise.

---

# 3. Repository Overview

Project:

Harness Operator System

Purpose:

A platform for operating AI Agents through structured knowledge, repository contracts, execution workflows and governance.

Core Domains:

- Platform
- Repository
- Context
- Execution
- Capability
- Governance

Entry Point:

Platform Layer

---

# 4. Read Order (Knowledge First)

Before implementing any task, read information in the following order:

```
Task
    │
    ▼
Knowledge Base
    │
    ▼
Architecture
    │
    ▼
Related Specifications
    │
    ▼
Implementation Plan
    │
    ▼
Existing Source Code
```

Never start implementation before understanding the relevant knowledge.

Knowledge has higher priority than implementation.

Priority order:

```
Architecture
    ↓
Specifications
    ↓
Data Models
    ↓
Error Model
    ↓
Implementation Plan
    ↓
Source Code
```

---

# 5. Development Workflow

Every task must follow this workflow.

```
Explore
    │
    ▼
Understand
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

Do not skip any step.

Large architectural changes require Human Approval before implementation.

---

# 6. Working with Harness

Harness is a knowledge-driven platform.

Code is only one part of the repository.

Whenever implementation changes, determine whether the following also require updates:

| Changed | Also Update |
|----------|-------------|
| Architecture | Architecture Documents |
| Capability | Capability Specification |
| Workflow | Workflow Specification |
| Repository Structure | Repository Specification |
| Data Model | Data Model Specification |
| Manifest | Manifest Specification |
| Rules | Governance Documents |
| Public Behavior | Documentation |
| Errors | Error Model |

Implementation and Knowledge must remain synchronized.

---

# 7. Repository Rules

Always:

- Follow `03_SYSTEM_ARCHITECTURE.md`.
- Preserve package boundaries.
- Reuse existing capabilities before creating new ones.
- Keep dependencies unidirectional.
- Follow the shared Error Model.
- Keep documentation synchronized.
- Use relative paths throughout the repository.

Never:

- Break architecture.
- Introduce cyclic dependencies.
- Duplicate capabilities.
- Invent new contracts without specification.
- Skip validation.
- Hide validation failures.
- Remove tests to make builds pass.

---

# 8. Harness CLI Workflow

Use Harness CLI throughout development.

Before implementation:

```bash
harness doctor
```

Before review:

```bash
harness validate
```

Check repository status:

```bash
harness status
```

When modifying repository knowledge or governance:

```bash
harness proposal submit --file <proposal.md>
```

---

# 9. Build & Validation

Before completing any task, ensure:

```bash
npm run build
npm run test
npm run lint
```

or the equivalent project commands.

Validation requirements:

- Build passes
- Tests pass
- Lint passes
- Documentation updated
- Knowledge synchronized
- No architectural violations

---

# 10. Review Checklist

Verify:

- Requirements satisfied.
- Architecture preserved.
- Repository contracts respected.
- Dependencies remain correct.
- Performance acceptable.
- Compatibility preserved.
- Documentation updated.
- Tests updated.
- Knowledge Base synchronized.

---

# 11. Definition of Done

A task is complete only when:

- Implementation is complete.
- Validation succeeds.
- Tests pass.
- Documentation is updated.
- Knowledge Base is updated when applicable.
- Human review is completed for required changes.

---

# 12. Decision Authority

AI MAY:

- Refactor internal implementation.
- Improve readability.
- Improve documentation.
- Add or improve tests.
- Optimize implementation without changing observable behavior.

AI MUST REQUEST APPROVAL BEFORE:

- Changing architecture.
- Changing repository structure.
- Changing public contracts.
- Introducing new dependencies.
- Breaking backward compatibility.
- Modifying governance rules.
- Removing existing capabilities.

---

# 13. Communication

For non-trivial tasks, always provide:

1. Requirement Analysis
2. Impact Analysis
3. Implementation Plan
4. Validation Results
5. Summary
6. Remaining Risks
7. Suggested Commit Message

Do not perform commits unless explicitly instructed.

Always update the latest entry in `CHANGELOG.md` without modifying historical records.

---

# 14. Guiding Principle

Harness is a **Knowledge-Driven Development Platform**.

Your goal is not simply to produce working code.

Your goal is to keep the following layers consistent:

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
Governance
```

When uncertain, prefer reading more knowledge over writing more code.