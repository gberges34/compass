import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScheduleTask, useUnscheduleTask, taskKeys } from './useTasks';
import * as api from '../lib/api';
import type { Task } from '../types';

// Mock the API
jest.mock('../lib/api', () => ({
  scheduleTask: jest.fn(),
  unscheduleTask: jest.fn(),
}));

// Mock the toast context
jest.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

describe('Task Scheduling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTask: Task = {
    id: 'test-task-id',
    name: 'Test Task',
    status: 'NEXT',
    priority: 'SHOULD',
    category: 'PERSONAL',
    context: 'HOME',
    energyRequired: 'MEDIUM',
    duration: 60,
    definitionOfDone: 'Task completed',
    createdAt: '2025-11-10T10:00:00.000Z',
    updatedAt: '2025-11-10T10:00:00.000Z',
  };

  const mockScheduledTask: Task = {
    ...mockTask,
    scheduledStart: '2025-12-25T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };

  describe('useScheduleTask', () => {
    it('should schedule a task successfully', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Pre-populate cache with the task
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify success
      expect(result.current.isSuccess).toBe(true);
      expect(api.scheduleTask).toHaveBeenCalledWith('test-task-id', scheduledStart);
      expect(api.scheduleTask).toHaveBeenCalledTimes(1);
    });

    it('should update cache with scheduled start time during optimistic update', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockScheduledTask), 100))
      );

      // Pre-populate cache with the task
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Verify optimistic update was applied immediately
      // (the cache should be updated even before the mutation completes)
      await waitFor(() => {
        const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
        expect(cachedTasks).toBeDefined();
        expect(cachedTasks?.[0]?.scheduledStart).toBe(scheduledStart);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify cache still has the scheduled time
      const finalCachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(finalCachedTasks?.[0]?.scheduledStart).toBe(scheduledStart);
    });

    it('should update all cached task lists on schedule', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Pre-populate multiple cache entries with different filters
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);
      queryClient.setQueryData(taskKeys.list({ status: 'ACTIVE' }), [mockTask]);
      queryClient.setQueryData(taskKeys.list({}), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify all cache entries were updated
      const nextStatusTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      const activeTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'ACTIVE' }));
      const allTasks = queryClient.getQueryData<Task[]>(taskKeys.list({}));

      expect(nextStatusTasks?.[0]?.scheduledStart).toBe(scheduledStart);
      expect(activeTasks?.[0]?.scheduledStart).toBe(scheduledStart);
      expect(allTasks?.[0]?.scheduledStart).toBe(scheduledStart);
    });

    it('should rollback cache on error', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      const error = new Error('Schedule failed');
      jest.mocked(api.scheduleTask).mockRejectedValueOnce(error);

      // Pre-populate cache
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to fail
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify error state
      expect(result.current.isError).toBe(true);

      // Verify cache was rolled back
      const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(cachedTasks?.[0]?.scheduledStart).toBeUndefined();
      expect(cachedTasks?.[0]?.scheduledStart).not.toBeDefined();
    });

    it('should include updatedAt timestamp in cache update', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Pre-populate cache
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify updatedAt was set
      const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(cachedTasks?.[0]?.updatedAt).toBeDefined();
      expect(new Date(cachedTasks?.[0]?.updatedAt || '').getTime()).toBeGreaterThan(
        new Date(mockTask.updatedAt).getTime()
      );
    });
  });

  describe('useUnscheduleTask', () => {
    it('should unschedule a task successfully', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockResolvedValueOnce(unscheduledTask);

      // Pre-populate cache with scheduled task
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify success
      expect(result.current.isSuccess).toBe(true);
      expect(api.unscheduleTask).toHaveBeenCalledWith('test-task-id');
      expect(api.unscheduleTask).toHaveBeenCalledTimes(1);
    });

    it('should remove scheduledStart from cache during optimistic update', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(unscheduledTask), 100))
      );

      // Pre-populate cache with scheduled task
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Verify optimistic update removed scheduledStart (set to null during optimistic update)
      await waitFor(() => {
        const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
        expect(cachedTasks?.[0]?.scheduledStart).toBeNull();
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // After the mutation completes, the query is invalidated and refetched
      // The mock returns a task with scheduledStart: undefined
      // The cache should either be refetched (undefined) or still have the optimistic null value
      const finalCachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      // Accept either null (optimistic) or undefined (after refetch)
      expect(finalCachedTasks?.[0]?.scheduledStart).not.toBe(mockScheduledTask.scheduledStart);
    });

    it('should update all cached task lists on unschedule', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockResolvedValueOnce(unscheduledTask);

      // Pre-populate multiple cache entries with different filters
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);
      queryClient.setQueryData(taskKeys.list({ status: 'ACTIVE' }), [mockScheduledTask]);
      queryClient.setQueryData(taskKeys.list({}), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify all cache entries were updated
      const nextStatusTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      const activeTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'ACTIVE' }));
      const allTasks = queryClient.getQueryData<Task[]>(taskKeys.list({}));

      expect(nextStatusTasks?.[0]?.scheduledStart).toBeNull();
      expect(activeTasks?.[0]?.scheduledStart).toBeNull();
      expect(allTasks?.[0]?.scheduledStart).toBeNull();
    });

    it('should rollback cache on error', async () => {
      // Setup
      const error = new Error('Unschedule failed');
      jest.mocked(api.unscheduleTask).mockRejectedValueOnce(error);

      // Pre-populate cache with scheduled task
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to fail
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify error state
      expect(result.current.isError).toBe(true);

      // Verify cache was rolled back to original state with scheduledStart
      const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(cachedTasks?.[0]?.scheduledStart).toBe(mockScheduledTask.scheduledStart);
    });

    it('should update updatedAt timestamp in cache', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockResolvedValueOnce(unscheduledTask);

      // Pre-populate cache
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify updatedAt was updated
      const cachedTasks = queryClient.getQueryData<Task[]>(taskKeys.list({ status: 'NEXT' }));
      expect(cachedTasks?.[0]?.updatedAt).toBeDefined();
      expect(new Date(cachedTasks?.[0]?.updatedAt || '').getTime()).toBeGreaterThan(
        new Date(mockScheduledTask.updatedAt).getTime()
      );
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should invalidate all task queries after successful schedule', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Spy on invalidateQueries
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Pre-populate cache
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockTask]);

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify invalidation was called
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });

      invalidateSpy.mockRestore();
    });

    it('should invalidate all task queries after successful unschedule', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockResolvedValueOnce(unscheduledTask);

      // Spy on invalidateQueries
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Pre-populate cache
      queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), [mockScheduledTask]);

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify invalidation was called
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });

      invalidateSpy.mockRestore();
    });
  });
});
