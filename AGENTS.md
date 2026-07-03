# AGENTS.md

# Universal Coding Harness - AI Agent Guide

## Purpose

Welcome to **Universal Coding Harness**.

This project follows a **Documentation First** approach.

The documentation defines the architecture, behavior, and engineering standards.

**Never implement features based on assumptions.**

Always locate and read the relevant documentation before making changes.

---

# Source of Truth

When making decisions, use the following priority:

1. User Request
2. Architecture Decision Records (ADR)
3. Technical Design
4. Architecture Overview
5. Contracts
6. Existing Code

If code conflicts with documentation, **documentation is the source of truth**.

---

# Getting Started

Before implementing any task:

1. Read **README.md** to understand the project.
2. Read **docs/DOCUMENTATION_INDEX.md**.
3. Locate the documents related to your task.
4. Read them before writing code.

Do **not** explore the repository randomly.

---

# Documentation Index

The project documentation is organized by responsibility.

## Project Overview

Read these first:

| Document                        | Purpose                          |
| ------------------------------- | -------------------------------- |
| `README.md`                     | Project overview and philosophy  |
| `docs/DOCUMENTATION_INDEX.md`   | Documentation map and navigation |
| `docs/ARCHITECTURE_OVERVIEW.md` | High-level architecture          |
| `docs/TECHNICAL_DESIGN.md`      | Detailed implementation design   |
| `docs/TECHNOLOGY_STACK.md`      | Technology choices               |
| `docs/GLOSSARY.md`              | Project terminology              |

---

## Engineering Standards

Read when implementing or modifying core behavior.

| Document                     | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `docs/QUALITY_ATTRIBUTES.md` | Performance, scalability and reliability requirements |
| `docs/FAILURE_HANDLING.md`   | Error handling and recovery strategies                |
| `docs/STATE_MACHINE.md`      | Workflow and execution lifecycle                      |
| `docs/PLUGIN_API.md`         | Plugin architecture and extension points              |
| `docs/SECURITY_MODEL.md`     | Security model and constraints                        |
| `docs/VERSIONING.md`         | Versioning strategy and compatibility                 |

---

## Architecture Decisions

Location:

```text
docs/decisions/
```

Read the relevant ADR before changing architecture, introducing new patterns, or modifying existing designs.

ADR explains **why** a design exists.

Do not implement against an ADR without explicit approval.

---

## Contracts

Location:

```text
docs/contracts/
```

Read contracts before modifying:

* APIs
* Interfaces
* Events
* Configuration
* Schemas
* Data models

Implementation must follow contracts.

---

## Project Planning

Read the project plan before implementing large features.

Use it to determine:

* current milestone
* project scope
* implementation priorities
* future roadmap

Do not implement features outside the current milestone unless requested.

---

# Task Routing

Use the following guide to locate documentation.

| If your task is about... | Read...                                 |
| ------------------------ | --------------------------------------- |
| Repository analysis      | Architecture Overview, Technical Design |
| Knowledge Engine         | Technical Design, Versioning, Contracts |
| Context Engine           | Technical Design                        |
| Planning Engine          | Technical Design, State Machine, ADR    |
| Code Generation          | Technical Design                        |
| Verification             | Quality Attributes, Failure Handling    |
| Runtime                  | Technical Design                        |
| Plugins                  | Plugin API, Security Model              |
| Configuration            | Contracts, Versioning                   |
| Database                 | Contracts, ADR                          |
| Events                   | Contracts, ADR                          |
| Performance              | Quality Attributes                      |
| Workflow                 | State Machine                           |
| Security                 | Security Model                          |
| Public API               | Contracts, Versioning                   |

If multiple modules are affected, read documentation for each affected module.

---

# Implementation Workflow

Always follow this sequence:

```text
Understand Task
        ↓
Locate Documentation
        ↓
Read Documentation
        ↓
Create Implementation Plan
        ↓
Implement
        ↓
Verify
        ↓
Update Documentation (if needed)
```

---

# Before Coding

Before implementation, identify:

* Which module owns this responsibility?
* Which documents describe this module?
* Which contracts are affected?
* Which ADRs are related?
* Does this change impact other modules?

If the answer is unclear, read the documentation before continuing.

---

# Architecture Rules

Do not:

* invent architecture
* bypass module boundaries
* duplicate business logic
* hardcode project knowledge
* introduce undocumented behavior
* modify contracts without approval

The existing architecture should be extended—not replaced.

---

# Documentation Rules

Documentation is part of the implementation.

When changing:

* public APIs
* configuration
* contracts
* workflows
* plugins
* architecture

update the corresponding documentation.

If you cannot identify which document should be updated, consult `docs/DOCUMENTATION_INDEX.md`.

---

# Human Approval Required

Always request approval before:

* changing architecture
* changing contracts
* changing database schema
* introducing new dependencies
* changing public APIs
* modifying workflows
* deleting features

---

# Git Commit & Push Rules

* **No automatic commits/pushes:** AI Agent tuyệt đối không được tự ý thực hiện lệnh `git commit` hay `git push` lên remote. Mọi hành động commit/push bắt buộc phải tuân thủ quy định tại [CONTRIBUTION.md](CONTRIBUTION.md).

---

# Verification Checklist

Before marking a task complete:

* Requirement implemented
* Build succeeds
* Tests pass (if available)
* Contracts remain valid
* Architecture preserved
* Documentation updated (if required)

---

# Guiding Principle

> Read before implementing.
>
> Documentation defines the system.
>
> Architecture guides the implementation.
>
> AI implements the design—it does not redefine it.
