# Band-Aid Fixes: Before & After Examples

## Overview
This document provides specific code changes needed to fix each band-aid pattern identified in the codebase.

---

## FIX #1: ReviewsPage.tsx - Manual State to React Query

### Current (Band-Aid)
```typescript
// File: frontend/src/pages/ReviewsPage.tsx
const ReviewsPage: React.FC = () => {
  const toast = useToast();
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
  
  // ... rest of component
};
```

### Fixed (React Query)
```typescript
// File: frontend/src/pages/ReviewsPage.tsx
import { useReviews } from '../hooks/useReviews';

const ReviewsPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReviewType>('DAILY');
  
  // Single hook replaces: useState + useEffect + fetchReviews function
  // Handles: loading, error, caching, refetch, retry
  const { 
    data: reviews = [], 
    isLoading: loading,
    error
  } = useReviews(activeTab);

  // Handle error from hook
  useEffect(() => {
    if (error) {
      toast.showError('Failed to load reviews. Please try again.');
    }
  }, [error, toast]);

  // ... rest of component - no fetchReviews function needed
};
```

### New Hook
```typescript
// File: frontend/src/hooks/useReviews.ts
import { useQuery } from '@tanstack/react-query';
import { getReviews } from '../lib/api';
import type { Review, ReviewType } from '../types';
import { useToast } from '../contexts/ToastContext';

export const useReviews = (type: ReviewType) => {
  const toast = useToast();
  const limit = type === 'DAILY' ? 30 : 12;

  return useQuery({
    queryKey: ['reviews', type],
    queryFn: () => getReviews(type, limit),
    onError: (error) => {
      console.error('Error fetching reviews:', error);
    }
  });
};

// Optional: Prefetch for performance
export const prefetchReviews = (queryClient: QueryClient, type: ReviewType) => {
  return queryClient.prefetchQuery({
    queryKey: ['reviews', type],
    queryFn: () => getReviews(type, type === 'DAILY' ? 30 : 12),
  });
};
```

### Benefits
- Automatic caching between tab switches
- Automatic retry on failure
- No manual loading state
- No manual error handling in component
- Reusable across app
- Built-in stale data handling

---

## FIX #2: TodayPage.tsx - Remove isMounted Checks

### Current (Band-Aid)
```typescript
// File: frontend/src/pages/TodayPage.tsx
const TodayPage: React.FC = () => {
  const toast = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [nextTasks, setNextTasks] = useState<Task[]>([]);
  const [todayLogs, setTodayLogs] = useState<PostDoLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;  // BAND-AID: isMounted flag

    const fetchData = async () => {
      try {
        setLoading(true);

        let dailyPlan: DailyPlan | null = null;
        try {
          dailyPlan = await getTodayPlan();
          if (isMounted) {  // CHECK 1
            setPlan(dailyPlan);
          }
        } catch (err) {
          if (isMounted) {  // CHECK 2
            setPlan(null);
          }
        }

        const active = await getTasks({ status: 'ACTIVE' });
        if (!isMounted) return;  // CHECK 3
        setActiveTasks(active);

        const next = await getTasks({ status: 'NEXT' });
        if (!isMounted) return;  // CHECK 4
        const sortedNext = next.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        setNextTasks(sortedNext.slice(0, 5));

        const todayDate = new Date().toISOString().split('T')[0];
        const logs = await getPostDoLogs({
          startDate: todayDate,
          endDate: todayDate,
        });
        if (!isMounted) return;  // CHECK 5
        setTodayLogs(logs);
      } catch (err) {
        if (isMounted) {
          toast.showError(err instanceof Error ? err.message : 'Failed to load data');
          console.error('Error loading today page data:', err);
        }
      } finally {
        if (isMounted) {  // CHECK 6
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;  // CLEANUP
    };
  }, []);
  
  // ... rest of component
};
```

### Fixed (React Query)
```typescript
// File: frontend/src/pages/TodayPage.tsx
import { useTodayPlan } from '../hooks/useDailyPlans';
import { useTasks } from '../hooks/useTasks';
import { usePostDoLogs } from '../hooks/usePostDoLogs';

const TodayPage: React.FC = () => {
  const toast = useToast();
  
  // Each hook handles its own: loading, error, caching, cleanup
  // NO isMounted checks needed
  // NO manual error handling needed
  const { 
    data: plan, 
    isLoading: planLoading 
  } = useTodayPlan();
  
  const { 
    data: activeTasks = [], 
    isLoading: activeLoading 
  } = useTasks({ status: 'ACTIVE' });
  
  const { 
    data: nextTasks = [], 
    isLoading: nextLoading 
  } = useTasks({ status: 'NEXT' });
  
  const todayDate = new Date().toISOString().split('T')[0];
  const { 
    data: todayLogs = [], 
    isLoading: logsLoading 
  } = usePostDoLogs({
    startDate: todayDate,
    endDate: todayDate,
  });

  // Combine loading states if needed
  const loading = planLoading || activeLoading || nextLoading || logsLoading;

  // Sort next tasks after loading
  const sortedNextTasks = useMemo(() => {
    const priorityOrder = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
    return nextTasks
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 5);
  }, [nextTasks]);

  // ... rest of component with sorted tasks

  // Calculate stats from query data
  const tasksCompletedToday = todayLogs.length;
  const deepWorkHoursToday = todayLogs.reduce(
    (total, log) => total + log.actualDuration / 60,
    0
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-24">
      {/* Component JSX - no isMounted checks needed */}
    </div>
  );
};
```

### Why This Works
- React Query automatically cancels requests on unmount
- No setState on unmounted components
- Hooks provide automatic cleanup
- Each hook manages its own lifecycle
- Parallel requests instead of sequential

---

## FIX #3: ClarifyPage.tsx - Remove Manual Cache Invalidation

### Current (Band-Aid)
```typescript
// File: frontend/src/pages/ClarifyPage.tsx
const handleSaveTask = async () => {
  if (!selectedTask || !enrichedData) return;

  setSaving(true);
  try {
    const priorityMap: Record<number, Priority> = {
      1: 'MUST',
      2: 'SHOULD',
      3: 'COULD',
      4: 'MAYBE',
    };

    await createTask({
      name: enrichedData.name,
      priority: priorityMap[priority],
      category: enrichedData.category as any,
      context: enrichedData.context as any,
      energyRequired: energy,
      duration,
      definitionOfDone: enrichedData.definitionOfDone,
      status: 'NEXT',
      dueDate: selectedTask.dueDate,
    });

    toast.showSuccess('Task saved successfully!');

    // BAND-AID: Manual state mutation
    setPendingTasks(prev => prev.filter(t => t.id !== selectedTask.id));

    // BAND-AID: Manual form reset
    setSelectedTask(null);
    setEnrichedData(null);
  } catch (err) {
    toast.showError('Failed to save task. Please try again.');
    console.error('Error saving task:', err);
  } finally {
    setSaving(false);
  }
};
```

### Fixed (React Query)
```typescript
// File: frontend/src/pages/ClarifyPage.tsx
import { usePendingTasks, useEnrichTask, useCreateTask } from '../hooks/useTodos';
import { queryClient } from '../lib/queryClient';

const ClarifyPage: React.FC = () => {
  const toast = useToast();
  const { data: pendingTasks = [], isLoading: loading } = usePendingTasks();
  const enrichMutation = useEnrichTask();
  
  // Mutation with automatic cache invalidation
  const createMutation = useCreateTask({
    onSuccess: (data) => {
      toast.showSuccess('Task saved successfully!');
      
      // React Query automatically invalidates and refetches
      // This removes the task from pending list automatically
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      
      // Reset form
      setSelectedTask(null);
      setEnrichedData(null);
    },
    onError: (error) => {
      toast.showError('Failed to save task. Please try again.');
      console.error('Error saving task:', error);
    }
  });

  const handleSaveTask = async () => {
    if (!selectedTask || !enrichedData) return;

    const priorityMap: Record<number, Priority> = {
      1: 'MUST',
      2: 'SHOULD',
      3: 'COULD',
      4: 'MAYBE',
    };

    // No manual error handling - mutation handles it
    // No manual state updates - invalidateQueries handles it
    await createMutation.mutateAsync({
      name: enrichedData.name,
      priority: priorityMap[priority],
      category: enrichedData.category as any,
      context: enrichedData.context as any,
      energyRequired: energy,
      duration,
      definitionOfDone: enrichedData.definitionOfDone,
      status: 'NEXT',
      dueDate: selectedTask.dueDate,
    });
  };

  // ... rest of component
};
```

### Updated Hook
```typescript
// File: frontend/src/hooks/useTodos.ts
export const useCreateTask = (options?: {
  onSuccess?: (data: Task) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskData: CreateTaskRequest) => createTask(taskData),
    onSuccess: (data) => {
      // Automatic cache invalidation
      queryClient.invalidateQueries({ queryKey: ['pendingTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    }
  });
};
```

### Benefits
- No manual state mutations
- Single source of truth (server cache)
- Automatic UI updates
- Handles race conditions
- Works across app instances

---

## FIX #4: OrientWestPage.tsx - Remove setTimeout Hack

### Current (Band-Aid)
```typescript
// File: frontend/src/pages/OrientWestPage.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!plan) {
    toast.showError('No plan to update');
    return;
  }

  if (!reflection.trim()) {
    toast.showError('Reflection is required');
    return;
  }

  try {
    setSubmitting(true);

    const request: UpdateDailyPlanRequest = {
      reflection: reflection.trim(),
      actualOutcomes,
      energyMatch,
    };

    await updateDailyPlanReflection(plan.id, request);
    toast.showSuccess('Evening reflection saved successfully! Navigating to Reviews...');

    // BAND-AID: Hardcoded timeout
    setTimeout(() => {
      navigate('/reviews');
    }, 1500);
  } catch (err) {
    toast.showError(err instanceof Error ? err.message : 'Failed to save reflection');
    console.error('Error saving reflection:', err);
  } finally {
    setSubmitting(false);
  }
};
```

### Fixed (React Query)
```typescript
// File: frontend/src/pages/OrientWestPage.tsx
import { useUpdateDailyPlanReflection } from '../hooks/useDailyPlans';

const OrientWestPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Mutation with onSuccess callback
  const updateMutation = useUpdateDailyPlanReflection({
    onSuccess: () => {
      toast.showSuccess('Evening reflection saved successfully!');
      
      // Navigate immediately - no timeout needed
      // Success = API succeeded, so we can navigate
      navigate('/reviews');
    },
    onError: (error) => {
      toast.showError(error instanceof Error ? error.message : 'Failed to save reflection');
      console.error('Error saving reflection:', error);
    }
  });

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [actualOutcomes, setActualOutcomes] = useState<number>(0);
  const [energyMatch, setEnergyMatch] = useState<EnergyMatch>('MOSTLY_ALIGNED');
  const [reflection, setReflection] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plan) {
      toast.showError('No plan to update');
      return;
    }

    if (!reflection.trim()) {
      toast.showError('Reflection is required');
      return;
    }

    // No try/catch - mutation handles errors via onError
    // No setTimeout - onSuccess handles navigation
    await updateMutation.mutateAsync({
      id: plan.id,
      reflection: reflection.trim(),
      actualOutcomes,
      energyMatch,
    });
  };

  // ... rest of component
};
```

### Updated Hook
```typescript
// File: frontend/src/hooks/useDailyPlans.ts
export const useUpdateDailyPlanReflection = (options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) => {
  return useMutation({
    mutationFn: ({ id, ...request }: { id: string } & UpdateDailyPlanRequest) =>
      updateDailyPlanReflection(id, request),
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    }
  });
};
```

### Benefits
- No arbitrary delays
- Navigation happens when API succeeds
- No tight coupling to toast
- Consistent timing
- Better error handling

---

## FIX #5: OrientEastPage.tsx - Add Cleanup or Migrate

### Current (Band-Aid)
```typescript
// File: frontend/src/pages/OrientEastPage.tsx
useEffect(() => {
  const checkExistingPlan = async () => {
    try {
      setLoading(true);
      const plan = await getTodayPlan();
      setExistingPlan(plan);
    } catch (err) {
      // No plan exists yet, that's fine
      setExistingPlan(null);
      setIsEditing(true); // Show form if no plan exists
    } finally {
      setLoading(false);
    }
  };

  checkExistingPlan();
  // BAND-AID: No cleanup function!
}, []);
```

### Fixed (React Query)
```typescript
// File: frontend/src/pages/OrientEastPage.tsx
import { useTodayPlan } from '../hooks/useDailyPlans';

const OrientEastPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // React Query handles loading, error, and cleanup
  const { 
    data: existingPlan, 
    isLoading: loading, 
    isError 
  } = useTodayPlan();

  // Effect to handle editing mode based on error state
  useEffect(() => {
    if (isError) {
      // No plan exists - show form
      setIsEditing(true);
    } else if (existingPlan) {
      // Plan exists - show read-only view
      setIsEditing(false);
    }
  }, [isError, existingPlan]);

  // ... rest of component
};
```

### Benefits
- Automatic cleanup on unmount
- No memory leaks
- React Query manages request lifecycle
- No try/catch needed
- Cleaner logic flow

---

## FIX #6: Global - Centralize Error Handling

### Pattern: Error Handling Hook
```typescript
// File: frontend/src/hooks/useErrorHandler.ts
import { useToast } from '../contexts/ToastContext';

export const useErrorHandler = () => {
  const toast = useToast();

  const handleError = (error: Error | unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    toast.showError(message);
    console.error(fallbackMessage, error);
  };

  return { handleError };
};
```

### Usage Pattern
```typescript
// In all query hooks - automatic error handling
export const useReviews = (type: ReviewType) => {
  return useQuery({
    queryKey: ['reviews', type],
    queryFn: () => getReviews(type),
    onError: (error) => {
      toast.showError('Failed to load reviews');
      console.error('Reviews error:', error);
    }
  });
};

// In components - no manual error handling in catch blocks
const { 
  data: reviews = [], 
  isLoading: loading, 
  error 
} = useReviews(activeTab);
```

---

## Summary of Changes

| File | Changes | Band-Aids Fixed | Impact |
|------|---------|-----------------|--------|
| ReviewsPage.tsx | Use useReviews hook | Manual state (1) | -40 lines, +1 hook |
| TodayPage.tsx | Use 3 hooks, remove isMounted | isMounted (5), manual state | -60 lines, +3 hooks |
| ClarifyPage.tsx | Use hooks + invalidateQueries | Manual cache (1), manual state | -20 lines, +2 hooks |
| OrientWestPage.tsx | Use mutation callback, remove setTimeout | setTimeout (1), isMounted (3) | -15 lines, +1 hook |
| OrientEastPage.tsx | Use hooks, add useEffect | No cleanup (1) | -10 lines, +1 hook |
| Global | Centralize error handling | Duplicate error handling (5+) | Better maintainability |

