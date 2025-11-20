# Fix Scheduling Revert Bug Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the scheduling bug where task schedule/unschedule actions revert immediately, timestamps update but scheduled times don't change, and tasks don't appear on the calendar.

**Architecture:** The issue stems from React Query cache invalidation mismatches and timezone handling inconsistencies. The fix involves normalizing cache keys, ensuring consistent query filters, and adding proper timezone handling. We'll also add backend validation and improve error handling.

**Tech Stack:** React Query v5, TypeScript, Express.js, Prisma ORM, PostgreSQL, date-fns for timezone handling

---

## Root Cause Analysis

Based on investigation, the scheduling revert issue is caused by:

1. **Cache Key Mismatch**: Optimistic updates target `taskKeys.list({ status: 'NEXT' })` but CalendarPage may query with different filters, causing cache misses
2. **Stale Cache Entries**: Multiple cache entries with different filter combinations aren't being invalidated properly
3. **Timezone Issues**: Date string construction without proper timezone handling causes display inconsistencies
4. **Missing Backend Validation**: No server-side checks allow invalid states to persist

---

## Task 1: Add Logging to Identify Cache Invalidation Issue

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:68-129`

**Step 1: Add console logging to schedule mutation**

Add logging before and after cache operations:

```typescript
export function useScheduleTask() {
  return useMutation({
    mutationFn: ({ id, scheduledStart }: { id: string; scheduledStart: string }) =>
      api.scheduleTask(id, scheduledStart),
    onMutate: async ({ id, scheduledStart }) => {
      console.log('[useScheduleTask] onMutate called:', { id, scheduledStart });

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));
      console.log('[useScheduleTask] Previous cache:', previousTasks);

      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), (old: Task[] = []) => {
        const updated = old.map((task) =>
          task.id === id ? { ...task, scheduledStart, updatedAt: new Date().toISOString() } : task
        );
        console.log('[useScheduleTask] Updated cache:', updated);
        return updated;
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      console.error('[useScheduleTask] Error:', err);
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), context.previousTasks);
      }
      toast.showError('Failed to schedule task');
    },
    onSuccess: (data) => {
      console.log('[useScheduleTask] Success response:', data);
    },
    onSettled: () => {
      console.log('[useScheduleTask] Invalidating queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 2: Add same logging to unschedule mutation**

```typescript
export function useUnscheduleTask() {
  return useMutation({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onMutate: async (id) => {
      console.log('[useUnscheduleTask] onMutate called:', { id });

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));
      console.log('[useUnscheduleTask] Previous cache:', previousTasks);

      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), (old: Task[] = []) => {
        const updated = old.map((task) =>
          task.id === id ? { ...task, scheduledStart: null, updatedAt: new Date().toISOString() } : task
        );
        console.log('[useUnscheduleTask] Updated cache:', updated);
        return updated;
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      console.error('[useUnscheduleTask] Error:', err);
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), context.previousTasks);
      }
      toast.showError('Failed to unschedule task');
    },
    onSuccess: (data) => {
      console.log('[useUnscheduleTask] Success response:', data);
    },
    onSettled: () => {
      console.log('[useUnscheduleTask] Invalidating queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 3: Test and observe console output**

Run in browser:
1. Open browser console (F12)
2. Try scheduling a task
3. Observe log output for cache operations
4. Check if optimistic update shows correct data
5. Check if success response matches
6. Check if invalidation triggers refetch

Expected: Logs will reveal if cache keys mismatch or if response data differs from optimistic update

**Step 4: Commit logging changes**

```bash
git add frontend/src/hooks/useTasks.ts
git commit -m "debug: add logging to schedule mutations for cache debugging"
```

---

## Task 2: Fix Cache Key Consistency

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:68-129`
- Modify: `frontend/src/pages/CalendarPage.tsx:25`

**Step 1: Update optimistic updates to use broader cache invalidation**

Instead of targeting specific filter, update ALL task list caches:

```typescript
export function useScheduleTask() {
  return useMutation({
    mutationFn: ({ id, scheduledStart }: { id: string; scheduledStart: string }) =>
      api.scheduleTask(id, scheduledStart),
    onMutate: async ({ id, scheduledStart }) => {
      console.log('[useScheduleTask] onMutate called:', { id, scheduledStart });

      // Cancel all task queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get ALL cached task lists (not just status: NEXT)
      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Update task in ALL cached lists
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.map((task) =>
              task.id === id
                ? { ...task, scheduledStart, updatedAt: new Date().toISOString() }
                : task
            )
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useScheduleTask] Error:', err);
      // Rollback ALL cache entries
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to schedule task');
    },
    onSuccess: (data) => {
      console.log('[useScheduleTask] Success response:', data);
    },
    onSettled: () => {
      console.log('[useScheduleTask] Invalidating all task queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 2: Apply same fix to unschedule mutation**

```typescript
export function useUnscheduleTask() {
  return useMutation({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onMutate: async (id) => {
      console.log('[useUnscheduleTask] onMutate called:', { id });

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.map((task) =>
              task.id === id
                ? { ...task, scheduledStart: null, updatedAt: new Date().toISOString() }
                : task
            )
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useUnscheduleTask] Error:', err);
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to unschedule task');
    },
    onSuccess: (data) => {
      console.log('[useUnscheduleTask] Success response:', data);
    },
    onSettled: () => {
      console.log('[useUnscheduleTask] Invalidating all task queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
```

**Step 3: Test scheduling with fix**

Run: Browser console open, try scheduling/unscheduling
Expected: Tasks should stay scheduled, calendar updates immediately, no revert

**Step 4: Commit cache fix**

```bash
git add frontend/src/hooks/useTasks.ts
git commit -m "fix: update all cached task lists on schedule/unschedule mutations"
```

---

## Task 3: Add Backend Validation for Scheduling

**Files:**
- Modify: `backend/src/routes/tasks.ts:244-267`

**Step 1: Add validation for past scheduling**

```typescript
// Line 244: Update schedule endpoint with validation
router.patch('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledStart } = scheduleTaskSchema.parse(req.body);

    // Validate not scheduling in the past
    const scheduledDate = new Date(scheduledStart);
    const now = new Date();

    if (scheduledDate < now) {
      return res.status(400).json({
        error: 'Cannot schedule task in the past',
        scheduledStart,
        now: now.toISOString(),
      });
    }

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: {
        scheduledStart: scheduledDate,
      },
    });

    console.log(`[schedule] Task ${id} scheduled for ${scheduledDate.toISOString()}`);
    res.json(task);
  } catch (error) {
    console.error('[schedule] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to schedule task' });
  }
});
```

**Step 2: Add logging to unschedule endpoint**

```typescript
// Line 269: Update unschedule endpoint with logging
router.patch('/:id/unschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.update({
      where: { id },
      data: {
        scheduledStart: null,
      },
    });

    console.log(`[unschedule] Task ${id} unscheduled`);
    res.json(task);
  } catch (error) {
    console.error('[unschedule] Error:', error);
    res.status(500).json({ error: 'Failed to unschedule task' });
  }
});
```

**Step 3: Test backend validation**

Run backend tests:
```bash
cd backend
# Test with curl
curl -X PATCH http://localhost:3001/api/tasks/{task-id}/schedule \
  -H "Content-Type: application/json" \
  -d '{"scheduledStart": "2025-01-01T10:00:00.000Z"}'
```

Expected: Past dates should return 400 error, valid dates should return updated task

**Step 4: Commit backend validation**

```bash
git add backend/src/routes/tasks.ts
git commit -m "feat: add backend validation for scheduling in the past"
```

---

## Task 4: Fix Timezone Handling in Calendar

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx:173-238`

**Step 1: Install date-fns for better date handling**

```bash
cd frontend
npm install date-fns
```

**Step 2: Update calendar drag handler to use UTC consistently**

```typescript
import { format, parseISO, startOfDay, addMinutes } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Line 173: Update handleEventDrop
const handleEventDrop = async ({
  event,
  start,
  end,
}: {
  event: CalendarEvent;
  start: Date;
  end: Date;
}) => {
  console.log('[handleEventDrop] Dropping event:', { event, start, end });

  // Prevent scheduling in the past (compare UTC times)
  const now = new Date();
  if (start < now) {
    toast.showError('Cannot schedule tasks in the past');
    return;
  }

  if (event.type === 'task' && event.task) {
    try {
      // Convert local Date to UTC ISO string
      const scheduledStartUTC = start.toISOString();

      console.log('[handleEventDrop] Scheduling task:', {
        taskId: event.task.id,
        scheduledStartUTC,
        localTime: start.toString(),
      });

      await scheduleTaskMutation.mutateAsync({
        id: event.task.id,
        scheduledStart: scheduledStartUTC,
      });

      toast.showSuccess(`Task "${event.task.name}" scheduled`);
    } catch (error) {
      console.error('[handleEventDrop] Failed to schedule:', error);
      toast.showError('Failed to schedule task');
    }
  }
};
```

**Step 3: Update event resize handler similarly**

```typescript
// Line 211: Update handleEventResize
const handleEventResize = async ({
  event,
  start,
  end,
}: {
  event: CalendarEvent;
  start: Date;
  end: Date;
}) => {
  console.log('[handleEventResize] Resizing event:', { event, start, end });

  if (event.type === 'task' && event.task) {
    try {
      // Calculate new duration in minutes
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      console.log('[handleEventResize] New duration:', { durationMinutes });

      await updateTaskMutation.mutateAsync({
        id: event.task.id,
        updates: {
          duration: durationMinutes,
          scheduledStart: start.toISOString(),
        },
      });

      toast.showSuccess(`Task "${event.task.name}" updated`);
    } catch (error) {
      console.error('[handleEventResize] Failed to resize:', error);
      toast.showError('Failed to update task');
    }
  }
};
```

**Step 4: Test drag and drop**

Run: Open calendar, drag task to new time
Expected: Task stays at dropped time, no revert, console shows UTC times

**Step 5: Commit timezone fixes**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/pages/CalendarPage.tsx
git commit -m "fix: use consistent UTC timezone handling in calendar drag operations"
```

---

## Task 5: Add Null Safety to Calendar Event Generation

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx:48-110`

**Step 1: Add defensive null checks**

```typescript
// Line 48: Update event generation with null safety
const events = useMemo(() => {
  console.log('[Calendar] Generating events from tasks:', scheduledTasks.length);

  const taskEvents: CalendarEvent[] = scheduledTasks
    .filter((task) => {
      // Defensive: ensure scheduledStart exists and is valid
      if (!task.scheduledStart) {
        console.warn('[Calendar] Task missing scheduledStart:', task.id);
        return false;
      }

      try {
        const start = new Date(task.scheduledStart);
        if (isNaN(start.getTime())) {
          console.warn('[Calendar] Invalid scheduledStart date:', task.scheduledStart);
          return false;
        }
        return true;
      } catch (error) {
        console.error('[Calendar] Error parsing scheduledStart:', error);
        return false;
      }
    })
    .map((task) => {
      const start = new Date(task.scheduledStart!);
      const end = new Date(start.getTime() + task.duration * 60000);

      return {
        id: task.id,
        title: task.name,
        start,
        end,
        task,
        type: 'task' as const,
      };
    });

  console.log('[Calendar] Generated task events:', taskEvents.length);

  // Rest of event generation (plan events)
  const planEvents: CalendarEvent[] = [];
  // ... existing plan event generation code ...

  return [...taskEvents, ...planEvents];
}, [scheduledTasks, todayPlan]);
```

**Step 2: Test with invalid data**

Run: Try to schedule task, check console for warnings
Expected: No crashes, invalid dates filtered out with warnings

**Step 3: Commit null safety**

```bash
git add frontend/src/pages/CalendarPage.tsx
git commit -m "fix: add null safety and validation to calendar event generation"
```

---

## Task 6: Add Proper Error Handling to API Client

**Files:**
- Modify: `frontend/src/lib/api.ts:80-88`

**Step 1: Add error logging and retry logic**

```typescript
// Line 80: Update scheduleTask with better error handling
export const scheduleTask = async (id: string, scheduledStart: string): Promise<Task> => {
  console.log('[API] scheduleTask called:', { id, scheduledStart });

  try {
    const response = await api.patch<Task>(`/tasks/${id}/schedule`, { scheduledStart });
    console.log('[API] scheduleTask success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[API] scheduleTask failed:', {
      id,
      scheduledStart,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

// Line 85: Update unscheduleTask with better error handling
export const unscheduleTask = async (id: string): Promise<Task> => {
  console.log('[API] unscheduleTask called:', { id });

  try {
    const response = await api.patch<Task>(`/tasks/${id}/unschedule`);
    console.log('[API] unscheduleTask success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[API] unscheduleTask failed:', {
      id,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });
    throw error;
  }
};
```

**Step 2: Test error scenarios**

Run: Stop backend, try scheduling
Expected: Clear error message in console and toast

**Step 3: Commit error handling**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add comprehensive error logging to schedule API calls"
```

---

## Task 7: Add Database Query Logging

**Files:**
- Modify: `backend/src/routes/tasks.ts:96-142`

**Step 1: Add logging to GET tasks queries**

```typescript
// Line 96: Add logging to tasks list endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, context, scheduledDate } = req.query;

    console.log('[GET /tasks] Query params:', { status, category, context, scheduledDate });

    const where: Prisma.TaskWhereInput = {};

    if (status) {
      where.status = status as TaskStatus;
    }
    if (category) {
      where.category = category as Category;
    }
    if (context) {
      where.context = context as Context;
    }
    if (scheduledDate) {
      const date = new Date(scheduledDate as string);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.scheduledStart = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    console.log('[GET /tasks] Query where clause:', JSON.stringify(where));

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    console.log('[GET /tasks] Found tasks:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('[GET /tasks] Error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});
```

**Step 2: Test query logging**

Run backend, make requests, check console
Expected: See all query params and results logged

**Step 3: Commit query logging**

```bash
git add backend/src/routes/tasks.ts
git commit -m "debug: add comprehensive logging to task query endpoints"
```

---

## Task 8: Remove Debug Logging (Cleanup)

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts`
- Modify: `frontend/src/pages/CalendarPage.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `backend/src/routes/tasks.ts`

**Step 1: Remove console.log statements from production code**

Replace all `console.log` with conditional logging:

```typescript
// Add at top of each file
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

// Then use:
log('[useScheduleTask] onMutate called:', { id, scheduledStart });
```

Or remove entirely if issue is confirmed fixed.

**Step 2: Keep error logging**

Keep `console.error` statements as they're useful for production debugging.

**Step 3: Test without debug logs**

Run: Test scheduling without verbose logging
Expected: Works correctly, no performance issues

**Step 4: Commit cleanup**

```bash
git add frontend/src/hooks/useTasks.ts frontend/src/pages/CalendarPage.tsx frontend/src/lib/api.ts backend/src/routes/tasks.ts
git commit -m "chore: remove debug logging from schedule operations"
```

---

## Task 9: Add Integration Test for Scheduling

**Files:**
- Create: `frontend/src/tests/scheduling.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScheduleTask, useUnscheduleTask } from '../hooks/useTasks';

describe('Task Scheduling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('should schedule a task and persist the change', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useScheduleTask(), { wrapper });

    const taskId = 'test-task-id';
    const scheduledStart = '2025-12-25T10:00:00.000Z';

    await waitFor(() => {
      result.current.mutate({ id: taskId, scheduledStart });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify cache was updated
    const cachedTasks = queryClient.getQueryData(['tasks', 'list', { status: 'NEXT' }]);
    expect(cachedTasks).toBeDefined();
  });

  it('should unschedule a task and remove from calendar', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

    const taskId = 'test-task-id';

    await waitFor(() => {
      result.current.mutate(taskId);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

**Step 2: Run tests**

```bash
cd frontend
npm run test
```

Expected: Tests pass, scheduling works correctly

**Step 3: Commit tests**

```bash
git add frontend/src/tests/scheduling.test.ts
git commit -m "test: add integration tests for task scheduling"
```

---

## Task 10: Final Verification and Documentation

**Files:**
- Create: `docs/troubleshooting/scheduling-fix.md`

**Step 1: Create troubleshooting documentation**

```markdown
# Scheduling Fix Documentation

## Issue
Tasks were not staying scheduled when using the calendar drag-and-drop feature. The scheduled time would update momentarily but then revert to the previous state.

## Root Cause
1. **Cache Key Mismatch**: React Query optimistic updates were targeting a specific cache key (`taskKeys.list({ status: 'NEXT' })`) while the calendar page queried with different filters, causing cache misses.
2. **Incomplete Cache Invalidation**: Only some cached queries were being updated during optimistic updates.

## Solution
Updated the schedule/unschedule mutations to:
1. Update ALL cached task lists during optimistic updates, not just one
2. Added comprehensive error handling and logging
3. Added backend validation for past scheduling
4. Improved timezone consistency using UTC throughout

## Files Changed
- `frontend/src/hooks/useTasks.ts` - Updated cache operations
- `frontend/src/pages/CalendarPage.tsx` - Added null safety and timezone fixes
- `frontend/src/lib/api.ts` - Enhanced error logging
- `backend/src/routes/tasks.ts` - Added validation and logging

## Testing
To verify the fix works:
1. Open the calendar page
2. Drag a task to a new time slot
3. Task should stay at the new time (no revert)
4. Refresh the page - task should remain scheduled
5. Check browser console for no errors

## Future Improvements
- Add overlap detection for scheduled tasks
- Add time zone selector for users in different zones
- Add recurring task scheduling
```

**Step 2: Test full workflow**

Manual test checklist:
- [ ] Schedule task via drag-and-drop - stays scheduled
- [ ] Unschedule task via modal - removes from calendar
- [ ] Refresh page - scheduled tasks persist
- [ ] Schedule multiple tasks - all appear correctly
- [ ] Resize task duration - updates correctly
- [ ] Try scheduling in past - shows error message
- [ ] Network failure - shows clear error, doesn't corrupt cache

**Step 3: Commit documentation**

```bash
git add docs/troubleshooting/scheduling-fix.md
git commit -m "docs: add troubleshooting guide for scheduling fix"
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: complete scheduling revert bug fix"
```

---

## Testing Checklist

After implementation, verify:

- [ ] Schedule a task via drag-and-drop - persists without reverting
- [ ] Unschedule a task - removes from calendar immediately
- [ ] Schedule multiple tasks - all appear on calendar
- [ ] Refresh page - scheduled tasks remain in place
- [ ] Open browser console - no errors during operations
- [ ] Check network tab - API calls succeed with 200 status
- [ ] Try scheduling in past - shows validation error
- [ ] Backend logs show successful schedule/unschedule operations
- [ ] Tasks with `scheduledStart` appear on correct day/time
- [ ] Calendar displays tasks at correct times (timezone-aware)

---

## References

- **React Query Docs:** https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- **Cache Invalidation:** https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- **Prisma DateTime:** https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datetime
- **date-fns Timezone:** https://date-fns.org/docs/Time-Zones

## Related Skills

- @superpowers:systematic-debugging - If new issues arise during implementation
- @superpowers:verification-before-completion - Use before marking complete
- @superpowers:test-driven-development - For adding comprehensive tests
