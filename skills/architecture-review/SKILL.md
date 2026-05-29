---
name: architecture-review
description: "Surface architectural friction and propose deepening opportunities — turn shallow modules into deep ones for testability and maintainability."
metadata:
  version: "1.0"
  updated: "2026-05-28"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["architecture", "module", "refactor", "deep", "shallow", "coupling", "seam", "kiến trúc", "mô-đun", "tái cấu trúc", "sâu", "nông", "liên kết", "điểm nối"]
---

# Architecture Review

## Glossary

| Term | Definition |
|------|-----------|
| Module | Any unit with an interface and implementation (class, service, package) |
| Interface | The surface area callers depend on (public API, params, return types) |
| Implementation | Hidden complexity behind the interface |
| Depth | Ratio of implementation complexity to interface complexity. Deep = simple interface, rich implementation. Shallow = complex interface, trivial implementation |
| Seam | A boundary where you can substitute one implementation for another |
| Adapter | A thin translation layer between your code and an external dependency |
| Leverage | How much downstream code benefits from one change at the seam |
| Locality | How close related decisions live to each other (high = good) |

## Key Principles

1. **Deletion test** — If you deleted this module, how much would break? Low breakage = low leverage = candidate for merging or removal.
2. **Interface is the test surface** — If the interface is simple, testing is simple. Deep modules are inherently more testable.
3. **One adapter = hypothetical seam** — Every adapter you write is a bet that the dependency behind it might change. One adapter per external dependency; no more.

## Process

### Phase 1: Explore

Look for friction organically. Signals to watch for:

- **Bouncing between modules** — A single change touches 4+ files across layers
- **Shallow modules** — Classes that just delegate without adding value
- **No locality** — Related config, types, and logic scattered across the tree
- **Tight coupling** — Module A imports internals of Module B
- **Untested code** — Complex logic with no test coverage (often means interface is too wide)

### Phase 2: Present Candidates

For each candidate, present:

| Field | Content |
|-------|---------|
| Files | List of affected files |
| Problem | What friction exists today |
| Solution | Proposed structural change |
| Benefits | Locality gain + leverage gain |
| Strength | **Strong** / **Worth exploring** / **Speculative** |

### Phase 3: Grilling Loop

Walk the design tree with the user:

1. Pick the strongest candidate
2. Ask: "What constraints would prevent this?" (dependencies, deadlines, team ownership)
3. If blocked → pivot to next candidate
4. If viable → sketch the target structure (files, interfaces, seams)
5. Confirm scope and proceed

Repeat until the user is satisfied or all candidates are resolved.

## Integration with Harness

- `progress_log` — Log each finding as you discover it (problem + affected files)
- `instinct_add` — When a pattern recurs across sessions, capture it as an instinct (e.g., "shallow service wrappers in this repo add no value")
- `scope_check` — Before proposing modifications, verify target files are within the active task scope

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|-------------|
| Refactor everything at once | Unbounded scope, impossible to verify |
| Add interfaces "for testability" without depth | Creates shallow modules, increases surface area |
| Split by layer instead of by feature | Destroys locality, forces cross-cutting changes |
| Adapter around something that will never change | Unnecessary indirection, zero leverage |
| Rename without restructuring | Cosmetic change, no architectural improvement |
