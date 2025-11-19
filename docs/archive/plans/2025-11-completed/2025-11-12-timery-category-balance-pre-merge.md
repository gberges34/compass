# Timery Category Balance Pre-Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship `feature/timery-category-balance` with resilient error UX, accurate Toggl deduplication, and type-safe review metrics before merge.

**Architecture:** Centralize Axios response handling in the React client, reuse Prisma-backed PostDoLog timestamps inside the Timery service, and tighten Review route math with explicit types so backend and frontend stay in lockstep.

**Tech Stack:** React 19 + Axios + React Query, Express 5 + Prisma 6 + Jest, TypeScript (frontend 4.9, backend 5.9).

---

## Task 1: Harden Axios Error Status Handling (CRITICAL)

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Add: `frontend/src/lib/__tests__/api-error-handler.test.ts`

**Step 1: Add typed payload + helper**
Define a local type and helper near the interceptor so every branch can map HTTP status codes. Example:
```ts
interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
}

function getUserFriendlyError(status?: number, data?: ApiErrorPayload): string {
  const serverMessage = data?.error || data?.message;
  switch (status) {
    case 400:
      return serverMessage || 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return serverMessage || 'The requested resource was not found.';
    case 422:
      return serverMessage || 'One or more fields need attention.';
    case 429:
      return 'Too many requests. Please slow down and retry shortly.';
    case 500:
    default:
      return serverMessage || 'An unexpected error occurred. Please try again.';
  }
}
```

**Step 2: Update interceptor logic**
Inside `api.interceptors.response.use`, branch on `error.response`, `error.request`, and fallback:
```ts
if (error.response) {
  const { status, data } = error.response;
  error.userMessage = getUserFriendlyError(status, data);
  error.errorCode = data?.code;
} else if (error.request) {
  error.userMessage = 'Network error. Please check your connection.';
} else {
  error.userMessage = 'Request configuration failed. Please retry.';
}
```
Also log `status`, `code`, `url`, and `method` when `DEBUG` is true.

**Step 3: Unit tests for helper**
Create `frontend/src/lib/__tests__/api-error-handler.test.ts` with Jest cases that import `getUserFriendlyError` (export it for tests only) and assert mappings for 400/401/404/429, fallback to server message, and default message when status undefined.

**Step 4: Run targeted tests**
```bash
cd frontend && CI=1 npm test -- api-error-handler.test.ts
```

**Step 5: Commit**
```bash
git add frontend/src/lib/api.ts frontend/src/lib/__tests__/api-error-handler.test.ts
git commit -m "fix(frontend): harden axios error messaging"
```

---

## Task 2: Use PostDoLog start/end times for Timery deduplication (HIGH)

**Files:**
- Modify: `backend/src/services/timery.ts`
- Modify: `backend/src/routes/reviews.ts`
- Add: `backend/src/services/__tests__/timery.test.ts`

**Step 1: Type PostDoLog ranges**
At the top of `timery.ts`, import `PostDoLog` from `@prisma/client` (type-only) and define:
```ts
type PostDoLogTimeRange = Pick<PostDoLog, 'startTime' | 'endTime'>;
```
Update `isTogglEntryDuplicate` to accept `PostDoLogTimeRange[]` and compare actual `log.startTime` / `log.endTime` with tolerance instead of deriving from `completionDate` / `actualDuration`.

**Step 2: Pass real timestamps from Review metrics**
In `calculateDailyMetrics` and `calculateWeeklyMetrics`, derive an array before calling the service:
```ts
const postDoLogTimeRanges = postDoLogs.map((log) => ({
  startTime: log.startTime,
  endTime: log.endTime,
}));
const togglCategoryBalance = await getCategoryBalanceFromToggl(
  dayStart,
  dayEnd,
  postDoLogTimeRanges
);
```
Keep the existing `postDoLogs` array for local metrics so nothing else changes.

**Step 3: Add service tests**
Create `backend/src/services/__tests__/timery.test.ts` that imports (and temporarily exports) `isTogglEntryDuplicate` and covers:\n1. Toggl entry fully overlapping a PostDoLog returns `true`.\n2. Entry outside the 15-minute tolerance returns `false`.\n3. Running Toggl entry (stop `null`) compares against `new Date()` correctly (mock `Date.now`).\nThese tests ensure regressions surface quickly.

**Step 4: Run backend unit tests**
```bash
cd backend && npm test -- src/services/__tests__/timery.test.ts
```

**Step 5: Commit**
```bash
git add backend/src/services/timery.ts backend/src/routes/reviews.ts backend/src/services/__tests__/timery.test.ts
git commit -m "fix(backend): dedupe Timery entries with real PostDoLog times"
```

---

## Task 3: Replace `any` with Prisma-backed types in review metrics (LOW)

**File:**
- Modify: `backend/src/routes/reviews.ts`

**Step 1: Import Prisma payload types**
Add:
```ts
import type { Prisma } from '@prisma/client';

type PostDoLogWithTask = Prisma.PostDoLogGetPayload<{ include: { task: true } }>;
type DailyPlanRecord = Prisma.DailyPlanGetPayload<{}>;
```

**Step 2: Annotate query results**
Type the outputs:
```ts
const postDoLogs: PostDoLogWithTask[] = await prisma.postDoLog.findMany({ ... });
const dailyPlans: DailyPlanRecord[] = await prisma.dailyPlan.findMany({ ... });
```
Then update reducers/filters to use these types so manual `: any` casts disappear:
```ts
const deepWorkMinutes = postDoLogs
  .filter((log) => log.task.energyRequired === 'HIGH')
  .reduce((sum, log) => sum + log.actualDuration, 0);
```
Also type `totalPlannedOutcomes` accumulator as `number` by default.

**Step 3: Compile check**
```bash
cd backend && npx tsc --noEmit
```
Verify zero errors.

**Step 4: Commit**
```bash
git add backend/src/routes/reviews.ts
git commit -m "chore(backend): replace review any types with Prisma payloads"
```

---

## Final Verification
1. `npm run verify` from repo root to ensure combined health script passes (or run `npm run health` + frontend tests if `verify` not available).
2. Smoke-test category balance UI to confirm toasts show friendly errors and Timery duplicate entries are skipped.
3. Push `feature/timery-category-balance` once status checks are green.
