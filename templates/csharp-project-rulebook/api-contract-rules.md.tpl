# API Contract Rules — {{PROJECT_NAME}}

> Generated: {{DATE}} | Stack: {{STACK}}

## Base URL

```
/api/{{PROJECT_NAME}}/v1/{resource}
```

## HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| GET | Read resource(s) | Yes |
| POST | Create resource | No |
| PUT | Full update | Yes |
| DELETE | Remove resource | Yes |

## DTO Conventions

### Input DTOs

- Suffix: `Input` (e.g., `CreateEntityInput`)
- All properties validated with attributes or FluentValidation

### Output DTOs

- Suffix: `Dto` (e.g., `EntityDto`)
- Include `Id`, `CreationTime`, `LastModificationTime`

## Pagination

All list endpoints use `PagedAndSortedResultRequestDto`:

```json
{
  "totalCount": 150,
  "items": [...]
}
```

## Error Response

```json
{
  "error": {
    "code": "{{PROJECT_NAME}}:010001",
    "message": "Human-readable message",
    "details": "Additional context"
  }
}
```

## Versioning

- URL-based: `/v1/`, `/v2/`
- Support previous version for 6 months after deprecation
- Breaking changes require new version number
