# Task Cache Optimistic Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a shared, type-safe helper for React Query task caches and refactor optimistic updates to target the correct filters while falling back to invalidations elsewhere.

**Architecture:** Encapsulate pagination-aware cache operations in `taskCache.ts`, expose typed helpers for update/restore, and refactor existing mutations in `useTasks.ts` to consume them with explicit query-key lists plus structured logging.

**Tech Stack:** TypeScript, React Query (`@tanstack/react-query`), Jest/Testing Library for frontend unit tests.

---

### Task 1: Add typed cache helpers & tests

**Files:**
- Create: `frontend/src/hooks/taskCache.ts`
- Create: `frontend/src/hooks/__tests__/taskCache.test.ts`
- Modify: `frontend/tsconfig.json` if new path alias/imports require updates

**Step 1: Write failing tests**
Add Jest tests covering:
```ts
describe('updateInfiniteTasksCache', () => {
  it('updates matching tasks across pages');
  it('leaves cache untouched when predicate misses and returns undefined');
  it('preserves immutability (new object references)');
});
```
Run: `cd frontend && npm test -- taskCache.test.tsx --watch=false`  
Expected: Tests fail because helper doesn’t exist.

**Step 2: Implement helper module**
Implement `getInfiniteTasksCache`, `updateInfiniteTasksCache`, and `restoreInfiniteTasksCache` using strong typing (`PaginatedResponse<Task>`). Include optional debug logging hooks and guard clauses.

**Step 3: Re-run tests**
Run same Jest command; expect PASS.

**Step 4: Commit**
```bash
git add frontend/src/hooks/taskCache.ts frontend/src/hooks/__tests__/taskCache.test.ts frontend/tsconfig.json
git commit -m "feat(frontend): add typed task cache helper"
```

---

### Task 2: Refactor optimistic mutations to use helper

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts`

**Step 1: Update `useUpdateTask`**
- Import helper.
- Define reusable `nextInfiniteKey`.
- In `onMutate`, capture snapshot, use helper to merge `updates`.
- In `onError`, call `restoreInfiniteTasksCache`.
- Add debug log when predicate misses to aid observability.

**Step 2: Update `useScheduleTask` & `useUnscheduleTask`**
- Repeat pattern with appropriate updater (set/clear `scheduledStart`).
- Ensure `onSuccess` invalidates only task detail (if necessary) while other lists either updated or invalidated intentionally.

**Step 3: Handle any other optimistic sections**
- Search for `setQueryData` usages touching tasks; convert compatible ones.
- Document fallback strategy: lists not in provided key array should be invalidated via `queryClient.invalidateQueries({ queryKey: taskKeys.lists() })`.

**Step 4: Run targeted tests**
`cd frontend && npm run lint && npm test -- hooks/useTasks.test.tsx --watch=false`

**Step 5: Commit**
```bash
git add frontend/src/hooks/useTasks.ts
git commit -m "refactor(frontend): centralize task optimistic updates"
```

---

### Task 3: Improve observability & verification

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts`
- Modify/Create relevant docs in `docs/` (e.g., `docs/plans/ANALYSIS_SUMMARY.md` entry) if required by repo guidelines

**Step 1: Add logging hooks**
- Ensure helper or callers log when zero tasks were updated or when snapshot restore occurs, using existing `DEBUG` gate.

**Step 2: Document behavior**
- Add short section to `ANALYSIS_SUMMARY.md` or a new README subsection explaining how to extend optimistic updates and when to prefer invalidations.

**Step 3: Run workspace verification**
`npm run verify` (after freeing required ports/DB as needed); capture any failures.

**Step 4: Commit**
```bash
git add docs/ANALYSIS_SUMMARY.md frontend/src/hooks/useTasks.ts
git commit -m "chore: document task cache helper usage"
```

---

**Plan complete and saved to `docs/plans/2025-11-13-task-cache-optimistic-plan.md`.**

Execution options:
1. Subagent-Driven (this session) – I’ll dispatch superpowers:subagent-driven-development per task with reviews.
2. Parallel Session – open a new session in this worktree and run superpowers:executing-plans step-by-step.

Which approach would you like?***
