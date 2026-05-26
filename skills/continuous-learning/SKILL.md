---
name: continuous-learning
version: "1.0"
updated: 2026-05-26
applies_to: ["*"]
triggers: ["session_end", "task_update"]
description: Extract and persist patterns from experience — instincts evolve into skills over time.
---

# Continuous Learning

Every session is an opportunity to learn. Capture patterns, prune noise, evolve skills.

## Core Principle

**What you learn once should benefit every future session.**

## The Learning Cycle

```
Experience → Pattern Recognition → Instinct → Validation → Skill
```

1. **Experience** — encounter a problem and solve it
2. **Recognize** — notice this is a reusable pattern
3. **Capture** — `instinct_add` with description + tags
4. **Validate** — pattern proves useful across sessions (confidence grows)
5. **Evolve** — cluster of related instincts becomes a skill

## When to Capture

Capture an instinct when you:
- Solve a problem that took multiple attempts
- Discover a non-obvious approach that worked
- Find a pattern that applies beyond this specific task
- Make a mistake you want to avoid repeating
- Learn a project-specific convention

## Instinct Quality

Good instincts are:
- **Specific** — actionable, not vague advice
- **Tagged** — findable by future queries
- **Contextual** — when does this apply?

Examples:
- ✅ "In this repo, always run `npm run typecheck` before `npm test` — tests assume types are valid" [tags: node, testing, repo:myapp]
- ✅ "EF Core migrations must be created from the Infrastructure project, not Domain" [tags: dotnet, ef-core, migrations]
- ❌ "Write good code" (too vague)
- ❌ "Tests are important" (obvious, not actionable)

## Confidence Scoring

- New instinct starts at 0.5
- Referenced and successful → +0.1 (max 1.0)
- Not referenced for N sessions → -0.05 decay
- Below 0.2 after 30 days → candidate for pruning

## Pruning

Regularly prune instincts that:
- Have low confidence (< 0.2)
- Are expired (past TTL)
- Are superseded by a skill
- Are too vague to be actionable

## Evolution: Instincts → Skills

When 5+ instincts share a tag cluster:
1. `instinct_evolve(tag_cluster)` → generates skill draft
2. Review and refine the draft
3. Save as SKILL.md with proper frontmatter
4. Prune the source instincts (now captured in skill)

## Integration with Harness

- After solving a tricky problem → `instinct_add`
- At session start → `instinct_get` for relevant patterns
- Periodically → `instinct_prune` to remove noise
- When cluster forms → `instinct_evolve` to create skill
- At session end → reflect on what was learned

## Anti-Patterns

| Anti-Pattern | Correct |
|---|---|
| Never capture patterns | Add instinct after each learning |
| Capture everything | Only actionable, specific patterns |
| Never prune | Regular pruning keeps signal high |
| Ignore instincts at start | Query relevant instincts per task |
| Manual skill creation only | Let instincts evolve naturally |
