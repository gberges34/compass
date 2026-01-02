import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import * as api from '../lib/api';
import type { Task, TaskFilters, ProcessCapturedTaskRequest, CompleteTaskRequest, PaginatedResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useMemo } from 'react';
import {
  restoreInfiniteTasksCache,
  updateInfiniteTasksCache,
  type TasksInfiniteData,
} from './taskCache';

// Development-only logging
const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Prefetch Helpers
export const prefetchTasks = (queryClient: QueryClient, filters?: TaskFilters) => {
  return queryClient.prefetchInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam }) => api.getTasks(filters, { cursor: pageParam, limit: 30 }),
    getNextPageParam: (lastPage: PaginatedResponse<Task>) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
};

// Queries

type TasksQueryOptions = Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>;
type InfiniteTasksQueryKey = [...ReturnType<typeof taskKeys.list>, 'infinite'];
type InfiniteTasksQueryOptions = Omit<
  UseInfiniteQueryOptions<
    PaginatedResponse<Task>,
    Error,
    any,
    InfiniteTasksQueryKey,
    string | undefined
  >,
  'queryKey' | 'queryFn' | 'initialPageParam'
>;

type CacheSnapshot = {
  key: InfiniteTasksQueryKey;
  snapshot: TasksInfiniteData;
  updatedCount: number;
};

type TaskMutationContext = {
  cacheSnapshots?: CacheSnapshot[];
};

const buildInfiniteKey = (filters?: TaskFilters) =>
  [...taskKeys.list(filters), 'infinite'] as InfiniteTasksQueryKey;

const nextInfiniteKey = buildInfiniteKey({ status: 'NEXT' });

// Helper to get all active task infinite query keys from the cache
const getAllActiveTaskInfiniteKeys = (queryClient: QueryClient): InfiniteTasksQueryKey[] => {
  const queries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
  return queries
    .map(([key]) => {
      // Check if this is an infinite query key (ends with 'infinite')
      const keyArray = key as unknown[];
      if (Array.isArray(keyArray) && keyArray[keyArray.length - 1] === 'infinite') {
        return keyArray as InfiniteTasksQueryKey;
      }
      return null;
    })
    .filter((key): key is InfiniteTasksQueryKey => key !== null);
};

// Fields that affect backend sorting - if these change, we should invalidate cache
const SORT_AFFECTING_FIELDS: (keyof Task)[] = ['status', 'priority', 'scheduledStart', 'createdAt'];

const describeKey = (key: InfiniteTasksQueryKey) => {
  try {
    return JSON.stringify(key);
  } catch {
    return '[unserializable-key]';
  }
};

const applyOptimisticTaskUpdates = (
  queryClient: QueryClient,
  queryKeys: InfiniteTasksQueryKey[],
  predicate: (task: Task) => boolean,
  updater: (task: Task) => Task,
  scope: string
): CacheSnapshot[] => {
  return queryKeys
    .map((key) => {
      const result = updateInfiniteTasksCache({
        queryClient,
        queryKey: key,
        predicate,
        updater,
      });

      if (!result) {
        log(`[${scope}] No cache hit for key ${describeKey(key)} when applying optimistic update`);
        return null;
      }

      log(
        `[${scope}] Optimistically updated ${result.updatedCount} item(s) for key ${describeKey(key)}`
      );

      return {
        key,
        snapshot: result.snapshot,
        updatedCount: result.updatedCount,
      };
    })
    .filter(Boolean) as CacheSnapshot[];
};

const restoreCacheSnapshots = (
  queryClient: QueryClient,
  snapshots?: CacheSnapshot[]
) => {
  snapshots?.forEach(({ key, snapshot }) => {
    restoreInfiniteTasksCache(queryClient, key, snapshot);
  });
};

// Keep useTasks backwards compatible (returns just data array)
export function useTasks(filters?: TaskFilters, options?: TasksQueryOptions) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const response = await api.getTasks(filters);
      return response.items; // Return just the items array for backwards compatibility
    },
    staleTime: 1000 * 60, // 1 minute for task lists (reduced from 5 minutes for better cross-device sync)
    refetchOnWindowFocus: true, // Re-enable refetch on window focus for task lists
    ...options,
  });
}

// New hook for infinite scroll with pagination
export function useTasksInfinite(filters?: TaskFilters, options?: InfiniteTasksQueryOptions) {
  const queryKey = [...taskKeys.list(filters), 'infinite'] as InfiniteTasksQueryKey;

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = undefined }) => api.getTasks(filters, { cursor: pageParam, limit: 50 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: 1000 * 60, // 1 minute for task lists (reduced from 5 minutes for better cross-device sync)
    refetchOnWindowFocus: true, // Re-enable refetch on window focus for task lists
    ...options,
  });
}

// Helper to flatten pages for components that need a simple array
export function useFlatTasks(filters?: TaskFilters) {
  const { data, ...rest } = useTasksInfinite(filters);

  const tasks = useMemo(() => {
    return data?.pages.flatMap((page: PaginatedResponse<Task>) => page.items) ?? [];
  }, [data]);

  return { tasks, ...rest };
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute for task details (reduced from 5 minutes for better cross-device sync)
    refetchOnWindowFocus: true, // Re-enable refetch on window focus for task details
  });
}

// Mutations

export function useCreateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(task),
    onError: (err: AxiosError) => {
      console.error('[useCreateTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to create task');
    },
    onSuccess: () => {
      log('[useCreateTask] Success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<Task, AxiosError, { id: string; updates: Partial<Task> }, TaskMutationContext>({
    mutationFn: ({ id, updates }) => api.updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get all active task infinite query keys
      const activeKeys = getAllActiveTaskInfiniteKeys(queryClient);

      const cacheSnapshots = applyOptimisticTaskUpdates(
        queryClient,
        activeKeys.length > 0 ? activeKeys : [nextInfiniteKey],
        (task) => task.id === id,
        (task) => ({ ...task, ...updates }),
        'useUpdateTask'
      );

      return { cacheSnapshots };
    },
    onError: (err: AxiosError, variables, context) => {
      restoreCacheSnapshots(queryClient, context?.cacheSnapshots);
      console.error('[useUpdateTask] Error, rolled back:', err);
      toast.showError(err.userMessage || 'Failed to update task');
    },
    onSuccess: (serverTask, variables, context) => {
      log('[useUpdateTask] Success, updating cache with server data');
      
      // Check if any sort-affecting fields were updated
      const updatedSortFields = Object.keys(variables.updates).filter((key) =>
        SORT_AFFECTING_FIELDS.includes(key as keyof Task)
      );

      if (updatedSortFields.length > 0) {
        // If sort-affecting fields changed, invalidate cache to force re-sort
        log(`[useUpdateTask] Sort-affecting fields changed (${updatedSortFields.join(', ')}), invalidating cache`);
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      } else {
        // Otherwise, update all active caches in-place
        const activeKeys = getAllActiveTaskInfiniteKeys(queryClient);
        const keysToUpdate = activeKeys.length > 0 ? activeKeys : [nextInfiniteKey];
        
        keysToUpdate.forEach((key) => {
          updateInfiniteTasksCache({
            queryClient,
            queryKey: key,
            predicate: (task) => task.id === variables.id,
            updater: () => serverTask,
          });
        });
      }

      // Update detail query cache with server-authoritative data
      queryClient.setQueryData(taskKeys.detail(variables.id), serverTask);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onError: (err: AxiosError) => {
      console.error('[useDeleteTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to delete task');
    },
    onSuccess: () => {
      log('[useDeleteTask] Success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useScheduleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<Task, AxiosError, { id: string; scheduledStart: string }, TaskMutationContext>({
    mutationFn: ({ id, scheduledStart }) => api.scheduleTask(id, scheduledStart),
    onMutate: async ({ id, scheduledStart }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get all active task infinite query keys
      const activeKeys = getAllActiveTaskInfiniteKeys(queryClient);

      const cacheSnapshots = applyOptimisticTaskUpdates(
        queryClient,
        activeKeys.length > 0 ? activeKeys : [nextInfiniteKey],
        (task) => task.id === id,
        (task) => ({
          ...task,
          scheduledStart,
          updatedAt: new Date().toISOString(),
        }),
        'useScheduleTask'
      );

      return { cacheSnapshots };
    },
    onError: (err: AxiosError, variables, context) => {
      restoreCacheSnapshots(queryClient, context?.cacheSnapshots);
      console.error('[useScheduleTask] Error, rolled back:', err);
      toast.showError(err.userMessage || 'Failed to schedule task');
    },
    onSuccess: (serverTask, variables) => {
      log('[useScheduleTask] Success, updating cache with server data:', serverTask);
      
      // scheduledStart affects sorting, so invalidate cache to force re-sort
      log('[useScheduleTask] scheduledStart changed, invalidating cache for re-sort');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // Update detail query cache with server-authoritative data
      queryClient.setQueryData(taskKeys.detail(variables.id), serverTask);
    },
  });
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<Task, AxiosError, string, TaskMutationContext>({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get all active task infinite query keys
      const activeKeys = getAllActiveTaskInfiniteKeys(queryClient);

      const cacheSnapshots = applyOptimisticTaskUpdates(
        queryClient,
        activeKeys.length > 0 ? activeKeys : [nextInfiniteKey],
        (task) => task.id === id,
        (task) => ({
          ...task,
          scheduledStart: null,
          updatedAt: new Date().toISOString(),
        }),
        'useUnscheduleTask'
      );

      return { cacheSnapshots };
    },
    onError: (err: AxiosError, variables, context) => {
      restoreCacheSnapshots(queryClient, context?.cacheSnapshots);
      console.error('[useUnscheduleTask] Error, rolled back:', err);
      toast.showError(err.userMessage || 'Failed to unschedule task');
    },
    onSuccess: (serverTask, taskId) => {
      log('[useUnscheduleTask] Success, updating cache with server data:', serverTask);
      
      // scheduledStart affects sorting, so invalidate cache to force re-sort
      log('[useUnscheduleTask] scheduledStart changed, invalidating cache for re-sort');
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });

      // Update detail query cache with server-authoritative data
      queryClient.setQueryData(taskKeys.detail(taskId), serverTask);
    },
  });
}

// Renamed from useEnrichTask
export function useProcessCapturedTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProcessCapturedTaskRequest) => api.processCapturedTask(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useActivateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.activateTask(id),
    onError: (err: AxiosError) => {
      console.error('[useActivateTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to activate task');
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CompleteTaskRequest }) =>
      api.completeTask(id, request),
    onError: (err: AxiosError) => {
      console.error('[useCompleteTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to complete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
