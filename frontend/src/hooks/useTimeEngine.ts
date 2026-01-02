import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

// Development-only logging
const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};

// Query Keys
export const timeEngineKeys = {
  all: ['timeEngine'] as const,
  state: () => [...timeEngineKeys.all, 'state'] as const,
};

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

/**
 * Hook for managing Time Engine state.
 * Automatically polls for current state and provides mutation functions.
 */
export function useTimeEngine() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Query for current state
  const {
    data: state,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: timeEngineKeys.state(),
    queryFn: () => api.getTimeEngineState(),
    refetchInterval: POLL_INTERVAL,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Mutation to start a slice
  const startSliceMutation = useMutation({
    mutationFn: (request: api.StartSliceRequest) => api.startTimeSlice(request),
    onError: (err: AxiosError) => {
      console.error('[useTimeEngine] Error starting slice:', err);
      toast.showError(err.userMessage || 'Failed to start time slice');
    },
    onSuccess: () => {
      log('[useTimeEngine] Slice started, invalidating state');
      queryClient.invalidateQueries({ queryKey: timeEngineKeys.state() });
    },
  });

  // Mutation to stop a slice
  const stopSliceMutation = useMutation({
    mutationFn: (request: api.StopSliceRequest) => api.stopTimeSlice(request),
    onError: (err: AxiosError) => {
      console.error('[useTimeEngine] Error stopping slice:', err);
      toast.showError(err.userMessage || 'Failed to stop time slice');
    },
    onSuccess: () => {
      log('[useTimeEngine] Slice stopped, invalidating state');
      queryClient.invalidateQueries({ queryKey: timeEngineKeys.state() });
    },
  });

  // Convenience functions
  const startSlice = async (
    category: string,
    dimension: api.StartSliceRequest['dimension'],
    source: api.StartSliceRequest['source'] = 'MANUAL',
    linkedTaskId?: string
  ) => {
    await startSliceMutation.mutateAsync({
      category,
      dimension,
      source,
      linkedTaskId,
    });
  };

  const stopSlice = async (
    dimension: api.StopSliceRequest['dimension'],
    category?: string
  ) => {
    await stopSliceMutation.mutateAsync({ dimension, category });
  };

  const refresh = async () => {
    await refetch();
  };

  return {
    state: state || null,
    loading: isLoading,
    error: error as Error | null,
    startSlice,
    stopSlice,
    refresh,
    isStarting: startSliceMutation.isPending,
    isStopping: stopSliceMutation.isPending,
  };
}

