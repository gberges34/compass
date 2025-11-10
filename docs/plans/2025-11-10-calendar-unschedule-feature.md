# Calendar Unschedule Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to unschedule tasks from the calendar, moving them back to the unscheduled tasks list.

**Architecture:** Add a PATCH endpoint to backend that sets scheduledStart to null, create an unscheduleTask API function in frontend, add an "Unschedule" button to the task detail modal in CalendarPage, and update local state to move the task from calendar events to unscheduled tasks list.

**Tech Stack:** Express.js (backend), React + TypeScript (frontend), Prisma ORM, Compass Design System

---

## Task 1: Add Backend Unschedule Endpoint

**Files:**
- Modify: `/Users/gberges/compass/backend/src/routes/tasks.ts` (after line 267, before DELETE endpoint)

**Step 1: Add unschedule endpoint after the schedule endpoint**

In `/Users/gberges/compass/backend/src/routes/tasks.ts`, add this new endpoint after the schedule endpoint (after line 267):

```typescript
// PATCH /api/tasks/:id/unschedule - Unschedule task
router.patch('/:id/unschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.update({
      where: { id },
      data: {
        scheduledStart: null,
      },
    });

    res.json(task);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});
```

**Step 2: Verify backend compiles**

Run: `cd /Users/gberges/compass/backend && npm run build`
Expected: TypeScript compiles successfully with no errors

**Step 3: Test the endpoint manually**

The backend dev server should already be running. You can test with curl:

```bash
# First, get a scheduled task ID from the database or API
# Then test unscheduling it:
curl -X PATCH http://localhost:3001/api/tasks/TASK_ID/unschedule
```

Expected: Returns task object with `scheduledStart: null`

**Step 4: Commit backend changes**

```bash
cd /Users/gberges/compass/backend
git add src/routes/tasks.ts
git commit -m "feat(api): add unschedule endpoint to remove task scheduling"
```

---

## Task 2: Add Frontend API Function

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/lib/api.ts` (after line 83, after scheduleTask function)

**Step 1: Add unscheduleTask API function**

In `/Users/gberges/compass/frontend/src/lib/api.ts`, add this function after the `scheduleTask` function (after line 83):

```typescript
export const unscheduleTask = async (id: string): Promise<Task> => {
  const response = await api.patch<Task>(`/tasks/${id}/unschedule`);
  return response.data;
};
```

**Step 2: Verify frontend compiles**

The webpack dev server should show compilation status. Check for TypeScript errors:

Expected: No TypeScript errors related to the new function

**Step 3: Commit frontend API changes**

```bash
cd /Users/gberges/compass/frontend
git add src/lib/api.ts
git commit -m "feat(api): add unscheduleTask API client function"
```

---

## Task 3: Add Unschedule Handler to CalendarPage

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (import section and after handleScheduleTask function)

**Step 1: Import the unscheduleTask function**

At the top of `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`, update the import from '../lib/api' (line 6):

```typescript
import { getTasks, scheduleTask, unscheduleTask, getTodayPlan } from '../lib/api';
```

**Step 2: Add handleUnscheduleTask function**

After the `handleScheduleTask` function (around line 186), add this new handler:

```typescript
const handleUnscheduleTask = async (task: Task) => {
  try {
    const updatedTask = await unscheduleTask(task.id);

    // Remove from calendar events
    setEvents((prev) => prev.filter((event) => event.id !== task.id));

    // Add back to unscheduled tasks
    setUnscheduledTasks((prev) => [...prev, updatedTask]);

    // Update tasks list
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, scheduledStart: null } : t))
    );

    // Close the modal
    setSelectedTask(null);

    toast.showSuccess('Task unscheduled and moved back to unscheduled list');
  } catch (err) {
    toast.showError('Failed to unschedule task. Please try again.');
    console.error('Error unscheduling task:', err);
  }
};
```

**Step 3: Verify compilation**

Check the webpack dev server output for any TypeScript errors.

Expected: No compilation errors

**Step 4: Commit the handler function**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add handleUnscheduleTask handler function"
```

---

## Task 4: Add Unschedule Button to Task Detail Modal

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (Task Detail Modal section, around line 521)

**Step 1: Add Unschedule button to modal**

In `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`, find the modal footer buttons section (around line 521). Replace the current button section:

```typescript
<div className="mt-24 flex justify-end">
  <Button
    variant="secondary"
    onClick={() => setSelectedTask(null)}
  >
    Close
  </Button>
</div>
```

With this updated version that includes both Unschedule and Close buttons:

```typescript
<div className="mt-24 flex justify-end space-x-12">
  {selectedTask.scheduledStart && (
    <Button
      variant="danger"
      onClick={() => handleUnscheduleTask(selectedTask)}
    >
      Unschedule
    </Button>
  )}
  <Button
    variant="secondary"
    onClick={() => setSelectedTask(null)}
  >
    Close
  </Button>
</div>
```

**Step 2: Verify UI renders correctly**

Open the browser and navigate to the Calendar page (http://localhost:3000/calendar). Click on a scheduled task event to open the modal.

Expected:
- Modal opens showing task details
- Two buttons appear: "Unschedule" (red/danger variant) and "Close" (gray/secondary variant)
- If task is not scheduled, only "Close" button appears

**Step 3: Test the unschedule functionality**

1. Click on a scheduled task in the calendar
2. Click the "Unschedule" button
3. Verify the modal closes
4. Verify the task disappears from the calendar
5. Scroll down to the "Unscheduled Tasks" section
6. Verify the task now appears in the unscheduled tasks list

Expected:
- Toast notification: "Task unscheduled and moved back to unscheduled list"
- Task removed from calendar view
- Task appears in unscheduled tasks sidebar

**Step 4: Commit UI changes**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add Unschedule button to task detail modal"
```

---

## Task 5: Visual Polish and Edge Cases

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (handleUnscheduleTask function)

**Step 1: Add loading state to prevent double-clicks**

Update the `handleUnscheduleTask` function to include a loading state. First, add a state variable near the other useState declarations (around line 23):

```typescript
const [unscheduling, setUnscheduling] = useState(false);
```

Then update the `handleUnscheduleTask` function:

```typescript
const handleUnscheduleTask = async (task: Task) => {
  if (unscheduling) return; // Prevent double-clicks

  try {
    setUnscheduling(true);
    const updatedTask = await unscheduleTask(task.id);

    // Remove from calendar events
    setEvents((prev) => prev.filter((event) => event.id !== task.id));

    // Add back to unscheduled tasks
    setUnscheduledTasks((prev) => [...prev, updatedTask]);

    // Update tasks list
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, scheduledStart: null } : t))
    );

    // Close the modal
    setSelectedTask(null);

    toast.showSuccess('Task unscheduled and moved back to unscheduled list');
  } catch (err) {
    toast.showError('Failed to unschedule task. Please try again.');
    console.error('Error unscheduling task:', err);
  } finally {
    setUnscheduling(false);
  }
};
```

**Step 2: Update button to show loading state**

Update the Unschedule button in the modal to be disabled while unscheduling:

```typescript
<div className="mt-24 flex justify-end space-x-12">
  {selectedTask.scheduledStart && (
    <Button
      variant="danger"
      onClick={() => handleUnscheduleTask(selectedTask)}
      disabled={unscheduling}
    >
      {unscheduling ? 'Unscheduling...' : 'Unschedule'}
    </Button>
  )}
  <Button
    variant="secondary"
    onClick={() => setSelectedTask(null)}
  >
    Close
  </Button>
</div>
```

**Step 3: Test the loading state**

1. Open Calendar page
2. Click on a scheduled task
3. Click "Unschedule"
4. Observe button changes to "Unscheduling..." and is disabled
5. Try clicking again (should not trigger multiple API calls)

Expected:
- Button text changes during operation
- Button is disabled during operation
- Only one API call is made

**Step 4: Test edge case - task not found**

Test what happens if a task is deleted in another session:

Expected: Error toast shows "Failed to unschedule task. Please try again."

**Step 5: Commit polish changes**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add loading state to unschedule button"
```

---

## Task 6: Final Verification and Documentation

**Step 1: Test complete user flow**

1. Start with an unscheduled task
2. Drag it to the calendar or use the schedule feature
3. Verify it appears on the calendar
4. Click the scheduled task to open modal
5. Click "Unschedule"
6. Verify it returns to unscheduled tasks list
7. Repeat the process to ensure it can be rescheduled

Expected: Complete round-trip works flawlessly

**Step 2: Test with multiple tasks**

1. Schedule 3-4 tasks at different times
2. Unschedule them in random order
3. Verify they all appear in the unscheduled list
4. Verify calendar updates correctly each time

Expected: All tasks handle unscheduling correctly

**Step 3: Verify backend persistence**

1. Unschedule a task
2. Refresh the browser page
3. Verify the task is still unscheduled (not on calendar)
4. Verify it appears in unscheduled tasks list

Expected: State persists across page reloads

**Step 4: Check for console errors**

Open browser DevTools console and perform all operations.

Expected: No errors or warnings in console

**Step 5: Create final commit if any cleanup needed**

```bash
# If any final adjustments were made
cd /Users/gberges/compass/frontend
git add .
git commit -m "chore(calendar): final cleanup for unschedule feature"
```

**Step 6: Update CHANGELOG or feature documentation**

If your project maintains a CHANGELOG.md, add an entry:

```markdown
## [Unreleased]

### Added
- Calendar: Tasks can now be unscheduled and moved back to the unscheduled tasks list
- Calendar: Task detail modal now includes "Unschedule" button for scheduled tasks
```

---

## Summary

This implementation adds a complete unschedule feature with:

1. **Backend API** - PATCH endpoint at `/api/tasks/:id/unschedule`
2. **Frontend API** - `unscheduleTask()` function in api.ts
3. **UI Handler** - `handleUnscheduleTask()` with proper state management
4. **User Interface** - "Unschedule" button in task detail modal
5. **Polish** - Loading states, error handling, and edge case coverage

The feature maintains proper separation of concerns:
- Backend handles data persistence
- Frontend API provides clean interface
- React component manages local state updates
- UI provides clear user feedback

Users can now freely move tasks between scheduled (on calendar) and unscheduled (in sidebar) states.
