# 05_CONTEXT_SPECIFICATION

**Version:** 4.0
**Status:** Final
**Ngày cập nhật:** 2026-07-11
**Ngôn ngữ:** Tiếng Việt

---

## 1. Purpose

Context domain chịu trách nhiệm **transform RepositoryContext thành RuntimeContext** phù hợp cho Execution.

- Nhận đầu vào là `RepositoryContext` đã được Repository domain build sẵn.
- Thực hiện filter, rank, và budget allocation để tạo ra `RuntimeContext` tối ưu cho từng task.
- **Không đọc filesystem**, **không resolve assets** — đây là trách nhiệm của Repository domain.
- Cung cấp RuntimeContext bất biến (immutable) cho Execution domain sử dụng.

---

## 2. Responsibilities vs Non-Responsibilities

### Responsibilities (Có trách nhiệm)

| Trách nhiệm | Mô tả |
|-------------|-------|
| Transform RepositoryContext | Nhận RepositoryContext và chuyển đổi thành RuntimeContext |
| Filtering | Lọc rules, knowledge, workflows, prompts theo task request |
| Ranking | Xếp hạng các assets theo priority, relevance, recency |
| Budget Allocation | Phân bổ token budget cho các loại assets |
| Immutability enforcement | Đảm bảo RuntimeContext không bị thay đổi sau khi build |
| Caching | Cache RuntimeContext để tránh rebuild không cần thiết |
| Context normalization | Chuẩn hoá RepositoryContext trước khi filter |

### Non-Responsibilities (Không có trách nhiệm)

| Không trách nhiệm | Giải thích |
|-------------------|------------|
| Đọc filesystem | Repository domain thực hiện |
| Resolve asset paths | Repository domain thực hiện |
| Load file content | Repository domain thực hiện |
| Validate asset schema | Repository domain thực hiện |
| Execute tasks | Execution domain thực hiện |
| Manage capabilities | Capability domain thực hiện |
| Enforce governance policies | Governance domain thực hiện |
| Platform integration | Platform domain thực hiện |

---

## 3. Context Model

### RepositoryContext (Đầu vào)

Cấu trúc đầy đủ của `RepositoryContext` được nhận từ Repository domain:

```
RepositoryContext {
  metadata: RepositoryMetadata
  assets: EffectiveAssetCollection
  rules: Rule[]
  prompts: Prompt[]
  templates: Template[]
  workflows: Workflow[]
  knowledge: Knowledge[]
  hooks: Hook[]
  capabilities: CapabilityDefinition[]
  repositoryMap: RepositoryMap
  adrs: ADR[]
}
```

**Mô tả các trường:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `metadata` | `RepositoryMetadata` | Thông tin repository (name, version, owner...) |
| `assets` | `EffectiveAssetCollection` | Tập hợp tất cả assets đã được resolve |
| `rules` | `Rule[]` | Danh sách các rules áp dụng cho repository |
| `prompts` | `Prompt[]` | Danh sách prompt templates |
| `templates` | `Template[]` | Danh sách code/doc templates |
| `workflows` | `Workflow[]` | Danh sách workflows tự động |
| `knowledge` | `Knowledge[]` | Danh sách knowledge entries |
| `hooks` | `Hook[]` | Danh sách hooks (pre/post execution) |
| `capabilities` | `CapabilityDefinition[]` | Danh sách capabilities được định nghĩa |
| `repositoryMap` | `RepositoryMap` | Bản đồ cấu trúc repository |
| `adrs` | `ADR[]` | Architectural Decision Records |

### RuntimeContext (Đầu ra)

Cấu trúc `RuntimeContext` sau khi đã qua filter/rank/budget:

```
RuntimeContext {
  taskContext: TaskContext      # filtered relevant to current task
  budget: BudgetAllocation
  rules: RankedRule[]
  relevantKnowledge: Knowledge[]
  activeWorkflow: Workflow | null
  availableCapabilities: CapabilityId[]
  repositoryMetadata: RepositoryMetadata
  buildTimestamp: ISO8601       # immutable marker
}
```

**Mô tả các trường:**

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `taskContext` | `TaskContext` | Context đã được lọc, liên quan đến task hiện tại |
| `budget` | `BudgetAllocation` | Phân bổ token budget thực tế |
| `rules` | `RankedRule[]` | Rules đã được xếp hạng theo priority |
| `relevantKnowledge` | `Knowledge[]` | Knowledge entries liên quan đến task |
| `activeWorkflow` | `Workflow \| null` | Workflow đang active (hoặc null nếu không có) |
| `availableCapabilities` | `CapabilityId[]` | Danh sách capability IDs khả dụng |
| `repositoryMetadata` | `RepositoryMetadata` | Metadata của repository |
| `buildTimestamp` | `ISO8601` | Timestamp build (immutable marker) |

---

## 4. Build Flow

Quy trình transform từ RepositoryContext sang RuntimeContext:

```
RepositoryContext (from Repository)
  ↓
ContextBuilder.build()
  ↓
ContextFilter.filter(context, taskRequest)
  ↓
ContextRanker.rank(filteredContext)
  ↓
BudgetAllocator.allocate(rankedContext, budgetConfig)
  ↓
RuntimeContext (immutable)
```

**Mô tả từng bước:**

| Bước | Module | Mô tả |
|------|--------|-------|
| 1. Build | `ContextBuilder` | Normalize RepositoryContext, validate structure |
| 2. Filter | `ContextFilter` | Lọc assets theo task request và filter config |
| 3. Rank | `ContextRanker` | Xếp hạng assets theo ranking strategy |
| 4. Allocate | `BudgetAllocator` | Phân bổ token budget, trim nếu vượt giới hạn |
| 5. Output | — | Tạo RuntimeContext immutable với buildTimestamp |

---

## 5. Filtering

### Filter Algorithm

Quá trình filtering loại bỏ các assets không liên quan đến task hiện tại:

- **Filter rules** by `scope_paths` matching task working directory
- **Filter knowledge** by domain tags matching task type
- **Filter workflows** by trigger matching task type
- **Remove deprecated** assets (nếu `include_deprecated: false`)
- **Remove assets** with insufficient confidence (dưới `min_confidence`)

### Filter Priority

1. Scope path matching (địa lý — working directory)
2. Tag/domain matching (ngữ nghĩa — task type)
3. Trigger matching (hành vi — trigger condition)
4. Confidence threshold (chất lượng — độ tin cậy)
5. Deprecation status (vòng đời — deprecated flag)

### FilterConfig

```yaml
filter:
  min_confidence: medium      # none | low | medium | high | verified
  include_deprecated: false   # bỏ qua assets deprecated
  scope_strict: true          # true = chỉ match chính xác scope path
```

**Giải thích các tham số:**

| Tham số | Giá trị mặc định | Mô tả |
|---------|-----------------|-------|
| `min_confidence` | `medium` | Ngưỡng confidence tối thiểu để giữ lại asset |
| `include_deprecated` | `false` | Có bao gồm assets deprecated không |
| `scope_strict` | `true` | Strict scope matching (chính xác path) hay loose (prefix match) |

---

## 6. Ranking

### Ranking Algorithm

Sau khi filter, các assets được xếp hạng để ưu tiên những assets quan trọng nhất:

- **Rule ranking:** priority (`critical > high > medium > low`), sau đó là recency
- **Knowledge ranking:** relevance score (tag match count), sau đó là confidence level
- **Prompt ranking:** specificity (more specific tags = higher rank)
- **Workflow ranking:** trigger specificity

### Ranking Strategy: Weighted

Điểm xếp hạng được tính theo công thức có trọng số:

```
score = (priority_score × 0.4) + (recency_score × 0.3) + (relevance_score × 0.3)
```

### RankingConfig

```yaml
ranking:
  strategy: weighted          # weighted | priority_only | relevance_only
  weights:
    priority: 0.4             # trọng số cho priority
    recency: 0.3              # trọng số cho recency (ngày tạo/cập nhật)
    relevance: 0.3            # trọng số cho relevance (tag match)
```

**Giải thích các tham số:**

| Tham số | Giá trị mặc định | Mô tả |
|---------|-----------------|-------|
| `strategy` | `weighted` | Chiến lược ranking |
| `weights.priority` | `0.4` | Trọng số cho mức độ ưu tiên |
| `weights.recency` | `0.3` | Trọng số cho độ mới (recency) |
| `weights.relevance` | `0.3` | Trọng số cho độ liên quan |

> **Lưu ý:** Tổng các `weights` phải bằng `1.0`.

---

## 7. Budget Management

### Budget Algorithm

Sau ranking, BudgetAllocator phân bổ token budget để đảm bảo RuntimeContext không vượt quá giới hạn:

- **Default token budget:** `10,000 tokens`
- **Truncation strategy:** `priority_trim` — loại bỏ items có rank thấp nhất trước
- **Hard limit strategy:** reject nếu vượt budget sau khi trim

### Budget Distribution

| Loại asset | Tỷ lệ tối đa | Tokens tối đa (default) |
|------------|-------------|------------------------|
| `rules` | 30% | 3,000 tokens |
| `knowledge` | 40% | 4,000 tokens |
| `prompts` | 15% | 1,500 tokens |
| `workflows` | 10% | 1,000 tokens |
| `metadata` | 5% | 500 tokens |

### BudgetConfig

```yaml
budget:
  total_tokens: 10000         # tổng token budget
  strategy: priority_trim     # priority_trim | hard_reject | soft_truncate
  distribution:
    rules: 0.30               # 30% cho rules
    knowledge: 0.40           # 40% cho knowledge
    prompts: 0.15             # 15% cho prompts
    workflows: 0.10           # 10% cho workflows
    metadata: 0.05            # 5% cho metadata
```

**Giải thích các tham số:**

| Tham số | Giá trị mặc định | Mô tả |
|---------|-----------------|-------|
| `total_tokens` | `10000` | Tổng số token cho phép |
| `strategy` | `priority_trim` | Chiến lược xử lý khi vượt budget |
| `distribution.*` | Xem bảng trên | Tỷ lệ phân bổ cho từng loại |

---

## 8. Immutability

RuntimeContext phải hoàn toàn bất biến (immutable) sau khi được build. Đây là nguyên tắc cốt lõi để đảm bảo tính nhất quán trong quá trình execution.

### Quy tắc Immutability

- **Không có setter methods** trên RuntimeContext và các sub-objects
- **Deep copy** khi truyền RuntimeContext ra ngoài context domain
- **`buildTimestamp`** là immutable marker — không được thay đổi sau khi set
- **Execution domain** không được phép modify RuntimeContext dưới bất kỳ hình thức nào
- Mọi "thay đổi" phải tạo ra một RuntimeContext mới thông qua build flow đầy đủ

### Enforcement

| Cơ chế | Mô tả |
|--------|-------|
| Frozen objects | Sử dụng language-level immutability (freeze/seal) |
| Deep copy on access | Trả về bản sao khi expose collections |
| No public mutators | Không expose setter hay mutation methods |
| Validation on build | Validate immutability constraints khi build xong |

---

## 9. Cache Model

### Cache Strategy

Context domain sử dụng hash-based caching để tránh rebuild RuntimeContext khi inputs không thay đổi.

- **Cache key:** `hash(manifestVersion + sharedHarnessChecksum + localAssetsChecksum)`
- **Cache storage:** In-memory only — **không dùng filesystem cache**
- **TTL:** Session duration — invalidate khi process exit
- **Max entries:** 10 entries (LRU eviction)

### Invalidation Triggers

| Trigger | Mô tả |
|---------|-------|
| Manifest change | File manifest thay đổi version hoặc content |
| Asset change | Bất kỳ local asset nào thay đổi (checksum mismatch) |
| Shared Harness update | Shared Harness được cập nhật lên version mới |
| Manual invalidation | Gọi `invalidate(cacheKey)` trực tiếp |

### CacheConfig

```yaml
cache:
  enabled: true               # bật/tắt caching
  strategy: hash_based        # hash_based | disabled
  max_entries: 10             # số lượng entries tối đa (LRU)
```

**Lưu ý quan trọng:**
- Cache chỉ tồn tại trong memory — không persist giữa các sessions
- Khi process exit, toàn bộ cache bị xoá
- Cache key phải bao gồm đủ 3 thành phần để đảm bảo tính chính xác

---

## 10. Public Service Contract

`ContextService` là interface công khai duy nhất của context domain:

```
ContextService:
  build(repoContext: RepositoryContext) -> RepositoryContext
    # normalize RepositoryContext (validate + sanitize)

  filter(repoContext: RepositoryContext, request: TaskRequest) -> FilteredContext
    # lọc assets theo task request

  rank(filtered: FilteredContext) -> RankedContext
    # xếp hạng assets trong filtered context

  allocateBudget(ranked: RankedContext, config: BudgetConfig) -> RuntimeContext
    # phân bổ budget và tạo RuntimeContext immutable

  invalidate(cacheKey: string) -> void
    # invalidate cache entry theo key

  buildRuntimeContext(repoContext: RepositoryContext, request: TaskRequest) -> RuntimeContext
    # convenience method: thực hiện toàn bộ build flow trong một lệnh gọi
```

### Luồng gọi thông thường

```
# Cách 1: Step-by-step (kiểm soát tốt hơn)
normalized = contextService.build(repoContext)
filtered   = contextService.filter(normalized, taskRequest)
ranked     = contextService.rank(filtered)
runtime    = contextService.allocateBudget(ranked, budgetConfig)

# Cách 2: Convenience method (đơn giản hơn)
runtime = contextService.buildRuntimeContext(repoContext, taskRequest)
```

---

## 11. Internal Modules

Cấu trúc internal modules của context domain:

```
context/
├── builder/
│   └── ContextBuilder          # normalize + validate RepositoryContext
│
├── filter/
│   ├── ContextFilter           # thực thi filter algorithm
│   └── FilterConfig            # cấu hình filter (min_confidence, scope_strict...)
│
├── ranking/
│   ├── ContextRanker           # thực thi ranking algorithm
│   ├── RankingConfig           # cấu hình ranking (strategy, weights)
│   └── RankingStrategy         # interface cho các strategy implementations
│
├── budget/
│   ├── BudgetAllocator         # phân bổ token budget
│   ├── BudgetConfig            # cấu hình budget (total_tokens, distribution)
│   └── TruncationStrategy      # interface cho truncation strategies
│
└── cache/
    ├── ContextCache            # cache manager (get, set, invalidate)
    ├── CacheEntry              # cấu trúc một cache entry
    └── CachePolicy             # policy (TTL, max_entries, eviction strategy)
```

**Mô tả từng module:**

| Module | Trách nhiệm chính |
|--------|------------------|
| `builder/` | Normalize và validate RepositoryContext đầu vào |
| `filter/` | Lọc assets không liên quan đến task |
| `ranking/` | Xếp hạng assets theo weighted strategy |
| `budget/` | Phân bổ token budget, trim khi vượt giới hạn |
| `cache/` | In-memory cache với hash-based key |

---

## 12. Compile-time Dependencies

### Allowed Dependencies

| Domain | Lý do |
|--------|-------|
| `shared` | Shared types, utilities, interfaces dùng chung |
| `repository` | RepositoryContext là input của context domain |

### Forbidden Dependencies

| Domain | Lý do cấm |
|--------|-----------|
| `execution` | Execution là consumer — không được phép import ngược |
| `capability` | Capability domain không được import vào context |
| `governance` | Governance domain không được import vào context |
| `platform` | Platform domain không được import vào context |

> **Nguyên tắc:** Context domain nằm ở tầng trung gian — chỉ phụ thuộc vào tầng thấp hơn (shared, repository), không phụ thuộc vào tầng cao hơn (execution, capability...).

---

## 13. Error Model

| Code | Category | Description | Recovery |
|------|----------|-------------|----------|
| `CTX_001` | Build | Context build failed | Check Repository Context validity — đảm bảo RepositoryContext đầu vào hợp lệ |
| `CTX_002` | Filter | Filter config invalid | Check filter configuration — kiểm tra `min_confidence`, `scope_strict` values |
| `CTX_003` | Budget | Budget exceeded hard limit | Increase `total_tokens` budget hoặc reduce số lượng assets trong repository |
| `CTX_004` | Budget | Budget config invalid | Check budget configuration — đảm bảo `distribution` values tổng bằng `1.0` |
| `CTX_005` | Cache | Cache invalidation failed | Clear cache manually bằng cách restart session hoặc gọi `invalidate()` |

### Error Handling Strategy

- Tất cả errors từ context domain phải có error code theo format `CTX_XXX`
- Build errors (CTX_001) không được silent fail — phải propagate lên caller
- Budget errors (CTX_003) phải log rõ ràng asset count và token count thực tế
- Cache errors (CTX_005) không được block execution — degrade gracefully (rebuild without cache)

---

## 14. Configuration Schema (Full YAML Example)

Cấu hình đầy đủ cho context domain:

```yaml
# context_config.yaml
# Context Domain Configuration - Version 4.0

context:
  # ── Filter Configuration ────────────────────────────────────────────────
  filter:
    min_confidence: medium      # none | low | medium | high | verified
    include_deprecated: false   # bao gồm deprecated assets?
    scope_strict: true          # strict scope path matching

  # ── Ranking Configuration ────────────────────────────────────────────────
  ranking:
    strategy: weighted          # weighted | priority_only | relevance_only
    weights:
      priority: 0.4             # trọng số priority (0.0 - 1.0)
      recency: 0.3              # trọng số recency (0.0 - 1.0)
      relevance: 0.3            # trọng số relevance (0.0 - 1.0)
                                # tổng weights phải = 1.0

  # ── Budget Configuration ─────────────────────────────────────────────────
  budget:
    total_tokens: 10000         # tổng token budget
    strategy: priority_trim     # priority_trim | hard_reject | soft_truncate
    distribution:
      rules: 0.30               # 30% = 3000 tokens
      knowledge: 0.40           # 40% = 4000 tokens
      prompts: 0.15             # 15% = 1500 tokens
      workflows: 0.10           # 10% = 1000 tokens
      metadata: 0.05            # 5%  = 500 tokens
                                # tổng distribution phải = 1.0

  # ── Cache Configuration ──────────────────────────────────────────────────
  cache:
    enabled: true               # bật/tắt caching
    strategy: hash_based        # hash_based | disabled
    max_entries: 10             # số lượng cache entries tối đa (LRU eviction)
                                # TTL = session duration (auto-clear on exit)
```

---

## 15. Extension Points

Context domain cung cấp các extension points để tùy chỉnh behavior:

### 15.1 Custom RankingStrategy

Implement interface `RankingStrategy` để thêm chiến lược ranking mới:

```
interface RankingStrategy {
  name: string
  rank(items: RankableItem[], config: RankingConfig) -> RankedItem[]
}
```

Đăng ký strategy mới trong `RankingConfig`:
```yaml
ranking:
  strategy: custom_strategy_name
```

### 15.2 Custom TruncationStrategy

Implement interface `TruncationStrategy` để tùy chỉnh cách trim khi vượt budget:

```
interface TruncationStrategy {
  name: string
  truncate(items: BudgetableItem[], limit: number) -> BudgetableItem[]
}
```

### 15.3 Custom FilterPredicate

Thêm filter predicates tùy chỉnh vào `ContextFilter`:

```
interface FilterPredicate {
  name: string
  applies(asset: Asset, request: TaskRequest) -> boolean
}
```

### 15.4 Cache Backend

Mặc định là in-memory cache. Có thể implement `CacheBackend` interface để hỗ trợ backend khác (nếu cần trong tương lai):

```
interface CacheBackend {
  get(key: string) -> CacheEntry | null
  set(key: string, entry: CacheEntry) -> void
  invalidate(key: string) -> void
  clear() -> void
}
```

> **Lưu ý:** Filesystem cache backend không được phép theo thiết kế hiện tại.

---

## 16. Design Rules

Các nguyên tắc thiết kế bắt buộc của context domain:

| # | Rule | Mô tả |
|---|------|-------|
| DR-01 | **No filesystem access** | Context domain không bao giờ đọc/ghi filesystem |
| DR-02 | **No asset resolution** | Không resolve asset paths hay load file content |
| DR-03 | **Immutable output** | RuntimeContext phải immutable sau khi build |
| DR-04 | **Pure transform** | Mỗi bước (filter/rank/budget) là pure function — same input = same output |
| DR-05 | **Dependency direction** | Chỉ phụ thuộc vào shared và repository |
| DR-06 | **In-memory cache only** | Cache không được persist ra filesystem hay external storage |
| DR-07 | **Fail fast on invalid config** | Invalid config phải raise error ngay lập tức, không silent fail |
| DR-08 | **Graceful cache degradation** | Cache failure không được block execution |
| DR-09 | **Budget weights sum to 1.0** | Tổng distribution weights trong BudgetConfig phải đúng bằng 1.0 |
| DR-10 | **Single responsibility per module** | Mỗi internal module chỉ làm một việc (filter, rank, budget, cache, build) |

---

## 17. Cross References

| Document | Mô tả liên kết |
|----------|---------------|
| `01_SYSTEM_OVERVIEW.md` | Kiến trúc tổng thể — vị trí context domain trong hệ thống |
| `02_REPOSITORY_SPECIFICATION.md` | Repository domain — nguồn cung cấp RepositoryContext |
| `03_EXECUTION_SPECIFICATION.md` | Execution domain — consumer của RuntimeContext |
| `04_CAPABILITY_SPECIFICATION.md` | Capability domain — định nghĩa CapabilityDefinition trong RepositoryContext |
| `06_GOVERNANCE_SPECIFICATION.md` | Governance domain — policy enforcement (không phải context responsibility) |
| `07_SHARED_SPECIFICATION.md` | Shared domain — shared types và interfaces được context domain sử dụng |
| `08_PLATFORM_SPECIFICATION.md` | Platform domain — không có dependency từ context |
| `ADR-005` | Decision: In-memory only cache cho context domain |
| `ADR-008` | Decision: Immutable RuntimeContext design |

---

## 18. Out of Scope

Các chức năng **không thuộc** context domain và không được implement ở đây:

| Chức năng | Thuộc domain nào |
|-----------|-----------------|
| Đọc file manifest từ filesystem | Repository domain |
| Resolve asset file paths | Repository domain |
| Load nội dung file assets | Repository domain |
| Validate asset schema/format | Repository domain |
| Thực thi task dựa trên RuntimeContext | Execution domain |
| Quản lý lifecycle của capabilities | Capability domain |
| Enforce access control policies | Governance domain |
| Tích hợp với external platforms | Platform domain |
| Persist cache ra disk/database | Out of scope hoàn toàn (by design) |
| Real-time context streaming | Out of scope hoàn toàn (không cần thiết) |
| Multi-tenant context isolation | Governance domain |
| Context versioning/history | Out of scope (stateless by design) |

---

*Document này là Final specification cho Context domain v4.0. Mọi thay đổi phải được review và tạo ADR tương ứng.*
