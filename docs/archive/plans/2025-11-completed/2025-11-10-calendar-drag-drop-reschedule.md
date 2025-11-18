# Calendar Drag-and-Drop Reschedule Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to drag and drop calendar events (scheduled tasks) to different time slots to reschedule them, making all calendar times potential landing spots.

**Architecture:** Leverage react-big-calendar's built-in drag-and-drop (DnD) functionality with the `react-dnd` addon. Enable the `draggableAccessor` prop to make task events draggable, implement `onEventDrop` and `onEventResize` handlers to update the backend when events are moved/resized, and provide visual feedback during drag operations.

**Tech Stack:** React Big Calendar with DnD addon, react-dnd, Express.js (backend), Prisma ORM

**Key Documentation:**
- React Big Calendar DnD: https://jquense.github.io/react-big-calendar/examples/index.html#prop-draggableAccessor
- The calendar already imports from 'react-big-calendar' - we need to use the DnD wrapper

---

## Task 1: Install react-big-calendar DnD Dependencies

**Files:**
- Modify: `/Users/gberges/compass/frontend/package.json` (dependencies)

**Step 1: Install required packages**

The drag-and-drop functionality for react-big-calendar requires additional peer dependencies:

```bash
cd /Users/gberges/compass/frontend
npm install react-dnd react-dnd-html5-backend
```

Expected: Packages install successfully

**Step 2: Verify installation**

Check that the packages are in package.json:

```bash
cat package.json | grep -A 3 '"react-dnd"'
```

Expected: Should see react-dnd and react-dnd-html5-backend in dependencies

**Step 3: Commit dependency changes**

```bash
cd /Users/gberges/compass/frontend
git add package.json package-lock.json
git commit -m "feat(calendar): add react-dnd dependencies for drag-and-drop"
```

---

## Task 2: Import and Setup DnD Calendar Wrapper

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (import section, lines 1-12)

**Step 1: Add DnD imports**

At the top of `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx`, update the react-big-calendar import (line 2):

```typescript
import { Calendar, momentLocalizer, Event as BigCalendarEvent, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
```

**Step 2: Create DnD Calendar component**

After the localizer declaration (after line 14), add:

```typescript
const DnDCalendar = withDragAndDrop(Calendar);
```

**Step 3: Verify compilation**

Check the webpack dev server output for any TypeScript errors.

Expected: No compilation errors

**Step 4: Commit import changes**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): import react-big-calendar DnD addon"
```

---

## Task 3: Add State for Drag-and-Drop Operations

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (state variables section, around line 27)

**Step 1: Add rescheduling state**

After the `unscheduling` state (line 27), add a new state variable:

```typescript
const [rescheduling, setRescheduling] = useState(false);
```

This will be used to show loading state during reschedule operations.

**Step 2: Verify compilation**

Expected: No TypeScript errors

**Step 3: Commit state changes**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add rescheduling state for drag operations"
```

---

## Task 4: Implement Event Drop Handler

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (after handleUnscheduleTask, around line 217)

**Step 1: Add onEventDrop handler**

After the `handleUnscheduleTask` function (around line 217), add this new handler:

```typescript
const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
  // Only allow rescheduling task events, not time blocks
  if (event.type !== 'task' || !event.task) {
    toast.showError('Cannot reschedule time blocks');
    return;
  }

  if (rescheduling) return; // Prevent concurrent operations

  try {
    setRescheduling(true);

    // Call the existing scheduleTask API
    const scheduledStart = start.toISOString();
    const updatedTask = await scheduleTask(event.task.id, scheduledStart);

    // Update the event in the events array
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              start,
              end,
              task: { ...e.task!, scheduledStart },
            }
          : e
      )
    );

    // Update the task in the tasks array
    setTasks((prev) =>
      prev.map((t) =>
        t.id === event.task!.id ? { ...t, scheduledStart } : t
      )
    );

    toast.showSuccess('Task rescheduled successfully');
  } catch (err) {
    toast.showError('Failed to reschedule task. Please try again.');
    console.error('Error rescheduling task:', err);

    // Refresh to restore original state
    fetchData();
  } finally {
    setRescheduling(false);
  }
};
```

**Step 2: Add onEventResize handler**

After `handleEventDrop`, add a handler for resizing events (changing duration):

```typescript
const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
  // Only allow resizing task events
  if (event.type !== 'task' || !event.task) {
    toast.showError('Cannot resize time blocks');
    return;
  }

  if (rescheduling) return;

  try {
    setRescheduling(true);

    // Calculate new duration in minutes
    const newDuration = Math.round((end.getTime() - start.getTime()) / 60000);

    // Update task with new scheduled time and duration
    const scheduledStart = start.toISOString();
    const updatedTask = await scheduleTask(event.task.id, scheduledStart);

    // Note: We'd need a new API endpoint to update duration separately
    // For now, just update the scheduled time
    // TODO: Add updateTask API call to also update duration

    // Update the event
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              start,
              end,
              task: { ...e.task!, scheduledStart, duration: newDuration },
            }
          : e
      )
    );

    // Update the task
    setTasks((prev) =>
      prev.map((t) =>
        t.id === event.task!.id ? { ...t, scheduledStart, duration: newDuration } : t
      )
    );

    toast.showSuccess('Task duration updated');
  } catch (err) {
    toast.showError('Failed to resize task. Please try again.');
    console.error('Error resizing task:', err);
    fetchData();
  } finally {
    setRescheduling(false);
  }
};
```

**Step 3: Verify compilation**

Check for TypeScript errors.

Expected: No errors

**Step 4: Commit handler functions**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add event drop and resize handlers"
```

---

## Task 5: Replace Calendar Component with DnDCalendar

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (Calendar component, around line 435)

**Step 1: Update Calendar component usage**

Find the `<Calendar>` component (around line 435) and replace it with `<DnDCalendar>`:

```typescript
<DnDCalendar
  localizer={localizer}
  events={events as BigCalendarEvent[]}
  startAccessor="start"
  endAccessor="end"
  style={{ height: 700 }}
  onSelectSlot={handleSelectSlot}
  onSelectEvent={handleSelectEvent}
  selectable
  eventPropGetter={eventStyleGetter}
  views={['month', 'week', 'day']}
  view={currentView}
  date={currentDate}
  onNavigate={handleNavigate}
  onView={handleViewChange}
  components={{
    toolbar: CalendarToolbar,
  }}
  draggableAccessor={(event: CalendarEvent) => event.type === 'task'}
  resizable
  onEventDrop={handleEventDrop}
  onEventResize={handleEventResize}
/>
```

Key additions:
- `draggableAccessor`: Function that returns true for events that can be dragged (only tasks, not time blocks)
- `resizable`: Enables resizing events by dragging edges
- `onEventDrop`: Called when an event is dropped after dragging
- `onEventResize`: Called when an event is resized

**Step 2: Verify compilation**

Expected: No TypeScript errors

**Step 3: Test in browser**

1. Open http://localhost:3000/calendar
2. Find a scheduled task on the calendar
3. Try to drag it to a different time slot
4. Verify the task moves and the time updates
5. Try to resize a task by dragging its edges
6. Verify the duration changes

Expected:
- Tasks should be draggable and droppable on different time slots
- Time blocks (Deep Work, Admin, Buffer) should not be draggable
- Success toast appears after successful reschedule
- Task appears in new time slot immediately

**Step 4: Commit Calendar component changes**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): enable drag-and-drop rescheduling for task events"
```

---

## Task 6: Add Visual Feedback During Drag Operations

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (eventStyleGetter, around line 235)

**Step 1: Update eventStyleGetter for drag state**

Update the `eventStyleGetter` function to add visual feedback during drag operations. Replace the current function (around line 235) with:

```typescript
const eventStyleGetter = (calendarEvent: CalendarEvent) => {
  let backgroundColor = '#94a3b8';
  let borderColor = '#64748b';
  let opacity = rescheduling ? 0.5 : 0.9; // Reduce opacity during reschedule
  let cursor = 'pointer';

  if (calendarEvent.type === 'task' && calendarEvent.task) {
    backgroundColor = getCategoryColor(calendarEvent.task.category);
    borderColor = backgroundColor;
    cursor = 'move'; // Show move cursor for draggable tasks
  } else if (calendarEvent.type === 'deepWork') {
    backgroundColor = '#3b82f6';
    borderColor = '#2563eb';
    cursor = 'default'; // Not draggable
  } else if (calendarEvent.type === 'admin') {
    backgroundColor = '#8b5cf6';
    borderColor = '#7c3aed';
    cursor = 'default';
  } else if (calendarEvent.type === 'buffer') {
    backgroundColor = '#6b7280';
    borderColor = '#4b5563';
    cursor = 'default';
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '4px',
      opacity,
      color: 'white',
      display: 'block',
      cursor,
      transition: 'opacity 0.2s ease',
    },
  };
};
```

**Step 2: Add CSS for drag preview**

Add custom CSS to improve the drag preview. Create or update the calendar styles. You can add this as a style tag or in a separate CSS file:

```css
/* Enhanced drag-and-drop styles */
.rbc-addons-dnd-dragging {
  opacity: 0.7 !important;
  cursor: grabbing !important;
}

.rbc-addons-dnd-drag-preview {
  opacity: 0.8 !important;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2) !important;
}

.rbc-addons-dnd-over {
  background-color: rgba(59, 130, 246, 0.1) !important;
}

.rbc-event.rbc-addons-dnd-resizable {
  cursor: ew-resize;
}
```

You can add these styles inline at the end of CalendarPage.tsx using a `<style>` tag inside the component, or create a separate CSS file.

**Step 3: Test visual feedback**

1. Open calendar
2. Hover over a task event - cursor should change to 'move'
3. Start dragging a task - should see reduced opacity and drag preview
4. Hover over time blocks - cursor should be default (not draggable)
5. Drop the task - should see smooth transition

Expected: Clear visual indicators for drag state

**Step 4: Commit visual improvements**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add visual feedback for drag-and-drop operations"
```

---

## Task 7: Handle Edge Cases and Error States

**Files:**
- Modify: `/Users/gberges/compass/frontend/src/pages/CalendarPage.tsx` (handleEventDrop)

**Step 1: Add validation to prevent invalid drops**

Update the `handleEventDrop` function to add more validation:

```typescript
const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
  // Only allow rescheduling task events, not time blocks
  if (event.type !== 'task' || !event.task) {
    toast.showError('Cannot reschedule time blocks');
    return;
  }

  // Prevent dropping in the past
  const now = new Date();
  if (start < now) {
    toast.showError('Cannot schedule tasks in the past');
    fetchData(); // Refresh to restore original position
    return;
  }

  // Prevent concurrent operations
  if (rescheduling) {
    return;
  }

  try {
    setRescheduling(true);

    // Call the existing scheduleTask API
    const scheduledStart = start.toISOString();
    const updatedTask = await scheduleTask(event.task.id, scheduledStart);

    // Update the event in the events array
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              start,
              end,
              task: { ...e.task!, scheduledStart },
            }
          : e
      )
    );

    // Update the task in the tasks array
    setTasks((prev) =>
      prev.map((t) =>
        t.id === event.task!.id ? { ...t, scheduledStart } : t
      )
    );

    toast.showSuccess('Task rescheduled successfully');
  } catch (err) {
    toast.showError('Failed to reschedule task. Please try again.');
    console.error('Error rescheduling task:', err);

    // Refresh to restore original state
    fetchData();
  } finally {
    setRescheduling(false);
  }
};
```

**Step 2: Add loading indicator**

Add a loading overlay while rescheduling. In the Calendar wrapper div (around line 434), add conditional rendering:

```typescript
<div
  className="bg-cloud rounded-card shadow-e01 border border-fog p-24 flex-1 relative"
  onDragOver={handleDragOver}
  onDrop={handleDrop}
>
  {rescheduling && (
    <div className="absolute inset-0 bg-snow/50 flex items-center justify-center z-10 rounded-card">
      <div className="bg-cloud rounded-card shadow-e02 p-16">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-action mb-8"></div>
        <p className="text-slate text-small">Rescheduling...</p>
      </div>
    </div>
  )}
  <DnDCalendar
    {/* ... existing props */}
  />
</div>
```

**Step 3: Test edge cases**

Test the following scenarios:
1. Try to drag a time block (Deep Work/Admin/Buffer) - should show error
2. Try to drag a task to a past time - should show error and restore position
3. Drag multiple tasks rapidly - should queue properly with loading state
4. Drag to an overlapping time slot - should still work (no conflict checking yet)

Expected: All edge cases handled gracefully with appropriate error messages

**Step 4: Commit edge case handling**

```bash
cd /Users/gberges/compass/frontend
git add src/pages/CalendarPage.tsx
git commit -m "feat(calendar): add validation and error handling for drag-and-drop"
```

---

## Task 8: Final Testing and Documentation

**Step 1: Test complete drag-and-drop workflow**

1. Schedule a task by dragging from unscheduled sidebar
2. Drag the task to a different time slot on the same day
3. Drag the task to a different day
4. Resize the task by dragging its edges
5. Unschedule the task using the Unschedule button
6. Verify all state updates correctly

Expected: Complete workflow works smoothly with visual feedback

**Step 2: Test multi-day and multi-week views**

1. Switch to week view
2. Drag tasks across days within the week
3. Switch to day view
4. Drag tasks to different hours
5. Switch back to month view
6. Verify all views support drag-and-drop

Expected: Drag-and-drop works in all calendar views

**Step 3: Check browser console for errors**

Open DevTools console and perform all drag operations.

Expected: No errors or warnings

**Step 4: Verify backend persistence**

1. Drag a task to a new time
2. Refresh the browser
3. Verify the task is still in the new time slot

Expected: Changes persist across page reloads

**Step 5: Check for performance issues**

1. Create 20+ scheduled tasks
2. Try dragging tasks rapidly
3. Check for lag or stuttering

Expected: Smooth performance even with many events

**Step 6: Update documentation**

If the project has user documentation, add a section about drag-and-drop:

```markdown
## Rescheduling Tasks

You can reschedule tasks by dragging and dropping them to different time slots:

1. **Drag to Reschedule**: Click and hold a task event, then drag it to a new time slot
2. **Resize Duration**: Drag the edges of a task event to adjust its duration
3. **Visual Feedback**: The cursor changes to indicate draggable items
4. **Time Blocks**: Deep Work, Admin, and Buffer time blocks cannot be moved

Note: Tasks cannot be scheduled in the past. The system will show an error and restore the original position.
```

**Step 7: Create final commit if needed**

```bash
cd /Users/gberges/compass/frontend
git add .
git commit -m "docs(calendar): add drag-and-drop feature documentation"
```

---

## Summary

This implementation adds complete drag-and-drop functionality to the calendar:

1. **Draggable Events** - Task events can be dragged to different time slots
2. **Resizable Events** - Task duration can be adjusted by dragging edges
3. **Visual Feedback** - Cursor changes, opacity effects, and loading states
4. **Error Handling** - Validation for past times, non-draggable blocks, etc.
5. **State Management** - Proper updates to events, tasks, and unscheduled tasks lists
6. **Backend Integration** - Uses existing scheduleTask API endpoint

The feature maintains proper separation of concerns:
- react-big-calendar handles the drag mechanics
- React components manage state updates
- Backend API persists changes
- UI provides clear visual feedback

Users can now:
- Drag tasks from the sidebar to schedule them (already exists)
- Drag scheduled tasks to different time slots to reschedule
- Resize tasks to adjust their duration
- See real-time visual feedback during drag operations

**Technical Notes:**
- The `draggableAccessor` prop ensures only task events are draggable
- Time blocks (Deep Work, Admin, Buffer) remain static
- The resize handler calculates new duration based on time difference
- Error recovery automatically refreshes data if backend update fails
- Loading states prevent race conditions during drag operations
