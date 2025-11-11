import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { DailyPlan, CreateDailyPlanRequest, UpdateDailyPlanRequest } from '../types';

// Query Keys
export const dailyPlanKeys = {
  all: ['dailyPlans'] as const,
  today: () => [...dailyPlanKeys.all, 'today'] as const,
  byDate: (date: string) => [...dailyPlanKeys.all, 'date', date] as const,
};

// Prefetch Helpers
export const prefetchTodayPlan = (queryClient: QueryClient) => {
  return queryClient.prefetchQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: () => api.getTodayPlan(),
  });
};

export const prefetchDailyPlan = (queryClient: QueryClient, date: string) => {
  return queryClient.prefetchQuery({
    queryKey: dailyPlanKeys.byDate(date),
    queryFn: () => api.getPlanByDate(date),
  });
};

// Queries

export function useTodayPlan() {
  return useQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: async () => {
      try {
        return await api.getTodayPlan();
      } catch (error: any) {
        // 404 means no plan exists yet - this is expected and acceptable
        if (error.response?.status === 404) {
          return null;
        }
        // Re-throw other errors (network issues, 500s, etc.)
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useDailyPlan(date: string) {
  return useQuery({
    queryKey: dailyPlanKeys.byDate(date),
    queryFn: () => api.getPlanByDate(date),
    enabled: !!date,
  });
}

// Mutations

export function useCreateDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateDailyPlanRequest) => api.createDailyPlan(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.today() });
      queryClient.setQueryData(dailyPlanKeys.byDate(data.date.toString().split('T')[0]), data);
    },
  });
}

export function useUpdateDailyPlanReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, request }: { planId: string; request: UpdateDailyPlanRequest }) =>
      api.updateDailyPlanReflection(planId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyPlanKeys.all });
    },
  });
}
