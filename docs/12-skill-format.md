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

## Frontmatter Fields (v1.1)

```yaml
---
name: my-skill-name
description: One-line description of what this skill teaches.
metadata:
  version: "1.1"
  updated: 2026-06-21
  applies_to: ["node", "dotnet"]
  tier: 2
  keywords: ["keyword1", "keyword2"]
steps:
  - id: check_scope
    type: action_mappable
    required_tool: scope_check
  - id: analyze_cause
    type: narrative_gated
    blocks: verify_run
    gate_field: root_cause
---
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | ✅ | — | Skill identifier, matches directory name |
| `description` | string | ✅ | — | One-line summary |
| `metadata.version` | string | ✅ | — | Semver version string |
| `metadata.updated` | string | ✅ | — | ISO date (YYYY-MM-DD) |
| `metadata.applies_to` | string[] | ✅ | — | Stack filters: `["*"]`, `["node"]`, `["dotnet", "nestjs"]` |
| `metadata.triggers` | string[] | ⚠️ | — | **Deprecated** — use `tier` + `keywords` instead |
| `metadata.tier` | number | ❌ | 2 | Skill priority: 1 (core), 2 (contextual), 3 (on-demand) |
| `metadata.keywords` | string[] | ❌ | [] | Keywords for tier 2 matching (English + Vietnamese) |
| `steps` | object[] | ❌ | — | Danh sách các bước logic (thay thế cho `action_map` cũ) |
| `steps[].id` | string | ✅ | — | ID của step |
| `steps[].type` | string | ✅ | — | `action_mappable`, `narrative_gated`, hoặc `unenforceable` |
| `steps[].required_tool` | string | ⚠️ | — | Tool cần thực thi (bắt buộc cho `action_mappable`) |
| `steps[].order` | string | ❌ | — | Điều kiện thứ tự, vd `before(verify_run)` |
| `steps[].blocks` | string | ⚠️ | — | Tên tool bị chặn (bắt buộc cho `narrative_gated`) |
| `steps[].gate_field` | string | ⚠️ | — | Trường dữ liệu cần nộp (bắt buộc cho `narrative_gated`) |

### Valid `applies_to` Values

- `"*"` — all stacks
- `"node"`, `"dotnet"`, `"python"`, `"go"`, `"rust"`
- Custom values for project-specific skills

### Tier Definitions

| Tier | Behavior | Example |
|------|----------|---------|
| **1** | Always suggested at session start | `karpathy-guidelines`, `harness-workflow` |
| **2** | Suggested when keywords match task context | `systematic-diagnosis` (matches "bug", "fix") |
| **3** | Never auto-suggested, only explicit load | `write-a-skill`, `verification-loop` |

### Keywords Format

Keywords should include both English and Vietnamese terms for better matching:

```yaml
keywords: ["bug", "fix", "error", "crash", "debug", "lỗi", "sửa", "sập", "gỡ lỗi"]
```

### Deprecated `triggers` Field

The `triggers` field is deprecated in favor of `tier` + `keywords`:

- **Old:** `triggers: ["task_create"]` — always suggest on task_create
- **New:** `tier: 2` + `keywords: [...]` — suggest only when keywords match

Backward compatibility: Skills with only `triggers` field still work (default to tier 2, no keywords).

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
