import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Task, TaskFilters, EnrichTaskRequest, CompleteTaskRequest } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query Keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Queries

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => api.getTasks(filters),
  });
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

  return useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
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

export function useUnscheduleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

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

  return useMutation({
    mutationFn: (id: string) => api.activateTask(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CompleteTaskRequest }) =>
      api.completeTask(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
