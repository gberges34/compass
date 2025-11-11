# Band-Aid Over Band-Aid: Comprehensive Analysis

## Executive Summary

The codebase exhibits multiple "band-aid" patterns where manual state management, memory leak prevention, and error handling workarounds are used instead of leveraging React Query's built-in capabilities. This analysis identifies specific instances and recommends React Query replacements.

---

## 1. PAGES NOT USING REACT QUERY (Manual State Management)

### Pattern: useState + useEffect + Direct API Calls

#### 1.1 ReviewsPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/ReviewsPage.tsx`
**Lines:** 1-40

```typescript
// BAND-AID: Manual state management with useState + useEffect
const [activeTab, setActiveTab] = useState<ReviewType>('DAILY');
const [reviews, setReviews] = useState<Review[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchReviews();
}, [activeTab]);

const fetchReviews = async () => {
  try {
    setLoading(true);
    const limit = activeTab === 'DAILY' ? 30 : 12;
    const data = await getReviews(activeTab, limit);
    setReviews(data);
  } catch (err) {
    toast.showError('Failed to load reviews. Please try again.');
    console.error('Error fetching reviews:', err);
  } finally {
    setLoading(false);
  }
};
```

**Issues:**
- Manual loading state management
- Manual error handling with setError
- No caching between tab switches
- No retry logic
- No automatic refetching on data stale

**React Query Replacement:**
```typescript
import { useReviews } from '../hooks/useReviews'; // Create this hook

const { 
  data: reviews = [], 
  isLoading: loading,
  error 
} = useReviews(activeTab);

if (error) {
  toast.showError('Failed to load reviews. Please try again.');
}
```

---

#### 1.2 TodayPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/TodayPage.tsx`
**Lines:** 28-90

```typescript
// BAND-AID: Manual state + isMounted check (memory leak prevention)
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    try {
      setLoading(true);

      let dailyPlan: DailyPlan | null = null;
      try {
        dailyPlan = await getTodayPlan();
        if (isMounted) {  // <-- BAND-AID: isMounted check
          setPlan(dailyPlan);
        }
      } catch (err) {
        if (isMounted) {
          setPlan(null);
        }
      }

      // Multiple sequential API calls
      const active = await getTasks({ status: 'ACTIVE' });
      if (!isMounted) return;  // <-- Another isMounted check
      setActiveTasks(active);

      const next = await getTasks({ status: 'NEXT' });
      if (!isMounted) return;
      const sortedNext = next.sort(...);
      setNextTasks(sortedNext.slice(0, 5));

      const logs = await getPostDoLogs({ startDate, endDate });
      if (!isMounted) return;
      setTodayLogs(logs);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchData();
  return () => {
    isMounted = false;  // <-- Cleanup to prevent setState on unmounted component
  };
}, []);
```

**Issues:**
- Manual `isMounted` flag for memory leak prevention
- Multiple sequential API calls (no parallelization)
- Multiple `if (!isMounted) return` checks scattered throughout
- Manual loading state
- Manual error handling with toast
- Cleanup function needed to prevent memory leaks

**React Query Replacement:**
```typescript
import { useTodayPlan } from '../hooks/useDailyPlans';
import { useTasks } from '../hooks/useTasks';
import { usePostDoLogs } from '../hooks/usePostDoLogs';

// React Query handles memory leaks automatically with cleanup
const { data: plan, isLoading: planLoading } = useTodayPlan();
const { data: activeTasks = [], isLoading: activeLoading } = useTasks({ status: 'ACTIVE' });
const { data: nextTasks = [], isLoading: nextLoading } = useTasks({ status: 'NEXT' });
const { data: logs = [], isLoading: logsLoading } = usePostDoLogs({
  startDate: todayDate,
  endDate: todayDate,
});

const loading = planLoading || activeLoading || nextLoading || logsLoading;

// No isMounted needed - React Query cleanup is automatic
// No manual error handling needed - use error states from hooks
```

---

#### 1.3 ClarifyPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/ClarifyPage.tsx`
**Lines:** 34-49

```typescript
// BAND-AID: Manual state management + direct API calls
useEffect(() => {
  fetchPendingTasks();
}, []);

const fetchPendingTasks = async () => {
  setLoading(true);
  try {
    const response = await getTodoistPending();
    setPendingTasks(response.tasks);
  } catch (err) {
    toast.showError('Failed to load pending tasks. Please try again.');
    console.error('Error fetching pending tasks:', err);
  } finally {
    setLoading(false);
  }
};
```

**Issues:**
- Manual loading state
- Manual error handling with toast
- No caching
- No retry logic
- Manual task state after mutation (line 113)

**Related Band-Aid (Manual Cache Invalidation):**
```typescript
// Line 113: Manual state update after mutation
setPendingTasks(prev => prev.filter(t => t.id !== selectedTask.id));
```

**React Query Replacement:**
```typescript
import { usePendingTasks, useEnrichTask, useCreateTask } from '../hooks/useTodos';

const { 
  data: pendingTasks = [], 
  isLoading: loading,
  error 
} = usePendingTasks();

// Mutations automatically refetch and invalidate cache
const enrichMutation = useEnrichTask();
const createMutation = useCreateTask();

// After creating task, React Query automatically removes from pending via cache invalidation
```

---

#### 1.4 OrientWestPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/OrientWestPage.tsx`
**Lines:** 33-62

```typescript
// BAND-AID: Manual state + isMounted check
useEffect(() => {
  let isMounted = true;

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const todayPlan = await getTodayPlan();
      if (isMounted) {  // <-- BAND-AID: isMounted check
        setPlan(todayPlan);
        setNoPlanFound(false);
      }
    } catch (err) {
      if (isMounted) {  // <-- Another check
        setNoPlanFound(true);
        toast.showWarning('No plan found for today...');
      }
    } finally {
      if (isMounted) {  // <-- Another check
        setLoading(false);
      }
    }
  };

  fetchPlan();

  return () => {
    isMounted = false;  // <-- Cleanup
  };
}, []);
```

**Issues:**
- Multiple `isMounted` checks (band-aid for memory leaks)
- Manual loading state
- Manual error state (`noPlanFound`)

**React Query Replacement:**
```typescript
import { useTodayPlan } from '../hooks/useDailyPlans';

const { 
  data: plan, 
  isLoading: loading, 
  error,
  isError 
} = useTodayPlan();

const noPlanFound = isError; // Use error state directly
```

---

#### 1.5 OrientEastPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/OrientEastPage.tsx`
**Lines:** 61-77

```typescript
// BAND-AID: Manual state check without isMounted (potential memory leak)
useEffect(() => {
  const checkExistingPlan = async () => {
    try {
      setLoading(true);
      const plan = await getTodayPlan();
      setExistingPlan(plan);
    } catch (err) {
      setExistingPlan(null);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  checkExistingPlan();
}, []);
```

**Issues:**
- No `isMounted` check (potential memory leak)
- Manual state management
- Manual error handling
- Missing cleanup function

**React Query Replacement:**
```typescript
const { 
  data: existingPlan, 
  isLoading: loading,
  isError
} = useTodayPlan();

// useEffect to handle editing mode
useEffect(() => {
  if (isError) {
    setIsEditing(true);
  }
}, [isError]);
```

---

### Summary: Pages Needing React Query Hooks

| Page | Pattern | Lines | Issue |
|------|---------|-------|-------|
| ReviewsPage | useState + useEffect | 1-40 | Manual state, no caching |
| TodayPage | isMounted + sequential calls | 28-90 | Memory leak pattern, multiple checks |
| ClarifyPage | useState + useEffect | 34-49 | Manual state, manual cache invalidation |
| OrientWestPage | isMounted check | 33-62 | Multiple checks, manual error state |
| OrientEastPage | No cleanup | 61-77 | Potential memory leak |

---

## 2. MANUAL CACHE INVALIDATION PATTERNS

### 2.1 ClarifyPage.tsx - Manual setState After Mutation
**File:** `/Users/gberges/compass/frontend/src/pages/ClarifyPage.tsx`
**Lines:** 112-117

```typescript
// BAND-AID: Manual cache invalidation with setState
toast.showSuccess('Task saved successfully!');

// Remove from pending list manually
setPendingTasks(prev => prev.filter(t => t.id !== selectedTask.id));

// Reset form
setSelectedTask(null);
setEnrichedData(null);
```

**Why This Is a Band-Aid:**
- Mutates local state instead of letting React Query handle cache
- Fragile: if API succeeds but client-side filter fails, UI is out of sync
- No server source of truth - if page refreshes, filter might not apply
- Doesn't handle edge cases (what if multiple creates in flight?)

**React Query Replacement:**
```typescript
const createMutation = useCreateTask({
  onSuccess: () => {
    // React Query automatically invalidates queries
    queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
    toast.showSuccess('Task saved successfully!');
    setSelectedTask(null);
    setEnrichedData(null);
  }
});
```

---

## 3. isMounted CHECKS (Memory Leak Prevention Band-Aid)

### Pattern Overview
Multiple pages use `isMounted` to prevent state updates on unmounted components. This is a band-aid because:
- It's boilerplate code that adds complexity
- React Query/AbortController handles this automatically
- Each page reimplements the same logic

### 3.1 TodayPage.tsx - Multiple isMounted Checks
**File:** `/Users/gberges/compass/frontend/src/pages/TodayPage.tsx`
**Lines:** 29-87

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check 1: After getTodayPlan
      if (isMounted) {
        setPlan(dailyPlan);
      }

      // Check 2: After getTasks (active)
      if (!isMounted) return;
      setActiveTasks(active);

      // Check 3: After getTasks (next)
      if (!isMounted) return;
      setNextTasks(sortedNext.slice(0, 5));

      // Check 4: After getPostDoLogs
      if (!isMounted) return;
      setTodayLogs(logs);
    } finally {
      // Check 5: In finally block
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchData();

  return () => {
    isMounted = false;  // Cleanup
  };
}, []);
```

**Band-Aids:** 5 separate `isMounted` checks

**React Query Replacement:**
```typescript
// React Query automatically cleans up on unmount
const { data: plan } = useTodayPlan();
const { data: activeTasks } = useTasks({ status: 'ACTIVE' });
const { data: nextTasks } = useTasks({ status: 'NEXT' });
const { data: todayLogs } = usePostDoLogs({ startDate, endDate });

// No isMounted needed - React Query handles cleanup
```

---

### 3.2 OrientWestPage.tsx - Multiple isMounted Checks
**File:** `/Users/gberges/compass/frontend/src/pages/OrientWestPage.tsx`
**Lines:** 34-62

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const todayPlan = await getTodayPlan();
      if (isMounted) {  // Check 1
        setPlan(todayPlan);
        setNoPlanFound(false);
      }
    } catch (err) {
      if (isMounted) {  // Check 2
        setNoPlanFound(true);
        toast.showWarning('No plan found for today...');
      }
    } finally {
      if (isMounted) {  // Check 3
        setLoading(false);
      }
    }
  };

  fetchPlan();

  return () => {
    isMounted = false;
  };
}, []);
```

**Band-Aids:** 3 separate `isMounted` checks with cleanup

---

## 4. RACE CONDITION & TIMING PATTERNS

### 4.1 OrientWestPage.tsx - setTimeout for Navigation
**File:** `/Users/gberges/compass/frontend/src/pages/OrientWestPage.tsx`
**Lines:** 87-92

```typescript
// BAND-AID: setTimeout to "wait" for toast before navigating
try {
  setSubmitting(true);
  
  const request: UpdateDailyPlanRequest = {
    reflection: reflection.trim(),
    actualOutcomes,
    energyMatch,
  };

  await updateDailyPlanReflection(plan.id, request);
  toast.showSuccess('Evening reflection saved successfully! Navigating to Reviews...');

  // Wait 1.5 seconds before navigating
  setTimeout(() => {
    navigate('/reviews');
  }, 1500);
} catch (err) {
  toast.showError(...);
} finally {
  setSubmitting(false);
}
```

**Why This Is a Band-Aid:**
- Hardcoded 1500ms delay is arbitrary
- Toast display time varies (user might dismiss it)
- What if actual duration is longer? Shorter?
- Tight coupling to toast implementation

**React Query Solution:**
```typescript
// Use onSuccess callback in mutation
const updateMutation = useUpdateDailyPlanReflection({
  onSuccess: () => {
    toast.showSuccess('Evening reflection saved!');
    // Navigate immediately or use navigate directly
    navigate('/reviews');
  }
});

await updateMutation.mutateAsync({...});
```

---

### 4.2 OrientEastPage.tsx - setTimeout for Navigation
**File:** `/Users/gberges/compass/frontend/src/pages/OrientEastPage.tsx`
**Lines:** 153-159

```typescript
// BAND-AID: Another setTimeout delay
await createDailyPlan(request);
toast.showSuccess('Daily plan created successfully! Navigating to Today page...');

// Navigate to /today after a brief delay
setTimeout(() => {
  navigate('/today');
}, 1500);
```

**Same Issues:** Arbitrary delay, tight coupling to toast

---

## 5. DUPLICATE ERROR HANDLING PATTERNS

### 5.1 ReviewsPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/ReviewsPage.tsx`
**Line:** 48

```typescript
catch (err) {
  toast.showError('Failed to load reviews. Please try again.');
  console.error('Error fetching reviews:', err);
}
```

### 5.2 TodayPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/TodayPage.tsx`
**Line:** 74

```typescript
if (isMounted) {
  toast.showError(err instanceof Error ? err.message : 'Failed to load data');
  console.error('Error loading today page data:', err);
}
```

### 5.3 ClarifyPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/ClarifyPage.tsx`
**Lines:** 44, 79, 119

```typescript
catch (err) {
  toast.showError('Failed to load pending tasks. Please try again.');
  console.error('Error fetching pending tasks:', err);
}
```

**Pattern:** Every page reimplements error handling with toast.showError + console.error

**React Query Solution:**
```typescript
// Create a custom hook with built-in error handling
export const useTasks = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    onError: (error) => {
      // Central error handling
      toast.showError('Failed to load tasks');
      console.error('Tasks query error:', error);
    }
  });
};
```

---

## 6. PAGES USING REACT QUERY (For Comparison)

### Good Pattern: CalendarPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`
**Lines:** 91-99

```typescript
// GOOD: Using React Query hooks
const { data: tasks = [], isLoading: tasksLoading } = useTasks({ status: 'NEXT' });
const { data: todayPlan, isLoading: planLoading } = useTodayPlan();
const scheduleTaskMutation = useScheduleTask();
const unscheduleTaskMutation = useUnscheduleTask();
const updateTaskMutation = useUpdateTask();

// Local UI state only
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
const [draggedTask, setDraggedTask] = useState<Task | null>(null);
```

**What's Right:**
- Data from React Query hooks
- Local UI state separate from server state
- Mutations handled via hooks
- No manual loading state
- No isMounted checks
- Automatic cache management
- Proper error handling in mutations

### Good Pattern: TasksPage.tsx
**File:** `/Users/gberges/compass/frontend/src/pages/TasksPage.tsx`
**Lines:** 37-42

```typescript
// GOOD: React Query for data, hooks for mutations
const { data: tasks = [], isLoading: loading } = useTasks(filters);
const createTaskMutation = useCreateTask();
const activateTaskMutation = useActivateTask();
const completeTaskMutation = useCompleteTask();
const updateTaskMutation = useUpdateTask();
const deleteTaskMutation = useDeleteTask();
```

---

## Summary Table

| Band-Aid Type | Location | Count | React Query Fix |
|---------------|----------|-------|-----------------|
| Manual state (useState + useEffect) | ReviewsPage, TodayPage, ClarifyPage, OrientWest, OrientEast | 5 pages | Use React Query hooks |
| isMounted checks | TodayPage (5), OrientWest (3) | 8 total | Automatic cleanup |
| Manual cache invalidation | ClarifyPage | 1 | `invalidateQueries` |
| setTimeout delays | OrientWest, OrientEast | 2 | Use `onSuccess` callbacks |
| Duplicate error handling | All pages | Every page | Centralize in hooks |
| Missing cleanup | OrientEast | 1 | Add cleanup function |

---

## Recommendations

1. **Migrate ReviewsPage** → Create `useReviews` hook
2. **Migrate TodayPage** → Use existing hooks, remove isMounted
3. **Migrate ClarifyPage** → Create `usePendingTasks` hook, remove manual setState
4. **Migrate OrientWestPage** → Use hooks, remove isMounted, remove setTimeout
5. **Fix OrientEastPage** → Use hooks, add cleanup or migrate to hooks
6. **Centralize error handling** → Add error callbacks to all hooks
7. **Remove all isMounted patterns** → Let React Query handle cleanup

