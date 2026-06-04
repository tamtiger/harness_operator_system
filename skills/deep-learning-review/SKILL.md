---
name: deep-learning-review
description: "Post-session/project deep learning — generates structured knowledge documents explaining what was built, why, and how it works for knowledge retention."
metadata:
  version: "1.1"
  updated: "2026-06-04"
  applies_to: ["*"]
  triggers: ["session_end", "session_handoff"]
  tier: 2
  keywords: ["learn", "review", "explain", "understand", "knowledge", "học", "hiểu", "giải thích", "tổng kết", "recap", "session review", "project review", "elii", "intern"]
---

# Deep Learning Review

## Purpose

After completing a session or understanding a project, generate structured knowledge documents that explain what was done, why decisions were made, and how the system works. Target audience: an intern who knows basic programming but nothing about this codebase.

## Mode Auto-Detection

**When triggered automatically** (via `session_end` or `session_handoff`):
→ Default to **Mode A** (session review) unless evidence suggests otherwise

**When user provides input**, use these heuristics (in order):

| Signal | Mode |
|--------|------|
| `"session"` / `"recap"` / `"vừa làm"` | A |
| `"project"` / `"onboard"` / `"codebase"` / `"architecture"` | B |
| No clear signal / ambiguous | A (safer, smaller scope) |

**Example detection:**
- Auto-trigger from `session_end` → Mode A (last session's work)
- User: `"learn session"` → Mode A
- User: `"learn project OMS"` → Mode B
- User: `"learn"` → Mode A (default)

## Modes

| Mode | Trigger | Focus |
|------|---------|-------|
| `session` (A) | After completing a task/bugfix | The specific problem solved |
| `project` (B) | When onboarding or reviewing a codebase | The entire system |

## Non-Negotiable Rules

- **No questions** — analyze from available context/code, output complete document immediately
- **elii style** — Explain Like I'm an Intern: clear, practical, real examples, no assumed domain knowledge
- **Intern baseline** — Assumes: knows language syntax, functions, classes, HTTP, database, async. Does NOT know: this codebase, business domain, architectural decisions
- **Why > What** — Always prioritize explaining "why" over "what"
- **Accuracy** — If uncertain about something, mark it explicitly rather than skip or guess
- **Format** — Must render cleanly on GitHub Markdown

## Scope Guard — When to Skip

**Skip skill if:**
- Session has < 3 tool calls (too trivial to document)
- All operations are read-only (no changes to document)
- Session ended in error/abort with no deliverable
- Project has < 3 files (too small for structured review)
- Insufficient code context to analyze (< 50 lines of actual code in repo)

**Signal to user:** `"Session too short/minimal to warrant deep learning document. Skipping skill."`

**Skip vs Proceed matrix:**
| Condition | Action |
|-----------|--------|
| Session: 1-2 tool calls | ✋ SKIP |
| Session: 3+ tool calls + changes | ✅ PROCEED |
| Project: < 3 files | ✋ SKIP |
| Project: 3+ files + readable code | ✅ PROCEED |
| Context: < 50 LoC visible | ✋ SKIP |
| Context: 50+ LoC + structures clear | ✅ PROCEED |

## Mode A — Session Review

Generate a single markdown document with these sections:

### 1. VẤN ĐỀ (Problem)
- What was the problem and why did it exist?
- Context, prior limitations, branching paths considered

### 2. GIẢI PHÁP (Solution)
- How was it solved and why this approach?
- Design decisions, business logic, edge cases handled

### 3. LUỒNG THỰC THI (Execution Flow)
- End-to-end flow from entry to completion
- Which function calls which, data transformations at each step
- Use text diagrams (A → B → C) or ordered lists

### 4. TÁC ĐỘNG (Impact)
- What components/users/systems are affected?
- Points that could easily cause bugs if modified incorrectly

### 5. CHECKLIST TỰ KIỂM TRA (10 questions)
- Mix of conceptual, "why not alternative", and debug-scenario questions
- No answers included in this section

### 6. FILE ĐÁP ÁN
- Output as separate `<name>.answer.md` with detailed answers

### 7. TÓM TẮT (3-minute summary)
- Explain the entire session to a new intern in 3 minutes

## Mode B — Project Review

Generate markdown document(s) with these sections:

> If codebase is large (>20 modules or >100 files), split into per-module files with a main `index.md` linking them.

### 1. TỔNG QUAN PROJECT
- What does it do, what problem does it solve, who uses it?

### 2. KIẾN TRÚC & CẤU TRÚC
- Main components and their roles
- How components communicate

### 3. LUỒNG HỆ THỐNG (System Flow)
- Overall system flow from entry point to output
- Happy path, error path, edge cases
- Text diagrams showing function/module call chains
- Data transformations through each layer

### 4. LOGIC CỐT LÕI
- For each important part: what / why / how / edge cases

### 5. CÁC QUYẾT ĐỊNH KỸ THUẬT
- Why this tech/pattern/approach was chosen
- Accepted trade-offs

### 6. TÁC ĐỘNG & KẾT NỐI
- Changing part X affects what?
- Points that easily cause bugs

### 7. DEPENDENCY GRAPH
- File/module dependency graph (text diagram)
- Build/load order between modules

### 8. CHECKLIST TỰ KIỂM TRA (15 questions)
- No answers in this section

### 9. FILE ĐÁP ÁN
- Separate `.answer.md` file(s) with detailed answers

### 10. TÓM TẮT 1 TRANG (5-minute summary)
- Explain the project to a new intern in 5 minutes

## Constraints

| Constraint | Value |
|-----------|-------|
| Section max words | 250 (except Flow sections: 400) |
| Question max length | 2 lines |
| Code examples | Use fenced code blocks |
| Comparisons | Use tables |
| Flows | Use text diagrams |
| Min real examples | 3 per document |

## Anti-Patterns — What NOT to Do

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| **Copy-paste code blocks** without explanation | Reader learns nothing about WHY or WHEN to use it | Explain the pattern: "This function does X because Y. Common case: Z." |
| **Omit "why" — only state "what"** | Intern can't apply knowledge to new situation | For every decision: "We chose X over Y because..." |
| **Document too long** (>2000 words per section) | Reader gets lost, skims, misses key insights | Be ruthless. 250 word max. Use sub-docs for deep dives. |
| **No concrete examples** (all abstract) | Intern can't connect concepts to real code | Always include: 3+ code snippets, real file paths, actual variable names |
| **Document trivial sessions** (<3 tool calls) | Pollutes knowledge base with noise | Skip per Scope Guard. Check tool call count before proceeding. |
| **Generate Mode B without reading code** | Architecture docs are wrong/incomplete | For Mode B: read at least 10 key files. Map 5+ modules. Don't guess. |
| **Mixing modes** (try to do both A + B) | Confuses reader, output is neither focused nor complete | Pick ONE mode. Generate separate doc if both needed. |

---

## Example Output (Abbreviated Mode A)

### 1. VẤN ĐỀ (Problem)
```
Users got 500 errors when uploading files >10MB. Root cause: 
handler wasn't streaming multipart form data, was loading entire 
file into memory. On AWS Lambda, memory limit is 128MB.
```

### 2. GIẢI PHÁP (Solution)
```
Switched to busboy streaming parser. Parse chunks, write to S3 
as they arrive. Chose busboy over formidable because: (1) lower 
memory footprint, (2) handles backpressure natively.
```

### 3. LUỒNG THỰC THI (Flow)
```
POST /upload → multer middleware → busboy stream
→ S3 write per chunk → response sent when stream closes
```

### 4. TÁC ĐỘNG (Impact)
```
Fixes 500s for large files. Doesn't break existing <10MB uploads 
(backward compatible). If S3 rate limits change, need to adjust 
chunk flush logic.
```

### 5-7. [CHECKLIST / ANSWERS / SUMMARY follow template]

---

## Output Location

Save generated documents to:
```
.harness/artifacts/learning/YYYYMMDD_HHMM_<mode>_<topic>.md
.harness/artifacts/learning/YYYYMMDD_HHMM_<mode>_<topic>.answer.md
```

## Example Answer Document

See `deep-learning-review.answer.md` in this skill directory for a complete example Mode A session with:
- Full Q&A for all 10 self-check questions
- Real code examples and diagrams
- Trade-off analysis and future improvements
- Production monitoring recommendations

This example demonstrates the expected depth, tone, and structure for high-quality learning documents.

## Workflow — Phases + Harness Integration

### Phase 1: Gather Context

Collect all necessary information before analysis.

| Harness Tool | Purpose |
|---|---|
| `harness_status` | Get active session ID, pending tasks, recent instincts |
| Read `.harness/progress.md` | Understand what was accomplished |
| Read `.harness/handoff_last.json` | Get prior session handoff (if resuming) |
| Audit log (via session data) | Trace tool calls, decisions made |
| Git diff or changed files | Identify what code/docs changed |

**Action:** Gather all context without asking. If some is missing, mark explicitly in output.

---

### Phase 2: Determine Mode & Apply Scope Guard

1. Apply auto-detection heuristic (Mode Auto-Detection section)
2. Check Scope Guard conditions — if skip conditions met, **abort skill with reason**
3. If proceeding: confirm mode choice in final output header

**Action:** Decide Mode A or B. Decide whether to skip. No ambiguity.

---

### Phase 3: Analyze & Identify Key Insights

**For Mode A (Session):**
- Identify the problem: what was broken/unclear/missing?
- Trace the solution: which functions/modules involved, why that approach?
- Capture execution flow: A → B → C chains, data transformations
- Note impact: what breaks if this is modified?

**For Mode B (Project):**
- Identify architecture: main components, layers, boundaries
- Trace system flow: entry point → outputs, happy vs error paths
- Map dependencies: what depends on what? Build order?
- Capture technical decisions: why this stack/pattern/tool?

**Action:** Extract 3–5 key insights. If uncertain, mark explicitly: `[UNCERTAIN: need to verify X]`.

---

### Phase 4: Generate Document

Follow the appropriate mode's template (Mode A or Mode B). Enforce all constraints:
- Section max words: 250 (Flow sections: 400)
- Min real examples: 3 per document
- Code blocks, tables, text diagrams as specified
- Each question ≤ 2 lines
- Quality rubric: complete + specific + accurate

**Action:** Generate full document following template. No partial output.

---

### Phase 5: Save & Present

1. Create `.harness/artifacts/learning/` directory if missing
2. Save main doc: `YYYYMMDD_HHMM_<mode>_<topic>.md`
3. Save answer doc: `YYYYMMDD_HHMM_<mode>_<topic>.answer.md`
4. Record learning event: `audit_log("learning_document_generated", { mode, topic, file_count: 2 })`
5. Present TÓM TẮT (3-min or 5-min summary) to user
6. Offer to `instinct_add` if user found a reusable pattern

**Action:** Save atomically, present summary, offer pattern capture.

---

### Integration with Harness Tools

| Phase | Tool | Purpose |
|---|---|---|
| 1 | `harness_status` | Get session context |
| 1 | Read progress/handoff/audit | Understand work done |
| 2 | Auto-detection logic | Determine mode |
| 4 | (None — pure analysis) | Generate document |
| 5 | `audit_log` | Record learning event |
| 5 | `instinct_add` | Capture reusable pattern if applicable |
