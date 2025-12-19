import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { subDays } from 'date-fns';

// Development-only logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

// Query Keys
export const timeHistoryKeys = {
  all: ['timeHistory'] as const,
  slices: (params: api.QuerySlicesParams) => [...timeHistoryKeys.all, 'slices', params] as const,
};

/**
 * Hook for managing Time History queries and mutations.
 * Provides query for historical slices and mutations for update/delete.
 */
export function useTimeHistory(params?: {
  startDate?: Date;
  endDate?: Date;
  dimension?: api.QuerySlicesParams['dimension'];
  category?: string;
  linkedTaskId?: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Default to last 7 days if no dates provided
  const defaultEndDate = params?.endDate || new Date();
  const defaultStartDate = params?.startDate || subDays(defaultEndDate, 7);

  const queryParams: api.QuerySlicesParams = {
    startDate: defaultStartDate.toISOString(),
    endDate: defaultEndDate.toISOString(),
    ...(params?.dimension && { dimension: params.dimension }),
    ...(params?.category && { category: params.category }),
    ...(params?.linkedTaskId && { linkedTaskId: params.linkedTaskId }),
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2761dbf6-7b0b-437d-af41-cb3c6ac13e5f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTimeHistory.ts:42',message:'Query params computed',data:{queryParams,inputStartDate:params?.startDate?.toISOString(),inputEndDate:params?.endDate?.toISOString(),inputDimension:params?.dimension},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion

  // Query for historical slices
  const {
    data: slices = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: timeHistoryKeys.slices(queryParams),
    queryFn: () => api.getTimeSlices(queryParams),
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Mutation to update a slice
  const updateSliceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ start: string; end: string | null; category: string }> }) =>
      api.updateTimeSlice(id, data),
    onError: (err: AxiosError) => {
      console.error('[useTimeHistory] Error updating slice:', err);
      toast.showError((err as any).userMessage || 'Failed to update time slice');
    },
    onSuccess: () => {
      log('[useTimeHistory] Slice updated, invalidating queries');
      queryClient.invalidateQueries({ queryKey: timeHistoryKeys.all });
      // Also invalidate current state in case an active slice was updated
      queryClient.invalidateQueries({ queryKey: ['timeEngine', 'state'] });
    },
  });

  // Mutation to delete a slice
  const deleteSliceMutation = useMutation({
    mutationFn: (id: string) => api.deleteTimeSlice(id),
    onError: (err: AxiosError) => {
      console.error('[useTimeHistory] Error deleting slice:', err);
      toast.showError((err as any).userMessage || 'Failed to delete time slice');
    },
    onSuccess: () => {
      log('[useTimeHistory] Slice deleted, invalidating queries');
      queryClient.invalidateQueries({ queryKey: timeHistoryKeys.all });
      // Also invalidate current state in case an active slice was deleted
      queryClient.invalidateQueries({ queryKey: ['timeEngine', 'state'] });
    },
  });

  return {
    slices,
    loading: isLoading,
    error: error as Error | null,
    refetch,
    updateSlice: updateSliceMutation.mutateAsync,
    deleteSlice: deleteSliceMutation.mutateAsync,
    isUpdating: updateSliceMutation.isPending,
    isDeleting: deleteSliceMutation.isPending,
  };
}

/**
 * Prefetch function for navigation
 */
export function prefetchTimeHistory(queryClient: ReturnType<typeof useQueryClient>, params?: api.QuerySlicesParams) {
  const defaultParams: api.QuerySlicesParams = {
    startDate: subDays(new Date(), 7).toISOString(),
    endDate: new Date().toISOString(),
    ...params,
  };

  queryClient.prefetchQuery({
    queryKey: timeHistoryKeys.slices(defaultParams),
    queryFn: () => api.getTimeSlices(defaultParams),
  });
}

