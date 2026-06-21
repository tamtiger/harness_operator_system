# Harness-OS Improvement Plan v2

## From Skill Guidance → Skill Compliance System

> Revision note: this version replaces self-reported evidence scoring with a
> verifiable/narrative split, reorders enforcement ahead of dashboards, and
> states explicitly what this system can and cannot block.

---

## Problem Statement

Current architecture assumes:

```text
skill_load()
↓
Agent reads skill
↓
Agent follows skill
```

This assumption is weak. Modern coding agents frequently:

- Load skills but ignore them
- Partially follow skills
- Skip workflow steps
- Claim completion without executing required actions

Root issue:

> harness-os currently trusts agent intentions instead of validating agent
> behavior.

---

## What This System Can and Cannot Do

This must be stated up front, because it constrains every phase below.

**Can do:**
- Observe and score MCP tool calls the agent actually makes
- Block a tool from returning success (e.g. `task_complete`) when
  prerequisites are missing
- Capture evidence the harness generates itself (diffs, exit codes, file
  hashes) which the agent cannot fabricate by writing text

**Cannot do:**
- Stop an agent from telling the user "done" in plain chat text without
  calling any tool
- Verify that agent-written narrative (root cause, hypothesis) is true —
  only that it was supplied
- Intercept host-native tools (the IDE's own file-edit tool) unless the host
  explicitly routes those calls through harness-os

Every phase below is designed around these limits, not around an assumption
that harness-os has full control of the agent.

---

## Phase 1 — Workflow Enforcement Foundation

### Objective

Make workflow execution observable.

### Session Workflow State

```ts
interface SessionWorkflowState {
  sessionStarted: boolean;
  taskCreated: boolean;
  skillsLoaded: string[];
  progressLogged: boolean;
  verifyExecuted: boolean;
  verifyPassed: boolean;       // NEW — distinct from "was called"
  handoffCreated: boolean;
  completedSteps: string[];
}
```

`verifyExecuted` and `verifyPassed` are tracked separately. A tool call that
fails or runs against an empty config still sets `verifyExecuted = true` but
must not set `verifyPassed = true`.

### New MCP Endpoint

```ts
workflow_status(sessionId)
```

```json
{
  "sessionStarted": true,
  "taskCreated": true,
  "verifyExecuted": true,
  "verifyPassed": false,
  "complianceScore": 62
}
```

---

## Phase 2 — Evidence Model: Verifiable vs. Narrative

### Objective

Stop scoring agent claims as if they were proof. This is the core fix from
v1.

### Two Evidence Classes

**Verifiable evidence** — captured by the harness itself, not written by the
agent. The agent cannot influence the content, only trigger the capture.

| Example | Source |
|---|---|
| File diff before/after edit | git diff, computed by harness |
| Test exit code | subprocess result |
| Lint/typecheck output | subprocess result |
| Lines changed vs. scope_check allowlist | computed by harness |

**Narrative evidence** — free text written by the agent (root cause,
hypothesis, reasoning). Useful for human review and for the instinct/learning
system. **Not eligible for compliance score points**, because it cannot be
distinguished from a fabricated string that merely satisfies a schema.

### Rule

> Compliance score is computed only from verifiable evidence and from the
> fact that a required tool call returned a *passing* result. Narrative
> evidence is stored and surfaced for human/audit review but contributes
> zero points.

---

## Phase 3 — Skill Contracts

### Objective

Transform skills from prose into contracts the harness can check against
verifiable evidence.

```yaml
name: systematic-diagnosis

required_actions:
  - gather_evidence      # must correspond to a tool call, not a claim
  - run_verification

required_verifiable_evidence:
  - diff_captured
  - verify_exit_code

narrative_fields:          # stored, not scored
  - hypothesis
  - root_cause

compliance_weight: 15
```

```ts
interface SkillContract {
  name: string;
  description: string;
  requiredActions: string[];
  requiredVerifiableEvidence: string[];
  narrativeFields: string[];     // never scored
  complianceWeight: number;
}
```

---

## Phase 4 — Evidence Capture

### Objective

Capture verifiable evidence automatically as a side effect of tool calls
that already happen, rather than asking the agent to submit it separately.

Example: when `verify_run` executes, the harness itself records exit code,
stdout/stderr length, and which checks ran — the agent does not construct
this payload.

### MCP Tool (narrative only)

```text
skill_narrative_submit(sessionId, skill, field, text)
```

Explicitly named `narrative_submit`, not `evidence_submit`, so its scope is
unambiguous: this writes to the audit log and instinct system, never to the
compliance score.

---

## Phase 5 — Compliance Validator

### Objective

Validate session state against loaded skill contracts using only verifiable
signals.

```text
compliance_check(sessionId)
```

```json
{
  "score": 91,
  "missingActions": [],
  "missingVerifiableEvidence": [],
  "status": "PASS"
}
```

```json
{
  "score": 54,
  "missingActions": ["verify_run"],
  "missingVerifiableEvidence": ["verify_exit_code"],
  "status": "FAIL"
}
```

### Scoring Rule (replaces v1 table)

| Action | Points awarded when... |
|---|---|
| session_start | called |
| task_create | called |
| skill_load | called |
| progress_log | called with non-empty content |
| verify_run | `verifyPassed === true`, not merely called |
| session_handoff | called after `verifyPassed === true` |

`verify_run` is weighted highest (25) and is the only item gated on outcome
rather than invocation, because it is the highest-leverage signal against
fake completion.

---

## Phase 6 — Completion Guard (moved up from Phase 9)

### Objective

This is the first phase with real teeth, moved ahead of dashboards because
observability alone does not change agent behavior — see "What This System
Can and Cannot Do" above.

### Rule

`task_complete` returns an error, not a silent pass, if:

```text
verifyPassed === false
```

or

```text
compliance_check.status === "FAIL"
```

### Explicit Scope Limit

This guard blocks the `task_complete` *tool call* from succeeding. It does
**not** prevent the agent from writing "the task is done" directly in its
chat response without calling the tool at all. That failure mode is outside
what an MCP server can control and should be documented as a known
limitation, not silently assumed away.

---

## Phase 7 — Auto Skill Resolution

### Objective

Reduce dependency on agent memory for which skill to load.

```text
session_start
↓
workflow guidance
↓
auto skill resolution (harness-determined, not agent-determined)
↓
skills attached automatically
```

Eliminates the "agent forgot to load skill" failure mode without requiring
agent cooperation.

---

## Phase 8 — Workflow Router

### Objective

Move workflow-size selection from prompt judgment to a defined heuristic, so
classification is not just another agent self-report.

### Heuristic (concrete, not illustrative)

Classify as **Quick** if all of:
- Estimated files touched ≤ 2
- No match against a configured sensitive-path list (auth, payments, db
  migrations, infra/, security-relevant globs)
- No new dependency added

Otherwise classify as **Full**.

Router output is informational context for the agent, not a hard gate —
misclassification should degrade gracefully (extra skill loaded, not a
blocked task) rather than fail closed.

---

## Phase 9 — Observability Dashboard

### Metrics

```text
Compliance Rate      = sessions with score ≥ threshold / total sessions
Verification Rate    = verifyPassed=true / code-changing tasks
Handoff Rate         = session_handoff called / sessions started
Workflow Success Rate = compliance PASS / workflow started
```

Dashboard is read-only reporting, built last because it depends on data
produced by Phases 1–6 and has no effect on agent behavior by itself.

---

## Phase 10 — Extended Hard Enforcement (Optional)

Only pursue if compliance remains poor after Phase 6 ships.

- **Edit Guard**: block file modification if `sessionStarted === false` —
  only feasible if the host routes edits through harness-os; document this
  dependency before attempting it.
- **Handoff Guard**: block session close if `session_handoff` missing.

---

## Recommended Implementation Order

### Sprint 1
- `workflow_status`
- Verifiable/narrative evidence split (Phase 2)
- Outcome-based `compliance_check` (Phase 5)
- **Completion Guard** (Phase 6)

ROI: Very High — this sprint is the only one that changes agent behavior,
not just visibility.

### Sprint 2
- Skill Contract v2 (Phase 3)
- Evidence capture wiring (Phase 4)

ROI: High

### Sprint 3
- Auto Skill Resolution (Phase 7)
- Workflow Router (Phase 8)

ROI: High

### Sprint 4
- Observability Dashboard (Phase 9)
- Extended Hard Enforcement, if needed (Phase 10)

ROI: Medium

---

## Success Criteria

A successful harness-os workflow should no longer depend on:

```text
Agent memory
```

or

```text
Agent honesty in free text
```

It should depend on:

```text
Tool calls the harness can observe
+
Evidence the harness itself captures
+
Outcome-gated compliance validation
```

with an explicit, documented boundary around what cannot be enforced this
way.

Final principle:

> Trust verifiable evidence, not agent claims — and say plainly where
> verifiable evidence cannot reach.

# Phase 3.5 — Skill-to-Action Mapping Layer

## Objective

Bridge the gap between:

```text
Skill Loaded
```

and

```text
Skill Actually Executed
```

A loaded skill should not be treated as compliance evidence.

Only observable actions should contribute to compliance.

---

## Problem

Current Skill Contract v2 improves validation:

```yaml
required_actions:
required_verifiable_evidence:
```

However, a significant gap remains:

```text
skill loaded
↓
agent ignores skill
↓
verify_run passes
↓
task_complete succeeds
```

This is possible whenever the skill contains behavioral guidance that is not directly tied to a required action.

Examples:

| Skill                | Fully Enforceable? |
| -------------------- | ------------------ |
| scope-check workflow | Yes                |
| verification-loop    | Yes                |
| code-review-workflow | Partially          |
| systematic-diagnosis | Partially          |
| design-grilling      | No                 |
| strategic-thinking   | No                 |
| karpathy-guidelines  | No                 |

---

## Principle

A skill is only enforceable if its requirements can be mapped to:

* MCP tool calls
* workflow state transitions
* harness-generated evidence

Everything else remains advisory.

---

## Skill Classification

### Class A — Fully Enforceable

Can be mapped directly to observable actions.

Example:

```yaml
name: harness-workflow

required_actions:
  - session_start
  - verify_run
  - session_handoff
```

Compliance:

```text
100% machine-verifiable
```

---

### Class B — Partially Enforceable

Contains both observable and narrative elements.

Example:

```yaml
name: systematic-diagnosis

required_actions:
  - gather_evidence
  - verify_run

narrative_fields:
  - hypothesis
  - root_cause
```

Compliance checks:

```text
Actions → enforceable
Narrative → audit only
```

---

### Class C — Advisory

Cannot be reliably mapped to observable actions.

Examples:

```text
strategic-thinking
karpathy-guidelines
design-grilling
```

These skills:

* influence context
* influence reasoning

but do not generate compliance points.

---

## Skill Action Map

New structure:

```yaml
name: systematic-diagnosis

action_map:
  gather_evidence:
    tool: code_search
    required: true

  validate_fix:
    tool: verify_run
    required: true

narrative_fields:
  - root_cause
  - hypothesis
```

---

## Workflow Sequence Validation

Some skills require order.

Example:

```text
scope_check
↓
edit
↓
verify_run
```

Valid.

---

Example:

```text
edit
↓
scope_check
↓
verify_run
```

Invalid.

````

The compliance engine should validate sequence, not just presence.

---

## Compliance Rule

Loaded skills do not earn points.

Only completed mapped actions earn points.

Example:

```text
skill_load("systematic-diagnosis")
````

Score:

```text
0
```

---

Example:

```text
skill_load
+
gather_evidence
+
verify_run
```

Score:

```text
earned
```

---

## Future Direction

Eventually:

```text
Skill
↓
Action Graph
↓
Workflow Engine
↓
Compliance Validator
```

Instead of:

```text
Skill
↓
Prompt Text
↓
Model Interpretation
```

This reduces dependence on model obedience and increases reliance on observable system behavior.

