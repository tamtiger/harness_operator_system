# Harness-OS Plan: Skill-to-Action Mapping

> Solves: a skill is correctly suggested and loaded into context, but the
> agent does not actually follow it. Loading is not compliance.

---

## Problem

Auto-loading a skill (suggesting it, attaching it to context at
`session_start`) guarantees the agent *sees* it. It does not guarantee the
agent *does* what it says. Today, skill content is prose:

```text
"Always run scope_check before editing files outside the task scope."
"Identify root cause before applying a fix."
"Think carefully about edge cases before writing code."
```

None of these are observable by the harness as written. An agent can read
all three and do none of them, and nothing in the load mechanism catches
it — load success and compliance are two different things being treated as
one.

---

## Goal

Convert skill prose into checkable tool-call sequences wherever that's
possible, and explicitly mark the parts where it isn't. Stop pretending a
skill is "followed" just because it was "loaded."

---

## Classifying Skill Steps

Every step in a skill is classified into exactly one of three types when
the skill contract is authored:

| Type | Definition | Enforceable? |
|---|---|---|
| **Action-mappable** | Step corresponds to a specific tool call that must occur, optionally in sequence relative to other calls | Yes — fully |
| **Narrative-gated** | Step requires the agent to produce a statement (root cause, hypothesis) before a subsequent tool call is allowed to succeed | Partially — presence can be enforced, correctness cannot |
| **Unenforceable** | Step is pure judgment/reasoning with no observable artifact ("think carefully", "consider edge cases") | No — model quality only |

A skill contract must declare which bucket each step falls into. Skills
with zero action-mappable or narrative-gated steps should be flagged at
authoring time — they're guidance, not contract, and should not carry
compliance weight.

---

## Skill Contract Schema

```yaml
name: systematic-diagnosis

steps:
  - id: pre_edit_scope_check
    type: action_mappable
    required_tool: scope_check
    order: before(edit_file)

  - id: root_cause_before_fix
    type: narrative_gated
    required_tool: skill_narrative_submit
    gate_field: root_cause
    blocks: fix_apply       # fix_apply rejects if this hasn't been submitted

  - id: consider_edge_cases
    type: unenforceable
    note: "tracked for human review only, never scored"

compliance_weight: 15
```

```ts
type SkillStepType = "action_mappable" | "narrative_gated" | "unenforceable";

interface SkillStep {
  id: string;
  type: SkillStepType;
  requiredTool?: string;   // action_mappable, narrative_gated
  order?: string;          // e.g. "before(edit_file)" — sequence constraint
  gateField?: string;      // narrative_gated only
  blocks?: string;         // narrative_gated only — tool that stays locked until satisfied
  note?: string;           // unenforceable only
}
```

---

## Enforcement Behavior by Type

- **Action-mappable**: compliance check fails if `required_tool` was not
  called, or was called out of the declared `order`. Hard,
  outcome-independent presence/sequence check.

- **Narrative-gated**: the `blocks` tool (e.g. `fix_apply`) returns an
  error if `gate_field` has no submitted value yet. This enforces that
  *something* was written before proceeding — it does not and cannot
  verify the content is correct. The tool's error message should state
  this limit plainly, so it isn't mistaken for a correctness check.

- **Unenforceable**: stored in the skill contract as documentation only.
  Never surfaced in compliance scoring, to avoid implying it's measured
  when it isn't.

---

## What This Closes, and What It Doesn't

**Closes:**
- Agent never calls the tools a skill requires (e.g. `scope_check`) — now
  caught the same way a missing `verify_run` is caught.
- Agent jumps straight to a fix with no stated reasoning — now blocked
  structurally instead of merely discouraged in prose.

**Does not close:**
- Agent submits a `root_cause` narrative that is fabricated or low
  quality. No automated check here can verify reasoning *content* — that
  stays bounded by model capability, not tooling.
- Skills that are inherently judgment-only ("think carefully") remain
  unenforceable by design. The honest fix is removing such steps from any
  skill that needs compliance weight — not pretending they're measured.

---

## Authoring Implication

Skill authors must write with enforcement in mind: prose-only skills should
be rewritten so their critical steps have a corresponding tool call. A
skill with zero action-mappable or narrative-gated steps should not carry
compliance weight at all — it's guidance, and should be labeled as such.

---

## Relationship to Auto-Loading

Auto-loading (suggesting/attaching the right skill at session start) and
this mapping are two separate fixes for two separate failures:

| Failure | Fix |
|---|---|
| Agent never loads the right skill | Auto-resolution at session start |
| Agent loads the skill but ignores it | Skill-to-Action Mapping (this plan) |

Auto-loading alone does not solve compliance — it only guarantees
visibility. This plan is what turns visibility into something the harness
can actually check.
