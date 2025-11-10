# Calendar Page Performance Optimizations

**Date:** 2025-11-10
**Component:** `frontend/src/pages/CalendarPage.tsx`

## Problem

The calendar was regenerating events and re-rendering BigCalendar unnecessarily, causing potential performance issues during drag operations. The console logs showed 4x event regeneration per drag, which is expected with optimistic updates, but other functions were also being recreated unnecessarily.

## Optimizations Applied

### 1. Default View Changed to Week
- Changed `currentView` initial state from `'month'` to `'week'`
- Week view is more performant than month view with many events
- Rationale: Users primarily schedule tasks for the current week

### 2. Memoized Event Style Getter
- Wrapped `eventStyleGetter` with `useCallback`
- Dependencies: `[scheduleTaskMutation.isPending]`
- Impact: Prevents BigCalendar prop changes on every render

### 3. Moved getCategoryColor Outside Component
- Moved pure function to module scope
- No dependencies on component state/props
- Impact: Prevents function recreation on every render

### 4. Memoized Calendar Accessors
- Extracted `tooltipAccessor` with `useCallback`
- Extracted `draggableAccessor` with `useCallback`
- Dependencies: `[]` (no dependencies)
- Impact: Stable references prevent BigCalendar rerenders

### 5. Memoized Unscheduled Task Cards
- Created `UnscheduledTaskCard` memoized component
- Wrapped with `React.memo`
- Created `handleScheduleFromSidebar` callback
- Impact: Task cards only rerender when their props change

### 6. Documented Expected Regeneration
- Added comment explaining 4x event regeneration
- This is expected with optimistic updates + refetch flow:
  1. onMutate (optimistic update)
  2-3. React Query cache synchronization
  4. onSuccess explicit refetch

## Performance Metrics

**Before Optimizations:**
- Event style getter recreated: Every render
- Category color function recreated: Every render
- Accessor functions recreated: Every render
- Task cards rerendered: On every parent update

**After Optimizations:**
- Event style getter recreated: Only when mutation pending state changes
- Category color function recreated: Never (module scope)
- Accessor functions recreated: Never (no dependencies)
- Task cards rerendered: Only when individual task props change

## Testing Checklist

- [x] Calendar opens in week view by default
- [x] Can switch to month/day views
- [x] Drag and drop still works
- [x] Task tooltips display correctly
- [x] Unscheduled tasks render correctly
- [x] Schedule button works
- [x] Optimistic updates work (immediate UI feedback)
- [x] Error states rollback correctly
- [x] Category colors display correctly

## Future Optimization Opportunities

1. **Virtualization for Large Task Lists**: If unscheduled tasks exceed 50+ items, consider react-window
2. **Debounce Event Resize**: Add 100ms debounce to handleEventResize to prevent rapid API calls
3. **Calendar Component Splitting**: Split calendar and sidebar into separate components for better isolation
4. **Event Object Pooling**: If events list exceeds 100+ items, consider object pooling to reduce GC pressure

## References

- React.memo: https://react.dev/reference/react/memo
- useCallback: https://react.dev/reference/react/useCallback
- useMemo: https://react.dev/reference/react/useMemo
- React Big Calendar: https://jquense.github.io/react-big-calendar/
