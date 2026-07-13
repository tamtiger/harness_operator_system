# Harness Platform — End-to-End Review & Documentation Upgrade

> **Review Date:** 2026-07-13
> **Reviewer Role:** Senior Platform Architect / DX Reviewer / QA Lead / Technical Writer / AI Agent Runtime Auditor
> **Scope:** CLI · MCP · Installation · Init · Runtime · Knowledge · Governance · Documentation

---

# PART 1 — EXECUTIVE SUMMARY

## Overall Scores

| Dimension | Score | Verdict |
|---|---|---|
| **Platform Maturity** | 6.5 / 10 | Solid foundation, critical usability gaps |
| **Production Readiness** | ⚠️ NOT READY | P0 init bug + version chaos break first-run experience |
| **AI Agent Readiness** | ⚠️ PARTIAL | CLI works once installed; MCP config missing; AGENTS.md incomplete |
| **Developer Experience** | 5 / 10 | 5 commands have arg/flag mismatches vs docs |

## Summary Statement

Harness has a well-designed six-domain architecture with strong internals — the build compiles, tests cover all domains, and the runtime orchestration is sound. However, the platform fails at the entry points that matter most: `harness init` silently produces a stub AGENTS.md instead of the full template, the CLI reports the wrong version, and no MCP client configuration examples exist anywhere. A new user or AI agent cannot successfully onboard without hitting these blockers.

## Major Risks

1. **P0 — Templates missing from dist**: Every `harness init` call produces a minimal stub AGENTS.md. The full template exists in `src/` but is never copied to `dist/`.
2. **P0 — No MCP client config**: Zero guidance on connecting Claude Desktop, Cursor, or any MCP client to the server. The MCP value proposition is invisible.
3. **P1 — Version mismatch**: `package.json` says `0.0.15`, CLI outputs `v1.0.0 (spec 4.0)`. Automated tooling relying on version detection will break.
4. **P1 — CLI arg mismatches**: `harness install` and `harness proposal submit` parse args differently than documented, causing silent failures.
5. **P1 — AGENTS.md incomplete**: Missing entire MCP section; missing `harness context`, `harness run`, `conformance` from workflow; AI Agents won't know how to use key platform features.

---

# PART 2 — FINDINGS

## F-001 · P0 · Templates Not Copied to dist

| Field | Value |
|---|---|
| **Severity** | P0 — Critical |
| **Area** | Build / Init |
| **Description** | `harness init` falls back to a 3-line stub AGENTS.md instead of the full template |
| **Root Cause** | `init.ts` resolves template path as `path.resolve(__dirname, '../../../../src/shared/templates/AGENTS_TEMPLATE.md')`. At runtime `__dirname` is inside `dist/adapters/cli/commands/`, so this path walks up to the project root and then into `src/` — which works in development but not when the package is installed globally (`npm install -g`). Additionally, `tsconfig.json` `include: ["src/**/*"]` only compiles `.ts` files; `.md` files are never copied to `dist/`. |
| **Impact** | Every user who installs globally gets a 3-line AGENTS.md. The primary value of `harness init` is destroyed. |
| **Recommendation** | Add a `postbuild` script in `package.json` to copy templates: `"postbuild": "xcopy /E /I src\\shared\\templates dist\\shared\\templates"` (Windows) or use `cp -r` cross-platform via a small Node script. Then update the path in `init.ts` to `path.resolve(__dirname, '../../../shared/templates/AGENTS_TEMPLATE.md')` (relative to `dist/`). |

## F-002 · P0 · No MCP Client Configuration

| Field | Value |
|---|---|
| **Severity** | P0 — Critical |
| **Area** | MCP / Documentation |
| **Description** | No `claude_desktop_config.json`, Cursor `.cursor/mcp.json`, or any MCP client config example exists anywhere in the repo |
| **Root Cause** | Never written. The MCP server works but there is no onboarding documentation for connecting clients. |
| **Impact** | Users cannot connect any AI tool to the Harness MCP server without guessing the correct config format. The entire MCP feature surface is invisible to new users. |
| **Recommendation** | Add MCP configuration examples to README.md and to the `docs/` or `.harness/` directory. See Part 5 (updated README) for exact config blocks. |

## F-003 · P1 · CLI Version Hardcoded

| Field | Value |
|---|---|
| **Severity** | P1 — High |
| **Area** | CLI |
| **Description** | `harness version` outputs `harness v1.0.0 (spec 4.0)` regardless of the actual package version |
| **Root Cause** | `src/adapters/cli/index.ts` hardcodes the string `'harness v1.0.0 (spec 4.0)'`. `package.json` declares `"version": "0.0.15"`. |
| **Impact** | Version-aware tooling (update scripts, CI checks) gets the wrong version. Confusing for users. |
| **Recommendation** | `platform/service.ts` already has a `getPackageVersion()` helper that reads `package.json` dynamically. Expose it: change `console.log('harness v1.0.0 (spec 4.0)')` to `console.log(\`harness v${getPackageVersion()} (spec 4.0)\`)`. Also ensure `resolveJsonModule: true` in `tsconfig.json`. |

## F-004 · P1 · `harness init --force` Not Implemented

| Field | Value |
|---|---|
| **Severity** | P1 — High |
| **Area** | CLI / Init |
| **Description** | The CLI spec (`13_CLI_SPECIFICATION.md`), README, and help text all document `harness init [--force]`, but `init.ts` always `process.exit(1)` when `.harness/harness.yaml` already exists |
| **Root Cause** | `--force` flag is never read from `args` in either `index.ts` or `init.ts`. |
| **Impact** | Developers cannot re-initialize a repo without manually deleting `.harness/`. The `harness init /tmp/test --force` pattern documented in AGENTS.md does not work. |
| **Recommendation** | In `index.ts`, parse `--force` and pass it to `runInit()`. In `init.ts`, check `options.force` before the early exit. |

## F-005 · P1 · `harness install` Arg Mismatch

| Field | Value |
|---|---|
| **Severity** | P1 — High |
| **Area** | CLI |
| **Description** | Spec and README document `harness install [--source <uri>] [--version <ver>]` (named flags). Implementation reads positional `cleanArgs[1]` as source and `cleanArgs[2]` as version. |
| **Root Cause** | `index.ts` never parses `--source` or `--version` flags for the install command. |
| **Impact** | `harness install --source https://github.com/org/harness.git --version v2.0.0` silently uses the string `--source` as the source URI. Users following documentation get incorrect behavior. |
| **Recommendation** | Parse `--source` and `--version` flags in `index.ts` for the install branch, same pattern used for `--status` / `--type` in proposal list. |

## F-006 · P1 · `harness proposal submit` API Mismatch

| Field | Value |
|---|---|
| **Severity** | P1 — High |
| **Area** | CLI / Governance |
| **Description** | Spec and README document `harness proposal submit [--file <path>]` to create a proposal from a markdown file. Implementation takes a positional `<asset-id>` and calls `submitExistingProposal(id)`, which submits a **pre-existing** draft proposal by ID. |
| **Root Cause** | The submit command was designed for a different use case than documented. There is no way to create a new proposal from a markdown file via CLI. |
| **Impact** | Agents following governance workflow write a proposal to a file, run `harness proposal submit --file /tmp/proposal.md`, and get an error (no `--file` parsing). The entire AI-driven governance flow is broken. |
| **Recommendation** | Either (a) implement `--file <path>` parsing that reads the markdown file and calls `submitProposal({ title, content })`, or (b) update all documentation to reflect the actual `<asset-id>` usage. Option (a) is strongly preferred. |

## F-007 · P1 · `harness context` Hardcoded Tags

| Field | Value |
|---|---|
| **Severity** | P1 — Medium-High |
| **Area** | CLI / Context |
| **Description** | `runContext()` always passes `tags: ['auth', 'implementation']` regardless of the `--task` description provided |
| **Root Cause** | Tags are hardcoded in `context.ts`. |
| **Impact** | The context command always returns the same subset of assets regardless of the task. An agent asking for context about "database migrations" gets auth/implementation assets instead. |
| **Recommendation** | Either derive tags from the task description (simple keyword extraction), or remove the static tags and let the context builder filter by relevance alone. |

## F-008 · P1 · Governance CLI Missing `promote` / `requestChanges` / `reject`

| Field | Value |
|---|---|
| **Severity** | P1 — Medium |
| **Area** | CLI / Governance |
| **Description** | `GovernanceService` implements `promote()`, `requestChanges()`, and `reject()`. `PlatformService` wraps `rejectProposal()`. None of these are exposed via CLI commands. |
| **Root Cause** | CLI adapter was not updated when these methods were added. |
| **Impact** | The full governance lifecycle (submit → review → approve/reject → promote) cannot be completed from the CLI. Reviewers must interact with GovernanceService directly. |
| **Recommendation** | Add `harness proposal reject <id>`, `harness proposal request-changes <id>`, and `harness proposal promote <id>` to `src/adapters/cli/commands/proposal/`. |

## F-009 · P2 · README Entirely in Vietnamese

| Field | Value |
|---|---|
| **Severity** | P2 — Medium |
| **Area** | Documentation |
| **Description** | The entire README.md is in Vietnamese. AI coding tools (Claude Code, Codex, Gemini CLI, Cursor) use English-primary system prompts and will struggle to parse Vietnamese docs reliably. |
| **Root Cause** | Intentional localization decision. |
| **Impact** | International users and all English-first AI agents get no usable onboarding. The platform's primary consumers (AI tools) are disadvantaged. |
| **Recommendation** | Rewrite README in English as the primary language. A Vietnamese translation can exist as a secondary file (`README.vi.md`). |

## F-010 · P2 · MCP `harness_proposal_submit` Schema Mismatch vs AGENTS.md

| Field | Value |
|---|---|
| **Severity** | P2 — Medium |
| **Area** | MCP |
| **Description** | `AGENTS.md` section 7 documents `harness_proposal_submit` as accepting `{ title, content, author }` to create a new proposal. The actual MCP implementation accepts `{ id }` to submit a pre-existing draft. |
| **Root Cause** | Same mismatch as F-006; the AGENTS.md was written against the spec, not the implementation. |
| **Impact** | AI agents following AGENTS.md will call `harness_proposal_submit` with `title` and `content` and get an error. |
| **Recommendation** | Either fix the MCP tool to accept `title + content` and create a new proposal (preferred), or update AGENTS.md section 7 to document the actual `{ id }` interface. |

## F-011 · P2 · No Uninstall Procedure Documented

| Field | Value |
|---|---|
| **Severity** | P2 — Low-Medium |
| **Area** | Documentation |
| **Description** | No uninstall procedure is documented anywhere — not in README, not in AGENTS.md, not in the adoption guide. |
| **Root Cause** | Never written. |
| **Impact** | Users who want to remove Harness from a project or globally uninstall the CLI have no guidance. |
| **Recommendation** | Document: `npm uninstall -g harness-operator-system` to remove global CLI; manually delete `.harness/` from a project to remove project-level init; remove `AGENTS.md` if desired. |

## F-012 · P2 · `harness manifest` Command Referenced But Not Implemented

| Field | Value |
|---|---|
| **Severity** | P2 — Low |
| **Area** | CLI |
| **Description** | The review prompt scope lists `manifest` as a CLI command to audit. No `manifest` command exists in `index.ts` or `commands/`. |
| **Root Cause** | Never implemented. |
| **Impact** | Minor — no documentation claims it exists. Mentioning it creates false expectations. |
| **Recommendation** | Either implement `harness manifest [path]` to display the parsed manifest contents (useful for debugging), or explicitly document that no such command exists. |

---

# PART 3 — CLI AUDIT TABLE

| Command | Exists | Works | Problems |
|---|---|---|---|
| `harness help` | ✅ | ✅ | None |
| `harness version` | ✅ | ⚠️ | Hardcoded `v1.0.0` — should read from `package.json` (F-003) |
| `harness init [path]` | ✅ | ⚠️ | No `--force` flag (F-004); templates not in dist so AGENTS.md is stub (F-001) |
| `harness validate [path] [--strict]` | ✅ | ✅ | None |
| `harness status [--json]` | ✅ | ✅ | None |
| `harness doctor` | ✅ | ✅ | None |
| `harness run "task"` | ✅ | ✅ | None |
| `harness context --task "..."` | ✅ | ⚠️ | Tags hardcoded `['auth','implementation']` regardless of task (F-007) |
| `harness capability list` | ✅ | ✅ | None |
| `harness install [source] [version]` | ✅ | ⚠️ | Uses positional args, not `--source`/`--version` flags as documented (F-005) |
| `harness update [version] [--force]` | ✅ | ✅ | None |
| `harness sync` | ✅ | ✅ | None |
| `harness publish <asset-path>` | ✅ | ✅ | None |
| `harness proposal list` | ✅ | ✅ | None |
| `harness proposal submit` | ✅ | ⚠️ | Takes `<asset-id>` (submits existing draft), not `--file <path>` as documented (F-006) |
| `harness proposal approve <id>` | ✅ | ✅ | None |
| `harness proposal reject <id>` | ❌ | ❌ | Not implemented — GovernanceService.reject() exists but no CLI command (F-008) |
| `harness proposal promote <id>` | ❌ | ❌ | Not implemented — GovernanceService.promote() exists but no CLI command (F-008) |
| `harness proposal request-changes <id>` | ❌ | ❌ | Not implemented — GovernanceService.requestChanges() exists but no CLI command (F-008) |
| `harness mcp-server` | ✅ | ✅ | None |
| `harness conformance run` | ✅ | ✅ | None |
| `harness manifest` | ❌ | ❌ | Never implemented (F-012) |

---

# PART 4 — MCP AUDIT TABLE

| Tool | Exists | Callable | Actual Schema | Problems |
|---|---|---|---|---|
| `harness_run` | ✅ | ✅ | `{ description: string, workflowId?: string }` | Schema param is `description` but AGENTS.md says `task` — minor naming inconsistency |
| `harness_validate` | ✅ | ✅ | `{ root?: string }` | None |
| `harness_proposal_list` | ✅ | ✅ | `{ status?: enum }` | None |
| `harness_proposal_submit` | ✅ | ⚠️ | `{ id: string }` — submits **existing** draft by ID | AGENTS.md documents `{ title, content, author }` to **create** new proposal — schema mismatch (F-010) |
| MCP client config (Claude Desktop) | ❌ | — | — | No config examples anywhere (F-002) |
| MCP client config (Cursor) | ❌ | — | — | No config examples anywhere (F-002) |
| MCP client config (Kiro/generic) | ❌ | — | — | No config examples anywhere (F-002) |

---

# PART 5 — PRIORITY ROADMAP

## P0 — Must Fix (Blocking)

| ID | Task | Files |
|---|---|---|
| P0-1 | Copy templates to dist on build | `package.json` (postbuild script), `init.ts` (fix path to `dist/shared/templates/`) |
| P0-2 | Add MCP client config examples | `README.md`, optionally `docs/mcp-setup.md` |

## P1 — Should Fix

| ID | Task | Files |
|---|---|---|
| P1-1 | Fix CLI version to read from package.json | `src/adapters/cli/index.ts`, `src/platform/service.ts` (already has helper) |
| P1-2 | Implement `--force` for `harness init` | `src/adapters/cli/index.ts`, `src/adapters/cli/commands/init.ts` |
| P1-3 | Fix `harness install` to parse `--source` / `--version` flags | `src/adapters/cli/index.ts` |
| P1-4 | Fix `harness proposal submit` to accept `--file <path>` | `src/adapters/cli/index.ts`, `src/adapters/cli/commands/proposal/submit.ts` |
| P1-5 | Fix `harness context` to derive tags from task description | `src/adapters/cli/commands/context.ts` |
| P1-6 | Add `harness proposal reject/promote/request-changes` CLI commands | `src/adapters/cli/commands/proposal/` |
| P1-7 | Fix AGENTS.md — add MCP section, add missing CLI commands | `AGENTS.md` |
| P1-8 | Fix MCP `harness_proposal_submit` to accept title+content OR update AGENTS.md schema | `src/adapters/mcp/server.ts`, `AGENTS.md` |

## P2 — Nice to Have

| ID | Task | Files |
|---|---|---|
| P2-1 | Rewrite README.md in English | `README.md` |
| P2-2 | Document uninstall procedure | `README.md`, `AGENTS.md` |
| P2-3 | Implement `harness manifest [path]` command | `src/adapters/cli/` |
| P2-4 | Update AGENTS Template with conformance + MCP examples | `src/shared/templates/AGENTS_TEMPLATE.md` |
| P2-5 | Add `resolveJsonModule: true` to tsconfig.json | `tsconfig.json` |

---

> **Xem các file draft riêng biệt:**
> - `REVIEW_README_DRAFT.md` — nội dung README.md mới
> - `REVIEW_AGENTS_DRAFT.md` — nội dung AGENTS.md mới
> - `REVIEW_AGENTS_TEMPLATE_DRAFT.md` — nội dung AGENTS_TEMPLATE.md mới

---
