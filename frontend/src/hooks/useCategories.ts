import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import type { CategoryEntity } from '../types';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

type CategoriesFilters = api.GetCategoriesFilters;

const normalizeFilters = (filters?: CategoriesFilters): Required<CategoriesFilters> => ({
  includeArchived: !!filters?.includeArchived,
});

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: CategoriesFilters) => [...categoryKeys.lists(), { filters: normalizeFilters(filters) }] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const prefetchCategories = (queryClient: QueryClient, filters?: CategoriesFilters) => {
  const normalizedFilters = normalizeFilters(filters);
  return queryClient.prefetchQuery({
    queryKey: categoryKeys.list(normalizedFilters),
    queryFn: () => api.getCategories(normalizedFilters),
    staleTime: FIVE_MINUTES_MS,
  });
};

export function useCategories(filters?: CategoriesFilters) {
  const normalizedFilters = normalizeFilters(filters);
  return useQuery({
    queryKey: categoryKeys.list(normalizedFilters),
    queryFn: () => api.getCategories(normalizedFilters),
    staleTime: FIVE_MINUTES_MS,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: api.createCategory,
    onSuccess: (created) => {
      const listQueries = queryClient.getQueriesData<CategoryEntity[]>({ queryKey: categoryKeys.lists() });
      listQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        const maybeFilters = (queryKey as any[])?.at(-1)?.filters as Required<CategoriesFilters> | undefined;
        const includeArchived = !!maybeFilters?.includeArchived;

        if (!includeArchived && created.isArchived) return;
        queryClient.setQueryData<CategoryEntity[]>(queryKey, [created, ...data]);
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
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() });
      const previous = queryClient.getQueriesData<CategoryEntity[]>({ queryKey: categoryKeys.lists() });

      previous.forEach(([queryKey]) => {
        queryClient.setQueryData<CategoryEntity[]>(queryKey, (prevData) => {
          if (!prevData) return prevData;
          const maybeFilters = (queryKey as any[])?.at(-1)?.filters as Required<CategoriesFilters> | undefined;
          const includeArchived = !!maybeFilters?.includeArchived;

          return prevData.flatMap((cat) => {
            if (cat.id !== id) return [cat];
            const next = { ...cat, ...updates };
            if (!includeArchived && next.isArchived) return [];
            return [next];
          });
        });
      });

      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
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
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() });
      const previous = queryClient.getQueriesData<CategoryEntity[]>({ queryKey: categoryKeys.lists() });
      previous.forEach(([queryKey]) => {
        queryClient.setQueryData<CategoryEntity[]>(queryKey, (prevData) => {
          if (!prevData) return prevData;
          const maybeFilters = (queryKey as any[])?.at(-1)?.filters as Required<CategoriesFilters> | undefined;
          const includeArchived = !!maybeFilters?.includeArchived;

          return prevData.flatMap((cat) => {
            if (cat.id !== id) return [cat];
            const archived = { ...cat, isArchived: true };
            if (!includeArchived) return [];
            return [archived];
          });
        });
      });
      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        context.previous.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.showError(err?.userMessage || 'Failed to archive category');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
