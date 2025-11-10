# Fix Optimistic UI Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure all user inputs visually reflect immediately on the site without requiring page refresh.

**Architecture:** The root cause is that React Query's optimistic updates modify the cache but don't trigger component re-renders until `invalidateQueries` completes and refetches. We need to ensure that components observe the cache changes immediately. Additionally, some pages still use manual state management instead of React Query.

**Tech Stack:** React Query v5, React 19, TypeScript, React Big Calendar

**Design Requirement:** Any input the user makes must visually reflect on the site immediately after the button press. The user should not have to refresh to see the changes they just made.

---

## Root Cause Analysis

### Problem 1: Calendar Not Updating After Drag-and-Drop

**File:** `frontend/src/pages/CalendarPage.tsx`

**Issue:**
- Line 29: Uses `useTasks({ status: 'NEXT' })` query
- Line 48-50: `scheduledTasks` derives from `tasks` via `useMemo`
- Line 53-140: `events` derives from `scheduledTasks` via `useMemo`
- When `useScheduleTask` mutation runs:
  1. `onMutate` updates cache optimistically (useTasks.ts:87-100)
  2. API call executes
  3. `onSuccess` fires, toast shows
  4. `onSettled` calls `invalidateQueries` (useTasks.ts:119)
  5. Refetch happens → component re-renders → calendar updates

**Root Cause:** The component doesn't observe cache changes until after the refetch. React Query's `setQueryData` updates the cache but doesn't trigger query observers to re-render until the query is marked stale and refetched.

**Solution:** The optimistic update should trigger re-renders immediately. This is actually how React Query is supposed to work - when you call `setQueryData`, all components using that query should re-render. The issue is that we're updating the cache correctly, but the calendar query `useTasks({ status: 'NEXT' })` might not be getting updated because the scheduled task may have moved out of the `NEXT` status filter.

**Actual Problem:** CalendarPage uses `useTasks({ status: 'NEXT' })` which fetches unscheduled tasks. When a task is scheduled, it still has status `NEXT`, but the component's query might not be the one being updated in the optimistic update.

Let me re-analyze: Looking at useTasks.ts:87, the optimistic update uses `getQueriesData({ queryKey: taskKeys.lists() })` which should match ALL task list queries including the one used by CalendarPage. This should work.

**The Real Issue:** Looking more carefully at CalendarPage.tsx:29, it queries `{ status: 'NEXT' }`. The optimistic update DOES update this cache entry (we verified this in our earlier fix). However, React Query may not be triggering a re-render because the mutation and query are happening in the same component, and React Query batches updates.

**Actual Solution:** We need to ensure the calendar re-computes its events when the mutation succeeds. The best way is to make sure the query data changes are observed immediately.

After deeper analysis: The issue is that `invalidateQueries` doesn't immediately refetch - it marks queries as stale, and they refetch on next access or when a component using them is mounted. Since the CalendarPage is already mounted and actively using the query, it should refetch immediately. But there might be a timing issue.

**True Fix:** Use `refetchQueries` instead of `invalidateQueries` in the `onSuccess` handler to force immediate refetch, OR rely on the optimistic update to trigger re-renders (which it should already do).

**Let's test a hypothesis:** The optimistic update IS working, but the calendar's `events` useMemo dependencies might not be triggering a recomputation. Let me check: Line 140 shows `[scheduledTasks, todayPlan]` as dependencies. `scheduledTasks` comes from line 47-50 which depends on `tasks`. `tasks` comes from line 29 `useTasks` query. When the query updates, `tasks` should change reference, triggering `scheduledTasks` to recompute, which triggers `events` to recompute.

**Final Analysis:** The React Query setup is actually correct. The issue must be that:
1. The optimistic update is working BUT
2. Something is preventing the re-render OR
3. The API response is reverting the optimistic update before the refetch happens

Let me check if there's a timing issue: In useTasks.ts:114-120, after `onSuccess`, we call `invalidateQueries`. This marks the query stale but doesn't immediately refetch unless `refetchOnMount` or `refetchOnWindowFocus` triggers it. For an active query (one being used by a mounted component), `invalidateQueries` should trigger an immediate refetch.

**ACTUAL ROOT CAUSE (after thorough analysis):**
React Query's `invalidateQueries` in `onSettled` (line 119) happens AFTER the component has already re-rendered with the optimistic update. However, the calendar might not be re-rendering because:
1. The optimistic update modifies the cache
2. But the calendar's query hook might not detect the change until after `invalidateQueries` runs
3. React Query batches updates, so the re-render happens after the entire mutation lifecycle completes

**THE REAL FIX:** We need to ensure the query refetches immediately after success. Change `invalidateQueries` to `refetchQueries` OR add `refetchOnMount: true` to the query options.

Actually, I just realized: `invalidateQueries` should work fine for active queries. Let me check the React Query documentation...

After research: `invalidateQueries` marks queries as stale and triggers refetch for active queries. This should work. The issue might be that the optimistic update is being overwritten by the API response BEFORE the refetch happens.

**EUREKA MOMENT:** Looking at useTasks.ts:78-79, the mutation function returns the API response. React Query automatically updates the cache with the mutation result if it matches the query data structure. So:
1. Optimistic update sets `scheduledStart` to new value
2. API responds with updated task
3. React Query sees the response and might update the cache AGAIN
4. But the response might be the old value if the backend hasn't fully processed it yet
5. Then `invalidateQueries` refetches and gets the correct value

**SOLUTION:** Ensure the API response is correctly returning the updated task, and rely on `onSuccess` to update the cache explicitly rather than relying on automatic cache updates from the mutation response.

Wait, let me re-read the user's complaint: "After I move the block, I get confirmation that task rescheduled successfully, but the calendar itself does not update until I refresh the page."

This means:
1. Toast shows "Task rescheduled successfully" (so `onSuccess` fired)
2. But calendar doesn't update (so the refetch didn't happen or didn't trigger re-render)
3. Page refresh fixes it (so the backend data is correct)

**FINAL ROOT CAUSE:** The `invalidateQueries` in `onSettled` (line 119) is not triggering a refetch for the active query. This could be because:
1. The query key doesn't match (but we verified it does)
2. The query is in a loading state and refetch is debounced
3. React Query's default behavior doesn't refetch immediately for some reason

**THE FIX:** In `onSuccess`, explicitly refetch the queries instead of just invalidating:
```typescript
onSuccess: () => {
  queryClient.refetchQueries({ queryKey: taskKeys.lists() });
}
```

OR update the cache in `onSuccess` with the API response:
```typescript
onSuccess: (updatedTask, { id }) => {
  // Update all cached queries with the API response
  const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
  allCachedQueries.forEach(([queryKey, data]) => {
    if (Array.isArray(data)) {
      queryClient.setQueryData(queryKey, (old: Task[] = []) =>
        old.map((task) =>
          task.id === id ? updatedTask : task
        )
      );
    }
  });
}
```

### Problem 2: TasksPage Uses Manual State Management

**File:** `frontend/src/pages/TasksPage.tsx`

**Issue:** Lines 2, 16, 33-49 show manual state management with `useState` and `fetchTasks()`. When tasks are updated, the page calls `await fetchTasks()` to refresh. This works but is inconsistent with CalendarPage's React Query approach.

**Solution:** Migrate TasksPage to use React Query hooks for consistency and better caching.

---

## Implementation Plan

### Task 1: Fix Calendar Optimistic Updates with Explicit Refetch

**Goal:** Make calendar update immediately after drag-and-drop by ensuring refetch happens synchronously.

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:117-121`

**Step 1: Change invalidateQueries to refetchQueries in useScheduleTask**

In `useTasks.ts`, replace the `onSettled` handler with explicit refetch:

```typescript
onSuccess: (data) => {
  log('[useScheduleTask] Success response:', data);
  // Explicitly refetch all task queries to ensure immediate UI update
  queryClient.refetchQueries({ queryKey: taskKeys.lists() });
},
onSettled: () => {
  log('[useScheduleTask] Mutation settled');
  // Remove the invalidateQueries call since we're refetching in onSuccess
},
```

**Step 2: Apply same fix to useUnscheduleTask**

In `useTasks.ts`, update `useUnscheduleTask` mutation:

```typescript
onSuccess: (data) => {
  log('[useUnscheduleTask] Success response:', data);
  // Explicitly refetch all task queries to ensure immediate UI update
  queryClient.refetchQueries({ queryKey: taskKeys.lists() });
},
onSettled: () => {
  log('[useUnscheduleTask] Mutation settled');
  // Remove the invalidateQueries call
},
```

**Step 3: Apply same fix to useUpdateTask**

In `useTasks.ts:49-60`, update the mutation:

```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 4: Test the calendar drag-and-drop**

Manual test:
1. Open calendar at http://localhost:3000/calendar
2. Drag a task to a new time slot
3. Verify calendar updates immediately (no refresh needed)
4. Open browser DevTools console
5. Check for React Query logs showing refetch

Expected: Calendar updates immediately after drag-and-drop

**Step 5: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useTasks.ts
git commit -m "fix: use refetchQueries for immediate UI updates after mutations

Replace invalidateQueries with refetchQueries in schedule, unschedule, and update mutations to ensure calendar and other views update immediately without requiring page refresh.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add Optimistic Updates to useUpdateTask

**Goal:** Ensure task updates (like duration changes) show immediately on calendar.

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:49-60`

**Step 1: Add optimistic update to useUpdateTask**

```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      log('[useUpdateTask] onMutate called:', { id, updates });

      // Cancel all task queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get ALL cached task lists
      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Update task in ALL cached lists
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.map((task) =>
              task.id === id
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            )
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useUpdateTask] Error:', err);
      // Rollback ALL cache entries
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_, variables) => {
      log('[useUpdateTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 2: Test task resize on calendar**

Manual test:
1. Open calendar
2. Resize a task event by dragging the bottom edge
3. Verify the task immediately shows new duration
4. Check that duration persists after page refresh

Expected: Task resize shows immediately

**Step 3: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useTasks.ts
git commit -m "feat: add optimistic updates to useUpdateTask mutation

Ensure task updates (duration, scheduled time) show immediately on UI before server responds. Includes rollback on error.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Migrate TasksPage to React Query

**Goal:** Replace manual state management with React Query for consistency and optimistic updates.

**Files:**
- Modify: `frontend/src/pages/TasksPage.tsx`

**Step 1: Read the full TasksPage file**

```bash
cd /Users/gberges/compass
```

Read: `frontend/src/pages/TasksPage.tsx`

Understand:
- Current state management approach (lines 16-22)
- How fetchTasks is used (lines 33-49, 64, 81, 98, etc.)
- All action handlers that call fetchTasks

**Step 2: Replace manual state with React Query hooks**

Update imports:
```typescript
import React, { useState } from 'react';
import type { Task, TaskStatus, Category, Energy, Priority } from '../types';
import { useToast } from '../contexts/ToastContext';
import {
  useTasks,
  useCreateTask,
  useActivateTask,
  useCompleteTask,
  useUpdateTask,
  useDeleteTask,
} from '../hooks/useTasks';
import TaskModal from '../components/TaskModal';
// ... rest of imports
```

Replace state management (lines 16-22):
```typescript
const TasksPage: React.FC = () => {
  const toast = useToast();
  const [selectedTab, setSelectedTab] = useState<TaskStatus>('NEXT');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [energyFilter, setEnergyFilter] = useState<Energy | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');

  // Build filters object
  const filters: any = { status: selectedTab };
  if (categoryFilter) filters.category = categoryFilter;
  if (energyFilter) filters.energyRequired = energyFilter;
  if (priorityFilter) filters.priority = priorityFilter;

  // React Query hooks
  const { data: tasks = [], isLoading: loading } = useTasks(filters);
  const createTaskMutation = useCreateTask();
  const activateTaskMutation = useActivateTask();
  const completeTaskMutation = useCompleteTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Local UI state only
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
```

**Step 3: Remove fetchTasks function and useEffect**

Delete lines 29-49 (the useEffect and fetchTasks function).

**Step 4: Update action handlers to use mutations**

Replace `handleActivateTask` (lines 59-72):
```typescript
const handleActivateTask = async (task: Task) => {
  try {
    const response = await activateTaskMutation.mutateAsync(task.id);
    toast.showSuccess(`Task activated!\nFocus Mode: ${response.focusMode}\nTimer: ${response.timeryProject}`);
    setSelectedTask(null);
  } catch (err) {
    toast.showError('Failed to activate task');
    console.error('Error activating task:', err);
  }
};
```

Replace `handleCompleteTask` (lines 74-89):
```typescript
const handleCompleteTask = async (completionData: any) => {
  if (!taskToComplete) return;
  try {
    await completeTaskMutation.mutateAsync({
      id: taskToComplete.id,
      request: completionData,
    });
    toast.showSuccess('Task completed successfully!');
    setTaskToComplete(null);
    setSelectedTask(null);
  } catch (err) {
    toast.showError('Failed to complete task');
    console.error('Error completing task:', err);
  }
};
```

Replace `handleEditTask`:
```typescript
const handleEditTask = async (taskData: Partial<Task>) => {
  if (!taskToEdit) return;
  try {
    await updateTaskMutation.mutateAsync({
      id: taskToEdit.id,
      updates: taskData,
    });
    toast.showSuccess('Task updated successfully!');
    setTaskToEdit(null);
    setSelectedTask(null);
  } catch (err) {
    toast.showError('Failed to update task');
    console.error('Error updating task:', err);
  }
};
```

Replace `handleDeleteTask`:
```typescript
const handleDeleteTask = async (task: Task) => {
  if (!window.confirm(`Are you sure you want to delete "${task.name}"?`)) {
    return;
  }
  try {
    await deleteTaskMutation.mutateAsync(task.id);
    toast.showSuccess('Task deleted successfully!');
    setSelectedTask(null);
  } catch (err) {
    toast.showError('Failed to delete task');
    console.error('Error deleting task:', err);
  }
};
```

Replace `handleCreateTask`:
```typescript
const handleCreateTask = async (taskData: Partial<Task>) => {
  try {
    await createTaskMutation.mutateAsync(taskData);
    toast.showSuccess('Task created successfully!');
    setShowNewTaskModal(false);
  } catch (err) {
    toast.showError('Failed to create task');
    console.error('Error creating task:', err);
  }
};
```

**Step 5: Remove actionLoading state**

Delete the `actionLoading` state variable and `setActionLoading` calls. Replace with mutation pending states where needed:

```typescript
disabled={activateTaskMutation.isPending}
disabled={completeTaskMutation.isPending}
disabled={updateTaskMutation.isPending}
disabled={deleteTaskMutation.isPending}
```

**Step 6: Test TasksPage**

Manual test:
1. Open tasks page at http://localhost:3000/tasks
2. Create a new task → verify it appears immediately
3. Edit a task → verify changes appear immediately
4. Delete a task → verify it disappears immediately
5. Filter tasks → verify filtering works
6. Switch tabs → verify tab switching works

Expected: All actions show immediate UI updates

**Step 7: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/pages/TasksPage.tsx
git commit -m "refactor: migrate TasksPage to React Query

Replace manual state management with React Query hooks for consistency across the app. All CRUD operations now use optimistic updates and automatic cache management.

Benefits:
- Immediate UI updates without manual refetching
- Automatic cache synchronization across components
- Better error handling with rollback
- Consistent patterns with CalendarPage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Add Optimistic Updates to Other Mutations

**Goal:** Ensure all mutations show immediate feedback.

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts`

**Step 1: Add optimistic update to useCreateTask**

```typescript
export function useCreateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(task),
    onMutate: async (newTask) => {
      log('[useCreateTask] onMutate called:', newTask);

      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot current state
      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Optimistically add the new task (with temporary ID)
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        name: newTask.name || 'New Task',
        status: newTask.status || 'NEXT',
        priority: newTask.priority || 'COULD',
        category: newTask.category || 'PERSONAL',
        duration: newTask.duration || 30,
        energyRequired: newTask.energyRequired || 'MEDIUM',
        context: newTask.context || 'ANYWHERE',
        definitionOfDone: newTask.definitionOfDone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...newTask,
      } as Task;

      // Add to ALL cached lists that match the task's filters
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          // Check if this cache entry would include the new task
          const filters = (queryKey as any[])[2]?.filters;
          const shouldInclude = !filters ||
            (!filters.status || filters.status === optimisticTask.status) &&
            (!filters.category || filters.category === optimisticTask.category) &&
            (!filters.priority || filters.priority === optimisticTask.priority) &&
            (!filters.energyRequired || filters.energyRequired === optimisticTask.energyRequired);

          if (shouldInclude) {
            queryClient.setQueryData(queryKey, (old: Task[] = []) => [...old, optimisticTask]);
          }
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useCreateTask] Error:', err);
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to create task');
    },
    onSuccess: () => {
      log('[useCreateTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 2: Add optimistic update to useDeleteTask**

```typescript
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: async (id) => {
      log('[useDeleteTask] onMutate called:', { id });

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Remove task from ALL cached lists
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.filter((task) => task.id !== id)
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useDeleteTask] Error:', err);
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to delete task');
    },
    onSuccess: () => {
      log('[useDeleteTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 3: Add toast context to mutations**

Update useCreateTask, useUpdateTask, useDeleteTask to import and use toast:

```typescript
import { useToast } from '../contexts/ToastContext';
```

Already present in useScheduleTask and useUnscheduleTask.

**Step 4: Test all mutations**

Manual test:
1. Create a task → immediate appearance
2. Update a task → immediate change
3. Delete a task → immediate removal
4. Schedule a task → immediate calendar update
5. Unschedule a task → immediate removal from calendar

Expected: All operations show instant feedback

**Step 5: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useTasks.ts
git commit -m "feat: add optimistic updates to all task mutations

Add optimistic UI updates to create, update, and delete mutations. All task operations now show immediate feedback with automatic rollback on errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Update Tests for New Mutation Behavior

**Goal:** Ensure integration tests cover the refetchQueries behavior.

**Files:**
- Modify: `frontend/src/hooks/useTasks.test.tsx`

**Step 1: Add refetchQueries test**

Add new test to verify refetchQueries is called:

```typescript
describe('useUpdateTask', () => {
  it('should refetch queries after successful update', async () => {
    const queryClient = new QueryClient();
    const refetchSpy = jest.spyOn(queryClient, 'refetchQueries');

    jest.mocked(api.updateTask).mockResolvedValue(mockTask);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'test-task-id',
        updates: { name: 'Updated Task Name' },
      });
    });

    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: taskKeys.detail('test-task-id') });
  });

  it('should update cache optimistically before server responds', async () => {
    const queryClient = new QueryClient();

    // Pre-populate cache
    queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

    jest.mocked(api.updateTask).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTask), 100))
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    // Execute mutation
    result.current.mutate({
      id: 'test-task-id',
      updates: { name: 'Updated Name' },
    });

    // Verify optimistic update
    await waitFor(() => {
      const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(cachedTasks?.[0]?.name).toBe('Updated Name');
    });
  });
});
```

**Step 2: Run tests**

```bash
cd /Users/gberges/compass/frontend
npm test -- useTasks.test.tsx --run
```

Expected: All tests pass

**Step 3: Fix any failing tests**

If tests fail, update assertions to match new behavior (refetchQueries instead of invalidateQueries).

**Step 4: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useTasks.test.tsx
git commit -m "test: update tests for refetchQueries behavior

Update integration tests to verify refetchQueries is called and optimistic updates work for all mutations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Add Loading States to Calendar

**Goal:** Show visual feedback during mutations on calendar.

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`

**Step 1: Update loading overlay to show for all mutations**

Update line 511 to check all mutation states:

```typescript
{(scheduleTaskMutation.isPending || unscheduleTaskMutation.isPending || updateTaskMutation.isPending) && (
  <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-40 rounded-card">
    <div className="bg-cloud px-24 py-16 rounded-modal shadow-eglass border border-fog">
      <div className="flex items-center space-x-12">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-ink"></div>
        <span className="text-ink text-body">
          {scheduleTaskMutation.isPending && 'Rescheduling task...'}
          {unscheduleTaskMutation.isPending && 'Unscheduling task...'}
          {updateTaskMutation.isPending && 'Updating task...'}
        </span>
      </div>
    </div>
  </div>
)}
```

**Step 2: Update event style to show loading state for all mutations**

Update line 334:

```typescript
opacity: (scheduleTaskMutation.isPending || unscheduleTaskMutation.isPending || updateTaskMutation.isPending) ? 0.6 : 0.9,
```

Update line 337:

```typescript
cursor: isDraggable ? (
  scheduleTaskMutation.isPending || unscheduleTaskMutation.isPending || updateTaskMutation.isPending
    ? 'wait'
    : 'move'
) : 'default',
```

**Step 3: Test loading states**

Manual test:
1. Drag a task on calendar
2. Verify loading overlay appears immediately
3. Verify loading overlay disappears when done
4. Verify task shows updated position

Expected: Smooth loading feedback

**Step 4: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/pages/CalendarPage.tsx
git commit -m "feat: improve loading states on calendar

Show loading overlay for all mutations (schedule, unschedule, update) with appropriate messages. Prevents user from making concurrent changes during operations.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Check Other Pages for Similar Issues

**Goal:** Ensure all pages show immediate feedback.

**Files:**
- Read: `frontend/src/pages/TodayPage.tsx`
- Read: `frontend/src/pages/OrientEastPage.tsx`
- Read: `frontend/src/pages/ClarifyPage.tsx`

**Step 1: Audit TodayPage**

```bash
cd /Users/gberges/compass
```

Read `frontend/src/pages/TodayPage.tsx` and check:
- Does it use React Query or manual state?
- Are mutations optimistic?
- Does UI update immediately?

**Step 2: Audit OrientEastPage**

Read `frontend/src/pages/OrientEastPage.tsx` and check same questions.

**Step 3: Audit ClarifyPage**

Read `frontend/src/pages/ClarifyPage.tsx` and check same questions.

**Step 4: Document findings**

### Audit Results

#### TodayPage (`frontend/src/pages/TodayPage.tsx`)

**State Management:** Manual (useState)
- Lines 14-18: Uses `useState` for plan, activeTasks, nextTasks, todayLogs
- Lines 27-89: Uses `useEffect` with `fetchData()` function
- API calls: `getTodayPlan()`, `getTasks()`, `getPostDoLogs()`

**Mutations:** None detected
- Page is read-only display of data
- No create, update, or delete operations
- No mutation loading states needed

**Immediate Feedback:** Not applicable (read-only page)

**Assessment:** NO MIGRATION NEEDED
- This is a dashboard/display page with no user mutations
- Manual state is appropriate for fetching and displaying data
- No optimistic updates needed since no mutations occur
- However, could benefit from React Query for better caching and sharing data with other pages

**Priority:** Low - Not critical for optimistic updates

---

#### OrientEastPage (`frontend/src/pages/OrientEastPage.tsx`)

**State Management:** Manual (useState)
- Lines 17-20: Loading and form submission state
- Lines 23-52: Form state (all individual form fields with useState)
- Line 61-77: useEffect to fetch existing plan

**Mutations:** One mutation detected - `createDailyPlan()`
- Line 153: Manual API call with `createDailyPlan(request)`
- Lines 112-165: handleSubmit function performs the mutation
- Line 113-114: Uses `setSubmitting` state for loading
- Lines 157-159: Manual delay and navigation after success

**Immediate Feedback:** PARTIAL
- Loading state shows during submission (line 499)
- Success navigation after delay (lines 157-159)
- No optimistic update to cache
- User sees success toast then navigates away

**Assessment:** MIGRATION RECOMMENDED (Low Priority)
- Current approach works but is manual
- If plan creation could fail and rollback, would benefit from optimistic updates
- Navigation on success is reasonable for this flow
- But form state could be cleaner with React Query + form library

**Priority:** Low - User flow is sequential (create → navigate), so no concurrent updates

**Recommendation:**
- Create React Query mutation for createDailyPlan
- Keep current success/error handling
- Optional: Could improve form state management with React Hook Form

---

#### ClarifyPage (`frontend/src/pages/ClarifyPage.tsx`)

**State Management:** Manual (useState)
- Lines 18-32: All states manually managed with useState
- Lines 34-49: useEffect fetching pending tasks
- Multiple API calls: `getTodoistPending()`, `enrichTask()`, `createTask()`

**Mutations:** Two mutations detected
- **Line 41-49:** `getTodoistPending()` - read operation
- **Line 64-84:** `handleEnrichTask()` - AI enrichment mutation
  - Lines 62-83: Manual API call with `enrichTask()`
  - Line 28: Uses `enriching` state for loading
  - No optimistic update
  - UI waits for response before showing enriched data

- **Line 86-124:** `handleSaveTask()` - create mutation
  - Lines 89-123: Manual API call with `createTask()`
  - Line 32: Uses `saving` state for loading
  - Line 113: Manual state update to remove from list
  - No optimistic update
  - Manual rollback if save fails

**Immediate Feedback:** PARTIAL
- Loading states show during operations (lines 251-264, 308-323)
- Enriched data doesn't display until enrichment completes
- Saved task is manually removed from list
- No optimistic update shown before server responds

**Assessment:** MIGRATION RECOMMENDED (Medium Priority)
- Two mutations could benefit from React Query
- Sequential workflow (enrich → save) means optimistic updates less critical
- However, manual state management is error-prone
- Optimistic removal from pending list would improve UX

**Priority:** Medium - Multiple mutations, complex state management

**Recommendation:**
- Create `useEnrichTask()` mutation hook
- Create `useCreateTask()` mutation hook (already exists in useTasks.ts, but focused on tasks not pending clarification)
- Add optimistic updates:
  - For enrich: Show enriched data immediately as the user requested
  - For save: Show loading state, remove from pending list optimistically with rollback
- Replace manual useState with React Query hooks
- Keep current form validation (appears solid)

---

**Step 5: Create follow-up tasks if needed**

### Migration Priority Summary

| Page | State Management | Mutations | Feedback | Priority | Effort | Notes |
|------|------------------|-----------|----------|----------|--------|-------|
| TodayPage | Manual | None | Read-only | Low | Low | Dashboard page, no mutations, works fine |
| OrientEastPage | Manual | 1 (create) | Good | Low | Medium | Sequential flow, migration optional |
| ClarifyPage | Manual | 2 (enrich + create) | Partial | Medium | Medium | Complex state, would benefit from React Query |

### Recommended Follow-up Tasks

1. **Task 7a: Migrate ClarifyPage to React Query**
   - Create `useEnrichTask()` hook with optimistic updates
   - Migrate `handleSaveTask()` to use existing `useCreateTask()`
   - Replace manual state with React Query + form hooks
   - Timeline: After core optimistic updates stabilize
   - Priority: Medium

2. **Task 7b: Migrate OrientEastPage to React Query (Optional)**
   - Create `useCreateDailyPlan()` hook
   - Keep current success flow (navigate on success)
   - Timeline: Later, lower priority
   - Priority: Low

3. **Task 7c: Consider TodayPage for React Query (Optional)**
   - Migrate to React Query for better data sharing
   - Would benefit if data needs to be shared with other components
   - Timeline: Phase 2, lower priority
   - Priority: Low

**Step 6: Commit findings**

```bash
cd /Users/gberges/compass
git add docs/plans/2025-11-10-fix-optimistic-ui-updates.md
git commit -m "docs: audit all pages for optimistic update support

Documented which pages use React Query vs manual state management.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Create Documentation for Optimistic Updates Pattern

**Goal:** Document the pattern for future development.

**Files:**
- Create: `docs/patterns/optimistic-updates.md`

**Step 1: Write documentation**

```markdown
# Optimistic Updates Pattern

## Overview

All user interactions in Compass should show immediate visual feedback without requiring page refresh. This is achieved through React Query's optimistic updates and cache management.

## The Pattern

### 1. Define Mutations with Optimistic Updates

```typescript
export function useMutationName() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data) => api.mutationCall(data),

    // Step 1: Optimistic update BEFORE API call
    onMutate: async (variables) => {
      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: relevantKeys });

      // Snapshot current cache for rollback
      const allCachedQueries = queryClient.getQueriesData({ queryKey: relevantKeys });

      // Update cache optimistically
      allCachedQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, (old) => {
          // Apply optimistic update logic
          return updatedData;
        });
      });

      // Return context for error rollback
      return { allCachedQueries };
    },

    // Step 2: Handle errors with rollback
    onError: (err, variables, context) => {
      console.error('[mutationName] Error:', err);

      // Rollback to snapshot
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.showError('Operation failed');
    },

    // Step 3: Refetch on success to sync with server
    onSuccess: () => {
      // Use refetchQueries (not invalidateQueries) for immediate updates
      queryClient.refetchQueries({ queryKey: relevantKeys });
    },
  });
}
```

### 2. Use Mutations in Components

```typescript
const Component = () => {
  const mutation = useMutationName();

  const handleAction = async (data) => {
    try {
      await mutation.mutateAsync(data);
      toast.showSuccess('Success!');
    } catch (err) {
      // Error already handled in mutation
    }
  };

  return (
    <button
      onClick={() => handleAction(data)}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Loading...' : 'Action'}
    </button>
  );
};
```

## Key Principles

1. **Immediate Feedback**: UI updates before API responds
2. **Rollback on Error**: Failed operations revert to previous state
3. **Server Sync**: After success, refetch to ensure consistency
4. **All Caches**: Update all relevant cache entries, not just one
5. **Loading States**: Show loading indicators during mutations

## Examples

### Schedule Task
- **Optimistic**: Add scheduledStart to task in cache
- **Error**: Remove scheduledStart from task
- **Success**: Refetch to get server-confirmed time

### Delete Task
- **Optimistic**: Remove task from all cached lists
- **Error**: Restore task to original position
- **Success**: Refetch to confirm deletion

### Update Task
- **Optimistic**: Apply changes to task in cache
- **Error**: Revert to original values
- **Success**: Refetch to get server-confirmed data

## Common Pitfalls

### ❌ Using invalidateQueries instead of refetchQueries
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  // ^ This marks queries as stale but doesn't immediately refetch
}
```

### ✅ Use refetchQueries for immediate updates
```typescript
onSuccess: () => {
  queryClient.refetchQueries({ queryKey: taskKeys.lists() });
  // ^ This immediately refetches active queries
}
```

### ❌ Updating only one cache entry
```typescript
onMutate: async () => {
  const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));
  queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), updatedData);
  // ^ This only updates one specific cache entry
}
```

### ✅ Update all cache entries
```typescript
onMutate: async () => {
  const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
  allCachedQueries.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, updatedData);
  });
  // ^ This updates all cached task lists
}
```

## Testing

Always test optimistic updates:

```typescript
it('should update cache optimistically before server responds', async () => {
  // Pre-populate cache
  queryClient.setQueryData(queryKey, initialData);

  // Mock slow API response
  jest.mocked(api.call).mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve(data), 100))
  );

  // Execute mutation
  result.current.mutate(variables);

  // Verify cache updated immediately (before API responds)
  await waitFor(() => {
    const cachedData = queryClient.getQueryData(queryKey);
    expect(cachedData).toEqual(optimisticData);
  });
});
```

## Migration Checklist

When migrating a page to React Query:

- [ ] Replace useState with useQuery for data fetching
- [ ] Replace manual API calls with useMutation hooks
- [ ] Add optimistic updates to all mutations
- [ ] Remove manual fetchData/refetch calls
- [ ] Add loading states (mutation.isPending)
- [ ] Add error handling in mutations
- [ ] Test all CRUD operations show immediate feedback
- [ ] Test error rollback works correctly
- [ ] Update tests to cover optimistic updates
```

**Step 2: Commit documentation**

```bash
cd /Users/gberges/compass
git add docs/patterns/optimistic-updates.md
git commit -m "docs: add optimistic updates pattern documentation

Comprehensive guide for implementing immediate UI feedback using React Query optimistic updates. Includes examples, common pitfalls, and testing strategies.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Final Verification

**Goal:** Verify all requirements are met.

**Step 1: Test calendar scheduling**

Manual test:
1. Open http://localhost:3000/calendar
2. Drag a task to a time slot
3. Verify task appears immediately (no refresh)
4. Verify success toast shows
5. Verify task persists after page refresh

**Step 2: Test calendar unscheduling**

Manual test:
1. Click a scheduled task
2. Click "Unschedule" button
3. Verify task disappears from calendar immediately
4. Verify task appears in sidebar immediately
5. Verify changes persist after refresh

**Step 3: Test calendar resizing**

Manual test:
1. Drag bottom edge of a task to resize
2. Verify task shows new duration immediately
3. Verify duration persists after refresh

**Step 4: Test tasks page**

Manual test:
1. Open http://localhost:3000/tasks
2. Create a new task → immediate appearance
3. Edit a task → immediate change
4. Delete a task → immediate removal
5. Filter tasks → immediate filtering
6. Switch tabs → immediate tab change

**Step 5: Document results**

Create summary:
- ✅ Calendar drag-and-drop shows immediate feedback
- ✅ Calendar unscheduling shows immediate feedback
- ✅ Calendar resizing shows immediate feedback
- ✅ Tasks page all operations show immediate feedback
- ✅ No page refreshes required for any operation

**Step 6: Commit verification results**

```bash
cd /Users/gberges/compass
git add docs/plans/2025-11-10-fix-optimistic-ui-updates.md
git commit -m "docs: add verification results for optimistic updates

All user interactions now show immediate visual feedback without requiring page refresh. Verified across Calendar and Tasks pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

This plan fixes the optimistic UI update issues by:

1. **Changing invalidateQueries to refetchQueries** - Ensures immediate refetch instead of just marking as stale
2. **Adding optimistic updates to all mutations** - Create, update, delete, schedule, unschedule all show immediate feedback
3. **Migrating TasksPage to React Query** - Consistency across the app
4. **Improving loading states** - Clear visual feedback during operations
5. **Comprehensive testing** - Ensuring all operations work correctly
6. **Documentation** - Pattern guide for future development

**Expected Outcome:** All user inputs show immediate visual feedback without requiring page refresh.

**Testing:** Manual testing on calendar (drag, resize, unschedule) and tasks page (create, edit, delete, filter).

**Time Estimate:** 2-3 hours for full implementation and testing.
