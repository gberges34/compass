import { useQuery, useInfiniteQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Review, CreateReviewRequest, PaginatedResponse } from '../types';
import { useMemo } from 'react';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (type?: 'DAILY' | 'WEEKLY') =>
    [...reviewKeys.lists(), { type }] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
};

// Prefetch Helpers
export const prefetchReviews = (
  queryClient: QueryClient,
  type?: 'DAILY' | 'WEEKLY'
) => {
  return queryClient.prefetchInfiniteQuery({
    queryKey: reviewKeys.list(type),
    queryFn: ({ pageParam }) => api.getReviews({ type, cursor: pageParam, limit: 30 }),
    getNextPageParam: (lastPage: PaginatedResponse<Review>) => lastPage.pagination.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
};

export function useReviews(type?: 'DAILY' | 'WEEKLY') {
  return useInfiniteQuery({
    queryKey: reviewKeys.list(type),
    queryFn: ({ pageParam }) => api.getReviews({ type, cursor: pageParam, limit: 30 }),
    getNextPageParam: (lastPage: PaginatedResponse<Review>) => lastPage.pagination.nextCursor,
    initialPageParam: undefined as string | undefined,
  });
}

// Helper to flatten pages for components that need a simple array
export function useFlatReviews(type?: 'DAILY' | 'WEEKLY') {
  const { data, ...rest } = useReviews(type);

  const reviews = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  return { reviews, ...rest };
}

export function useReview(id: string) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: () => api.getReview(id),
    enabled: !!id,
  });
}

export function useCreateDailyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateReviewRequest) => api.createDailyReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

export function useCreateWeeklyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateReviewRequest) => api.createWeeklyReview(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}
