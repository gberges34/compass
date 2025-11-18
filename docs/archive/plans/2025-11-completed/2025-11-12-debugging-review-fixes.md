# Debugging Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address code-review regressions introduced while applying DEBUGGING_REPORT.md, focusing on DTO compatibility, type safety, and conflict response context.

**Architecture:** Preserve the existing Express + Prisma APIs while re-aligning shared types between backend and frontend. Tasks API responses will be formalized through shared DTOs, Prisma filtering will regain strong typing, and Orient East conflict handling will once again surface the existing plan payload.

**Tech Stack:** Node 20, Express 4, TypeScript, Prisma, Zod, React Query, Jest + Supertest.

---

### Task 1: Realign `GET /api/tasks` contract with shared DTOs

**Files:**
- Create: `shared/dto/tasks.ts`
- Modify: `backend/src/routes/tasks.ts:60-130`
- Modify: `frontend/src/hooks/useTasks.ts:1-120`
- Modify: `frontend/src/types/index.ts` (if needed for imports)
- Modify: `backend/tests/integration/tasks.test.ts:214-340`

**Step 1: Define canonical DTO**
```ts
// shared/dto/tasks.ts
export interface TaskPaginationResponse<TTask> {
  items: TTask[];
  nextCursor: string | null;
}
```
Export backend/frontend-friendly helper types so both layers import the same contract.

**Step 2: Update backend route to use DTO**
- Import the DTO and have the handler return `{ items: results, nextCursor }` exactly as before to avoid churn.
- Add a narrow unit-level assertion (e.g., TypeScript satisfies) to ensure the object conforms to the DTO.

**Step 3: Update tests**
- Extend `backend/tests/integration/tasks.test.ts` pagination suite to assert `response.body.items` exists and `response.body.nextCursor` matches expectations.

**Step 4: Update frontend hook**
- Replace the manual `page.items` references with the shared DTO type import so TypeScript enforces the shape.

**Step 5: Run targeted suites**
```
cd backend && npm test -- --runTestsByPath tests/integration/tasks.test.ts
cd frontend && npm test -- --runTestsByPath src/hooks/useTasks.test.tsx  # create if missing later
```
(Expect backend to pass once Postgres is available; document if DB is offline.)

**Step 6: Commit**
```
git add shared/dto/tasks.ts backend/src/routes/tasks.ts backend/tests/integration/tasks.test.ts frontend/src/hooks/useTasks.ts
git commit -m "fix(tasks): align DTO across backend and frontend"
```

---

### Task 2: Restore typed Prisma filters and cursor validation

**Files:**
- Modify: `backend/src/routes/tasks.ts:60-120`
- Modify: `backend/tests/integration/tasks.test.ts` (reuse existing suite)

**Step 1: Reintroduce enum typing**
- Import `$Enums` from `@prisma/client` and define `TaskStatus`, `Priority`, `Category`.
- Declare `const where: Prisma.TaskWhereInput = {};` instead of `any`.
- Cast validated query params to those enums before assignment.

**Step 2: Harden Zod schema**
- Ensure `cursor` stays `z.string().uuid().optional()` (already done) and `status/priority/category` reuse enum validators via `z.nativeEnum`.
- Use the parsed result when building the `where` clause to guarantee types.

**Step 3: Add regression test**
- In `backend/tests/integration/tasks.test.ts`, add a case that sends invalid status (`status=UNKNOWN`) and asserts `400 Validation error`, proving Zod blocks bad values.

**Step 4: Run backend suites**
```
cd backend && npm test -- --runTestsByPath tests/integration/tasks.test.ts
```

**Step 5: Commit**
```
git add backend/src/routes/tasks.ts backend/tests/integration/tasks.test.ts
git commit -m "fix(tasks): restore typed filters and validation"
```

---

### Task 3: Return existing daily plan data on conflicts

**Files:**
- Modify: `backend/src/routes/orient.ts:40-80`
- Modify: `backend/tests/integration/orient.test.ts:1-60`

**Step 1: Enhance integration test**
```ts
expect(second.body.details.plan.id).toBe(first.body.id);
expect(second.body.details.plan.topOutcomes).toEqual(payload.topOutcomes);
```
This enforces that the conflict response includes the prior plan.

**Step 2: Update route implementation**
- Inside the `P2002` catch, perform a `findUnique({ where: { date: today } })` to retrieve the existing plan (safe because we just caught a uniqueness violation).
- Throw `new ConflictError('Daily plan already exists for today', { date: today.toISOString(), plan: existingPlan })`.

**Step 3: Re-run orient suite**
```
cd backend && npm test -- --runTestsByPath tests/integration/orient.test.ts
```

**Step 4: Commit**
```
git add backend/src/routes/orient.ts backend/tests/integration/orient.test.ts
git commit -m "fix(orient): include existing plan in conflict response"
```

---

### Task 4: Full regression check & PR update

**Files:** N/A (commands + docs)

**Step 1: Backend sweep**
```
cd backend && npm test
```

**Step 2: Frontend spot check**
```
cd frontend && npm test -- --watch=false
```
(If no dedicated hook test exists, at least run the suite to ensure hooks compile with new DTO imports.)

**Step 3: Update PR description**
- Document the DTO alignment, validation fixes, and Orient conflict payload change.

**Step 4: Final commit (if anything pending)**
```
git status -sb
```

Plan complete and ready for execution.

---
