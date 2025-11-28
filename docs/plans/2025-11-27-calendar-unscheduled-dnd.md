# Calendar Unscheduled Tasks Drag-and-Drop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow dragging unscheduled tasks from the sidebar onto the calendar, snapping to the hovered slot, showing a ghost preview, and blocking overlaps with clear toasts.

**Architecture:** Leverage `react-big-calendar` external drag API (`dragFromOutsideItem`, `onDragOver`, `onDropFromOutside`) to infer snapped slot times. Maintain lightweight UI state for the dragged task and a preview ghost event. Reuse existing scheduling mutations and toast/error handlers; add collision detection against current task events.

**Tech Stack:** React 19, TypeScript, react-big-calendar with drag-and-drop addon, custom hooks (`useFlatTasks`, `useScheduleTask`), Tailwind utility classes for styling.

### Task 1: Understand current calendar drag/drop surface
- **Files:** Read `frontend/src/pages/CalendarPage.tsx`.
- **Steps:**
  1) Identify existing drag handlers (`handleDragStart`, `handleDrop`, `handleDragOver`), scheduler mutations, and event generation.
  2) Note calendar props already in use (`DnDCalendar`, `onEventDrop`, `draggableAccessor`, etc.).

### Task 2: Add state for external drag and ghost preview
- **Files:** Modify `frontend/src/pages/CalendarPage.tsx` near existing UI state hooks.
- **Steps:**
  1) Add `previewEvent` state (`CalendarEvent | null`) and `hoverStart`/`hoverEnd` or derive directly in preview builder.
  2) Ensure `draggedTask` resets on drop, drag end, or navigation/view changes.

### Task 3: Wire react-big-calendar external drag API
- **Files:** `frontend/src/pages/CalendarPage.tsx` where `DnDCalendar` is rendered.
- **Steps:**
  1) Implement `dragFromOutsideItem={() => draggedTask}` so the calendar treats sidebar drag as external items.
  2) Add `onDropFromOutside={({ start }) => ... }` to call `handleScheduleTask(draggedTask, start)` and clear preview/drag state.
  3) Extend the calendar props with `onDragOver={({ start }) => ... }` to set preview timing and block invalid drops (return `false`).
  4) Remove or bypass the old container-level `onDrop`/`onDragOver` wrappers once new handlers are in place.

### Task 4: Ghost preview rendering and styling
- **Files:** `frontend/src/pages/CalendarPage.tsx`.
- **Steps:**
  1) Merge `previewEvent` into the `events` array when present (e.g., `type: 'preview'`, `title` from task, `start`/`end` from hover slot + duration).
  2) Update `eventStyleGetter` to render previews with muted/transparent styling and dashed border; keep other event styles unchanged.
  3) Clear preview on drop, drag leave, blocked hover, and when `draggedTask` is cleared.

### Task 5: Collision detection and guards
- **Files:** `frontend/src/pages/CalendarPage.tsx`.
- **Steps:**
  1) Implement a helper to detect overlap between a candidate start/end and existing `task` events (ignore deep work/admin/buffer/preview).
  2) In `onDragOver`, if hover window is in the past or overlaps, clear preview and return `false` to block drop.
  3) In `onDropFromOutside`, re-check collisions and past-time guard; if blocked, toast via existing notifier (`toast.showError('That time is already booked')`) and do nothing.
  4) Preserve the existing rule that scheduled event moves are disallowed in the past; mirror it for outside drops.

### Task 6: Final cleanup and UX polish
- **Files:** `frontend/src/pages/CalendarPage.tsx`.
- **Steps:**
  1) Ensure `UnscheduledTaskCard` still sets `onDragStart` and add `onDragEnd` to clear state.
  2) Keep sidebar “Schedule” button behavior unchanged.
  3) Ensure preview resets on `onView`/`onNavigate` to avoid stale ghosts across weeks.

### Task 7: Verification
- **Commands:** From repo root: `cd frontend && npm test -- --watch=false` (if suite available); otherwise manual QA below.
- **Manual QA checklist:**
  - Drag unscheduled task onto a free future slot → ghost aligns to slot, drop schedules with original duration and category color.
  - Drag onto occupied slot → preview disappears/blocks, toast shows “That time is already booked,” no event created.
  - Drag into past time → drop blocked, toast shown.
  - Drag, then navigate to another view/week without dropping → preview clears.
  - Existing scheduled event drag/resize still works (no regression).
