---
name: write-a-skill
description: "A meta-skill guiding the creation and updates of new agent skills. Explains YAML frontmatter and file structure for harness-os skills."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 3
  keywords: []
---

# Writing Skills in Harness-OS

This meta-skill guides the creation of new modular skills for AI coding agents.

## Process

1. **Gather Requirements:** Ask the user:
   - What task, methodology, or stack does this skill cover?
   - What specific workflows or checklists should the agent follow?
   - What are the triggers (tools that run) where this skill should be suggested?
2. **Draft the Skill:** Create the file at `skills/<skill-name>/SKILL.md`. Include standard YAML frontmatter and a clean markdown body.
3. **Verify the Skill:** Run `harness doctor` to ensure the YAML frontmatter is valid and parseable.
4. **Review with User:** Present the draft to the user for feedback before final approval.

## Skill Directory Structure

```
skills/
└── my-new-skill/
    ├── SKILL.md           # Core instructions (required)
    ├── REFERENCE.md       # Supporting reference documentation (optional)
    └── EXAMPLES.md        # Extended examples / code blocks (optional)
```

## Frontmatter Schema

Every `SKILL.md` must start with a YAML frontmatter block containing these fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique skill name matching directory name (kebab-case). |
| `description` | string | One-line summary of what the skill teaches or handles. |
| `metadata.version` | string | Semver version (e.g. "1.0"). |
| `metadata.updated` | string | Last updated ISO date (YYYY-MM-DD). |
| `metadata.applies_to` | string[] | Stack filters: `["*"]` for all, or stacks like `["node"]`, `["dotnet"]`, `["php"]`. |
| `metadata.triggers` | string[] | Tool names that trigger this skill (e.g., `["session_start", "task_create"]`). |
| `metadata.tier` | number | `1` = always suggested at session_start, `2` = keyword-matched contextual, `3` = on-demand only. |
| `metadata.keywords` | string[] | Keywords for tier-2 matching (English + Vietnamese). Empty array `[]` for tier 1/3. |

Example:
```yaml
---
name: my-new-skill
description: "Brief summary."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["node"]
  triggers: ["session_start"]
  tier: 2
  keywords: ["keyword1", "keyword2", "từ khóa"]
---
```

## Body Guidelines

- Keep the body structured using standard Markdown headings (`#`, `##`, `###`).
- Break workflows into numbered lists or checklists (`- [ ]`).
- Include code snippets or templates where applicable.
- Define a table of anti-patterns and their corrections.
