# Plan: Refactor Skills & Fix Project Issues

**Ngày**: 2026-05-29  
**Phiên bản**: 1.0  
**Trạng thái**: Draft  
**Ưu tiên**: High

---

## Tóm tắt

Dự án harness-os hiện có 29 skills nhưng gặp các vấn đề:
1. **Vitest chạy test từ cả `src/` và `dist/`** → test chạy 2 lần (253 files nhưng chỉ ~127 unique)
2. **Trigger overload**: 15 skills trigger trên `session_start` → agent bị overwhelm
3. **Skill conflicts**: `harness-workflow` vs `spec-driven-workflow`, `goal-driven-execution` vs `karpathy-guidelines`
4. **Format inconsistency**: `skillCreateFromSession` tạo old format, nhưng built-in skills dùng new format
5. **Documentation lỗi thời**: AGENTS.md nói 8 skills, thực tế 29; docs/12-skill-format.md show old format

---

## Mục tiêu

1. ✅ Fix vitest config → chỉ chạy test từ `src/`
2. ✅ Giảm trigger overload → max 3-4 skills trên `session_start`
3. ✅ Giải quyết skill conflicts → merge hoặc remove redundant skills
4. ✅ Cập nhật `skillCreateFromSession` → generate new format
5. ✅ Cập nhật documentation → match thực tế

---

## Chi tiết từng issue

### Issue 1: Vitest chạy test 2 lần

**Vấn đề**:
- `vitest.config.ts` không có `include`/`exclude` pattern
- Vitest pick up `*.test.ts` từ `src/` AND `*.test.js` từ `dist/`
- Kết quả: 253 test files nhưng chỉ ~127 unique (127 duplicate)

**Giải pháp**:
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"],  // ← ADD THIS
  },
});
```

**Effort**: 5 phút  
**Risk**: Low (chỉ là config, không thay đổi logic)

---

### Issue 2: Trigger Overload trên `session_start`

**Vấn đề**:
15 skills trigger trên `session_start`:
- karpathy-guidelines
- harness-workflow
- architecture-review
- autonomous-optimizer
- caveman-mode
- continuous-learning
- csharp-baseline (dotnet only)
- csharp-code-review (dotnet only)
- csharp-repair (dotnet only)
- deep-research
- design-grilling
- parallel-coordination
- search-first
- security-audit
- spec-driven-workflow
- strategic-compact
- write-a-skill
- zoom-out

Agent bị suggest 15 skills cùng lúc → confusion, không biết cái nào ưu tiên.

**Giải pháp**:
Giữ chỉ 3-4 core skills trên `session_start`:
1. `karpathy-guidelines` (principles)
2. `harness-workflow` (lifecycle)
3. `strategic-compact` (context management)

Move các skills khác sang triggers cụ thể hơn:

| Skill | Trigger cũ | Trigger mới | Lý do |
|-------|-----------|-----------|-------|
| `architecture-review` | session_start | task_create | chỉ cần khi tạo task |
| `autonomous-optimizer` | verify_run | verify_run | keep (đã specific) |
| `caveman-mode` | session_start | (remove hoặc manual) | không phải methodology |
| `continuous-learning` | session_end, task_update | session_end, task_update | keep (đã specific) |
| `csharp-baseline` | session_start | (remove) | move to repo-specific skill |
| `csharp-code-review` | task_update | task_update | keep (đã specific) |
| `csharp-repair` | session_start | task_create | chỉ khi tạo task |
| `deep-research` | session_start | task_create | chỉ khi tạo task |
| `design-grilling` | session_start | task_create | chỉ khi tạo task |
| `parallel-coordination` | session_start, task_create | task_create | remove từ session_start |
| `search-first` | session_start, task_create | task_create | remove từ session_start |
| `security-audit` | verify_run, session_start | verify_run | remove từ session_start |
| `spec-driven-workflow` | session_start, task_create | task_create | remove từ session_start |
| `write-a-skill` | session_start | (remove) | chỉ dùng khi cần, không auto-suggest |
| `zoom-out` | session_start, task_create | task_create | remove từ session_start |

**Effort**: 30 phút (edit 15 skill files)  
**Risk**: Low (chỉ thay đổi metadata, không logic)

---

### Issue 3: Skill Conflicts

#### 3a. `harness-workflow` vs `spec-driven-workflow`

**Vấn đề**:
- `harness-workflow`: START → SELECT → EXECUTE → VERIFY → WRAP UP (CTR gate, EPCC mapping)
- `spec-driven-workflow`: Research → Innovate → Plan → Execute → Review (RIPER-5)
- Cả 2 đều là session-level workflow frameworks
- Agent không thể follow cả 2 cùng lúc

**Giải pháp**:
Giữ `harness-workflow` làm primary (tightly integrated với harness-os tools).  
Demote `spec-driven-workflow` → move từ `session_start` sang `task_create` (optional methodology reference).

**Effort**: 15 phút  
**Risk**: Low

#### 3b. `goal-driven-execution` redundant với `karpathy-guidelines` Principle 4

**Vấn đề**:
- `karpathy-guidelines` Principle 4: "Define success criteria, loop until verified"
- `goal-driven-execution`: Cùng nội dung, nhưng expand thành full skill
- Duplicate teaching

**Giải pháp**:
Remove `goal-driven-execution` skill. Nội dung đã covered bởi:
- `karpathy-guidelines` (principles)
- `verification-loop` (verification discipline)

**Effort**: 5 phút (delete folder)  
**Risk**: Low (nội dung đã covered ở chỗ khác)

#### 3c. `systematic-diagnosis` vs `csharp-bugfix`

**Vấn đề**:
- `systematic-diagnosis`: Language-agnostic bug diagnosis methodology
- `csharp-bugfix`: C#-specific bugfix workflow
- Cả 2 trigger trên `task_create` cho dotnet projects

**Giải pháp**:
`csharp-bugfix` reference `systematic-diagnosis` làm base methodology.  
`csharp-bugfix` focus chỉ trên C#-specific tooling (debugger, EF Core, etc.).

**Effort**: 20 phút (edit csharp-bugfix)  
**Risk**: Low

#### 3d. `search-first` vs `zoom-out`

**Vấn đề**:
- `search-first`: Find existing implementations/patterns trước khi write code
- `zoom-out`: Understand broader architecture khi stuck
- Cả 2 teach "read existing code before writing"
- Cả 2 trigger trên `session_start` + `task_create`

**Giải pháp**:
Differentiate triggers:
- `search-first`: `task_create` (before writing new code)
- `zoom-out`: `task_create` (when stuck debugging)

Hoặc merge thành 1 skill "read-first" với 2 sub-sections.

**Effort**: 15 phút  
**Risk**: Low

#### 3e. `caveman-mode` không phải methodology

**Vấn đề**:
- `caveman-mode`: Communication style preference (drop articles, use fragments)
- Không phải development methodology
- Trigger trên `session_start` → suggest mỗi session (không cần)

**Giải pháp**:
Option 1: Remove từ built-in skills → move to user preference  
Option 2: Change trigger từ `session_start` → manual/user-triggered  
Option 3: Keep nhưng move to `task_create` (optional, not auto-suggest)

**Recommendation**: Option 1 (remove từ built-in)

**Effort**: 5 phút  
**Risk**: Low

---

### Issue 4: `skillCreateFromSession` generates old format

**Vấn đề**:
- `skillCreateFromSession` (src/tools/skill.ts) generates:
  ```yaml
  name: ...
  version: "1.0"
  updated: ...
  applies_to: ["node"]
  triggers: ["session_start"]
  ```
- Nhưng ALL 29 built-in skills dùng new format:
  ```yaml
  name: ...
  description: ...
  metadata:
    version: "1.0"
    updated: ...
    applies_to: ["node"]
    triggers: ["session_start"]
  ```

**Giải pháp**:
Update `skillCreateFromSession` function → generate new format với nested `metadata:`.

**File**: `src/tools/skill.ts` (line ~170)

**Effort**: 10 phút  
**Risk**: Low (chỉ là string generation)

---

### Issue 5: Documentation lỗi thời

#### 5a. AGENTS.md nói 8 skills, thực tế 29

**Vấn đề**:
- AGENTS.md Section 9 (File Layout) list chỉ 8 skills
- Thực tế có 29 skills

**Giải pháp**:
Update AGENTS.md → list tất cả 29 skills hoặc reference docs/07-skills.md

**Effort**: 10 phút  
**Risk**: Low

#### 5b. docs/12-skill-format.md show old format

**Vấn đề**:
- docs/12-skill-format.md show flat format (version, updated, applies_to, triggers at root)
- Nhưng actual skills dùng nested `metadata:` format

**Giải pháp**:
Update docs/12-skill-format.md → show new format với nested metadata

**Effort**: 10 phút  
**Risk**: Low

---

## Execution Plan

### Phase 1: Quick Wins (30 phút)

1. **Fix vitest config** (5 phút)
   - Edit `vitest.config.ts`
   - Add `include: ["src/**/*.test.ts"]`
   - Run `bun test` → verify chỉ 127 unique tests

2. **Remove `goal-driven-execution` skill** (5 phút)
   - Delete `skills/goal-driven-execution/` folder
   - Verify smoke test still passes

3. **Update `skillCreateFromSession`** (10 phút)
   - Edit `src/tools/skill.ts`
   - Change generated frontmatter → nested `metadata:` format
   - Test với `skillCreateFromSession` tool

4. **Update documentation** (10 phút)
   - Update AGENTS.md Section 9
   - Update docs/12-skill-format.md

### Phase 2: Trigger Refactor (1 giờ)

1. **Reduce `session_start` triggers** (30 phút)
   - Edit 15 skill files
   - Move triggers theo table ở Issue 2
   - Verify skill_list output

2. **Resolve skill conflicts** (30 phút)
   - Edit `spec-driven-workflow` → move từ `session_start` → `task_create`
   - Edit `csharp-bugfix` → reference `systematic-diagnosis`
   - Edit `search-first` + `zoom-out` → differentiate triggers
   - Remove hoặc demote `caveman-mode`

### Phase 3: Verification (30 phút)

1. **Run full test suite** (5 phút)
   - `bun run build` → 0 errors
   - `bun test` → all pass
   - `bun run smoke` → all 26 tools registered

2. **Verify skill loading** (10 phút)
   - `harness skills --list` → verify triggers updated
   - `harness skills --show <skill>` → verify format correct

3. **Update progress log** (15 phút)
   - Document changes
   - Create handoff for next session

---

## Success Criteria

- ✅ vitest chỉ chạy test từ `src/` (127 unique tests, không duplicate)
- ✅ `session_start` trigger chỉ có 3-4 core skills
- ✅ Không có skill conflicts (mỗi skill có clear purpose)
- ✅ `skillCreateFromSession` generate new format
- ✅ Documentation match thực tế
- ✅ All tests pass (251 pass, 0 fail)
- ✅ Smoke test pass (26 tools registered)

---

## Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Removing `goal-driven-execution` breaks user workflows | Low | Content đã covered ở `karpathy-guidelines` + `verification-loop` |
| Changing skill triggers confuses users | Low | Triggers mới vẫn cover cùng use cases, chỉ less noisy |
| `skillCreateFromSession` format change breaks existing code | Low | Chỉ là string generation, không affect existing skills |
| Documentation changes miss something | Low | Review docs/07-skills.md để verify completeness |

---

## Timeline

- **Phase 1**: 30 phút
- **Phase 2**: 1 giờ
- **Phase 3**: 30 phút
- **Total**: ~2 giờ

---

## Notes

- Tất cả changes đều backward-compatible (chỉ metadata, không logic)
- Skill loading priority vẫn: repo-specific > global > built-in
- Không affect MCP tool registrations (26 tools unchanged)
- Smoke test sẽ pass sau mỗi phase

---

## Next Steps

1. Approve plan
2. Execute Phase 1 (quick wins)
3. Execute Phase 2 (trigger refactor)
4. Execute Phase 3 (verification)
5. Create PR + merge
