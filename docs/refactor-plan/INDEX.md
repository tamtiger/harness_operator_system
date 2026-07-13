# Harness Refactoring Plan — Master Index

> **Ngày:** 2026-07-13  
> **Tác giả:** Principal AI Runtime Architect / Software Architect / AI Agent Systems Engineer / DX Architect  
> **Trạng thái:** Planning Only — Không có code được viết, không có repository được thay đổi  
> **Reference:** https://github.com/obra/superpowers (main, v6.1.1) — verified từ source

---

## Documents

| File | Nội dung |
|---|---|
| `part1-inventory-architecture.md` | Executive Summary, Superpowers Runtime Inventory, Runtime Architecture Analysis |
| `part2-patterns-gaps.md` | Reusable Pattern Analysis, Harness Gap Analysis |
| `part3-mapping-architecture.md` | Superpowers→Harness Mapping Table, New Harness Architecture Design |
| `part4-skills-workflows-cli-mcp.md` | Core Skill Design, Workflow Design, CLI Refactoring, MCP Refactoring |
| `part5-docs-migration.md` | README/AGENTS.md/AGENTS_TEMPLATE.md Refactoring, Migration Roadmap |
| `part6-platform-adapters.md` | Multi-Platform Adapter Architecture, `harness install-adapter`, Phase 11 |

---

## Deliverable Checklist

| # | Deliverable | Document | Section |
|---|---|---|---|
| 1 | Executive Summary | part1 | §1 |
| 2 | Superpowers Runtime Inventory | part1 | §2 |
| 3 | Runtime Architecture Analysis | part1 | §3 |
| 4 | Reusable Pattern Analysis | part2 | §4 |
| 5 | Harness Gap Analysis | part2 | §5 |
| 6 | Superpowers → Harness Mapping | part3 | §6 |
| 7 | New Harness Runtime Architecture | part3 | §7 |
| 8 | Core Skill Design | part4 | §8 |
| 9 | Workflow Design | part4 | §9 |
| 10 | CLI Refactoring Plan | part4 | §10 |
| 11 | MCP Refactoring Plan | part4 | §11 |
| 12 | README Refactoring Plan | part5 | §12.1 |
| 13 | AGENTS.md Refactoring Plan | part5 | §12.2 |
| 14 | AGENTS_TEMPLATE.md Refactoring Plan | part5 | §12.3 |
| 15 | Incremental Migration Roadmap | part5 | §13 |
| 16 | Multi-Platform Adapter Architecture | part6 | §14–18 |

---

## Key Decisions Summary

### What Harness borrows from Superpowers (verified source)

| Superpowers Concept | Source File | Harness Adaptation |
|---|---|---|
| Skill as markdown behavioral contract | `skills/*/SKILL.md` | `skill` asset type in `.harness/skills/` |
| Session-start context injection | `hooks/session-start` | ContextService skill injection |
| Brainstorm → Plan → Execute separation | `brainstorming/SKILL.md`, `writing-plans/SKILL.md` | Planner phases in WorkflowEngine |
| Fresh subagent per task | `subagent-driven-development/SKILL.md` | ExecutionRuntime subagent dispatch |
| File handoff (task-brief, review-package) | `scripts/task-brief`, `scripts/review-package` | `src/execution/scripts/` equivalent |
| Durable progress ledger | `.superpowers/sdd/progress.md` | `.harness/run/<session>/progress.md` |
| Two-stage review (spec + quality) | `task-reviewer-prompt.md` | Two-stage review gate in execution loop |
| Iron Law + Rationalization Table | Multiple skills | Structure for all Harness skill files |
| TDD RED-GREEN-REFACTOR | `test-driven-development/SKILL.md` | `tdd-red-green-refactor` skill asset |
| Verification before completion | `verification-before-completion/SKILL.md` | `verify-before-done` skill asset |
| Systematic debugging 4 phases | `systematic-debugging/SKILL.md` | `systematic-debug` skill asset |
| Trigger-conditions-only description | `writing-skills/SKILL.md` (SDO section) | Harness skill frontmatter convention |
| Skill description = triggering conditions | `writing-skills/SKILL.md` | Applied to all Harness skill assets |

### What Harness keeps (Superpowers không có)

- Knowledge Base (21 spec files)
- Governance system (proposal → approve → promote)
- Capability registry (27 built-ins, 6-step registration)
- Shared + Local Harness merge
- Repository validation + conformance suite
- MCP server
- Context budget + ranking

### What Harness adds (neither Superpowers nor current Harness has)

- WorkflowEngine code component
- WorkflowTemplate YAML format
- Planner component (knowledge-aware)
- `harness workflow list/run` CLI commands
- `harness skill list/show` CLI commands
- `harness_workflow_list`, `harness_skill_list`, `harness_context_load` MCP tools
- `governance-checkpoint` skill (Harness-specific behavioral contract)
- Structured execution report
