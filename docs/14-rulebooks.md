# Rulebooks

[← Mục lục](./README.md) | [← Glossary](./glossary.md)

---

## What Are Rulebooks?

Rulebooks are structured instruction sets that define conventions for a technology stack or a specific project. They live in the harness coding framework and are loaded by agents before writing code.

---

## When to Create a Project Rulebook

Create a project rulebook when:

- Your project makes technology choices that differ from the stack default
- You have product-specific patterns (state machines, domain events, etc.)
- Multiple agents work on the same project and need consistent decisions
- You want to encode operational procedures (deployment, rollback, etc.)

Do NOT create a project rulebook for:

- General best practices already in the stack rulebook
- One-off decisions that only apply to a single file
- Temporary workarounds (use comments instead)

---

## Scaffolding via CLI

```bash
# Initialize a project rulebook (interactive)
harness init --project-rulebook

# This creates:
# .harness/rulebook.md (or links to framework location)
```

The scaffolded rulebook includes sections for:
- Architecture decisions
- Database & persistence
- External integrations
- Security requirements
- Testing strategy
- Deployment procedures

---

## Rulebook Structure

### Stack Rulebook (example: C#)

```
c#/
├── README.md                    # Stack rulebook entry point
├── architecture.md              # Layering, DDD patterns
├── naming.md                    # Naming conventions
├── testing.md                   # Test standards
├── workflows/
│   ├── feature-implementation.md
│   ├── bug-fix.md
│   └── code-review.md
└── projects/
    └── payment-hub/
        └── README.md            # Project rulebook
```

### Project Rulebook Template

```markdown
# {ProjectName} — Project Rulebook

## Architecture Decisions
- Database: [choice + rationale]
- Messaging: [choice + rationale]
- Caching: [choice + rationale]

## Domain Model
- Key aggregates and their boundaries
- Event flows

## External Integrations
- Service A: [endpoint, auth, retry policy]
- Service B: [endpoint, auth, retry policy]

## Security
- Authentication method
- Authorization model
- Data sensitivity classification

## Operational
- Deployment process
- Rollback procedure
- Monitoring alerts
```

---

## Precedence

```
Project Rulebook > Stack Rulebook > AGENTS.md > Skills > Instincts
```

See [glossary.md](./glossary.md) for detailed precedence rules.

---

## Loading Rulebooks

Agents load rulebooks via the routing table in `AGENTS.md`:

1. Identify the stack from project files
2. Load `{stack}/README.md` from the coding framework
3. If a project rulebook exists, load it next
4. Project-specific rules override stack defaults

---

## Best Practices

- Keep rulebooks actionable — rules agents can follow, not documentation
- Include examples for non-obvious patterns
- Update when architecture decisions change
- Reference external docs rather than duplicating content
- Mark overrides explicitly: "Override: stack says X, we use Y because Z"
