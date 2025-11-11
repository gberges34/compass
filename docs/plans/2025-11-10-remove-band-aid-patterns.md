# Remove Band-Aid Patterns - Migration to React Query

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate all "band-aid over band-aid" patterns by migrating pages from manual state management to React Query hooks.

**Architecture:** Replace useState/useEffect/manual-cache patterns with React Query hooks (useReviews, useTodayPlan, useTodoistPending, useOrientEast, useOrientWest). This eliminates 8 isMounted checks, manual cache invalidation, race conditions, and 145+ lines of boilerplate.

**Tech Stack:** React Query v5, TypeScript, existing hooks infrastructure

---

## Overview

**Problem:** 5 pages use manual state management with multiple band-aids:
- 8 isMounted checks for memory leak prevention
- Manual cache invalidation after mutations
- setTimeout hacks for race conditions
- Duplicate error handling in every page
- Memory leak risks (OrientEastPage has no cleanup)

**Solution:** Migrate to React Query hooks - eliminates ALL band-aids automatically.

**Priority Order:**
1. **CRITICAL**: TodayPage (5 isMounted checks, memory leak risk)
2. **CRITICAL**: OrientEastPage (no cleanup, memory leak)
3. **HIGH**: ReviewsPage (prefetch exists but unused)
4. **HIGH**: ClarifyPage (manual cache invalidation)
5. **MEDIUM**: OrientWestPage (setTimeout race condition hack)

**Estimated Time:** 4-6 hours total (45-60 min per page)

---

## Task 1: Migrate ReviewsPage to React Query

**Time Estimate:** 45 minutes

**Files:**
- Modify: `frontend/src/pages/ReviewsPage.tsx:1-90`
- Reference: `frontend/src/hooks/useReviews.ts` (already has useCreateDailyReview, useCreateWeeklyReview)
- Reference: `frontend/src/pages/CalendarPage.tsx` (good example of React Query usage)

**Current Band-Aids (Lines 25-45):**
```typescript
const [reviews, setReviews] = useState<Review[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchReviews = async () => {
  try {
    setLoading(true);
    const limit = activeTab === 'DAILY' ? 30 : 12;
    const data = await getReviews(activeTab, limit);
    setReviews(data);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    setError('Failed to load reviews');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchReviews();
}, [activeTab]);
```

**Root Cause:** Manual state management instead of using React Query.

---

### Step 1: Add useReviews hook to useReviews.ts

**File:** `frontend/src/hooks/useReviews.ts`

**Add this hook after the existing mutation hooks (around line 40):**

```typescript
export function useReviews(type?: 'DAILY' | 'WEEKLY', limit?: number) {
  return useQuery({
    queryKey: reviewKeys.list(type, limit),
    queryFn: () => api.getReviews(type, limit),
  });
}
```

**Verification:**
- TypeScript should compile without errors
- Hook signature matches prefetchReviews helper

---

### Step 2: Update ReviewsPage to use the hook

**File:** `frontend/src/pages/ReviewsPage.tsx`

**Replace lines 1-50 with:**

```typescript
import React, { useState } from 'react';
import { useReviews, useCreateDailyReview, useCreateWeeklyReview } from '../hooks/useReviews';
import type { Review } from '../types';
import { ReviewCard } from '../components/ReviewCard';
import { Button } from '../components/Button';
import { CreateReviewModal } from '../components/CreateReviewModal';

type TabType = 'DAILY' | 'WEEKLY';

export function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('DAILY');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Replace all manual state with React Query hook
  const limit = activeTab === 'DAILY' ? 30 : 12;
  const { data: reviews = [], isLoading, isError } = useReviews(activeTab, limit);

  const createDailyReview = useCreateDailyReview();
  const createWeeklyReview = useCreateWeeklyReview();

  const handleCreateReview = async (reviewData: any) => {
    if (activeTab === 'DAILY') {
      await createDailyReview.mutateAsync(reviewData);
    } else {
      await createWeeklyReview.mutateAsync(reviewData);
    }
    setShowCreateModal(false);
  };

  if (isLoading) {
    return <div className="p-4">Loading reviews...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-600">Failed to load reviews</div>;
  }

  // Rest of the component stays the same...
```

**Lines Removed:** ~25 lines of boilerplate (useState, useEffect, fetchReviews, try/catch)

---

### Step 3: Run TypeScript compilation

```bash
cd frontend && npx tsc --noEmit
```

**Expected:** No errors

---

### Step 4: Test in browser

**Manual Testing:**
1. Navigate to Reviews page
2. Verify reviews load automatically
3. Switch between DAILY/WEEKLY tabs
4. Verify data refetches on tab change
5. Create a new review
6. Verify list updates automatically (no manual refresh needed)

**Expected:** All functionality works, faster because prefetch is now utilized

---

### Step 5: Commit

```bash
git add frontend/src/pages/ReviewsPage.tsx frontend/src/hooks/useReviews.ts
git commit -m "refactor: migrate ReviewsPage to React Query

- Add useReviews hook to useReviews.ts
- Replace manual state management with useReviews hook
- Remove 25 lines of boilerplate (useState, useEffect, error handling)
- Now benefits from prefetch in Layout.tsx
- Automatic cache invalidation after mutations"
```

---

## Task 2: Migrate TodayPage to React Query (CRITICAL - Memory Leak Risk)

**Time Estimate:** 60 minutes

**Files:**
- Modify: `frontend/src/pages/TodayPage.tsx:1-150`
- Reference: `frontend/src/hooks/useTasks.ts` (has useTasks hook)
- Reference: `frontend/src/hooks/useDailyPlans.ts` (needs useTodayPlan hook)

**Current Band-Aids (Lines 28-90):**
- 5 isMounted checks (lines 31, 54, 64, 74, 84)
- 4 separate useState calls for different data
- 4 separate useEffect calls with cleanup
- Manual error state management
- Sequential API calls (not parallel)

**Code Smell Example:**

```typescript
const [isMounted, setIsMounted] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const active = await getTasks({ status: 'ACTIVE' });
      if (isMounted) setActiveTasks(active);  // Band-Aid #1

      const next = await getTasks({ status: 'NEXT' });
      if (isMounted) setNextTasks(next);  // Band-Aid #2
    } catch (err) {
      if (isMounted) setError('Failed');  // Band-Aid #3
    }
  };

  fetchData();
  return () => setIsMounted(false);  // Cleanup band-aid
}, []);
```

---

### Step 1: Add useTodayPlan hook to useDailyPlans.ts

**File:** `frontend/src/hooks/useDailyPlans.ts`

**Add after line 20:**

```typescript
export function useTodayPlan() {
  return useQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: () => api.getTodayPlan(),
  });
}
```

**Note:** This hook already has a prefetch helper (prefetchTodayPlan), so we're just adding the query hook.

---

### Step 2: Replace TodayPage state management

**File:** `frontend/src/pages/TodayPage.tsx`

**Replace lines 1-90 with:**

```typescript
import React from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTodayPlan } from '../hooks/useDailyPlans';
import { useActivateTask, useCompleteTask } from '../hooks/useTasks';
import type { Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { Button } from '../components/Button';

export function TodayPage() {
  // Replace ALL manual state with React Query hooks
  const { data: activeTasks = [], isLoading: activeLoading } = useTasks({ status: 'ACTIVE' });
  const { data: nextTasks = [], isLoading: nextLoading } = useTasks({ status: 'NEXT' });
  const { data: todayPlan, isLoading: planLoading } = useTodayPlan();

  const activateTask = useActivateTask();
  const completeTask = useCompleteTask();

  const isLoading = activeLoading || nextLoading || planLoading;

  // No isMounted checks needed
  // No useEffect needed
  // No manual error handling needed
  // No cleanup function needed
  // Parallel API calls automatically

  const handleActivateTask = (taskId: string) => {
    activateTask.mutate(taskId);
    // Cache updates automatically via mutation hook
  };

  const handleCompleteTask = (taskId: string, data: any) => {
    completeTask.mutate({ id: taskId, request: data });
    // Cache updates automatically
  };

  if (isLoading) {
    return <div className="p-4">Loading today's plan...</div>;
  }

  // Rest of the component...
```

**Lines Removed:** ~60 lines of boilerplate
**Band-Aids Eliminated:**
- ✅ All 5 isMounted checks removed
- ✅ All 4 useState calls removed
- ✅ All 4 useEffect calls removed
- ✅ Cleanup function removed
- ✅ Manual error handling removed
- ✅ Sequential API calls → automatic parallel fetching

---

### Step 3: Run TypeScript compilation

```bash
cd frontend && npx tsc --noEmit
```

**Expected:** No errors

---

### Step 4: Test thoroughly (this is critical)

**Manual Testing Checklist:**
1. [ ] Page loads without errors
2. [ ] All three data sources load (active tasks, next tasks, today plan)
3. [ ] Data loads in parallel (check Network tab - should see 3 simultaneous requests)
4. [ ] Activate a task → list updates automatically
5. [ ] Complete a task → both lists update automatically
6. [ ] Navigate away and back → data loads from cache instantly (no loading state)
7. [ ] Check console for memory leak warnings → should be ZERO
8. [ ] Refresh page rapidly → no race conditions or duplicate requests

**Expected:** All tests pass, no memory warnings, faster UX

---

### Step 5: Commit

```bash
git add frontend/src/pages/TodayPage.tsx frontend/src/hooks/useDailyPlans.ts
git commit -m "refactor(CRITICAL): migrate TodayPage to React Query hooks

FIXES: Memory leak risk from missing cleanup on unmounted component

- Add useTodayPlan hook to useDailyPlans.ts
- Replace manual state management with React Query hooks
- Remove ALL 5 isMounted checks (no longer needed)
- Remove 60+ lines of boilerplate code
- Sequential API calls → automatic parallel fetching
- Automatic cache invalidation after mutations
- Zero memory leak warnings

Band-aids eliminated: isMounted checks, manual cleanup, manual error handling"
```

---

## Task 3: Migrate ClarifyPage to React Query

**Time Estimate:** 45 minutes

**Files:**
- Modify: `frontend/src/pages/ClarifyPage.tsx:1-120`
- Reference: `frontend/src/hooks/useTodoist.ts` (needs useTodoistPending hook)

**Current Band-Aids:**
- Manual state management (lines 34-49)
- Manual cache invalidation (line 113): `setPendingTasks(prev => prev.filter(...))`
- Should use `queryClient.invalidateQueries()` or optimistic updates

---

### Step 1: Add useTodoistPending hook

**File:** `frontend/src/hooks/useTodoist.ts`

**Add after line 15:**

```typescript
export function useTodoistPending() {
  return useQuery({
    queryKey: todoistKeys.pending(),
    queryFn: () => api.getTodoistPending(),
  });
}
```

---

### Step 2: Replace ClarifyPage state management

**File:** `frontend/src/pages/ClarifyPage.tsx`

**Replace lines 18-49 with:**

```typescript
import React, { useState } from 'react';
import { useTodoistPending, useImportTodoistTasks } from '../hooks/useTodoist';
import type { TempCapturedTask } from '../types';
import { Button } from '../components/Button';
import { TaskImportCard } from '../components/TaskImportCard';

export function ClarifyPage() {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Replace manual state with React Query
  const { data, isLoading, isError } = useTodoistPending();
  const pendingCount = data?.count ?? 0;
  const pendingTasks = data?.tasks ?? [];

  const importTasks = useImportTodoistTasks();

  const handleImport = async () => {
    const tasksToImport = pendingTasks
      .filter(task => selectedTasks.includes(task.id))
      .map(task => ({ name: task.name, due: task.due }));

    await importTasks.mutateAsync({ tasks: tasksToImport });

    // No manual cache invalidation needed!
    // The mutation hook handles it automatically
    setSelectedTasks([]);
  };

  if (isLoading) {
    return <div className="p-4">Loading pending tasks...</div>;
  }

  if (isError) {
    return <div className="p-4 text-red-600">Failed to load pending tasks</div>;
  }

  // Rest of component...
```

**Line 113 BEFORE (manual cache invalidation):**
```typescript
setPendingTasks(prev => prev.filter(task => !importedIds.includes(task.id)));
```

**Line 113 AFTER (automatic):**
```typescript
// Removed - mutation hook invalidates cache automatically
```

---

### Step 3: Update useImportTodoistTasks hook to invalidate cache

**File:** `frontend/src/hooks/useTodoist.ts`

**Find the useImportTodoistTasks mutation (around line 25) and add onSuccess:**

```typescript
export function useImportTodoistTasks() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: { tasks: Array<{ name: string; due?: string }> }) =>
      api.importTodoistTasks(data.tasks),
    onSuccess: () => {
      // Invalidate pending tasks cache so page refetches
      queryClient.invalidateQueries({ queryKey: todoistKeys.pending() });
      toast.showSuccess('Tasks imported successfully');
    },
    onError: (err: AxiosError) => {
      console.error('[useImportTodoistTasks] Error:', err);
      toast.showError(err.userMessage || 'Failed to import tasks');
    },
  });
}
```

---

### Step 4: Run TypeScript compilation

```bash
cd frontend && npx tsc --noEmit
```

**Expected:** No errors

---

### Step 5: Test the import flow

**Manual Testing:**
1. Navigate to Clarify page
2. Verify pending tasks load
3. Select some tasks to import
4. Click import
5. **Key Test:** Verify the list updates automatically (imported tasks disappear)
6. Check that no manual `setPendingTasks` call is needed

**Expected:** Clean automatic cache invalidation, no manual state updates

---

### Step 6: Commit

```bash
git add frontend/src/pages/ClarifyPage.tsx frontend/src/hooks/useTodoist.ts
git commit -m "refactor: migrate ClarifyPage to React Query

- Add useTodoistPending hook to useTodoist.ts
- Replace manual state management with hook
- Remove manual cache invalidation (line 113)
- Add automatic cache invalidation in mutation onSuccess
- Cleaner, more maintainable code

Band-aid eliminated: Manual cache invalidation"
```

---

## Task 4: Migrate OrientEastPage to React Query (CRITICAL - Memory Leak)

**Time Estimate:** 60 minutes

**Files:**
- Modify: `frontend/src/pages/OrientEastPage.tsx:1-180`
- Modify: `frontend/src/hooks/useDailyPlans.ts` (add mutation if needed)

**Current Band-Aids:**
- No cleanup function (MEMORY LEAK RISK - lines 61-77)
- Manual state management
- setTimeout race condition hack (lines 153-159)

**Critical Issue (Lines 61-77):**
```typescript
useEffect(() => {
  const loadData = async () => {
    // ... async work
    setState(data);  // ⚠️ Can set state on unmounted component!
  };
  loadData();
  // ⚠️ NO CLEANUP FUNCTION - MEMORY LEAK!
}, []);
```

---

### Step 1: Verify hooks exist in useDailyPlans.ts

**File:** `frontend/src/hooks/useDailyPlans.ts`

**Check if these exist (they should from earlier work):**
- `useCreateDailyPlan` mutation
- `useTodayPlan` query (added in Task 2)

**If useCreateDailyPlan doesn't exist, add it:**

```typescript
export function useCreateDailyPlan() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (request: CreateDailyPlanRequest) => api.createDailyPlan(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.all });
      toast.showSuccess('Daily plan created');
    },
    onError: (err: AxiosError) => {
      console.error('[useCreateDailyPlan] Error:', err);
      toast.showError(err.userMessage || 'Failed to create daily plan');
    },
  });
}
```

---

### Step 2: Replace OrientEastPage state management

**File:** `frontend/src/pages/OrientEastPage.tsx`

**Replace lines 1-77 with:**

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useTodayPlan, useCreateDailyPlan } from '../hooks/useDailyPlans';
import { Button } from '../components/Button';
import { TaskSelector } from '../components/TaskSelector';

export function OrientEastPage() {
  const navigate = useNavigate();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [intention, setIntention] = useState('');

  // Replace all manual state with React Query
  const { data: nextTasks = [], isLoading: tasksLoading } = useTasks({ status: 'NEXT' });
  const { data: existingPlan, isLoading: planLoading } = useTodayPlan();

  const createPlan = useCreateDailyPlan();

  const isLoading = tasksLoading || planLoading;

  // No isMounted needed
  // No useEffect needed
  // No manual error handling needed
  // No cleanup function needed (React Query handles it!)

  const handleCreatePlan = async () => {
    await createPlan.mutateAsync({
      intention,
      selectedTaskIds,
      date: new Date().toISOString().split('T')[0],
    });

    // No setTimeout hack needed!
    // Cache is already updated by mutation
    navigate('/today');
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  // Rest of component...
```

---

### Step 3: Remove setTimeout hack

**Lines 153-159 BEFORE:**
```typescript
await createDailyPlan(planData);
// ⚠️ HACK: Wait for cache to update
setTimeout(() => {
  navigate('/today');
}, 1500);
```

**Lines 153-159 AFTER:**
```typescript
await createPlan.mutateAsync(planData);
// Cache updated immediately by mutation onSuccess
navigate('/today');
```

**Band-Aid Eliminated:** No more setTimeout race condition hack!

---

### Step 4: Run TypeScript compilation

```bash
cd frontend && npx tsc --noEmit
```

**Expected:** No errors

---

### Step 5: Test the critical flow

**Manual Testing (CRITICAL):**
1. Navigate to Orient East page
2. Select tasks and enter intention
3. Click "Create Plan"
4. **Critical Test:** Verify navigation happens immediately (no 1.5s delay)
5. **Critical Test:** Verify Today page shows the newly created plan
6. **Critical Test:** Navigate away quickly during creation → check console for memory leak warnings
7. Repeat test 5 times rapidly → no race conditions

**Expected:**
- Immediate navigation (no delay)
- Plan appears on Today page
- Zero memory leak warnings
- No race conditions

---

### Step 6: Commit

```bash
git add frontend/src/pages/OrientEastPage.tsx frontend/src/hooks/useDailyPlans.ts
git commit -m "refactor(CRITICAL): migrate OrientEastPage to React Query

FIXES: Memory leak from missing cleanup function

- Replace manual state management with React Query hooks
- Remove missing cleanup function (memory leak fix)
- Remove setTimeout(1500ms) race condition hack
- Immediate navigation after plan creation
- Automatic cache invalidation

Band-aids eliminated: Missing cleanup, setTimeout hack, manual error handling"
```

---

## Task 5: Migrate OrientWestPage to React Query

**Time Estimate:** 45 minutes

**Files:**
- Modify: `frontend/src/pages/OrientWestPage.tsx:1-120`
- Reference: `frontend/src/hooks/useDailyPlans.ts` (needs useUpdateDailyPlanReflection)

**Current Band-Aids:**
- 3 isMounted checks (lines 35, 45, 55)
- setTimeout race condition hack (lines 87-92)
- Manual state management

---

### Step 1: Verify mutation hook exists

**File:** `frontend/src/hooks/useDailyPlans.ts`

**Check for useUpdateDailyPlanReflection. If it doesn't exist, add it:**

```typescript
export function useUpdateDailyPlanReflection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ planId, request }: { planId: string; request: UpdateDailyPlanRequest }) =>
      api.updateDailyPlanReflection(planId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.all });
      toast.showSuccess('Reflection saved');
    },
    onError: (err: AxiosError) => {
      console.error('[useUpdateDailyPlanReflection] Error:', err);
      toast.showError(err.userMessage || 'Failed to save reflection');
    },
  });
}
```

---

### Step 2: Replace OrientWestPage state management

**File:** `frontend/src/pages/OrientWestPage.tsx`

**Replace lines 1-60 with:**

```typescript
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTodayPlan, useUpdateDailyPlanReflection } from '../hooks/useDailyPlans';
import { Button } from '../components/Button';
import { TextArea } from '../components/TextArea';

export function OrientWestPage() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();

  const [reflection, setReflection] = useState('');
  const [wins, setWins] = useState('');
  const [improvements, setImprovements] = useState('');

  // Replace all manual state with React Query
  const { data: todayPlan, isLoading } = useTodayPlan();
  const updateReflection = useUpdateDailyPlanReflection();

  // No isMounted checks needed
  // No useEffect needed
  // No cleanup function needed

  const handleSaveReflection = async () => {
    if (!todayPlan?.id) return;

    await updateReflection.mutateAsync({
      planId: todayPlan.id,
      request: { reflection, wins, improvements },
    });

    // No setTimeout hack!
    navigate('/reviews');
  };

  if (isLoading) {
    return <div className="p-4">Loading today's plan...</div>;
  }

  // Rest of component...
```

---

### Step 3: Remove setTimeout hack

**Lines 87-92 BEFORE:**
```typescript
await updateDailyPlanReflection(planId, data);
// ⚠️ HACK: Wait for cache to update
setTimeout(() => {
  navigate('/reviews');
}, 1500);
```

**Lines 87-92 AFTER:**
```typescript
await updateReflection.mutateAsync({ planId, request: data });
// Cache updated immediately
navigate('/reviews');
```

---

### Step 4: Run TypeScript compilation

```bash
cd frontend && npx tsc --noEmit
```

**Expected:** No errors

---

### Step 5: Test the flow

**Manual Testing:**
1. Create a daily plan first (via Orient East)
2. Navigate to Orient West
3. Enter reflection, wins, improvements
4. Click "Save"
5. **Key Test:** Navigation happens immediately (no delay)
6. **Key Test:** Reviews page shows updated reflection
7. Navigate back to Orient West → reflection data persists (from cache)

**Expected:** Immediate navigation, data persists, no delays

---

### Step 6: Commit

```bash
git add frontend/src/pages/OrientWestPage.tsx frontend/src/hooks/useDailyPlans.ts
git commit -m "refactor: migrate OrientWestPage to React Query

- Add useUpdateDailyPlanReflection hook if needed
- Replace manual state management with hooks
- Remove all 3 isMounted checks
- Remove setTimeout(1500ms) race condition hack
- Immediate navigation after saving
- Automatic cache invalidation

Band-aids eliminated: isMounted checks, setTimeout hack"
```

---

## Task 6: Final Verification and Testing

**Time Estimate:** 30 minutes

**Goal:** Verify all migrations work together and no regressions introduced.

---

### Step 1: Run full test suite

```bash
cd frontend
npm test -- --watchAll=false --passWithNoTests
```

**Expected:** All existing tests pass (especially useTasks.test.tsx)

---

### Step 2: Run TypeScript compilation

```bash
npx tsc --noEmit
```

**Expected:** Zero errors

---

### Step 3: Manual integration testing checklist

**Complete User Journey:**

1. [ ] **Reviews Page**
   - [ ] DAILY reviews load
   - [ ] WEEKLY reviews load
   - [ ] Create new review → appears in list immediately
   - [ ] Navigate away and back → loads from cache instantly

2. [ ] **Today Page**
   - [ ] Active tasks load
   - [ ] Next tasks load
   - [ ] Today's plan loads
   - [ ] All three load in parallel (check Network tab)
   - [ ] Activate a task → appears in active list
   - [ ] Complete a task → disappears from list
   - [ ] No console warnings about memory leaks

3. [ ] **Clarify Page**
   - [ ] Pending Todoist tasks load
   - [ ] Import selected tasks → disappear from list automatically
   - [ ] No manual refresh needed

4. [ ] **Orient East Page**
   - [ ] Next tasks load
   - [ ] Create plan → navigates immediately to Today page
   - [ ] Today page shows new plan (no delay)
   - [ ] No setTimeout delay

5. [ ] **Orient West Page**
   - [ ] Today's plan loads
   - [ ] Save reflection → navigates immediately to Reviews
   - [ ] Reviews page shows updated reflection
   - [ ] No setTimeout delay

6. [ ] **Cache Behavior**
   - [ ] Navigate between pages rapidly
   - [ ] Data loads from cache (instant, no loading spinners)
   - [ ] Network tab shows fewer duplicate requests

7. [ ] **Error Handling**
   - [ ] Stop backend server
   - [ ] Try to load any page
   - [ ] Verify error messages are user-friendly (from axios interceptor)
   - [ ] Restart backend
   - [ ] Verify retry works

**Expected:** All tests pass, faster UX, no errors, no memory warnings

---

### Step 4: Check browser console for warnings

**Open DevTools → Console:**
- [ ] Zero memory leak warnings
- [ ] Zero "Can't perform a React state update on an unmounted component" warnings
- [ ] Zero race condition warnings

**Expected:** Clean console

---

### Step 5: Performance comparison

**Before Migration (with band-aids):**
- ReviewsPage: Manual fetch on every mount
- TodayPage: 3 sequential API calls + 5 isMounted checks
- OrientEastPage: setTimeout(1500ms) delay before navigation
- OrientWestPage: setTimeout(1500ms) delay before navigation

**After Migration (React Query):**
- All pages: Instant cache hits on remount
- TodayPage: 3 parallel API calls, zero isMounted checks
- Orient pages: Immediate navigation (no delays)
- Automatic cache invalidation
- Built-in retry logic
- Error handling via axios interceptor

**Measure:**
- [ ] Use Chrome DevTools Performance tab
- [ ] Record loading Today page 3 times
- [ ] First load: ~same speed
- [ ] Second load: Should be instant (cache hit)
- [ ] Third load: Still instant

**Expected:** Second and third loads are significantly faster

---

### Step 6: Create summary document

**File:** `docs/completed/2025-11-10-band-aid-removal-summary.md`

**Content:**

```markdown
# Band-Aid Removal - Migration Summary

**Date:** 2025-11-10
**Pages Migrated:** 5
**Band-Aids Removed:** 15+
**Lines of Code Removed:** ~145

## Pages Migrated

1. ✅ ReviewsPage
2. ✅ TodayPage (CRITICAL - memory leak fixed)
3. ✅ ClarifyPage
4. ✅ OrientEastPage (CRITICAL - memory leak fixed)
5. ✅ OrientWestPage

## Band-Aids Eliminated

### isMounted Checks (8 total)
- TodayPage: 5 removed
- OrientWestPage: 3 removed
- **Impact:** No longer needed - React Query handles cleanup

### setTimeout Hacks (2 total)
- OrientEastPage: 1500ms delay removed
- OrientWestPage: 1500ms delay removed
- **Impact:** Immediate navigation, no race conditions

### Manual Cache Invalidation (1)
- ClarifyPage: Manual setPendingTasks filter removed
- **Impact:** Automatic cache invalidation via mutation hooks

### Missing Cleanup Functions (1 CRITICAL)
- OrientEastPage: Added automatic cleanup via React Query
- **Impact:** Memory leak fixed

### Manual State Management (5 pages)
- All pages: useState + useEffect + try/catch removed
- **Impact:** 145+ lines of boilerplate eliminated

## Performance Improvements

- **Parallel API Calls:** TodayPage now fetches 3 endpoints in parallel
- **Cache Hits:** Instant page loads on remount (data from cache)
- **Prefetch Utilization:** All pages now benefit from Layout.tsx prefetch
- **No Delays:** Removed 3 seconds total of setTimeout delays

## Code Quality Improvements

- **Type Safety:** All hooks properly typed with TypeScript
- **Error Handling:** Centralized via axios interceptor
- **Maintainability:** Single source of truth for data fetching
- **Consistency:** All pages use same pattern

## Testing Verification

- ✅ All existing tests pass
- ✅ TypeScript compilation succeeds
- ✅ Manual testing complete
- ✅ Zero memory leak warnings
- ✅ Zero console errors
- ✅ Performance improved

## Metrics

- **Before:** 145 lines of boilerplate across 5 pages
- **After:** ~30 lines total (hooks only)
- **Reduction:** ~115 lines removed (-79%)
- **Memory Leaks Fixed:** 2 (TodayPage, OrientEastPage)
- **Race Conditions Fixed:** 2 (setTimeout hacks)

## Future Recommendations

None - all band-aids removed! The codebase is now clean and maintainable.
```

---

### Step 7: Final commit

```bash
git add docs/completed/2025-11-10-band-aid-removal-summary.md
git commit -m "docs: add band-aid removal migration summary

- 5 pages migrated to React Query
- 15+ band-aids eliminated
- 145 lines of boilerplate removed
- 2 critical memory leaks fixed
- 2 race conditions fixed
- Significant performance improvements"
```

---

## Summary

**Total Time:** 4-6 hours
**Pages Migrated:** 5
**Band-Aids Removed:** 15+
**Lines Removed:** ~145
**Critical Bugs Fixed:** 2 memory leaks

**Before:**
- Manual state management everywhere
- 8 isMounted checks
- 2 setTimeout hacks (3 seconds of delays)
- Manual cache invalidation
- 2 memory leak risks
- Sequential API calls

**After:**
- React Query hooks everywhere
- Zero isMounted checks
- Zero setTimeout hacks
- Automatic cache invalidation
- Zero memory leaks
- Parallel API calls
- Instant cache hits on remount
- Centralized error handling

**Result:** Clean, maintainable, performant codebase with zero band-aids!
