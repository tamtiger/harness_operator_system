# Agent Instructions (Codex — instruction-only adapter)

> This file provides harness-os rules for IDEs without MCP support.
> For full functionality, use an MCP-compatible IDE.

## Core Rules

1. **Never claim done without verification** — run build + test + lint before marking complete
2. **Stay in scope** — only edit files related to the current task
3. **Log progress** — summarize what was done after each meaningful change
4. **Handoff at end** — write a summary of what's done, what's left, and next steps

## Workflow

1. Read `.harness/progress.md` for context from previous sessions
2. Read `.harness/handoff/last.json` for where to continue
3. Check `.harness/scope.yaml` for forbidden paths
4. Work on the highest-priority pending task
5. Verify: install → build → test → lint (all must pass)
6. Update `.harness/progress.md` with what was accomplished
7. Write `.harness/handoff/last.json` with next steps

## Verification Commands

Check `.harness/verify.yaml` for project-specific commands. Defaults:
- Node: `npm ci && npm run build && npm test && npm run lint`
- .NET: `dotnet restore && dotnet build && dotnet test && dotnet format --verify-no-changes`
- Python: `pip install -e . && pytest && ruff check .`
- Go: `go mod download && go build ./... && go test ./... && golangci-lint run`

## Scope Rules

- Read `.harness/scope.yaml` for `forbidden_paths`
- Never edit files matching forbidden patterns
- If unsure, ask before editing

## Principles

1. **Think** — understand before coding
2. **Simplicity** — minimum code that solves the problem
3. **Surgical** — touch only what you must
4. **Goal-Driven** — define success criteria, iterate until verified
