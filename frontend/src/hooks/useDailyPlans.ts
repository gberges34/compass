import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { DailyPlan, CreateDailyPlanRequest, UpdateDailyPlanRequest } from '../types';

// Query Keys
export const dailyPlanKeys = {
  all: ['dailyPlans'] as const,
  today: () => [...dailyPlanKeys.all, 'today'] as const,
  byDate: (date: string) => [...dailyPlanKeys.all, 'date', date] as const,
};

// Queries

export function useTodayPlan() {
  return useQuery({
    queryKey: dailyPlanKeys.today(),
    queryFn: () => api.getTodayPlan(),
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
