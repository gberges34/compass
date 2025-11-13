# Timery Category Balance PR Feedback Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address reviewer feedback for `feature/timery-category-balance` by correcting the deduplication helper, improving type clarity, documenting assumptions, and strengthening automated coverage before merge.

**Architecture:** Keep changes scoped to the existing Timery service (`backend/src/services/timery.ts`), review metrics route (`backend/src/routes/reviews.ts`), and supporting docs/tests. Use targeted Jest suites and TypeScript checks for validation.

**Tech Stack:** Node 20, TypeScript 5.9, Express 5, Prisma 6, Jest + ts-jest, React Scripts (for shared types/docs references).

---

### Task 1: Use Actual PostDoLog start/end times (Must Fix)

**Files:**
- Modify: `backend/src/services/timery.ts` (helper implementation)
- Modify: `backend/src/routes/reviews.ts` (call sites)
- Test: `backend/src/services/__tests__/timery.test.ts`

**Step 1: Write failing helper test**

```ts
it('uses start/end timestamps without deriving from duration', () => {
  const togglEntry = { start: toISO('2025-01-01T10:05:00Z'), stop: toISO('2025-01-01T10:35:00Z') };
  const postDoLogs = [
    { startTime: new Date('2025-01-01T10:00:00Z'), endTime: new Date('2025-01-01T11:00:00Z') },
  ];
  expect(isTogglEntryDuplicate(togglEntry as any, postDoLogs as any)).toBe(true);
});
```

Run: `cd backend && npm test -- src/services/__tests__/timery.test.ts`  
Expected: FAIL (helper still uses derived times).

**Step 2: Implement minimal fix**

```ts
export function isTogglEntryDuplicate(
  togglEntry: { start: string; stop: string | null },
  postDoLogs: Array<{ startTime: Date; endTime: Date }>
) {
  const toleranceMs = TOGGL_OVERLAP_TOLERANCE_MINUTES * 60 * 1000;
  const togglStart = new Date(togglEntry.start);
  const togglEnd = togglEntry.stop ? new Date(togglEntry.stop) : new Date();

  return postDoLogs.some((log) => {
    const compassStart = new Date(log.startTime);
    const compassEnd = new Date(log.endTime);
    const compassStartWithTolerance = new Date(compassStart.getTime() - toleranceMs);
    const compassEndWithTolerance = new Date(compassEnd.getTime() + toleranceMs);
    return togglStart <= compassEndWithTolerance && togglEnd >= compassStartWithTolerance;
  });
}
```

Update `calculateDailyMetrics` / `calculateWeeklyMetrics` to pass `{ startTime, endTime }`.

**Step 3: Re-run tests (expect PASS)**

`cd backend && npm test -- src/services/__tests__/timery.test.ts`

**Step 4: Commit**

```bash
git add backend/src/services/timery.ts backend/src/routes/reviews.ts backend/src/services/__tests__/timery.test.ts
git commit -m "fix(backend): dedupe using actual PostDoLog timestamps"
```

---

### Task 2: Export helper for tests (Must Fix)

**Files:**
- Modify: `backend/src/services/timery.ts`
- Test: `backend/src/services/__tests__/timery.test.ts`

**Step 1: Update helper signature**

Add `export` keyword to `isTogglEntryDuplicate` and ensure its type annotation matches test usage.

**Step 2: Adjust tests**

Use direct import:

```ts
import { isTogglEntryDuplicate } from '../timery';
```

**Step 3: Run targeted suite**

`cd backend && npm test -- src/services/__tests__/timery.test.ts`

**Step 4: Commit**

`git commit -am "test(backend): expose dedupe helper for unit coverage"`

---

### Task 3: Extract tolerance constant (Should Consider)

**Files:**
- Modify: `backend/src/services/timery.ts`

**Step 1: Introduce constant near top**

```ts
const TOGGL_OVERLAP_TOLERANCE_MINUTES = 15;
```

**Step 2: Replace magic number**

Ensure the helper references the constant.

**Step 3: Quick sanity check**

`cd backend && npx tsc --noEmit`

**Step 4: Commit**

`git commit -am "chore(backend): name Timery overlap tolerance"`

---

### Task 4: Align type usage with PostDoLogTimeRange (Should Consider)

**Files:**
- Modify: `backend/src/services/timery.ts`
- Modify: `backend/src/services/__tests__/timery.test.ts`
- Modify: `backend/src/routes/reviews.ts`

**Step 1: Define alias once**

```ts
type PostDoLogTimeRange = Pick<PostDoLog, 'startTime' | 'endTime'>;
```

**Step 2: Apply alias everywhere**

- Helper signature uses `PostDoLogTimeRange[]`.
- `getCategoryBalanceFromToggl` parameter defaults to `PostDoLogTimeRange[] = []`.
- Tests and review routes type their arrays as `PostDoLogTimeRange[]`.

**Step 3: Compile + unit tests**

`cd backend && npx tsc --noEmit`  
`cd backend && npm test -- src/services/__tests__/timery.test.ts`

**Step 4: Commit**

`git commit -am "refactor(backend): share PostDoLog time-range typing"`

---

### Task 5: Verify Toggl API timezone handling (Should Consider)

**Files:**
- Docs: `docs/plans/2025-11-12-timery-category-balance-feedback.md` (append findings)
- Optional comments inside `backend/src/services/timery.ts`

**Step 1: Read official docs**

Open https://developers.track.toggl.com/docs/time_entries#response and confirm timestamps are ISO 8601 UTC.

**Step 2: Capture summary**

Document whether the API always returns UTC, user-local, or workspace timezone. Note conversion steps already in code.

**Step 3: Update comments**

Add inline comment near `getTimeEntriesForDateRange` clarifying expectation, e.g., `// Toggl returns ISO timestamps in UTC; Compass stores UTC so no conversion needed`.

**Step 4: Commit docs**

`git add docs/plans/2025-11-12-timery-category-balance-feedback.md backend/src/services/timery.ts`  
`git commit -m "docs: clarify Timery timezone assumptions"`

**Findings (2025-11-12):**
- Toggl Track API docs for [time entries](https://developers.track.toggl.com/docs/time_entries#response) confirm that `start`/`stop` fields are ISO 8601 UTC values.
- Compass already stores timestamps in UTC, so using the raw `Date` objects keeps both systems aligned without extra conversion.
- Future workspace-specific timezone handling should still normalize to UTC before persistence so downstream analytics stay consistent.

---

### Task 6: Add integration test for category balance (Nice to Have)

**Files:**
- Create: `backend/src/services/__tests__/category-balance.integration.test.ts`
- Modify: `backend/src/services/timery.ts` (optional injection hooks)

**Step 1: Write failing test**

```ts
import * as service from '../timery';

jest.mock('../timery', () => ({
  ...jest.requireActual('../timery'),
  getTimeEntriesForDateRange: jest.fn().mockResolvedValue([
    { duration: 1200, start: '2025-01-01T10:00:00Z', stop: '2025-01-01T10:20:00Z', description: 'Foo', project_id: 1 },
  ]),
  getProjects: jest.fn().mockResolvedValue(new Map([[1, 'School']])),
}));

it('combines Toggl and Compass balances without double counting', async () => {
  const result = await getCategoryBalanceFromToggl(
    new Date('2025-01-01T00:00:00Z'),
    new Date('2025-01-02T00:00:00Z'),
    [{ startTime: new Date('2025-01-01T10:00:00Z'), endTime: new Date('2025-01-01T10:20:00Z') }]
  );
  expect(result).toEqual({ SCHOOL: 0 });
});
```

Run: `cd backend && npm test -- src/services/__tests__/category-balance.integration.test.ts` (expect FAIL).

**Step 2: Adjust service if needed**

Expose `getProjects` / `getTimeEntriesForDateRange` for mocking or refactor to dependency injection.

**Step 3: Re-run test (expect PASS)**

`cd backend && npm test -- src/services/__tests__/category-balance.integration.test.ts`

**Step 4: Commit**

`git add backend/src/services/__tests__/category-balance.integration.test.ts backend/src/services/timery.ts`  
`git commit -m "test(backend): cover category balance dedupe scenario"`

---

### Task 7: Document expected Toggl project names (Nice to Have)

**Files:**
- Modify: `backend/src/services/timery.ts`

**Step 1: Update map comment**

Add block comment explaining that `TOGGL_PROJECT_CATEGORY_MAP` keys must match the exact project names in Timery/Toggl, and mention where to update if new categories are added.

```ts
/**
 * Mapping of Toggl project names → Compass categories.
 * Keep in sync with Timery project list documented in docs/timery-projects.md.
 */
```

**Step 2: Optional doc**

Create `docs/timery-projects.md` listing current names if not already tracked.

**Step 3: Commit**

`git add backend/src/services/timery.ts docs/timery-projects.md`  
`git commit -m "docs: record Toggl project naming expectations"`

---

### Final Verification

1. `cd backend && npm test` (ensure all suites including new integration test pass).
2. `cd backend && npx tsc --noEmit`.
3. Manually hit review endpoint (optional) or rely on existing health scripts.
4. Update PR description with summary of fixes + test evidence.
