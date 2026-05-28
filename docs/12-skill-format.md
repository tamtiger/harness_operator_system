# Skill Format Specification (agentskills.io)

[← Mục lục](./README.md) | [← Skills](./skills.md)

---

## Overview

Skills are structured instruction documents that agents read to learn workflows and patterns. Each skill is a `SKILL.md` file with YAML frontmatter + markdown body.

---

## File Structure

```
skills/
├── my-skill/
│   └── SKILL.md          # Required: frontmatter + content
├── another-skill/
│   └── SKILL.md
```

Directory name MUST match the `name` field in frontmatter.

---

## Frontmatter Fields (v1.0)

```yaml
---
name: my-skill-name
version: "1.0"
updated: 2026-01-15
applies_to: ["node", "dotnet"]
triggers: ["session_start"]
description: One-line description of what this skill teaches.
---
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Skill identifier, matches directory name |
| `version` | string | ✅ | Semver version string |
| `updated` | string | ✅ | ISO date (YYYY-MM-DD) |
| `applies_to` | string[] | ✅ | Stack filters: `["*"]`, `["node"]`, `["dotnet", "nestjs"]` |
| `triggers` | string[] | ✅ | Tool names that trigger suggestion |
| `description` | string | ✅ | One-line summary |

### Valid `applies_to` Values

- `"*"` — all stacks
- `"node"`, `"dotnet"`, `"python"`, `"go"`, `"rust"`
- Custom values for project-specific skills

### Valid `triggers` Values

- `"session_start"` — suggested when session begins
- `"task_create"` — suggested when new task is created
- `"task_update"` — suggested when task status changes
- `"session_end"` — suggested at session end

---

## Markdown Body

After the closing `---`, write skill content in markdown. Recommended structure:

```markdown
# Skill Name

## When to Apply
- Conditions that make this skill relevant

## Workflow / Rules
1. Step-by-step instructions
2. ...

## Anti-patterns
- Things to avoid

## Examples
- Concrete examples if helpful
```

---

## Skill Resolution Order

1. **Repo-specific** (`.harness/skills/`) — highest priority
2. **User global** (`~/.harness/skills/`)
3. **Built-in** (`harness-os/skills/`)

Same-name skill at higher level overrides lower level.

---

## Migration from v0.7

In v0.7, some skills had frontmatter fields at the top level without proper nesting. v1.0 requires all fields inside the `---` fenced block.

If migrating old skills:
1. Ensure all 6 required fields are present in frontmatter
2. Remove any deprecated fields (none currently)
3. Run `harness doctor --check-skills-frontmatter` to validate

The migration script `scripts/migrate-frontmatter.ts` can auto-fix common issues:

```bash
npx tsx scripts/migrate-frontmatter.ts --dry-run skills/
npx tsx scripts/migrate-frontmatter.ts skills/  # apply fixes
```

---

## Validation

```bash
# Check all skills parse correctly
harness doctor --check-skills-frontmatter

# List skills with metadata
harness skills --list

# Show specific skill content
harness skills --show my-skill-name
```

---

## Creating Skills from Sessions

Agents can auto-generate skill drafts from session patterns:

```json
{ "tool": "skill_create_from_session", "args": { "session_id": "...", "theme": "error-handling" } }
```

This analyzes the session's audit log and produces a SKILL.md draft for human review.
