# DOCUMENTATION_INDEX.md

# Documentation Index

> Navigation guide for developers and AI Coding Agents.

This document is the entry point for all project documentation.

Do **not** read every document.

Instead, identify your task and follow the recommended reading path.

---

# Documentation Philosophy

Universal Coding Harness follows a **Documentation First** approach.

Documentation is organized by responsibility.

Each document answers a different question.

| Question                      | Read                     |
| ----------------------------- | ------------------------ |
| What is this project?         | README.md                |
| How is the system organized?  | ARCHITECTURE_OVERVIEW.md |
| How is it implemented?        | TECHNICAL_DESIGN.md      |
| Why was this design chosen?   | ADR                      |
| What are the interfaces?      | Contracts                |
| How should the system behave? | Engineering Standards    |

---

# Documentation Structure

```text
README.md
AGENTS.md

docs/
│
├── DOCUMENTATION_INDEX.md
│
├── ARCHITECTURE_OVERVIEW.md
├── TECHNICAL_DESIGN.md
├── TECHNOLOGY_STACK.md
├── GLOSSARY.md
│
├── QUALITY_ATTRIBUTES.md
├── FAILURE_HANDLING.md
├── STATE_MACHINE.md
├── PLUGIN_API.md
├── SECURITY_MODEL.md
├── VERSIONING.md
│
├── adr/
│
└── contracts/
```

---

# Recommended Reading Order

For new contributors:

1. README.md
2. ARCHITECTURE_OVERVIEW.md
3. TECHNICAL_DESIGN.md
4. TECHNOLOGY_STACK.md
5. GLOSSARY.md

After that, read only the documentation related to your task.

---

# Documentation Reference

## README.md

**Purpose**

Project overview.

Read when:

* First time opening the repository.
* Understanding project goals.
* Understanding project philosophy.

---

## ARCHITECTURE_OVERVIEW.md

**Purpose**

High-level architecture.

Read when:

* Understanding modules.
* Understanding boundaries.
* Understanding responsibilities.

Related:

* TECHNICAL_DESIGN
* ADR

---

## TECHNICAL_DESIGN.md

**Purpose**

Detailed implementation design.

Read when:

* Implementing new features.
* Refactoring.
* Extending existing modules.

Related:

* Contracts
* State Machine
* ADR

---

## TECHNOLOGY_STACK.md

**Purpose**

Technology decisions.

Read when:

* Introducing new libraries.
* Replacing dependencies.
* Choosing implementation strategies.

---

## GLOSSARY.md

**Purpose**

Project terminology.

Read when:

* Encountering unfamiliar terms.
* Understanding domain language.

---

## QUALITY_ATTRIBUTES.md

**Purpose**

Performance and quality requirements.

Read when:

* Optimizing performance.
* Measuring scalability.
* Designing new components.

---

## FAILURE_HANDLING.md

**Purpose**

Failure and recovery strategy.

Read when:

* Handling errors.
* Implementing retries.
* Designing recovery workflows.

---

## STATE_MACHINE.md

**Purpose**

Workflow lifecycle.

Read when:

* Implementing workflow logic.
* Changing execution flow.
* Debugging state transitions.

---

## PLUGIN_API.md

**Purpose**

Plugin architecture.

Read when:

* Creating plugins.
* Extending language support.
* Adding integrations.

---

## SECURITY_MODEL.md

**Purpose**

Security constraints.

Read when:

* Accessing filesystem.
* Executing commands.
* Managing permissions.
* Integrating external tools.

---

## VERSIONING.md

**Purpose**

Compatibility strategy.

Read when:

* Changing schemas.
* Updating configuration.
* Modifying public APIs.
* Creating migrations.

---

## ADR

Location:

```text
docs/decisions/
```

Purpose:

Architecture Decision Records.

Read when:

* Making architectural changes.
* Introducing new patterns.
* Questioning existing designs.

ADR explains **why** a design exists.

---

## Contracts

Location:

```text
docs/contracts/
```

Purpose:

System contracts.

Includes:

* Interfaces
* Events
* Configuration
* Schemas
* APIs

Read before changing any public behavior.

---

# Task Navigation

## I need to...

### Understand the project

Read:

* README
* Architecture Overview

---

### Add a new feature

Read:

* Technical Design
* Related ADR
* Related Contracts

---

### Modify architecture

Read:

* Architecture Overview
* Technical Design
* ADR

Approval required.

---

### Implement a workflow

Read:

* State Machine
* Failure Handling
* Technical Design

---

### Create a plugin

Read:

* Plugin API
* Security Model
* Technology Stack

---

### Change configuration

Read:

* Contracts
* Versioning

---

### Modify APIs

Read:

* Contracts
* Versioning
* ADR

---

### Improve performance

Read:

* Quality Attributes
* Technical Design

---

### Handle failures

Read:

* Failure Handling
* State Machine

---

### Work with database

Read:

* Contracts
* Versioning
* ADR

---

### Update security

Read:

* Security Model

---

# Documentation Dependency

```text
README
        │
        ▼
Architecture Overview
        │
        ▼
Technical Design
        │
        ├──────────────┐
        ▼              ▼
      ADR         Contracts
        │              │
        └──────┬───────┘
               ▼
Engineering Standards
(Quality, Security,
State Machine,
Versioning,
Failure Handling,
Plugin API)
```

---

# For AI Coding Agents

Do not search the repository randomly.

Use this document to locate the correct documentation.

Read only what is relevant to your task.

If multiple modules are affected, read documentation for every affected module.

If documentation is missing or inconsistent:

* Stop implementation.
* Ask for clarification.
* Never invent architecture or undocumented behavior.

---

# Guiding Principle

> The repository is organized so that documentation answers engineering questions before code does.

Documentation defines the architecture.

Code implements the documentation.
