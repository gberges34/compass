import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Task, TaskFilters, EnrichTaskRequest, CompleteTaskRequest } from '../types';
import { useToast } from '../contexts/ToastContext';

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
  const toast = useToast();

  return useMutation({
    mutationFn: (task: Partial<Task>) => api.createTask(task),
    onMutate: async (newTask) => {
      log('[useCreateTask] onMutate called:', newTask);

      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot current state
      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Optimistically add the new task (with temporary ID)
      const optimisticTask: Task = {
        id: `temp-${Date.now()}`,
        name: newTask.name || 'New Task',
        status: newTask.status || 'NEXT',
        priority: newTask.priority || 'COULD',
        category: newTask.category || 'PERSONAL',
        duration: newTask.duration || 30,
        energyRequired: newTask.energyRequired || 'MEDIUM',
        context: newTask.context || 'ANYWHERE',
        definitionOfDone: newTask.definitionOfDone || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...newTask,
      } as Task;

      // Add to ALL cached lists that match the task's filters
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          // Check if this cache entry would include the new task
          const filters = (queryKey as any[])[2]?.filters;
          const shouldInclude = !filters ||
            ((!filters.status || filters.status === optimisticTask.status) &&
            (!filters.category || filters.category === optimisticTask.category) &&
            (!filters.priority || filters.priority === optimisticTask.priority) &&
            (!filters.energyRequired || filters.energyRequired === optimisticTask.energyRequired));

          if (shouldInclude) {
            queryClient.setQueryData(queryKey, (old: Task[] = []) => [...old, optimisticTask]);
          }
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useCreateTask] Error:', err);
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to create task');
    },
    onSuccess: () => {
      log('[useCreateTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      api.updateTask(id, updates),
    onMutate: async ({ id, updates }) => {
      log('[useUpdateTask] onMutate called:', { id, updates });

      // Cancel all task queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Get ALL cached task lists
      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Update task in ALL cached lists
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.map((task) =>
              task.id === id
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            )
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useUpdateTask] Error:', err);
      // Rollback ALL cache entries
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to update task');
    },
    onSuccess: (_, variables) => {
      log('[useUpdateTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: async (id) => {
      log('[useDeleteTask] onMutate called:', { id });

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      // Remove task from ALL cached lists
      allCachedQueries.forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(queryKey, (old: Task[] = []) =>
            old.filter((task) => task.id !== id)
          );
        }
      });

      return { allCachedQueries };
    },
    onError: (err, variables, context) => {
      console.error('[useDeleteTask] Error:', err);
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError('Failed to delete task');
    },
    onSuccess: () => {
      log('[useDeleteTask] Success, refetching queries');
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
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
      log('[useScheduleTask] onMutate called:', { id, scheduledStart });

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
      log('[useScheduleTask] Success response:', data);
      // Explicitly refetch all task queries to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
    onSettled: () => {
      log('[useScheduleTask] Mutation settled');
    },
  });
}

export function useUnscheduleTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => api.unscheduleTask(id),
    onMutate: async (id) => {
      log('[useUnscheduleTask] onMutate called:', { id });

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
      log('[useUnscheduleTask] Success response:', data);
      // Explicitly refetch all task queries to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
    onSettled: () => {
      log('[useUnscheduleTask] Mutation settled');
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
      queryClient.refetchQueries({ queryKey: taskKeys.detail(id) });
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CompleteTaskRequest }) =>
      api.completeTask(id, request),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: taskKeys.lists() });
    },
  });
}
