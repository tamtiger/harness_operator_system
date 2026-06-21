---
name: to-prd
description: "Turn the current conversation context into a structured Product Requirements Document (PRD). Use when the user wants to generate a PRD from current requirements."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
  tier: 2
  keywords: ["prd", "requirements", "product", "feature", "user-story", "acceptance", "yêu cầu", "sản phẩm", "tính năng", "câu chuyện người dùng", "chấp nhận"]
action_map:
  create_task:
    tool: "task_create"
    required: true
compliance_weight: 15
---

# Product Requirements Document (PRD) Generation

This skill takes the current conversation context and codebase understanding and produces a structured Product Requirements Document (PRD). Do NOT interview the user again — just synthesize what you already know from the conversation.

## Process

1. **Explore the Repo:** Understand the current state of the codebase if you haven't already. Respect existing vocabulary in the project and respect any ADRs in `docs/adr/`.
2. **Identify Deep Modules:** Sketch out the major modules you will need to build or modify. Actively look for opportunities to extract **deep modules** that encapsulate significant logic behind a simple, stable, testable interface.
3. **Draft the PRD:** Use the template below. Seek user feedback and approval. Once approved, write it as a plan or task list.

## PRD Template

```markdown
# PRD: [Feature Title]

## Problem Statement
The problem that the user is facing, articulated from the user's perspective.

## Solution
The proposed solution, also from the user's perspective.

## User Stories
A comprehensive, numbered list of stories in the standard format:
- **US1:** As an [actor], I want [feature], so that [benefit].
- **US2:** ...

## Implementation Decisions
A list of architectural decisions, including modules, interfaces, schema changes, and API contracts. Focus on defining "deep modules" and stable contracts (avoid transient details like specific file paths or line numbers).

## Testing Decisions
Describe what constitutes a good test and which modules will be targeted for testing. Define unit/integration/E2E test boundaries.

## Out of Scope
Items explicitly excluded from the current effort to prevent gold-plating.

## Further Notes
Any additional context, constraints, or future considerations.
```
