# Design: Tiered Keyword Skill Matching

**Ngày**: 2026-05-29  
**Trạng thái**: Draft  
**Mục tiêu**: Giải quyết triệt để vấn đề trigger overload bằng hệ thống matching thông minh

---

## 1. Vấn đề

Hệ thống trigger hiện tại quá thô:
- Chỉ có 4 events: `session_start`, `task_create`, `task_update`, `session_end`
- `task_create` trigger 18 skills cùng lúc → agent bị overwhelm
- Không phân biệt được "task bugfix" vs "task feature" vs "task design"
- Thêm skill mới = tăng noise cho tất cả tasks

**Mục tiêu**: Agent luôn thấy **3-6 relevant skills** cho mỗi context, không bao giờ 18.

---

## 2. Giải pháp: Hybrid Tier + Keyword Matching

### 2.1 Concept

Mỗi skill có 2 thuộc tính mới trong metadata:
- **`tier`** (1-3): Quyết định mức độ ưu tiên suggest
- **`keywords`** (string[]): Quyết định skill match với task nào

### 2.2 Tier Definitions

| Tier | Ý nghĩa | Khi nào suggest | Max skills |
|------|---------|-----------------|-----------|
| **1** | Core workflow — luôn cần | `session_start` + mọi `task_create` | 3-4 |
| **2** | Contextual — cần khi match keywords | `task_create` khi title/scope match keywords | 2-4 |
| **3** | On-demand — chỉ khi explicit load | Không auto-suggest, chỉ qua `skill_load` | 0 |

### 2.3 Keyword Matching

Khi `task_create(title, scope)` được gọi:
1. Tokenize `title` + `scope` thành lowercase words
2. Với mỗi tier-2 skill, đếm số keywords match
3. Rank theo match score (descending)
4. Return top N skills (configurable, default 3)

**Matching algorithm**:
```
score(skill, task) = count(skill.keywords ∩ task_tokens)
```

Nếu `score > 0` → skill is relevant.  
Nếu `score == 0` → skill is NOT suggested.

### 2.4 Ví dụ

```
task_create(title="Fix payment timeout bug in OrderService")
→ tokens: ["fix", "payment", "timeout", "bug", "in", "orderservice"]

Skills matching:
- systematic-diagnosis: keywords=["bug","fix","error","crash","debug"] → score=2 ✅
- csharp-bugfix: keywords=["bug","fix","error","exception","null"] → score=2 ✅
- tdd-workflow: keywords=["test","tdd","red-green","refactor"] → score=0 ❌
- design-grilling: keywords=["design","architecture","plan","rfc"] → score=0 ❌

Result: suggest systematic-diagnosis + csharp-bugfix (+ tier 1 skills)
```

```
task_create(title="Design new payment gateway adapter")
→ tokens: ["design", "new", "payment", "gateway", "adapter"]

Skills matching:
- design-grilling: keywords=["design","architecture","plan","rfc"] → score=1 ✅
- architecture-review: keywords=["architecture","module","refactor","deep"] → score=0 ❌
- prototype-first: keywords=["prototype","spike","experiment","poc"] → score=0 ❌
- systematic-diagnosis: keywords=["bug","fix","error","crash"] → score=0 ❌

Result: suggest design-grilling (+ tier 1 skills)
```

---

## 3. Schema Changes

### 3.1 Frontmatter Schema (new fields)

```yaml
---
name: systematic-diagnosis
description: "..."
metadata:
  version: "1.1"
  updated: "2026-05-29"
  applies_to: ["*"]
  tier: 2
  keywords: ["bug", "fix", "error", "crash", "debug", "investigate", "diagnose", "reproduce", "regression", "broken"]
---
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `metadata.tier` | number (1-3) | No | 2 | Skill priority tier |
| `metadata.keywords` | string[] | No | [] | Keywords for matching |

**Backward compatibility**: Skills without `tier` → default tier 2. Skills without `keywords` → empty array (never match by keyword, only by tier).

### 3.2 Skill Tier Assignments

#### Tier 1 — Core (always suggested)
| Skill | Lý do |
|-------|-------|
| `karpathy-guidelines` | Principles mọi task cần |
| `harness-workflow` | Session lifecycle |
| `strategic-compact` | Context management |

#### Tier 2 — Contextual (keyword-matched)
| Skill | Keywords |
|-------|----------|
| `tdd-workflow` | test, tdd, red-green, refactor, unit-test, coverage, kiểm thử, test-driven, đỏ-xanh, tái cấu trúc, bao phủ |
| `read-first` | search, find, existing, pattern, duplicate, understand, tìm kiếm, tìm, có sẵn, mẫu, trùng lặp, hiểu |
| `systematic-diagnosis` | bug, fix, error, crash, debug, investigate, diagnose, reproduce, regression, broken, lỗi, sửa, sập, gỡ lỗi, điều tra, chẩn đoán, tái tạo, hồi quy |
| `design-grilling` | design, architecture, plan, rfc, proposal, evaluate, tradeoff, thiết kế, kiến trúc, kế hoạch, đề xuất, đánh giá, cân bằng |
| `architecture-review` | architecture, module, refactor, deep, shallow, coupling, seam, kiến trúc, mô-đun, tái cấu trúc, sâu, nông, liên kết, điểm nối |
| `prototype-first` | prototype, spike, experiment, poc, proof-of-concept, explore, nguyên mẫu, thử nghiệm, khám phá |
| `spec-driven-workflow` | spec, research, innovate, plan, execute, review, phase, đặc tả, nghiên cứu, đổi mới, kế hoạch, thực hiện, xem xét, giai đoạn |
| `parallel-coordination` | parallel, concurrent, decompose, independent, fan-out, stage, song song, đồng thời, phân rã, độc lập, giai đoạn |
| `vertical-slicing` | slice, vertical, tracer, end-to-end, thin, increment, lát cắt, dọc, đầu cuối, mỏng, tăng dần |
| `edge-case-generation` | edge-case, boundary, adversarial, fuzz, negative, overflow, trường hợp biên, ranh giới, đối kháng, âm, tràn |
| `security-audit` | security, vulnerability, owasp, stride, auth, injection, xss, bảo mật, lỗ hổng, xác thực, tiêm, csrf |
| `deep-research` | research, investigate, compare, evaluate, benchmark, literature, nghiên cứu, điều tra, so sánh, đánh giá, chuẩn mực |
| `to-prd` | prd, requirements, product, feature, user-story, acceptance, yêu cầu, sản phẩm, tính năng, câu chuyện người dùng, chấp nhận |
| `triage` | triage, priority, severity, classify, assign, backlog, phân loại, ưu tiên, mức độ, phân lớp, gán, danh sách chờ |
| `csharp-baseline` | csharp, dotnet, abp, entity, repository, appservice, c#, .net, thực thể, kho lưu trữ, dịch vụ ứng dụng |
| `csharp-bugfix` | csharp, dotnet, bug, fix, exception, null, ef-core, c#, .net, lỗi, sửa, ngoại lệ, null, entity-framework |
| `csharp-feature` | csharp, dotnet, feature, implement, service, controller, c#, .net, tính năng, triển khai, dịch vụ, bộ điều khiển |
| `csharp-code-review` | csharp, dotnet, review, code-review, pr, merge-request, c#, .net, xem xét, đánh giá mã, yêu cầu hợp nhất |
| `csharp-repair` | csharp, dotnet, hotfix, repair, patch, urgent, c#, .net, sửa nóng, sửa chữa, vá, khẩn cấp |
| `autonomous-optimizer` | optimize, performance, benchmark, measure, improve, profile, tối ưu, hiệu suất, chuẩn mực, đo lường, cải thiện, hồ sơ |
| `continuous-learning` | learn, pattern, instinct, capture, evolve, học, mẫu, bản năng, bắt, phát triển |

#### Tier 3 — On-demand (never auto-suggested)
| Skill | Lý do |
|-------|-------|
| `write-a-skill` | Meta-skill, chỉ cần khi tạo skill mới |
| `verification-loop` | Đã embedded trong harness-workflow |

---

## 4. Implementation

### 4.1 New file: `src/lib/skill-matcher.ts`

```typescript
export interface SkillMatchResult {
  name: string;
  tier: number;
  score: number;  // 0 for tier 1 (always), keyword match count for tier 2
}

/**
 * Match skills against task context.
 * Returns ranked list of relevant skills.
 */
export function matchSkills(
  skills: SkillWithMetadata[],
  context: MatchContext
): SkillMatchResult[] {
  // 1. Always include tier 1
  // 2. For tier 2: compute keyword score, include if score > 0
  // 3. Exclude tier 3
  // 4. Sort: tier 1 first, then tier 2 by score descending
  // 5. Apply max limit (configurable)
}

export interface MatchContext {
  taskTitle?: string;
  taskScope?: string;
  stack?: string;
}

/**
 * Tokenize text into lowercase words for matching.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
}

/**
 * Compute match score between skill keywords and task tokens.
 */
export function computeScore(keywords: string[], tokens: string[]): number {
  const tokenSet = new Set(tokens);
  return keywords.filter(k => tokenSet.has(k)).length;
}
```

### 4.2 Changes to `src/tools/skill.ts`

Update `skillList()` to accept optional `MatchContext` parameter:

```typescript
export function skillList(
  stackFilter?: string,
  repoPath?: string,
  context?: MatchContext  // NEW
): { skills: SkillListEntry[] } {
  // ... existing logic ...
  
  // NEW: if context provided, apply tier + keyword matching
  if (context) {
    return { skills: matchSkills(allSkills, context) };
  }
  
  // Fallback: return all (backward compatible)
  return { skills: allSkills };
}
```

### 4.3 Changes to `src/tools/session.ts`

Update `sessionStart()` — pass empty context (tier 1 only):

```typescript
// Only suggest tier 1 skills at session start
const { skills } = skillList(runtime.runtime, repoPath, { stack: runtime.runtime });
const applicableSkills = skills
  .filter(s => (s.metadata?.tier ?? 2) === 1)
  .map(s => s.name);
```

### 4.4 New MCP tool parameter: `skill_suggest`

Thêm tool mới hoặc extend `skill_list` với parameter `task_title`:

```typescript
server.registerTool(
  "skill_suggest",
  {
    description: "Suggest relevant skills for a task based on title and context.",
    inputSchema: {
      task_title: z.string().describe("Task title to match against"),
      task_scope: z.string().optional().describe("Task scope for additional context"),
      stack: z.string().optional().describe("Stack filter (node, dotnet, etc.)"),
      max_results: z.number().optional().describe("Max skills to return (default 6)"),
    },
  },
  makeHandler("skill_suggest", ({ task_title, task_scope, stack, max_results }) =>
    skillSuggest(task_title, task_scope, stack, max_results)
  )
);
```

### 4.5 Changes to `src/lib/frontmatter.ts`

Không cần thay đổi — `metadata` đã là `Record<string, unknown>`, tự chấp nhận `tier` và `keywords` fields.

### 4.6 Changes to `SkillListEntry` interface

```typescript
export interface SkillListEntry {
  name: string;
  version: string | null;
  description: string | null;
  applies_to: string[];
  metadata?: Record<string, unknown>;
  // NEW fields (extracted from metadata for convenience)
  tier?: number;
  keywords?: string[];
}
```

---

## 5. Migration Plan

### Phase 1: Add `tier` + `keywords` to all 25 skills (metadata only)

Chỉ edit YAML frontmatter, không thay đổi code. Backward compatible.

### Phase 2: Implement `skill-matcher.ts` + unit tests

New file, không affect existing code.

### Phase 3: Add `skill_suggest` tool

New tool, không thay đổi existing tools. Backward compatible.

### Phase 4: Update `session_start` to use tier filtering

Thay đổi nhỏ — chỉ filter `applicable_skills` output.

### Phase 5: Update documentation

- AGENTS.md
- docs/07-skills.md
- docs/12-skill-format.md

---

## 6. Backward Compatibility

| Component | Impact |
|-----------|--------|
| Existing skills without `tier`/`keywords` | Default tier=2, keywords=[] → never keyword-matched, but still returned by `skill_list()` without context |
| `skill_list` tool (MCP) | Unchanged — no new required params |
| `skill_load` tool (MCP) | Unchanged |
| `session_start` response | `applicable_skills` sẽ ngắn hơn (chỉ tier 1) — agent behavior improves |
| Repo-specific skills | Work as before — can add `tier`/`keywords` optionally |

---

## 7. Configuration

### Default limits (hardcoded, có thể move to config sau)

```typescript
const DEFAULTS = {
  MAX_TIER1_SKILLS: 4,      // Max tier 1 skills suggested
  MAX_TIER2_SKILLS: 4,      // Max tier 2 skills suggested per task
  MIN_KEYWORD_SCORE: 1,     // Minimum score to be suggested
  MAX_TOTAL_SUGGESTIONS: 8, // Hard cap on total suggestions
};
```

### Override via `.harness/config.yaml` (future)

```yaml
skills:
  max_suggestions: 6
  min_keyword_score: 1
```

---

## 8. Testing Strategy

### Unit tests (`src/lib/skill-matcher.test.ts`)

1. `tokenize()` — handles various inputs (camelCase, kebab-case, special chars)
2. `computeScore()` — correct match counting
3. `matchSkills()` — tier filtering + keyword ranking
4. Edge cases: empty keywords, empty title, no matches, all matches

### Integration test (smoke test update)

- `skill_suggest` tool returns correct skills for known task titles
- `session_start` returns only tier 1 skills

---

## 9. Ví dụ End-to-End

### Scenario 1: Bug fix task

```
Agent calls: task_create(title="Fix null reference in PaymentService.Process()")
Agent calls: skill_suggest(task_title="Fix null reference in PaymentService.Process()", stack="dotnet")

Response:
{
  "suggested_skills": [
    { "name": "karpathy-guidelines", "tier": 1, "score": 0 },
    { "name": "harness-workflow", "tier": 1, "score": 0 },
    { "name": "strategic-compact", "tier": 1, "score": 0 },
    { "name": "systematic-diagnosis", "tier": 2, "score": 2 },  // "fix" + matches
    { "name": "csharp-bugfix", "tier": 2, "score": 2 }          // "fix" + "dotnet"
  ],
  "total_available": 25
}
```

### Scenario 2: New feature task

```
Agent calls: task_create(title="Implement retry logic with exponential backoff")
Agent calls: skill_suggest(task_title="Implement retry logic with exponential backoff")

Response:
{
  "suggested_skills": [
    { "name": "karpathy-guidelines", "tier": 1, "score": 0 },
    { "name": "harness-workflow", "tier": 1, "score": 0 },
    { "name": "strategic-compact", "tier": 1, "score": 0 },
    { "name": "tdd-workflow", "tier": 2, "score": 1 }            // "test" implied
  ],
  "total_available": 25
}
```

### Scenario 3: Design task

```
Agent calls: skill_suggest(task_title="Design event-driven architecture for notification system")

Response:
{
  "suggested_skills": [
    { "name": "karpathy-guidelines", "tier": 1, "score": 0 },
    { "name": "harness-workflow", "tier": 1, "score": 0 },
    { "name": "strategic-compact", "tier": 1, "score": 0 },
    { "name": "design-grilling", "tier": 2, "score": 2 },        // "design" + "architecture"
    { "name": "architecture-review", "tier": 2, "score": 1 }     // "architecture"
  ],
  "total_available": 25
}
```

---

## 10. Trigger Field — Deprecation Path

Sau khi implement tier + keywords, field `triggers` trong frontmatter trở nên redundant:

- **Phase 1** (now): Giữ `triggers` field, thêm `tier` + `keywords` song song
- **Phase 2** (v1.3): `triggers` field deprecated, `tier` + `keywords` là primary
- **Phase 3** (v2.0): Remove `triggers` field hoàn toàn

Trong Phase 1, logic ưu tiên:
- Nếu skill có `tier` + `keywords` → dùng new matching
- Nếu skill chỉ có `triggers` (old format) → fallback to old behavior

---

## 11. Không làm

- ❌ Không dùng NLP/embedding cho keyword matching (overkill, thêm dependency)
- ❌ Không thay đổi `skill_load` behavior (explicit load luôn work)
- ❌ Không remove `triggers` field ngay (backward compat)
- ❌ Không thêm config UI (hardcoded defaults đủ tốt cho v1)

---

## 12. Success Criteria

- ✅ `session_start` suggest max 3-4 skills (tier 1 only)
- ✅ `skill_suggest("Fix bug X")` suggest 5-6 skills (3 tier 1 + 2-3 tier 2 matched)
- ✅ `skill_suggest("Design Y")` suggest 4-5 skills (3 tier 1 + 1-2 tier 2 matched)
- ✅ Thêm skill mới không tăng noise cho unrelated tasks
- ✅ All existing tests pass
- ✅ Smoke test pass
- ✅ Backward compatible (old skills without tier/keywords still work)

---

## 13. Effort Estimate

| Phase | Effort | Files |
|-------|--------|-------|
| Phase 1: Add metadata to 25 skills | 30 phút | 25 SKILL.md files |
| Phase 2: Implement skill-matcher.ts | 1 giờ | 1 new file + tests |
| Phase 3: Add skill_suggest tool | 30 phút | src/index.ts + src/tools/skill.ts |
| Phase 4: Update session_start | 15 phút | src/tools/session.ts |
| Phase 5: Update docs | 30 phút | 3 doc files |
| **Total** | **~3 giờ** | |

---

## 14. Alternatives Considered

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Pure keyword matching (no tiers) | Simple | Core skills might not match any keyword | Rejected — need guaranteed core skills |
| LLM-based matching | Most accurate | Adds latency + dependency + cost | Rejected — overkill for this use case |
| User-configured skill sets | Most flexible | Requires user setup | Rejected — too much friction |
| **Hybrid tier + keywords** | **Balanced, precise, simple** | **Needs keyword curation** | **Chosen** |
