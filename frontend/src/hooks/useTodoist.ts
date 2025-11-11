import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export const todoistKeys = {
  all: ['todoist'] as const,
  pending: () => [...todoistKeys.all, 'pending'] as const,
};

// Prefetch Helpers
export const prefetchTodoistPending = (queryClient: QueryClient) => {
  return queryClient.prefetchQuery({
    queryKey: todoistKeys.pending(),
    queryFn: () => api.getTodoistPending(),
  });
};

export function useTodoistPending() {
  return useQuery({
    queryKey: todoistKeys.pending(),
    queryFn: () => api.getTodoistPending(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useImportTodoistTasks() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (tasks: Array<{ name: string; due?: string }>) =>
      api.importTodoistTasks(tasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoistKeys.pending() });
      toast.showSuccess('Tasks imported successfully');
    },
    onError: (err: AxiosError) => {
      console.error('[useImportTodoistTasks] Error:', err);
      toast.showError(err.userMessage || 'Failed to import tasks');
    },
  });
}
