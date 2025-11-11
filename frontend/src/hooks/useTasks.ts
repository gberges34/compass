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
import type { Task, TaskFilters, EnrichTaskRequest, CompleteTaskRequest, PaginatedResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useMemo } from 'react';

// Development-only logging
const DEBUG = process.env.NODE_ENV === 'development';
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

// Keep useTasks backwards compatible (returns just data array)
export function useTasks(filters?: TaskFilters, options?: TasksQueryOptions) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const response = await api.getTasks(filters);
      return response.items; // Return just the items array for backwards compatibility
    },
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
    ...options,
  });
}

// Helper to flatten pages for components that need a simple array
export function useFlatTasks(filters?: TaskFilters): { tasks: Task[]; [key: string]: any } {
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

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onError: (err: AxiosError) => {
      console.error('[useUpdateTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to update task');
    },
    onSuccess: (_, variables) => {
      log('[useUpdateTask] Success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
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

  return useMutation({
    mutationFn: ({ id, scheduledStart }: { id: string; scheduledStart: string }) =>
      api.scheduleTask(id, scheduledStart),
    onError: (err: AxiosError) => {
      console.error('[useScheduleTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to schedule task');
    },
    onSuccess: (data) => {
      log('[useScheduleTask] Success response:', data);
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onError: (err: AxiosError) => {
      console.error('[useUnscheduleTask] Error:', err);
      toast.showError(err.userMessage || 'Failed to unschedule task');
    },
    onSuccess: (data) => {
      log('[useUnscheduleTask] Success response:', data);
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
