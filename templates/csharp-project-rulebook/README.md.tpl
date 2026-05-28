# {{PROJECT_NAME}} — Project Rulebook

> Generated: {{DATE}} | Stack: {{STACK}}

## Overview

{{PROJECT_NAME}} is a service built on {{STACK}}. This rulebook defines project-specific conventions, architecture decisions, and operational rules.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | ABP Framework 8.x |
| Runtime | .NET 8 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Messaging | RabbitMQ 3.12 |

## Module List

| Module | Responsibility |
|--------|---------------|
| `{{PROJECT_NAME}}.Core` | Core domain logic |
| `{{PROJECT_NAME}}.Api` | REST API endpoints |

## Getting Started

1. Read the stack rulebook: `rulebooks/csharp/architecture.md`
2. Read this project's module map: `module-map.md`
3. Review security rules: `security-rules.md`

## Environments

| Environment | Purpose |
|-------------|---------|
| CI | Automated testing |
| UAT | User acceptance |
| Production | Live traffic |
