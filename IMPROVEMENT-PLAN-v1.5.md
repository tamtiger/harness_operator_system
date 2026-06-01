# Harness v1.5 — Self-Learning & Knowledge Evolution Layer

> Prerequisite: v1.4.0 (reliability layer) phải ship trước.
> Base: harness-os 1.4.0 (31 tools, Bayesian instincts, circuit breaker, analytics)
> Target: **1.5.0**
> Branch: `feat/v1.5-knowledge`

---

## Vision

Biến Harness từ:

```
Task → Agent → Output
```

Thành:

```
Task → Context Injection → Agent → Output → Reflection → Knowledge Update → Better Future Tasks
```

Mỗi task hoàn thành hoặc thất bại đều giúp hệ thống trở nên tốt hơn.

---

## Core Principles

| Principle | Implementation |
|---|---|
| Learn From Every Task | `session_handoff` triggers reflection pipeline |
| Prevent Repeated Mistakes | `never_again.md` injected vào `session_start` context |
| Documentation Is Alive | Post-task hook auto-checks doc drift |
| Capture Engineering Knowledge | ADR + lessons stored as structured instincts |

---

## Architecture — Mapping vào harness-os hiện tại

### Không tạo subsystem mới. Mở rộng cái đã có.

| v1.5 Concept | Maps to | Implementation |
|---|---|---|
| Lessons Learned | **Instinct** with `type: 'lesson'` | Extend instinct schema, add `type` column |
| Error Patterns | **Instinct** with `type: 'pattern'` | Same table, different type |
| Anti-Patterns | **Instinct** with `type: 'anti_pattern'` | Same table, different type |
| ADR (Architecture Decisions) | **Instinct** with `type: 'decision'` | Same table, different type |
| Never Again | `.harness/never_again.md` file | Read by `session_start`, inject into response |
| Reflection Agent | **`postTaskExecution` hook** + new `reflection_run` tool | Hook triggers reflection |
| Auto Changelog | **`postTaskExecution` hook** | Hook appends to CHANGELOG |
| Knowledge Retrieval | Enhanced `skill_suggest` + `instinct_get` | Pre-task injection |

### Tại sao dùng instinct table thay vì tạo `knowledge/` directory mới?

1. **Instinct table đã có:** SQLite, queryable, confidence tracking (Bayesian từ v1.4), tags, TTL.
2. **Tránh dual-source-of-truth:** Markdown files trong `knowledge/` sẽ drift khỏi DB.
3. **Instinct system đã có prune/evolve/promote:** Reuse lifecycle management.
4. **Analytics đã track instincts:** `harness report` từ v1.4 sẽ tự động cover knowledge items.

Chỉ cần thêm `type` column để phân biệt:

```sql
ALTER TABLE instincts ADD COLUMN type TEXT DEFAULT 'instinct';
-- Values: 'instinct' | 'lesson' | 'pattern' | 'anti_pattern' | 'decision' | 'experiment'
```

---

## Schema Changes (additive, trên v1.4 schema)

```sql
-- Extend instincts table
ALTER TABLE instincts ADD COLUMN type TEXT DEFAULT 'instinct';
ALTER TABLE instincts ADD COLUMN context TEXT;          -- JSON: { task_id, repo, trigger_event }
ALTER TABLE instincts ADD COLUMN resolution TEXT;       -- How it was resolved
ALTER TABLE instincts ADD COLUMN review_trigger TEXT;   -- Condition to re-evaluate this knowledge

-- Reflection log (lightweight, append-only)
CREATE TABLE IF NOT EXISTS reflections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT,
  trigger TEXT NOT NULL,           -- 'task_complete' | 'task_failed' | 'session_handoff'
  findings TEXT NOT NULL,          -- JSON array of findings
  actions_taken TEXT NOT NULL,     -- JSON array of actions (instinct_add, doc_update, etc.)
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## New MCP Tools (2 tools)

### `reflection_run`

Trigger reflection analysis on a completed session/task.

```typescript
server.registerTool("reflection_run", {
  description: "Run reflection analysis on a completed task. Extracts lessons, patterns, and updates knowledge.",
  inputSchema: {
    session_id: z.string().describe("Session to reflect on"),
    task_id: z.string().optional().describe("Specific task (if omitted, reflects on entire session)"),
    trigger: z.enum(["task_complete", "task_failed", "session_handoff"]).describe("What triggered reflection"),
  },
});
```

**What it does:**
1. Query `audit_events` for the session — extract tool calls, errors, retries, duration
2. Query `session_instinct_refs` — which instincts were used
3. Analyze patterns:
   - Same tool failed multiple times? → Create `type: 'pattern'` instinct
   - Session took >3 loops to pass? → Create `type: 'lesson'` instinct
   - New architectural decision made? → Create `type: 'decision'` instinct
4. Check if similar lesson already exists (fuzzy match on description) → update confidence instead of duplicate
5. Return structured findings + actions taken

**Output:**

```json
{
  "findings": [
    { "type": "lesson", "description": "verify_run fails on Windows when path contains spaces", "confidence": 0.5 },
    { "type": "pattern", "description": "code_search_grep called 8 times before finding correct file", "confidence": 0.4 }
  ],
  "actions_taken": [
    { "action": "instinct_add", "id": "uuid-1", "type": "lesson" },
    { "action": "instinct_add", "id": "uuid-2", "type": "pattern" }
  ],
  "session_summary": {
    "total_tool_calls": 45,
    "errors": 3,
    "retries": 2,
    "duration_seconds": 340
  }
}
```

### `knowledge_query`

Query accumulated knowledge (lessons, patterns, decisions) relevant to a task.

```typescript
server.registerTool("knowledge_query", {
  description: "Query accumulated knowledge (lessons, patterns, anti-patterns, decisions) relevant to a task context.",
  inputSchema: {
    query: z.string().describe("Natural language query or task description"),
    types: z.array(z.enum(["lesson", "pattern", "anti_pattern", "decision", "experiment"])).optional(),
    tags: z.array(z.string()).optional(),
    min_confidence: z.number().optional().describe("Minimum confidence threshold (default 0.4)"),
  },
});
```

**What it does:**
1. Tokenize query (reuse `skill-matcher.ts` tokenizer)
2. Search instincts WHERE `type IN (requested_types)` AND tags match AND confidence >= threshold
3. Rank by relevance (token overlap + confidence weight)
4. Return top-K results

**Difference from `instinct_get`:** `instinct_get` filters by exact tags. `knowledge_query` does fuzzy semantic matching on description + tags combined.

---

## Never Again System

### Implementation: Simple file-based, injected at session_start

**File:** `.harness/never_again.md`

```markdown
# Never Again

Critical mistakes that must not be repeated in this repo.

- Do NOT use `rm -rf` in verify steps — use targeted cleanup
- Do NOT commit .env files — use .env.example
- Do NOT run `git push --force` on main branch
- Windows: Do NOT use Git Bash for Podman volume mounts — use WSL or PowerShell
```

**Integration in `session_start`:**

```typescript
export function sessionStart(repoPath: string): SessionStartResult {
  // ... existing logic ...

  // Inject never_again warnings
  const neverAgainPath = join(repoPath, ".harness", "never_again.md");
  let neverAgainWarnings: string[] = [];
  if (existsSync(neverAgainPath)) {
    const content = readFileSync(neverAgainPath, "utf-8");
    neverAgainWarnings = content
      .split("\n")
      .filter(line => line.startsWith("- "))
      .map(line => line.slice(2).trim());
  }

  return {
    ...result,
    never_again: neverAgainWarnings,  // New field in SessionStartResult
  };
}
```

**Auto-population:** `reflection_run` can append to `never_again.md` when it detects a critical repeated failure (same error 3+ times across sessions).

---

## Reflection Hook — `postTaskExecution`

### Kiro/IDE Hook Configuration

```json
{
  "name": "Auto Reflection",
  "version": "1.0.0",
  "when": {
    "type": "postTaskExecution"
  },
  "then": {
    "type": "askAgent",
    "prompt": "Run reflection_run for the completed task. Extract lessons and patterns. Update knowledge base."
  }
}
```

### harness-os Internal Hook (`.harness/hooks.yaml`)

```yaml
post_task_hooks:
  - trigger: task_complete
    action: reflection_run
    auto: true
  - trigger: task_failed
    action: reflection_run
    auto: true
```

**Note:** This extends the existing hooks.yaml schema. The `post_task_hooks` section is new.

---

## Pre-Task Knowledge Injection

### Enhanced `session_start` Response

```typescript
interface SessionStartResult {
  session_id: string;
  last_handoff: HandoffData | null;
  pending_tasks_count: number;
  applicable_skills: string[];
  instructions_to_read: string[];
  never_again: string[];                    // NEW: critical warnings
  relevant_knowledge: KnowledgeItem[];      // NEW: lessons/patterns for context
}
```

### How `relevant_knowledge` is populated:

1. Read `last_handoff.next_steps` → extract keywords
2. Read pending tasks titles → extract keywords
3. Query `instincts` WHERE `type IN ('lesson', 'pattern', 'anti_pattern')` AND tags overlap with keywords
4. Return top 5 by confidence

This gives the agent immediate context about past mistakes and patterns before starting work.

---

## Auto-Documentation Hooks

### Auto Changelog (postTaskExecution)

```yaml
post_task_hooks:
  - trigger: task_complete
    action: append_changelog
    template: |
      ## {{DATE}}
      - {{TASK_STATUS}}: {{TASK_TITLE}}
        Files: {{FILES_CHANGED}}
```

**Implementation:** In `session_handoff`, after closing session, check if `.harness/auto_changelog: true` in config.yaml. If yes, append entry to `CHANGELOG.md`.

### Doc Drift Detection (postTaskExecution)

After task completion, compare:
- Files changed in session (from `audit_events` tool_success payloads)
- Files referenced in `AGENTS.md`, `README.md`

If a changed file is referenced in docs but docs weren't updated → emit warning in handoff.

**Implementation:** Add to `sessionHandoff()`:

```typescript
// Check doc drift
const changedFiles = getSessionChangedFiles(sessionId);  // from audit_events
const docRefs = extractDocReferences(repoPath);          // parse AGENTS.md, README.md
const driftWarnings = changedFiles.filter(f => docRefs.includes(f));
if (driftWarnings.length > 0) {
  result._doc_drift_warning = `These files changed but docs may be outdated: ${driftWarnings.join(', ')}`;
}
```

---

## ADR System (Architecture Decision Records)

### Stored as instincts with `type: 'decision'`

```typescript
instinctAdd(
  "Use SQLite for all persistent state — simple deployment, single-file, no external deps",
  ["architecture", "database", "sqlite"],
  0.9,   // high confidence — deliberate decision
  null,  // no TTL — permanent
);
// + type: 'decision'
// + context: { task_id: "...", repo: "harness-os" }
// + review_trigger: "When data exceeds 100k records or need concurrent writes"
```

### CLI access:

```
harness knowledge --type decision --list
harness knowledge --type lesson --tags "windows,podman"
harness knowledge --add --type decision "Use pnpm over npm for workspace support"
```

---

## Experiment Registry

### Stored as instincts with `type: 'experiment'`

```typescript
instinctAdd(
  "Tried full codebase embedding for code search — token cost too high ($2.40/repo), latency 8s",
  ["experiment", "embedding", "code-search"],
  0.3,   // low confidence = failed experiment
  null,
);
// + type: 'experiment'
// + resolution: "Use file-level grep instead. Revisit when embedding costs drop 10x."
```

**Purpose:** Prevent re-running failed experiments. `knowledge_query("embedding for search")` will surface this.

---

## Roadmap

### Phase 1 — Foundation (v1.5.0)

| Item | Effort | Dependency |
|---|---|---|
| Schema migration (type, context, resolution columns) | S | v1.4 schema |
| `reflection_run` tool | M | audit_events + instinct system |
| `knowledge_query` tool | M | skill-matcher tokenizer |
| Never Again file injection in `session_start` | S | None |
| `harness knowledge` CLI command | S | Schema |
| Update smoke test (33 tools) | S | New tools |

### Phase 2 — Automation (v1.5.1)

| Item | Effort | Dependency |
|---|---|---|
| Post-task reflection hook (hooks.yaml extension) | M | Phase 1 |
| Auto changelog append | S | session_handoff |
| Doc drift detection | M | audit_events analysis |
| Pre-task knowledge injection in `session_start` | S | Phase 1 |

### Phase 3 — Intelligence (v1.5.2)

| Item | Effort | Dependency |
|---|---|---|
| Pattern deduplication (fuzzy match before insert) | M | Phase 1 |
| Auto-populate never_again from repeated failures | S | reflection_run |
| Knowledge effectiveness in `harness report` | S | v1.4 analytics |
| `instinct_evolve` enhanced: evolve lessons into skills | M | Phase 1 |

---

## What v1.5 Does NOT Do

| Excluded | Reason |
|---|---|
| External knowledge graph (Neo4j, etc.) | Overkill. SQLite + tags + tokenizer is sufficient for single-repo scale. |
| LLM-based semantic search | Adds external dependency. Token-based matching from skill-matcher is good enough. |
| Auto-fix code from lessons | Too risky. Lessons inform the agent, agent decides. |
| Cross-repo knowledge sharing | v1.6 scope. Need single-repo proven first. |
| Real-time file watcher | MCP server is request-response. Use hooks instead. |
| Separate `knowledge/` directory tree | Dual source of truth. Everything in SQLite instincts table. |

---

## Expected Outcome

After v1.5:

```
Session 1: Agent makes mistake X
  → reflection_run detects pattern
  → instinct_add(type='lesson', description='...')

Session 2: session_start
  → relevant_knowledge includes lesson about X
  → Agent avoids mistake X

Session 3: Same mistake attempted
  → never_again.md blocks it
  → Agent uses alternative approach
```

**Measurable:**
- `harness report` shows: knowledge items created per session
- Repeated error rate decreases over time (track via `audit_events` error patterns)
- `instinct_get --type lesson --min-confidence 0.7` grows over time

---

## Acceptance Criteria — v1.5.0

| # | Criterion | Verify |
|---|---|---|
| 1 | `reflection_run` extracts ≥1 finding from a session with errors | Unit test with mock audit data |
| 2 | `knowledge_query("podman volume")` returns relevant lessons | Unit test with seeded instincts |
| 3 | `session_start` includes `never_again` field when file exists | Unit test |
| 4 | `session_start` includes `relevant_knowledge` from past lessons | Unit test |
| 5 | Instinct with `type: 'lesson'` survives `instinct_prune` if confidence > 0.3 | Unit test |
| 6 | `harness knowledge --type decision --list` shows ADRs | CLI test |
| 7 | Duplicate lesson detection: same description → update confidence, not insert | Unit test |
| 8 | 33 tools registered in smoke test | Smoke test |
| 9 | `pnpm run build` passes, all tests pass | CI |

---

*Plan v1.5 | Created: 2026-06-01 | Prerequisite: v1.4.0 | Target: 1.5.0*
