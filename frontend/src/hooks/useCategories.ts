import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import type { CategoryEntity } from '../types';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: { includeArchived?: boolean }) => [...categoryKeys.lists(), { filters }] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const prefetchCategories = (queryClient: QueryClient) => {
  return queryClient.prefetchQuery({
    queryKey: categoryKeys.list(),
    queryFn: api.getCategories,
    staleTime: FIVE_MINUTES_MS,
  });
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: api.getCategories,
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: api.createCategory,
    onSuccess: (created) => {
      queryClient.setQueryData<CategoryEntity[]>(categoryKeys.list(), (prev) => {
        if (!prev) return [created];
        return [created, ...prev];
      });
    },
    onError: (err: any) => {
      toast.showError(err?.userMessage || 'Failed to create category');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: api.UpdateCategoryInput }) =>
      api.updateCategory(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = queryClient.getQueryData<CategoryEntity[]>(categoryKeys.list());

      queryClient.setQueryData<CategoryEntity[]>(categoryKeys.list(), (prev) => {
        if (!prev) return prev;
        return prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat));
      });

      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(categoryKeys.list(), context.previous);
      }
      toast.showError(err?.userMessage || 'Failed to update category');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: api.deleteCategory,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = queryClient.getQueryData<CategoryEntity[]>(categoryKeys.list());
      queryClient.setQueryData<CategoryEntity[]>(categoryKeys.list(), (prev) => {
        if (!prev) return prev;
        return prev.map((cat) => (cat.id === id ? { ...cat, isArchived: true } : cat));
      });
      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(categoryKeys.list(), context.previous);
      }
      toast.showError(err?.userMessage || 'Failed to archive category');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
