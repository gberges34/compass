# Passive Refresh Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add passive refresh capability to CalendarPage that automatically refetches data every 60 seconds while the tab is visible

**Architecture:** Create a React hook to track document visibility using the Page Visibility API. Extend existing data hooks to accept React Query options. Configure CalendarPage to refetch data periodically only while visible.

**Tech Stack:** React, TypeScript, React Query (@tanstack/react-query), Page Visibility API

---

## Task 1: Create useDocumentVisibility Hook with Tests

**Files:**
- Create: `frontend/src/hooks/__tests__/useDocumentVisibility.test.tsx`
- Create: `frontend/src/hooks/useDocumentVisibility.ts`

**Step 1: Write the failing test**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useDocumentVisibility } from '../useDocumentVisibility';

describe('useDocumentVisibility', () => {
  it('returns true when document is visible', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);
  });

  it('returns false when document is hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(false);
  });

  it('updates visibility state when visibilitychange event fires', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);

    // Simulate document becoming hidden
    Object.defineProperty(document, 'hidden', { value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(false);

    // Simulate document becoming visible again
    Object.defineProperty(document, 'hidden', { value: false });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(true);
  });

  it('defaults to true in SSR/test environments where document may be undefined', () => {
    const originalDocument = global.document;
    // @ts-ignore
    delete global.document;

    const { result } = renderHook(() => useDocumentVisibility());
    expect(result.current).toBe(true);

    global.document = originalDocument;
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useDocumentVisibility());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/gberges/compass/frontend && npm test -- useDocumentVisibility.test.tsx`

Expected: FAIL with "Module not found: Can't resolve '../useDocumentVisibility'"

**Step 3: Write minimal implementation**

```typescript
import { useEffect, useState } from 'react';

/**
 * Returns true when the document is visible (not hidden).
 * Defaults to true in SSR/test environments where document may be undefined.
 */
export function useDocumentVisibility() {
  const getVisibilityState = () => {
    if (typeof document === 'undefined') {
      return true;
    }
    return !document.hidden;
  };

  const [isVisible, setIsVisible] = useState<boolean>(getVisibilityState);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleChange = () => {
      setIsVisible(getVisibilityState());
    };

    document.addEventListener('visibilitychange', handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleChange);
    };
  }, []);

  return isVisible;
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/gberges/compass/frontend && npm test -- useDocumentVisibility.test.tsx`

Expected: PASS (all 5 tests pass)

**Step 5: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useDocumentVisibility.ts frontend/src/hooks/__tests__/useDocumentVisibility.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useDocumentVisibility hook

Add React hook that tracks document visibility using the Page Visibility
API. Returns true when tab is visible, false when hidden. Handles SSR/test
environments gracefully by defaulting to true.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extend useTasks Hook to Accept Query Options

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts:1-36`

**Step 1: Write test for options parameter**

Create file: `frontend/src/hooks/__tests__/useTasks-options.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '../useTasks';
import * as api from '../../lib/api';

jest.mock('../../lib/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTasks with options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts and applies refetchInterval option', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue(mockTasks);

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }, { refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });

  it('accepts and applies refetchOnWindowFocus option', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue(mockTasks);

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }, { refetchOnWindowFocus: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });

  it('works without options parameter (backward compatibility)', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue(mockTasks);

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/gberges/compass/frontend && npm test -- useTasks-options.test.tsx`

Expected: TypeScript error about useTasks not accepting second parameter

**Step 3: Implement options parameter in useTasks**

In `frontend/src/hooks/useTasks.ts`, update the imports and useTasks function:

```typescript
// Update line 1:
import { useQuery, useMutation, useQueryClient, QueryClient, type UseQueryOptions } from '@tanstack/react-query';

// Update lines 29-36:
type TasksQueryOptions = Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>;

export function useTasks(filters?: TaskFilters, options?: TasksQueryOptions) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.getTasks(filters),
    ...options,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/gberges/compass/frontend && npm test -- useTasks-options.test.tsx`

Expected: PASS (all 3 tests pass)

**Step 5: Run existing tests to ensure no regression**

Run: `cd /Users/gberges/compass/frontend && npm test -- useTasks.test.tsx`

Expected: PASS (all existing tests still pass)

**Step 6: Type check**

Run: `cd /Users/gberges/compass/frontend && npx tsc --noEmit`

Expected: No type errors

**Step 7: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useTasks.ts frontend/src/hooks/__tests__/useTasks-options.test.tsx
git commit -m "$(cat <<'EOF'
feat: add options parameter to useTasks hook

Extend useTasks to accept optional React Query options, enabling callers
to configure refetch behavior, stale time, and other query settings while
maintaining backward compatibility.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extend useTodayPlan Hook to Accept Query Options

**Files:**
- Modify: `frontend/src/hooks/useDailyPlans.ts:1,29-45`

**Step 1: Write test for options parameter**

Create file: `frontend/src/hooks/__tests__/useDailyPlans-options.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodayPlan } from '../useDailyPlans';
import * as api from '../../lib/api';

jest.mock('../../lib/api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTodayPlan with options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts and applies refetchInterval option', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan({ refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('accepts and applies refetchOnWindowFocus option', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan({ refetchOnWindowFocus: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('works without options parameter (backward compatibility)', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('handles 404 responses gracefully with options', async () => {
    const error = { response: { status: 404 } };
    (api.getTodayPlan as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useTodayPlan({ refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(null);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/gberges/compass/frontend && npm test -- useDailyPlans-options.test.tsx`

Expected: TypeScript error about useTodayPlan not accepting parameters

**Step 3: Implement options parameter in useTodayPlan**

In `frontend/src/hooks/useDailyPlans.ts`:

```typescript
// Update line 1:
import { useQuery, useMutation, useQueryClient, QueryClient, type UseQueryOptions } from '@tanstack/react-query';

// Update lines 27-46:
type TodayPlanQueryOptions = Omit<UseQueryOptions<DailyPlan | null, Error>, 'queryKey' | 'queryFn'>;

export function useTodayPlan(options?: TodayPlanQueryOptions) {
  return useQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: async () => {
      try {
        return await api.getTodayPlan();
      } catch (error: any) {
        // 404 means no plan exists yet - this is expected and acceptable
        if (error.response?.status === 404) {
          return null;
        }
        // Re-throw other errors (network issues, 500s, etc.)
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/gberges/compass/frontend && npm test -- useDailyPlans-options.test.tsx`

Expected: PASS (all 4 tests pass)

**Step 5: Type check**

Run: `cd /Users/gberges/compass/frontend && npx tsc --noEmit`

Expected: No type errors

**Step 6: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/hooks/useDailyPlans.ts frontend/src/hooks/__tests__/useDailyPlans-options.test.tsx
git commit -m "$(cat <<'EOF'
feat: add options parameter to useTodayPlan hook

Extend useTodayPlan to accept optional React Query options, enabling
callers to configure refetch behavior while maintaining backward
compatibility and the existing 404 error handling logic.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update CalendarPage to Use Passive Refresh

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx:11-12,111-116`

**Step 1: Write integration test**

Create file: `frontend/src/pages/__tests__/CalendarPage-passive-refresh.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from '../CalendarPage';
import * as api from '../../lib/api';

jest.mock('../../lib/api');
jest.mock('../../hooks/useDocumentVisibility');

import { useDocumentVisibility } from '../../hooks/useDocumentVisibility';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CalendarPage passive refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getTasks as jest.Mock).mockResolvedValue([]);
    (api.getTodayPlan as jest.Mock).mockResolvedValue(null);
  });

  it('enables refetch when document is visible', async () => {
    (useDocumentVisibility as jest.Mock).mockReturnValue(true);

    render(<CalendarPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    expect(api.getTasks).toHaveBeenCalled();
    expect(api.getTodayPlan).toHaveBeenCalled();
  });

  it('disables refetch when document is hidden', async () => {
    (useDocumentVisibility as jest.Mock).mockReturnValue(false);

    render(<CalendarPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    expect(api.getTasks).toHaveBeenCalled();
    expect(api.getTodayPlan).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/gberges/compass/frontend && npm test -- CalendarPage-passive-refresh.test.tsx`

Expected: FAIL (CalendarPage not using useDocumentVisibility yet)

**Step 3: Implement passive refresh in CalendarPage**

In `frontend/src/pages/CalendarPage.tsx`:

```typescript
// Add to imports (after line 12):
import { useDocumentVisibility } from '../hooks/useDocumentVisibility';

// Remove unused import (line 17):
// Remove: import { getCategoryStyle } from '../lib/designTokens';

// Update lines 111-116:
const CalendarPage: React.FC = () => {
  const toast = useToast();
  const isDocumentVisible = useDocumentVisibility();
  // Keep passive refresh active only while the calendar tab is visible.
  const refetchInterval = isDocumentVisible ? 60_000 : false;

  // React Query hooks - replace manual state management
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(
    { status: 'NEXT' },
    {
      refetchInterval,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
    }
  );
  const { data: todayPlan, isLoading: planLoading } = useTodayPlan({
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/gberges/compass/frontend && npm test -- CalendarPage-passive-refresh.test.tsx`

Expected: PASS (both tests pass)

**Step 5: Run all CalendarPage tests**

Run: `cd /Users/gberges/compass/frontend && npm test -- CalendarPage`

Expected: PASS (all tests pass including new ones)

**Step 6: Type check**

Run: `cd /Users/gberges/compass/frontend && npx tsc --noEmit`

Expected: No type errors

**Step 7: Commit**

```bash
cd /Users/gberges/compass
git add frontend/src/pages/CalendarPage.tsx frontend/src/pages/__tests__/CalendarPage-passive-refresh.test.tsx
git commit -m "$(cat <<'EOF'
feat: add passive refresh to CalendarPage

Implement automatic data refresh every 60 seconds while the calendar tab
is visible. Pauses refreshing when tab is hidden to save resources.

Refreshes both tasks and daily plans using React Query's refetchInterval
with visibility tracking from useDocumentVisibility hook.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Manual Testing and Verification

**Files:**
- Test in browser

**Step 1: Start development server**

Run: `cd /Users/gberges/compass && npm run dev`

Expected: Dev server starts successfully on http://localhost:5173

**Step 2: Open browser and navigate to calendar**

1. Open http://localhost:5173 in browser
2. Log in if required
3. Navigate to Calendar page

**Step 3: Verify passive refresh is working**

1. Open browser DevTools Network tab
2. Filter for XHR/Fetch requests
3. Observe that requests to `/api/tasks` and `/api/plans/today` occur every ~60 seconds
4. Switch to a different tab
5. Wait 2+ minutes
6. Switch back to calendar tab
7. Verify requests stopped while hidden and resume when visible

**Step 4: Verify no console errors**

Check browser console for any errors or warnings related to:
- useDocumentVisibility
- React Query
- Component rendering

**Step 5: Verify functionality still works**

- Drag and drop tasks to schedule them
- Unschedule tasks
- View task details
- Verify calendar displays correctly

Expected: All functionality works as before, with data refreshing automatically

**Step 6: Document testing results**

Create testing notes in this plan document showing that manual testing passed.

---

## Task 6: Final Verification and Cleanup

**Step 1: Run full test suite**

Run: `cd /Users/gberges/compass/frontend && npm test -- --passWithNoTests`

Expected: All tests pass

**Step 2: Run full type check**

Run: `cd /Users/gberges/compass/frontend && npx tsc --noEmit`

Expected: No type errors

**Step 3: Run linter**

Run: `cd /Users/gberges/compass/frontend && npm run lint`

Expected: No linting errors

**Step 4: Verify git status**

Run: `cd /Users/gberges/compass && git status`

Expected: Working tree clean (all changes committed)

**Step 5: Review commit history**

Run: `cd /Users/gberges/compass && git log --oneline -6`

Expected: See 4 feature commits for:
1. useDocumentVisibility hook
2. useTasks options parameter
3. useTodayPlan options parameter
4. CalendarPage passive refresh

---

## Implementation Notes

### DRY Principle
- Reused existing React Query configuration
- Shared visibility state via single hook
- No duplication of refetch logic

### YAGNI Principle
- Only added options parameter where needed (useTasks, useTodayPlan)
- Didn't add options to mutations (not needed for this feature)
- Kept refetch interval simple (60s constant, no configuration)

### TDD Approach
- Wrote tests before implementation for each component
- Verified tests fail before implementing
- Verified tests pass after implementing
- Maintained existing test coverage

### Performance Considerations
- Refreshing stops when tab is hidden (saves server resources)
- Using React Query's built-in refetch mechanism (optimized)
- 60-second interval prevents excessive requests
- refetchOnWindowFocus disabled to avoid double-fetch

### Backward Compatibility
- All existing call sites continue to work
- Options parameters are optional
- No breaking changes to API
