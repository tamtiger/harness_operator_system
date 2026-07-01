import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECT_YAML_TEMPLATE = `namespace: my-project
language: typescript
framework: node

approval:
  auto_approve_risk: [LOW]

plugins: []

team:
  approvers: []

cost:
  warn_per_task_usd: 0.50
  block_per_task_usd: 2.00

knowledge:
  include: []
`

const ARCHITECTURE_TEMPLATE = `# Architecture Overview

## Layers
- **Domain**: Business entities and logic
- **Application**: Use cases, orchestration
- **Infrastructure**: External systems, databases
- **API**: HTTP endpoints, middleware

## Dependency Rules
- Domain depends on nothing
- Application depends on Domain
- Infrastructure depends on Domain + Application
- API depends on Application + Infrastructure
`

const CONVENTIONS_TEMPLATE = `# Coding Conventions

## Naming
- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

## Patterns
- Use dependency injection
- Prefer composition over inheritance
- Single responsibility per file
`

const GLOSSARY_TEMPLATE = `# Business Glossary

## Example Term
Definition of the term.
`

const REPO_MAP_TEMPLATE = `namespace: my-project
language: typescript
framework: node

modules:
  - name: src
    path: src/
    responsibility: "Main application source code"
`

export interface InitResult {
  created: string[]
  skipped: string[]
}

export function initProject(repoPath: string): InitResult {
  const created: string[] = []
  const skipped: string[] = []

  // project.yaml
  const yamlPath = resolve(repoPath, 'project.yaml')
  if (existsSync(yamlPath)) {
    skipped.push('project.yaml')
  } else {
    writeFileSync(yamlPath, PROJECT_YAML_TEMPLATE, 'utf-8')
    created.push('project.yaml')
  }

  // docs/ dirs
  for (const dir of ['docs', 'docs/architecture', 'docs/adr', 'docs/conventions']) {
    const p = resolve(repoPath, dir)
    if (!existsSync(p)) {
      mkdirSync(p, { recursive: true })
      created.push(dir + '/')
    }
  }

  // templates
  const templates: [string, string][] = [
    ['docs/architecture/overview.md', ARCHITECTURE_TEMPLATE],
    ['docs/conventions/coding-style.md', CONVENTIONS_TEMPLATE],
    ['docs/glossary.md', GLOSSARY_TEMPLATE],
    ['docs/repo-map.yaml', REPO_MAP_TEMPLATE],
  ]

  for (const [relPath, content] of templates) {
    const p = resolve(repoPath, relPath)
    if (existsSync(p)) {
      skipped.push(relPath)
    } else {
      writeFileSync(p, content, 'utf-8')
      created.push(relPath)
    }
  }

  return { created, skipped }
}
