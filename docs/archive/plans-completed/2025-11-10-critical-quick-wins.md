# Critical Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 critical issues identified by debugging agent for immediate performance and correctness improvements.

**Architecture:** Address database indexing, API method alignment, enum consistency, code duplication, and error handling. All fixes are independent and can be implemented in any order.

**Tech Stack:** Prisma ORM, PostgreSQL, TypeScript, React 19.2.0, Axios, Express.js

---

## Task 1: Add Missing FK Index to PostDoLog

**Score: 90 | Time: 5 min**

**Problem:** PostDoLog.taskId foreign key lacks an index, causing slow JOIN queries.

**Files:**
- Modify: `backend/prisma/schema.prisma:66-93`

**Step 1: Add taskId index to PostDoLog model**

Find the PostDoLog model (line 66) and add the index after the existing indexes:

```prisma
model PostDoLog {
  id                String       @id @default(uuid())
  taskId            String       @unique
  task              Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)

  outcome           String
  effortLevel       Effort
  keyInsight        String

  estimatedDuration Int          // minutes
  actualDuration    Int          // minutes
  variance          Int          // calculated: actualDuration - estimatedDuration
  efficiency        Float        // calculated: (estimatedDuration / actualDuration) * 100

  startTime         DateTime
  endTime           DateTime
  timeOfDay         TimeOfDay    // calculated
  dayOfWeek         String       // calculated

  timeryEntryId     String?
  evidenceLink      String?
  rewardTaken       Boolean      @default(false)

  completionDate    DateTime     @default(now())

  @@index([completionDate])
  @@index([timeOfDay])
  @@index([taskId])  // ADD THIS LINE
}
```

**Step 2: Generate migration**

Run: `cd backend && npx prisma migrate dev --name add-postdolog-taskid-index`

Expected: Migration file created successfully

**Step 3: Verify index was created**

Run: `cd backend && npx prisma migrate status`

Expected: Shows migration as applied

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "perf: add index on PostDoLog.taskId foreign key

- Improves JOIN query performance
- Follows FK indexing best practice

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Fix HTTP Method from PUT to PATCH

**Score: 90 | Time: 2 min**

**Problem:** `updateTask` uses PUT instead of PATCH, violating REST semantics for partial updates.

**Files:**
- Modify: `frontend/src/lib/api.ts:57-60`

**Step 1: Change PUT to PATCH**

Find line 57-60 and change `api.put` to `api.patch`:

```typescript
// BEFORE (line 57-60):
export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await api.put<Task>(`/tasks/${id}`, updates);
  return response.data;
};

// AFTER:
export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await api.patch<Task>(`/tasks/${id}`, updates);
  return response.data;
};
```

**Step 2: Verify backend uses PATCH**

Run: `grep "router.patch.*:id" backend/src/routes/tasks.ts`

Expected: Should find `router.patch('/:id', ...` confirming backend expects PATCH

**Step 3: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "fix: use PATCH instead of PUT for updateTask

- Aligns with REST semantics for partial updates
- Matches backend endpoint method
- Updates are partial, not full replacement

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Align Effort Enum Between Frontend and Backend

**Score: 72 | Time: 5 min**

**Problem:** Backend uses SMALL/MEDIUM/LARGE, frontend might have inconsistency.

**Files:**
- Verify: `backend/prisma/schema.prisma:192-196`
- Verify: `frontend/src/types/index.ts`

**Step 1: Check backend Effort enum**

Backend schema (lines 192-196):
```prisma
enum Effort {
  SMALL
  MEDIUM
  LARGE
}
```

**Step 2: Check frontend types**

Run: `grep -A 5 "export.*Effort" frontend/src/types/index.ts`

Expected: Should match SMALL, MEDIUM, LARGE exactly

**Step 3: If mismatch found, update frontend types**

If frontend has different values, update to match:

```typescript
export type Effort = 'SMALL' | 'MEDIUM' | 'LARGE';
```

**Step 4: Search for any hardcoded effort values**

Run: `grep -r "effort.*=.*['\"]" frontend/src --include="*.ts" --include="*.tsx"`

Expected: All effort assignments use SMALL/MEDIUM/LARGE (not Small/Medium/Large or small/medium/large)

**Step 5: Fix any incorrect references**

If found, update them to use uppercase enum values.

**Step 6: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "fix: align Effort enum with backend schema

- Changed to SMALL/MEDIUM/LARGE (uppercase)
- Matches Prisma schema exactly
- Prevents runtime type errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Extract Priority Badge Mapping Utility

**Score: 81 | Time: 15 min**

**Problem:** Priority-to-badge variant mapping duplicated in 3 files (CalendarPage, TasksPage, TodayPage).

**Files:**
- Create: `frontend/src/lib/badgeUtils.ts`
- Modify: `frontend/src/pages/CalendarPage.tsx`
- Modify: `frontend/src/pages/TasksPage.tsx`
- Modify: `frontend/src/pages/TodayPage.tsx`

**Step 1: Create utility file**

Create `frontend/src/lib/badgeUtils.ts`:

```typescript
import type { BadgeVariant } from '../components/Badge';

/**
 * Maps task priority to Badge variant
 */
export const getPriorityBadgeVariant = (priority: string): BadgeVariant => {
  switch (priority) {
    case 'MUST':
      return 'danger';
    case 'SHOULD':
      return 'warn';
    case 'COULD':
      return 'sun';
    case 'MAYBE':
      return 'neutral';
    default:
      return 'neutral';
  }
};

/**
 * Maps energy level to Badge variant
 */
export const getEnergyBadgeVariant = (energy: string): BadgeVariant => {
  switch (energy) {
    case 'HIGH':
      return 'mint';
    case 'MEDIUM':
      return 'sun';
    case 'LOW':
      return 'blush';
    default:
      return 'neutral';
  }
};
```

**Step 2: Update CalendarPage.tsx**

Find the priority badge logic (search for `MUST.*danger`) and replace inline ternaries with:

```typescript
import { getPriorityBadgeVariant, getEnergyBadgeVariant } from '../lib/badgeUtils';

// Replace:
variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'}

// With:
variant={getPriorityBadgeVariant(task.priority)}
```

**Step 3: Update TasksPage.tsx**

Same replacement as CalendarPage.

**Step 4: Update TodayPage.tsx**

Same replacement as CalendarPage.

**Step 5: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 6: Test in browser**

1. Navigate to Tasks page
2. Verify priority badges display correctly
3. Navigate to Calendar page
4. Verify priority badges still work
5. Navigate to Today page
6. Verify badges work

Expected: All pages show correct badge colors

**Step 7: Commit**

```bash
git add frontend/src/lib/badgeUtils.ts frontend/src/pages/CalendarPage.tsx frontend/src/pages/TasksPage.tsx frontend/src/pages/TodayPage.tsx
git commit -m "refactor: extract priority and energy badge mapping utilities

- Created badgeUtils.ts with getPriorityBadgeVariant()
- Created getEnergyBadgeVariant() utility
- Replaced inline ternaries in 3 pages
- Eliminates code duplication
- Single source of truth for badge variants

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Add Missing Database Indexes

**Score: 80 | Time: 10 min**

**Problem:** Task, Review, and DailyPlan models missing optimal indexes for common queries.

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add indexes to Task model**

The Task model already has some indexes (lines 35-37). Add these additional ones after line 37:

```prisma
model Task {
  // ... existing fields ...

  @@index([status, priority])      // Already exists
  @@index([scheduledStart])         // Already exists
  @@index([category])               // Already exists
  @@index([createdAt])              // ADD - for sorting by creation
  @@index([dueDate])                // ADD - for due date queries
  @@index([status, scheduledStart]) // ADD - for scheduled tasks by status
}
```

**Step 2: Verify Review indexes**

Review model (lines 96-131) already has indexes at lines 129-130. Verify they're optimal:

```prisma
@@index([periodStart, type])  // Good - composite for date range + type
@@index([type])               // Good - for filtering by DAILY/WEEKLY
```

These are already optimal - no changes needed.

**Step 3: Verify DailyPlan indexes**

DailyPlan model (line 62) already has:

```prisma
@@index([date])  // Good - unique constraint + index for lookups
```

This is already optimal - no changes needed.

**Step 4: Generate migration**

Run: `cd backend && npx prisma migrate dev --name add-task-indexes`

Expected: Migration file created successfully

**Step 5: Verify migration**

Run: `cd backend && npx prisma migrate status`

Expected: Shows new migration as applied

**Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "perf: add missing indexes to Task model

- Added index on createdAt for sorting
- Added index on dueDate for due date queries
- Added composite index on status+scheduledStart
- Improves query performance for common patterns

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Extract Energy Badge Mapping Utility

**Score: 72 | Time: 10 min**

**Note:** This was already handled in Task 4 Step 1, where we created `getEnergyBadgeVariant()` in badgeUtils.ts.

**Files:**
- Already created in Task 4: `frontend/src/lib/badgeUtils.ts`
- Modify: Pages using energy badges

**Step 1: Find energy badge usage**

Run: `grep -rn "energyRequired.*HIGH.*mint" frontend/src/pages --include="*.tsx"`

Expected: Shows files with inline energy badge logic

**Step 2: Update CalendarPage.tsx (if has energy badges)**

Search for energy badge logic and replace with:

```typescript
// Replace:
variant={task.energyRequired === 'HIGH' ? 'mint' : task.energyRequired === 'MEDIUM' ? 'sun' : 'blush'}

// With:
variant={getEnergyBadgeVariant(task.energyRequired)}
```

**Step 3: Update other pages with energy badges**

Same pattern for any other pages.

**Step 4: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 5: Test in browser**

Navigate to pages with energy badges and verify they display correctly.

Expected: Energy badges show correct colors (HIGH=mint, MEDIUM=sun, LOW=blush)

**Step 6: Commit**

```bash
git add frontend/src/pages/*.tsx
git commit -m "refactor: replace inline energy badge logic with utility

- Used getEnergyBadgeVariant() from badgeUtils
- Eliminates remaining inline ternaries
- Consistent with priority badge refactoring

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Align Prefetch Keys with Hook Parameters

**Score: 63 | Time: 20 min**

**Problem:** Query prefetching may use inconsistent keys compared to actual query hooks.

**Files:**
- Verify: `frontend/src/hooks/useTasks.ts:11-16` (query keys)
- Verify: `frontend/src/hooks/useDailyPlans.ts` (query keys)
- Verify: `frontend/src/hooks/useReviews.ts` (query keys)
- Modify: Any prefetch calls that don't match

**Step 1: Document current query key structure**

From useTasks.ts (lines 11-16):
```typescript
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};
```

**Step 2: Find all prefetch calls**

Run: `grep -rn "prefetchQuery\|prefetch" frontend/src --include="*.ts" --include="*.tsx"`

Expected: Shows any prefetch usage

**Step 3: Verify prefetch keys match query keys**

For each prefetch found, verify it uses the exact same key structure as the corresponding query hook.

Example of correct usage:
```typescript
// Query
useQuery({
  queryKey: taskKeys.list({ status: 'NEXT' }),
  queryFn: () => api.getTasks({ status: 'NEXT' }),
});

// Prefetch (must match exactly)
queryClient.prefetchQuery({
  queryKey: taskKeys.list({ status: 'NEXT' }),
  queryFn: () => api.getTasks({ status: 'NEXT' }),
});
```

**Step 4: Fix any mismatches**

If found, update prefetch keys to match query keys exactly.

**Step 5: Add prefetch helper (if doesn't exist)**

If there are multiple prefetch calls, consider creating a helper:

```typescript
// In hooks/useTasks.ts
export const prefetchTasks = (queryClient: QueryClient, filters?: TaskFilters) => {
  return queryClient.prefetchQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.getTasks(filters),
  });
};
```

**Step 6: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/hooks/*.ts
git commit -m "fix: align prefetch query keys with hook parameters

- Ensured prefetch keys match actual query keys
- Added prefetch helper functions
- Prevents cache misses from key mismatch

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Add Axios Error Interceptor

**Score: 63 | Time: 30 min**

**Problem:** API errors lack centralized handling and user-friendly messages.

**Files:**
- Modify: `frontend/src/lib/api.ts:26-31`

**Step 1: Add response interceptor after axios instance creation**

After line 31 (after `api` instance is created), add:

```typescript
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  // Success response - pass through
  (response) => response,

  // Error response - handle globally
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      console.error('[API Error]', {
        status,
        url: error.config?.url,
        method: error.config?.method,
        data: data,
      });

      // Enrich error with user-friendly message
      const userMessage = getUserFriendlyError(status, data);
      error.userMessage = userMessage;
    } else if (error.request) {
      // Request made but no response (network error)
      console.error('[Network Error]', {
        url: error.config?.url,
        message: error.message,
      });
      error.userMessage = 'Network error. Please check your connection.';
    } else {
      // Something else went wrong
      console.error('[Request Error]', error.message);
      error.userMessage = 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  }
);

// Helper to generate user-friendly error messages
const getUserFriendlyError = (status: number, data: any): string => {
  // Try to get error message from response
  const serverMessage = data?.message || data?.error;

  switch (status) {
    case 400:
      return serverMessage || 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return serverMessage || 'The requested resource was not found.';
    case 409:
      return serverMessage || 'A conflict occurred. The resource may already exist.';
    case 422:
      return serverMessage || 'Validation error. Please check your input.';
    case 500:
      return 'Server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return serverMessage || `An error occurred (${status}).`;
  }
};
```

**Step 2: Update TypeScript error type**

Add type augmentation at the top of the file (after imports):

```typescript
// Augment AxiosError with userMessage
declare module 'axios' {
  export interface AxiosError {
    userMessage?: string;
  }
}
```

**Step 3: Update existing error handlers to use userMessage**

Find existing try-catch blocks (like in scheduleTask line 91) and update to use userMessage:

```typescript
// BEFORE:
} catch (error: any) {
  console.error('[API] scheduleTask failed:', {
    id,
    scheduledStart,
    error: error.response?.data || error.message,
    status: error.response?.status,
  });
  throw error;
}

// AFTER:
} catch (error: any) {
  // Error already logged and enriched by interceptor
  throw error;
}
```

**Step 4: Update toast calls to use userMessage**

In hooks/useTasks.ts error handlers, update to use userMessage:

```typescript
// Example from useScheduleTask
onError: (err: any) => {
  console.error('[useScheduleTask] Error:', err);
  // Use userMessage if available, fallback to generic
  const message = err.userMessage || 'Failed to schedule task';
  toast.showError(message);
  // ... rollback logic
},
```

**Step 5: Test error handling**

1. Stop backend server
2. Try to schedule a task in frontend
3. Verify toast shows "Network error. Please check your connection."
4. Start backend
5. Try invalid operation (e.g., schedule in past)
6. Verify toast shows server's error message

Expected: User-friendly error messages in all cases

**Step 6: Test compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No errors

**Step 7: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/hooks/useTasks.ts
git commit -m "feat: add axios error interceptor with user-friendly messages

- Centralized error handling in API client
- Maps HTTP status codes to readable messages
- Enriches errors with userMessage property
- Updated toast error handlers to use userMessage
- Logs all errors with context

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 8
**Total Time Estimate:** 1.5-2 hours
**Expected Commits:** 7-8 (Task 6 may be no-op if done in Task 4)

**Impact:**
- **Performance:** +4 database indexes for faster queries
- **Correctness:** HTTP method alignment, enum consistency
- **Maintainability:** Badge utilities eliminate duplication
- **User Experience:** Better error messages via interceptor
- **Reliability:** Query key alignment prevents cache misses

**Key Principles Applied:**
- **DRY:** Extract badge mapping utilities
- **YAGNI:** Only add indexes for actual query patterns
- **REST:** Use PATCH for partial updates
- **Defensive:** Centralized error handling

**Testing Strategy:**
- TypeScript compilation after each task
- Database migration verification
- Manual browser testing for UI changes
- Error scenario testing for interceptor

**Verification Checklist:**
- [ ] All migrations applied successfully
- [ ] TypeScript compiles with no errors
- [ ] Badge utilities work on all 3 pages
- [ ] HTTP methods align with backend
- [ ] Error interceptor shows friendly messages
- [ ] Query prefetch keys match hook keys
- [ ] Enums consistent between frontend/backend
