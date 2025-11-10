import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { Review, CreateReviewRequest } from '../types';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (type?: 'DAILY' | 'WEEKLY', limit?: number) =>
    [...reviewKeys.lists(), { type, limit }] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
};

export function useReviews(type?: 'DAILY' | 'WEEKLY', limit?: number) {
  return useQuery({
    queryKey: reviewKeys.list(type, limit),
    queryFn: () => api.getReviews(type, limit),
  });
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
