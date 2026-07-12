# M3 — Context Builder

**Milestone:** M3  
**Effort:** 2 ngày  
**Prerequisite:** M2  
**Spec:** `05_CONTEXT_SPECIFICATION.md`

---

## Objective

Transform `RepositoryContext` thành `RuntimeContext` phù hợp với task execution — filter, rank, apply token budget. Sau milestone này có thể chạy `harness context` để inspect context được build.

---

## Vertical Slice

```bash
harness context --task "implement authentication"
# Output:
# RuntimeContext built:
#   rules:      8 (filtered from 12, budget: 30%)
#   knowledge:  4 (filtered from 6, budget: 40%)
#   workflows:  1 (matched trigger: implementation)
#   budget used: 7,200 / 10,000 tokens
#   build time: 42ms
```

---

## Package Structure

```
src/context/
  builder/
    ContextBuilder.ts       ← T3.1
  filter/
    ContextFilter.ts        ← T3.2
    FilterConfig.ts
  ranking/
    ContextRanker.ts        ← T3.3
    RankingConfig.ts
  budget/
    BudgetAllocator.ts      ← T3.4
    BudgetConfig.ts
  cache/
    ContextCache.ts         ← T3.5
  service.ts                ← T3.6
```

---

## Tasks

### T3.1 — Context Builder

**File:** `src/context/builder/ContextBuilder.ts`

```typescript
export class ContextBuilder {
  build(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext
}
```

Pipeline (theo thứ tự cố định):
```
1. ContextFilter.filter(repoContext, request)
2. ContextRanker.rank(filtered, request)
3. BudgetAllocator.allocate(ranked, config)
4. Freeze → return RuntimeContext
```

RuntimeContext extends RepositoryContext với thêm:
- `taskContext`: extracted từ `request`
- `budget`: BudgetAllocation kết quả
- `rankedRules`: Rule[] đã sort
- `relevantKnowledge`: Knowledge[] đã filter + rank
- `activeWorkflow`: Workflow khớp với task type (hoặc null)
- `availableCapabilities`: CapabilityId[] từ assets.capabilities

---

### T3.2 — Context Filter

**File:** `src/context/filter/ContextFilter.ts`

```typescript
export class ContextFilter {
  filter(context: RepositoryContext, request: TaskRequest, config?: FilterConfig): RepositoryContext
}
```

Filter logic (từ `05_CONTEXT_SPECIFICATION.md §5`):

**Rules:** giữ nếu:
- Không có `scopePaths` → áp dụng globally
- Có `scopePaths` và `request.workingDirectory` match một trong các paths
- `deprecated !== true` (trừ khi `config.include_deprecated = true`)

**Knowledge:** giữ nếu:
- Tags overlap với `request.tags` (ít nhất 1 tag match)
- `confidence` >= `config.min_confidence` (mặc định: medium)
- `deprecated !== true`

**Workflows:** giữ nếu:
- `triggers` chứa `request.taskType` hoặc không có triggers

**Loại bỏ:** tất cả assets `deprecated: true` (default behavior).

```typescript
interface FilterConfig {
  min_confidence: 'high' | 'medium' | 'low'  // default: 'medium'
  include_deprecated: boolean                 // default: false
  scope_strict: boolean                       // default: true
}
```

---

### T3.3 — Context Ranker

**File:** `src/context/ranking/ContextRanker.ts`

```typescript
export class ContextRanker {
  rank(context: RepositoryContext, request: TaskRequest, config?: RankingConfig): RepositoryContext
}
```

Scoring formula (từ `05_CONTEXT_SPECIFICATION.md §6`):
```
score = (priority_score × w.priority)
      + (recency_score × w.recency)
      + (relevance_score × w.relevance)
```

Trong đó:
- `priority_score`: critical=1.0, high=0.75, medium=0.5, low=0.25
- `recency_score`: `1 - (now - updatedAt) / MAX_AGE_MS` (clamp 0–1, MAX_AGE = 90 ngày)
- `relevance_score`: `matchingTags.length / max(totalTags, 1)` (tag overlap với request)

Default weights:
```typescript
interface RankingConfig {
  strategy: 'weighted'   // default
  weights: {
    priority: 0.4
    recency: 0.3
    relevance: 0.3
  }
}
```

Sort descending bởi score. Trong context mới, các arrays được replace bằng sorted arrays.

---

### T3.4 — Budget Allocator

**File:** `src/context/budget/BudgetAllocator.ts`

```typescript
export class BudgetAllocator {
  allocate(context: RepositoryContext, config?: BudgetConfig): RuntimeContext
}
```

Token estimation: `Math.ceil(content.length / 4)` (rough 1 token ≈ 4 chars).

Distribution (từ `05_CONTEXT_SPECIFICATION.md §7`):
```typescript
interface BudgetConfig {
  total_tokens: number          // default: 10000
  strategy: 'priority_trim' | 'hard_limit'   // default: priority_trim
  distribution: {
    rules: 0.30
    knowledge: 0.40
    prompts: 0.15
    workflows: 0.10
    metadata: 0.05
  }
}
```

**priority_trim:** Trim từ cuối array (lowest ranked) cho đến khi fit trong budget.

**hard_limit:** Throw `ctxError('CTX_003', {tokens, limit})` nếu over budget.

Return `BudgetAllocation`:
```typescript
interface BudgetAllocation {
  totalTokens: number
  allocated: { rules, knowledge, prompts, workflows, metadata }
  remaining: number
}
```

---

### T3.5 — Context Cache

**File:** `src/context/cache/ContextCache.ts`

In-memory only, không persist xuống disk.

```typescript
export class ContextCache {
  get(key: CacheKey): RuntimeContext | null
  set(key: CacheKey, context: RuntimeContext): void
  invalidate(key: CacheKey): void
  clear(): void
}
```

Cache key generation:
```typescript
export function buildCacheKey(
  manifestVersion: string,
  sharedChecksum: string,
  localAssetsChecksum: string
): CacheKey {
  return sha256(`${manifestVersion}:${sharedChecksum}:${localAssetsChecksum}`)
}
```

Policy:
- Max entries: 10 (LRU eviction khi full)
- Session lifetime: in-memory, không persist
- Invalidate khi manifest, shared harness, hoặc local assets thay đổi

---

### T3.6 — Context Service

**File:** `src/context/service.ts`

```typescript
export class ContextServiceImpl implements ContextService {
  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest): RuntimeContext {
    const cacheKey = buildCacheKey(...)
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const runtime = this.builder.build(repoContext, request)
    this.cache.set(cacheKey, runtime)
    return runtime
  }

  invalidateCache(key: CacheKey): void {
    this.cache.invalidate(key)
  }
}
```

---

## Acceptance Scenarios — M3

**Scenario 1 — Filter by scope:**
```
Rules: [frontend-rule (scopePaths: ['src/ui']), backend-rule (no scope)]
Request workingDirectory: 'src/api'
→ Filtered rules: [backend-rule] only
```

**Scenario 2 — Budget trim:**
```
10 knowledge articles, total 15,000 tokens
Budget: 10,000 tokens, knowledge: 40% = 4,000 max
→ Top-ranked articles kept until 4,000 tokens used, rest trimmed
```

**Scenario 3 — Cache hit:**
```
buildRuntimeContext() called twice với same input
→ Second call returns cached result (no re-compute)
```

**Scenario 4 — Hard limit exceeded:**
```
Budget config: strategy = hard_limit, total_tokens = 1000
Assets total: 5,000 tokens
→ throw CTX_003
```

---

## Unit Tests — M3

| Test | Expected |
|------|----------|
| Filter: scope_strict matches workingDir | correct rules kept |
| Filter: no scope → global rule kept | rule in result |
| Filter: deprecated removed | deprecated rule absent |
| Filter: confidence=low removed by default | low-conf knowledge absent |
| Ranker: critical priority > high priority | correct order |
| Ranker: same priority, newer updatedAt wins | correct order |
| BudgetAllocator: trim to budget | result fits in budget |
| BudgetAllocator: hard_limit exceeded | throw CTX_003 |
| BudgetAllocator: BudgetAllocation.remaining correct | remaining = total - used |
| Cache: get after set returns same object | reference equality |
| Cache: LRU eviction at 11th entry | oldest entry evicted |
| Cache: invalidate removes entry | get returns null |
| RuntimeContext is frozen | `Object.isFrozen(ctx)` true |

---

## Definition of Done — M3

- [ ] Filter/rank/budget pipeline hoạt động theo đúng thứ tự
- [ ] FilterConfig, RankingConfig, BudgetConfig có giá trị default đúng
- [ ] RuntimeContext immutable sau khi build
- [ ] Cache in-memory, LRU 10 entries, invalidation hoạt động
- [ ] Error codes CTX_001–005 có test
- [ ] Unit tests pass
- [ ] dependency-cruiser: `context` chỉ import `shared`, `repository`

## Review Gate — M3

```
AI self-review: ranking formula đúng spec không? budget allocation đúng không?
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Unit tests pass
      ↓
Human review
      ↓
Merge to main
```
