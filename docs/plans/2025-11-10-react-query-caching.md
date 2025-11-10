# React Query Caching Implementation Plan

**Created:** 2025-11-10
**Status:** Planning
**Priority:** High

## Overview

Implement React Query (TanStack Query) caching throughout the Compass frontend to replace manual state management with automatic caching, background refetching, and optimistic updates. This will improve performance, reduce redundant API calls, and provide a better user experience.

## Current State Analysis

**Already Installed:**
- `@tanstack/react-query`: ^5.90.7 ✅

**Current Data Fetching Pattern:**
- Manual `useState` + `useEffect` for data fetching
- Manual loading states (`setLoading`)
- Manual error handling
- No caching between page navigations
- Redundant API calls on every mount
- Manual optimistic updates in drag-drop

**Example Current Pattern (CalendarPage.tsx:33-48):**
```typescript
useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    const allTasks = await getTasks({ status: 'NEXT' });
    setTasks(allTasks);
    // ... more fetching
  } catch (err) {
    // Manual error handling
  } finally {
    setLoading(false);
  }
};
```

## Benefits of React Query

1. **Automatic Caching:** Data fetched once is cached and reused
2. **Background Refetching:** Stale data refreshed automatically
3. **Deduplication:** Multiple components requesting same data = single API call
4. **Optimistic Updates:** UI updates immediately, rolls back on error
5. **Loading/Error States:** Built-in, no manual management
6. **Cache Invalidation:** Automatic cache updates after mutations
7. **Prefetching:** Preload data before navigation

---

## Implementation Tasks

### Task 1: Setup React Query Provider

**Objective:** Configure QueryClient and wrap app with QueryClientProvider

**Files to Modify:**
- `/Users/gberges/compass/frontend/src/App.tsx`
- `/Users/gberges/compass/frontend/src/lib/queryClient.ts` (new file)

**Steps:**

**Step 1: Create QueryClient configuration**

Create `/Users/gberges/compass/frontend/src/lib/queryClient.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Step 2: Wrap App with QueryClientProvider**

Update `/Users/gberges/compass/frontend/src/App.tsx`:

```typescript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './contexts/ToastContext';
// ... other imports

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              {/* ... routes */}
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Step 3: Install React Query DevTools**

```bash
cd /Users/gberges/compass/frontend
npm install @tanstack/react-query-devtools --save-dev
```

**Step 4: Commit**

```bash
git add src/App.tsx src/lib/queryClient.ts package.json package-lock.json
git commit -m "feat(react-query): setup QueryClient and provider

- Create QueryClient with optimized default options
- Wrap app with QueryClientProvider
- Add React Query DevTools for development
- Configure 5min stale time and 30min garbage collection"
```

---

### Task 2: Create React Query Hooks for Tasks API

**Objective:** Create custom hooks for all task-related queries and mutations

**Files to Create:**
- `/Users/gberges/compass/frontend/src/hooks/useTasks.ts`

**Steps:**

**Step 1: Create useTasks hook with queries**

Create `/Users/gberges/compass/frontend/src/hooks/useTasks.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Task, TaskFilters, EnrichTaskRequest, CompleteTaskRequest } from '../types';

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Queries

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.getTasks(filters),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
  });
}

// Mutations

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useScheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledStart }: { id: string; scheduledStart: string }) =>
      api.scheduleTask(id, scheduledStart),
    onMutate: async ({ id, scheduledStart }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));

      // Optimistically update
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), (old: Task[] = []) =>
        old.map((task) =>
          task.id === id ? { ...task, scheduledStart } : task
        )
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));

      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), (old: Task[] = []) =>
        old.map((task) =>
          task.id === id ? { ...task, scheduledStart: null } : task
        )
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useEnrichTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EnrichTaskRequest) => api.enrichTask(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useActivateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.activateTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CompleteTaskRequest }) =>
      api.completeTask(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useTasks.ts
git commit -m "feat(react-query): create task hooks with queries and mutations

- Add useTasks query hook with filter support
- Add useTask query hook for single task details
- Add mutation hooks for create, update, delete
- Add schedule/unschedule with optimistic updates
- Add enrich, activate, and complete task mutations
- Implement proper cache invalidation strategies"
```

---

### Task 3: Create React Query Hooks for Daily Plans

**Objective:** Create custom hooks for daily plan (Orient) queries and mutations

**Files to Create:**
- `/Users/gberges/compass/frontend/src/hooks/useDailyPlans.ts`

**Steps:**

**Step 1: Create useDailyPlans hook**

Create `/Users/gberges/compass/frontend/src/hooks/useDailyPlans.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { DailyPlan, CreateDailyPlanRequest, UpdateDailyPlanRequest } from '../types';

// Query Keys
export const dailyPlanKeys = {
  all: ['dailyPlans'] as const,
  today: () => [...dailyPlanKeys.all, 'today'] as const,
  byDate: (date: string) => [...dailyPlanKeys.all, 'date', date] as const,
};

// Queries

export function useTodayPlan() {
  return useQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: () => api.getTodayPlan(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useDailyPlan(date: string) {
  return useQuery({
    queryKey: dailyPlanKeys.byDate(date),
    queryFn: () => api.getPlanByDate(date),
    enabled: !!date,
  });
}

// Mutations

export function useCreateDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDailyPlanRequest) => api.createDailyPlan(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.today() });
      queryClient.setQueryData(dailyPlanKeys.byDate(data.date.toString().split('T')[0]), data);
    },
  });
}

export function useUpdateDailyPlanReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, request }: { planId: string; request: UpdateDailyPlanRequest }) =>
      api.updateDailyPlanReflection(planId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.all });
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/hooks/useDailyPlans.ts
git commit -m "feat(react-query): create daily plan hooks

- Add useTodayPlan query hook
- Add useDailyPlan query hook with date parameter
- Add useCreateDailyPlan mutation
- Add useUpdateDailyPlanReflection mutation
- Configure 10min stale time for plan data"
```

---

### Task 4: Create React Query Hooks for Reviews and Other APIs

**Objective:** Create hooks for reviews, todoist, and post-do logs

**Files to Create:**
- `/Users/gberges/compass/frontend/src/hooks/useReviews.ts`
- `/Users/gberges/compass/frontend/src/hooks/useTodoist.ts`
- `/Users/gberges/compass/frontend/src/hooks/usePostDoLogs.ts`

**Steps:**

**Step 1: Create useReviews hook**

Create `/Users/gberges/compass/frontend/src/hooks/useReviews.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Review, CreateReviewRequest } from '../types';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (type?: 'DAILY' | 'WEEKLY', limit?: number) =>
    [...reviewKeys.lists(), { type, limit }] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
};

export function useReviews(type?: 'DAILY' | 'WEEKLY', limit?: number) {
  return useQuery({
    queryKey: reviewKeys.list(type, limit),
    queryFn: () => api.getReviews(type, limit),
  });
}

export function useReview(id: string) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: () => api.getReview(id),
    enabled: !!id,
  });
}

export function useCreateDailyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateReviewRequest) => api.createDailyReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

export function useCreateWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateReviewRequest) => api.createWeeklyReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}
```

**Step 2: Create useTodoist hook**

Create `/Users/gberges/compass/frontend/src/hooks/useTodoist.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';

export const todoistKeys = {
  all: ['todoist'] as const,
  pending: () => [...todoistKeys.all, 'pending'] as const,
};

export function useTodoistPending() {
  return useQuery({
    queryKey: todoistKeys.pending(),
    queryFn: () => api.getTodoistPending(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useImportTodoistTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tasks: Array<{ name: string; due?: string }>) =>
      api.importTodoistTasks(tasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoistKeys.pending() });
    },
  });
}
```

**Step 3: Create usePostDoLogs hook**

Create `/Users/gberges/compass/frontend/src/hooks/usePostDoLogs.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

export const postDoLogKeys = {
  all: ['postDoLogs'] as const,
  lists: () => [...postDoLogKeys.all, 'list'] as const,
  list: (filters?: { startDate?: string; endDate?: string; category?: string }) =>
    [...postDoLogKeys.lists(), { filters }] as const,
};

export function usePostDoLogs(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: postDoLogKeys.list(filters),
    queryFn: () => api.getPostDoLogs(filters),
  });
}
```

**Step 4: Commit**

```bash
git add src/hooks/useReviews.ts src/hooks/useTodoist.ts src/hooks/usePostDoLogs.ts
git commit -m "feat(react-query): create review, todoist, and analytics hooks

- Add useReviews query with type and limit filters
- Add useReview query for single review
- Add daily/weekly review creation mutations
- Add useTodoistPending query hook
- Add useImportTodoistTasks mutation
- Add usePostDoLogs query for analytics data"
```

---

### Task 5: Refactor CalendarPage to Use React Query

**Objective:** Replace manual state management with React Query hooks in CalendarPage

**Files to Modify:**
- `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`

**Steps:**

**Step 1: Replace useEffect data fetching with React Query hooks**

Update `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`:

Replace this (lines 19-48):
```typescript
const [tasks, setTasks] = useState<Task[]>([]);
const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    const allTasks = await getTasks({ status: 'NEXT' });
    setTasks(allTasks);
    // ...
  } finally {
    setLoading(false);
  }
};
```

With this:
```typescript
import { useTasks } from '../hooks/useTasks';
import { useTodayPlan } from '../hooks/useDailyPlans';
import { useScheduleTask, useUnscheduleTask } from '../hooks/useTasks';

// Replace state with queries
const { data: tasks = [], isLoading: tasksLoading } = useTasks({ status: 'NEXT' });
const { data: todayPlan, isLoading: planLoading } = useTodayPlan();
const scheduleTaskMutation = useScheduleTask();
const unscheduleTaskMutation = useUnscheduleTask();

const loading = tasksLoading || planLoading;

// Compute derived data
const unscheduledTasks = tasks.filter((task) => !task.scheduledStart);
const scheduledTasks = tasks.filter((task) => task.scheduledStart);
```

**Step 2: Replace schedule/unschedule handlers with mutations**

Replace `handleScheduleTask` (lines 140-160):
```typescript
const handleScheduleTask = async (task: Task, scheduledStart: string) => {
  try {
    await scheduleTask(task.id, scheduledStart);
    fetchData(); // Manual refetch
    toast.showSuccess('Task scheduled successfully');
  } catch (err) {
    toast.showError('Failed to schedule task');
  }
};
```

With:
```typescript
const handleScheduleTask = async (task: Task, scheduledStart: string) => {
  try {
    await scheduleTaskMutation.mutateAsync({
      id: task.id,
      scheduledStart,
    });
    toast.showSuccess('Task scheduled successfully');
  } catch (err) {
    toast.showError('Failed to schedule task');
  }
};
```

Replace `handleUnscheduleTask` (lines 189-221):
```typescript
const handleUnscheduleTask = async (task: Task) => {
  if (unscheduling) return;

  try {
    setUnscheduling(true);
    await unscheduleTask(task.id);
    fetchData(); // Manual refetch
    setSelectedTask(null);
    toast.showSuccess('Task unscheduled successfully');
  } catch (err) {
    toast.showError('Failed to unschedule task');
  } finally {
    setUnscheduling(false);
  }
};
```

With:
```typescript
const handleUnscheduleTask = async (task: Task) => {
  if (unscheduleTaskMutation.isPending) return;

  try {
    await unscheduleTaskMutation.mutateAsync(task.id);
    setSelectedTask(null);
    toast.showSuccess('Task unscheduled successfully');
  } catch (err) {
    toast.showError('Failed to unschedule task');
  }
};
```

**Step 3: Update drag-drop handlers to use mutations**

Replace `handleEventDrop` (lines 223-277):
```typescript
const handleEventDrop = async ({ event, start, end }: { ... }) => {
  // ... validation

  try {
    setRescheduling(true);
    const scheduledStart = start.toISOString();
    await scheduleTask(event.task.id, scheduledStart);

    // Manual state updates
    setEvents((prev) => /* ... */);
    setTasks((prev) => /* ... */);

    toast.showSuccess('Task rescheduled successfully');
  } catch (err) {
    toast.showError('Failed to reschedule task');
    fetchData(); // Manual refetch on error
  } finally {
    setRescheduling(false);
  }
};
```

With:
```typescript
const handleEventDrop = async ({ event, start, end }: { ... }) => {
  // ... validation

  try {
    const scheduledStart = start.toISOString();
    await scheduleTaskMutation.mutateAsync({
      id: event.task.id,
      scheduledStart,
    });
    toast.showSuccess('Task rescheduled successfully');
  } catch (err) {
    toast.showError('Failed to reschedule task');
    // Optimistic update already rolled back by mutation
  }
};
```

**Step 4: Remove manual state variables**

Remove:
- `const [tasks, setTasks] = useState<Task[]>([]);`
- `const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);`
- `const [loading, setLoading] = useState(true);`
- `const [unscheduling, setUnscheduling] = useState(false);`
- `const [rescheduling, setRescheduling] = useState(false);`
- `const fetchData = async () => { ... }`

**Step 5: Update event generation to use query data**

The events array generation remains similar, but now uses data from React Query:

```typescript
const events = useMemo(() => {
  const taskEvents: CalendarEvent[] = scheduledTasks.map(/* ... */);
  const planEvents: CalendarEvent[] = todayPlan ? [/* ... */] : [];
  return [...taskEvents, ...planEvents];
}, [scheduledTasks, todayPlan]);
```

**Step 6: Update loading overlay to use mutation states**

Replace:
```typescript
{rescheduling && (
  <div className="...">Rescheduling task...</div>
)}
```

With:
```typescript
{scheduleTaskMutation.isPending && (
  <div className="...">Rescheduling task...</div>
)}
```

**Step 7: Commit**

```bash
git add src/pages/CalendarPage.tsx
git commit -m "refactor(calendar): migrate to React Query hooks

- Replace manual state with useTasks and useTodayPlan queries
- Replace schedule/unschedule with mutation hooks
- Remove manual loading states and fetchData function
- Leverage automatic cache invalidation
- Simplify drag-drop handlers with optimistic updates
- Remove redundant state management code"
```

---

### Task 6: Refactor Remaining Pages to Use React Query

**Objective:** Migrate all other pages to React Query hooks

**Files to Modify:**
- `/Users/gberges/compass/frontend/src/pages/TasksPage.tsx`
- `/Users/gberges/compass/frontend/src/pages/TodayPage.tsx`
- `/Users/gberges/compass/frontend/src/pages/ClarifyPage.tsx`
- `/Users/gberges/compass/frontend/src/pages/OrientEastPage.tsx`
- `/Users/gberges/compass/frontend/src/pages/OrientWestPage.tsx`
- `/Users/gberges/compass/frontend/src/pages/ReviewsPage.tsx`

**Steps:**

**Step 1: Refactor TasksPage**

In `/Users/gberges/compass/frontend/src/pages/TasksPage.tsx`:

Replace manual fetching with:
```typescript
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';

const TasksPage: React.FC = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // No more fetchData(), useEffect(), or manual state!
```

**Step 2: Refactor TodayPage**

In `/Users/gberges/compass/frontend/src/pages/TodayPage.tsx`:

```typescript
import { useTasks } from '../hooks/useTasks';
import { useTodayPlan } from '../hooks/useDailyPlans';

const TodayPage: React.FC = () => {
  const { data: activeTasks = [] } = useTasks({ status: 'ACTIVE' });
  const { data: nextTasks = [] } = useTasks({ status: 'NEXT' });
  const { data: todayPlan } = useTodayPlan();
```

**Step 3: Refactor ClarifyPage**

In `/Users/gberges/compass/frontend/src/pages/ClarifyPage.tsx`:

```typescript
import { useTodoistPending, useImportTodoistTasks } from '../hooks/useTodoist';
import { useEnrichTask } from '../hooks/useTasks';

const ClarifyPage: React.FC = () => {
  const { data: pendingData, isLoading } = useTodoistPending();
  const importMutation = useImportTodoistTasks();
  const enrichMutation = useEnrichTask();
```

**Step 4: Refactor Orient pages**

In `/Users/gberges/compass/frontend/src/pages/OrientEastPage.tsx`:

```typescript
import { useTasks } from '../hooks/useTasks';
import { useCreateDailyPlan } from '../hooks/useDailyPlans';

const OrientEastPage: React.FC = () => {
  const { data: nextTasks = [] } = useTasks({ status: 'NEXT' });
  const createPlanMutation = useCreateDailyPlan();
```

In `/Users/gberges/compass/frontend/src/pages/OrientWestPage.tsx`:

```typescript
import { useTodayPlan, useUpdateDailyPlanReflection } from '../hooks/useDailyPlans';

const OrientWestPage: React.FC = () => {
  const { data: todayPlan } = useTodayPlan();
  const updateReflectionMutation = useUpdateDailyPlanReflection();
```

**Step 5: Refactor ReviewsPage**

In `/Users/gberges/compass/frontend/src/pages/ReviewsPage.tsx`:

```typescript
import { useReviews, useCreateDailyReview, useCreateWeeklyReview } from '../hooks/useReviews';
import { usePostDoLogs } from '../hooks/usePostDoLogs';

const ReviewsPage: React.FC = () => {
  const { data: reviews = [] } = useReviews();
  const { data: postDoLogs = [] } = usePostDoLogs(/* filters */);
  const createDailyReviewMutation = useCreateDailyReview();
  const createWeeklyReviewMutation = useCreateWeeklyReview();
```

**Step 6: Commit each page separately**

```bash
# TasksPage
git add src/pages/TasksPage.tsx
git commit -m "refactor(tasks): migrate to React Query hooks"

# TodayPage
git add src/pages/TodayPage.tsx
git commit -m "refactor(today): migrate to React Query hooks"

# ClarifyPage
git add src/pages/ClarifyPage.tsx
git commit -m "refactor(clarify): migrate to React Query hooks"

# Orient pages
git add src/pages/OrientEastPage.tsx src/pages/OrientWestPage.tsx
git commit -m "refactor(orient): migrate to React Query hooks"

# ReviewsPage
git add src/pages/ReviewsPage.tsx
git commit -m "refactor(reviews): migrate to React Query hooks"
```

---

### Task 7: Testing and Performance Verification

**Objective:** Verify React Query implementation works correctly and improves performance

**Steps:**

**Step 1: Manual testing checklist**

Test each page:
- [ ] CalendarPage: Drag-drop reschedule works with optimistic updates
- [ ] CalendarPage: Unschedule button works and updates instantly
- [ ] TasksPage: Create/update/delete tasks work
- [ ] TodayPage: Active and next tasks load correctly
- [ ] ClarifyPage: Todoist import and task enrichment work
- [ ] OrientEastPage: Create daily plan works
- [ ] OrientWestPage: Update reflection works
- [ ] ReviewsPage: Reviews and analytics load correctly

**Step 2: Verify caching behavior**

1. Open React Query DevTools (bottom left icon)
2. Navigate to Calendar page
3. Check "tasks" and "dailyPlans" queries are cached
4. Navigate to Today page
5. Verify tasks are loaded from cache (no loading state)
6. Check network tab - no duplicate API calls

**Step 3: Test optimistic updates**

1. On Calendar, drag a task to new time
2. Verify task moves immediately (optimistic)
3. Disconnect network (DevTools → Network → Offline)
4. Try to drag task
5. Verify it rolls back to original position (error handling)

**Step 4: Test cache invalidation**

1. Create a new task on Tasks page
2. Navigate to Calendar page
3. Verify new task appears (cache invalidated)

**Step 5: Performance metrics**

Check browser console for:
- Reduced number of API calls
- Faster page transitions (cached data)
- No unnecessary re-renders

**Step 6: Document findings**

Create `/Users/gberges/compass/docs/react-query-migration-results.md` with:
- Performance improvements
- Bugs found and fixed
- Caching behavior observations

---

### Task 8: Cleanup and Documentation

**Objective:** Remove unused code and document React Query patterns

**Steps:**

**Step 1: Remove deprecated fetchData functions**

Search for and remove any remaining manual data fetching:
```bash
cd /Users/gberges/compass/frontend/src
grep -r "const fetchData = async" pages/
```

Remove any found instances.

**Step 2: Update component documentation**

Add JSDoc comments to hooks:
```typescript
/**
 * Query hook for fetching tasks with optional filters.
 * Data is cached for 5 minutes and automatically refetched on mount.
 *
 * @param filters - Optional filters for status, category, etc.
 * @returns Query result with tasks data, loading state, and error
 *
 * @example
 * const { data: tasks, isLoading } = useTasks({ status: 'NEXT' });
 */
export function useTasks(filters?: TaskFilters) {
  // ...
}
```

**Step 3: Create React Query guide**

Create `/Users/gberges/compass/docs/react-query-guide.md`:

```markdown
# React Query Usage Guide

## Query Keys

All query keys follow a hierarchical structure:
- `['tasks']` - All task-related queries
- `['tasks', 'list']` - All task list queries
- `['tasks', 'list', { filters }]` - Specific filtered list
- `['tasks', 'detail', id]` - Individual task

## Common Patterns

### Fetching Data
\`\`\`typescript
const { data, isLoading, error } = useTasks({ status: 'NEXT' });
\`\`\`

### Mutations
\`\`\`typescript
const mutation = useCreateTask();
await mutation.mutateAsync(newTask);
\`\`\`

### Optimistic Updates
Handled automatically in schedule/unschedule mutations.

## Cache Invalidation

Mutations automatically invalidate related queries:
- `createTask` → invalidates all task lists
- `updateTask` → invalidates specific task + all lists
- `deleteTask` → invalidates all task lists

## Stale Times

- Tasks: 5 minutes
- Daily Plans: 10 minutes
- Todoist: 2 minutes
- Reviews: 5 minutes
```

**Step 4: Final commit**

```bash
git add docs/react-query-guide.md docs/react-query-migration-results.md
git commit -m "docs: add React Query usage guide and migration results"
```

---

## Summary

This plan will:

1. ✅ Setup React Query with optimized configuration
2. ✅ Create custom hooks for all API endpoints
3. ✅ Implement optimistic updates for critical mutations
4. ✅ Replace manual state management across all pages
5. ✅ Add proper cache invalidation strategies
6. ✅ Improve app performance with intelligent caching
7. ✅ Reduce code complexity and boilerplate
8. ✅ Add development tools for debugging queries

**Estimated Completion Time:** 4-6 hours

**Benefits:**
- 🚀 Faster page transitions (cached data)
- 📉 Reduced API calls (deduplication)
- ✨ Better UX (optimistic updates)
- 🧹 Cleaner code (less boilerplate)
- 🐛 Easier debugging (DevTools)
- 🔄 Automatic background refetching
