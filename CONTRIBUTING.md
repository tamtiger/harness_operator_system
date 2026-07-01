# Contributing to Universal Coding Harness

Development rules for working on Harness source code.

---

## Project Structure

```
src/
├── cli.ts                ← CLI entry point
├── index.ts              ← Library exports
├── commands/             ← CLI command implementations
├── types/                ← All TypeScript interfaces
├── schemas/              ← Zod validation schemas
├── utils/                ← Pure utility functions
├── engines/              ← Engine implementations
└── mcp/                  ← MCP server + tool handlers
tests/
├── *.test.ts             ← Unit tests
```

## Conventions

- **Single package**: No monorepo. One `package.json`.
- **ESM only**: `"type": "module"`, imports with `.js` extension.
- **Strict TypeScript**: No `any`. Prefer discriminated unions.
- **Types first**: Define interfaces in `src/types/` before implementation.
- **No AI API keys**: Harness does NOT call AI. AI calls Harness via MCP.

## Build & Test

```bash
pnpm build          # tsup → dist/
pnpm test:run       # vitest (CI mode)
pnpm lint           # biome check
npx tsc --noEmit    # type check only
```

## After Every Change

- [ ] `npx tsc --noEmit` — no type errors
- [ ] `pnpm test:run` — all tests pass
- [ ] `pnpm build` — builds cleanly
- [ ] Update `CHANGELOG.md`
- [ ] Update `README.md` if CLI/structure changed

## Git Workflow

- Branch: `main` | `feature/*` | `fix/*`
- Commit message: [Conventional Commits](https://www.conventionalcommits.org/) format
- Before committing: **show diff + proposed commit message** to user for confirmation
- Do NOT commit without explicit user approval

