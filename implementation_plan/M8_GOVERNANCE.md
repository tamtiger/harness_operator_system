# M8 — Governance Workflow

**Milestone:** M8  
**Effort:** 2 ngày  
**Prerequisite:** M5 *(có thể chạy song song với M6)*  
**Spec:** `08_GOVERNANCE_SPECIFICATION.md`

---

## Objective

Implement knowledge lifecycle: Proposal → Review → Approve → Promote. Human approval gate là bắt buộc và không được bypass.

---

## Vertical Slice

```bash
# AI tạo proposal
harness proposal list --status DRAFT
# PROP-2026-07-11-001  [DRAFT]  Add TypeScript strict rule

# Human review
harness proposal approve PROP-2026-07-11-001 --message "Looks good"
# ✓ Approved: PROP-2026-07-11-001

# Promote to shared
harness publish
# ✓ Published: local.rule.typescript-strict → shared
```

---

## Package Structure

```
src/governance/
  proposal/
    ProposalManager.ts      ← T8.1
    ProposalFileFormat.ts   ← proposal markdown format
  review/
    ReviewManager.ts        ← T8.2
  approval/
    ApprovalEngine.ts       ← T8.3
  promotion/
    PromotionEngine.ts      ← T8.4
  audit/
    AuditLogger.ts          ← T8.5
  service.ts                ← T8.6
```

---

## Tasks

### T8.1 — Proposal Manager

**File:** `src/governance/proposal/ProposalManager.ts`

```typescript
export class ProposalManager {
  create(request: ProposalRequest): Proposal
  submit(id: ProposalId): Proposal
  get(id: ProposalId): Proposal
  list(filter: ProposalFilter): Proposal[]
}
```

**create():**
1. Generate ProposalId: `PROP-{YYYY-MM-DD}-{NNN}` — NNN là sequential per day
2. Set status = `DRAFT`
3. Persist qua `Repository.persist('.harness/proposals/{id}.md', content)`

**submit():**
1. Validate evidence.length >= 1 → throw `govError('GOV_004')`
2. Transition `DRAFT → SUBMITTED`
3. Log audit: `proposal_submitted`
4. Persist updated proposal

**Proposal file format** (`.harness/proposals/PROP-YYYY-MM-DD-NNN.md`):
```markdown
---
id: PROP-2026-07-11-001
title: Add TypeScript strict rule
type: new_asset
status: DRAFT
author: ai-agent
createdAt: 2026-07-11T10:00:00Z
updatedAt: 2026-07-11T10:00:00Z
---

## Rationale
TypeScript strict mode prevents common runtime errors.

## Evidence
- execution_log: task-123 found 5 `any` type usages

## Proposed Content
```yaml
id: typescript-strict
type: rule
...
```
```

---

### T8.2 — Review Manager

**File:** `src/governance/review/ReviewManager.ts`

```typescript
export class ReviewManager {
  startReview(id: ProposalId, reviewer: string): Proposal
  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal
}
```

**startReview():**
1. Check current status = `SUBMITTED` → throw `govError('GOV_002')` nếu không
2. Check `lockedBy` field — nếu locked bởi người khác → throw `govError('GOV_003')`
3. Transition `SUBMITTED → REVIEWING`
4. Set `lockedBy = reviewer`, `lockedAt = now`
5. Log audit, persist

**Lock timeout:** Check nếu `lockedAt` > 30 phút → clear lock, allow new reviewer.

**requestChanges():**
1. Validate caller = lockedBy → throw `govError('GOV_007')` nếu không
2. Transition `REVIEWING → DRAFT`
3. Add comment, clear lock
4. Log audit, persist

---

### T8.3 — Approval Engine

**File:** `src/governance/approval/ApprovalEngine.ts`

```typescript
export class ApprovalEngine {
  approve(id: ProposalId, reviewer: string, comments: string): Proposal
  reject(id: ProposalId, reviewer: string, comments: string): Proposal
}
```

**⚠ Security:** `approve()` chỉ được gọi qua CLI (`harness proposal approve`). Platform phải **không expose method này qua MCP**.

**approve():**
1. Check status = `REVIEWING` → throw `govError('GOV_002')`
2. Check caller = lockedBy → throw `govError('GOV_007')`
3. Transition `REVIEWING → APPROVED`
4. Set `approvedAt`, add comment, clear lock
5. Log audit, persist

**reject():**
1. Check status = `REVIEWING` → throw `govError('GOV_002')`
2. Transition `REVIEWING → REJECTED`
3. Set `reviewedAt`, add comment, clear lock
4. Log audit, persist

---

### T8.4 — Promotion Engine

**File:** `src/governance/promotion/PromotionEngine.ts`

```typescript
export class PromotionEngine {
  promote(id: ProposalId): PromotionResult
}
```

**promote():**
1. Get proposal, check status = `APPROVED` → throw `govError('GOV_002')`
2. Extract `proposedContent` từ proposal file
3. Determine target path trong Local Harness (`.harness/{type}/{asset-id}.md`)
4. Gọi `Repository.persist(root, targetPath, content)` để ghi asset
5. Transition `APPROVED → PROMOTED`
6. Set `promotedAt`
7. Log audit: `proposal_promoted`
8. Persist updated proposal
9. Return `{ proposalId, promotedAssetPath, promotedAt }`

**Governance chỉ promote.** Platform chịu trách nhiệm publish lên Harness Repository.

---

### T8.5 — Audit Logger

**File:** `src/governance/audit/AuditLogger.ts`

```typescript
export class AuditLogger {
  log(record: AuditRecord): void
  getLog(proposalId: ProposalId): AuditRecord[]
}
```

**log():**
- Append JSON line vào `.harness/logs/audit.jsonl` qua `Repository.persist()`
- File là append-only — không bao giờ rewrite

**getLog():**
- Read `.harness/logs/audit.jsonl`
- Parse mỗi line là JSON
- Filter by `proposalId`

JSONL format — mỗi line:
```json
{"id":"aud-001","timestamp":"2026-07-11T10:00:00Z","action":"proposal_submitted","actor":"ai-agent","proposalId":"PROP-2026-07-11-001","previousStatus":"DRAFT","newStatus":"SUBMITTED","details":""}
```

---

### T8.6 — Governance Service

**File:** `src/governance/service.ts`

```typescript
export class GovernanceServiceImpl implements GovernanceService {
  constructor(
    private proposals: ProposalManager,
    private review: ReviewManager,
    private approval: ApprovalEngine,
    private promotion: PromotionEngine,
    private audit: AuditLogger,
    private repo: RepositoryService,
  ) {}
}
```

---

## Acceptance Scenarios — M8

**Scenario 1 — Full governance lifecycle:**
```
1. AI tạo proposal (status: DRAFT)
2. AI submit proposal (status: SUBMITTED) — evidence check
3. Human start review (status: REVIEWING)
4. Human approve (status: APPROVED)
5. promote() → asset written to .harness/rules/
6. status: PROMOTED
7. Audit log có 5 records
```

**Scenario 2 — Human approval gate:**
```typescript
// Gọi approve() từ code (simulating AI trying to approve)
gov.approve('PROP-001', 'ai-agent', '')
// Expected: throw GOV_007 nếu ai-agent không phải là reviewer
// (MCP không expose approve — đây là defense-in-depth)
```

**Scenario 3 — Lock timeout:**
```
Reviewer A starts review, abandons (30+ min ago)
Reviewer B tries startReview()
→ Lock cleared, Reviewer B can review
```

**Scenario 4 — Submit without evidence:**
```
proposal.evidence = []
gov.submitProposal(...)
→ throw GOV_004
```

---

## Unit Tests — M8

| Test | Expected |
|------|----------|
| `create()` generates valid ProposalId | match `/^PROP-\d{4}-\d{2}-\d{2}-\d{3}$/` |
| `submit()` no evidence | throw GOV_004 |
| `submit()` DRAFT → SUBMITTED | status updated |
| `startReview()` not SUBMITTED | throw GOV_002 |
| `startReview()` already locked | throw GOV_003 |
| `startReview()` lock expired (>30min) | allowed |
| `approve()` not REVIEWING | throw GOV_002 |
| `approve()` wrong reviewer | throw GOV_007 |
| `approve()` valid | status = APPROVED |
| `reject()` valid | status = REJECTED |
| `promote()` not APPROVED | throw GOV_002 |
| `promote()` valid | asset persisted, status = PROMOTED |
| Audit log append | getLog returns correct records |
| Concurrent modify | GOV_006 if stale |

---

## Definition of Done — M8

- [ ] Proposal lifecycle đầy đủ (7 states, all transitions)
- [ ] Human approval gate enforced
- [ ] Governance không ghi filesystem trực tiếp (only via Repository.persist)
- [ ] Audit log append-only, JSONL format
- [ ] Lock với timeout 30 phút
- [ ] Error codes GOV_001–010 có test
- [ ] dependency-cruiser: `governance` không import `context`, `execution`, `capability`, `platform`

## Review Gate — M8

```
AI self-review: human approval gate không thể bypass chưa?
      ↓
tsc + eslint + dependency-cruiser (0 errors)
      ↓
Unit + integration tests pass
      ↓
Human review (focus: security — approve() không accessible qua MCP)
      ↓
Merge to main
```
