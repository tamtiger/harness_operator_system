---
name: strategic-compact
description: "Manage context window strategically — summarize, compact, and preserve critical information."
metadata:
  version: "1.0"
  updated: "2026-05-26"
  applies_to: ["*"]
  triggers: ["session_start"]
  tier: 1
  keywords: []
---

# Strategic Compact

Context windows are finite. Manage them deliberately.

## Core Principle

**Preserve what matters, discard what doesn't. Never lose critical state.**

## When to Compact

- Context approaching limit (feeling "foggy" about earlier decisions)
- Switching between unrelated tasks
- Before starting a complex multi-step operation
- After completing a major milestone

## What to Preserve

### Always Keep
- Current task and success criteria
- Key decisions made and WHY
- File paths being modified
- Error messages encountered
- Unfinished items

### Safe to Discard
- Full file contents already processed
- Intermediate debugging output
- Exploration paths that led nowhere
- Verbose command output (keep summary)

## Compaction Strategy

1. **Summarize decisions** — "Chose approach X because Y"
2. **List active files** — paths only, not full content
3. **Note blockers** — what's preventing progress
4. **Record state** — what's done, what's next
5. **Drop noise** — verbose logs, failed explorations

## Handoff as Compaction

The `session_handoff` tool IS strategic compaction:
- Summary = compressed context
- Unfinished = what to reload
- Next steps = where to resume

## Rules

- Compact BEFORE you lose information, not after
- Always preserve the "why" behind decisions
- File paths are cheap to store, full contents are expensive
- If you can re-read a file, don't store its contents in context
- Progress log is your external memory — use it

## Integration with Harness

- `progress_log` → externalize completed work (free up context)
- `handoff_write` → structured compaction for session boundary
- `session_start` → reload only what's needed from handoff
- `instinct_add` → persist patterns that survive across sessions

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Keep everything in context | Externalize to progress/handoff |
| Lose track of decisions | Log decisions with rationale |
| Forget file paths | Keep active file list |
| Re-read files unnecessarily | Note key facts, re-read only if needed |
| No handoff at session end | Always write handoff |
