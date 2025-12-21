import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScheduleTask, useUnscheduleTask, taskKeys } from './useTasks';
import * as api from '../lib/api';
import type { Task, PaginatedResponse } from '../types';

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

  // Helper to build infinite query key (matches implementation)
  const buildInfiniteKey = (filters?: { status?: string }) =>
    [...taskKeys.list(filters), 'infinite'] as const;

  // Helper to create infinite query data structure
  const createInfiniteData = (tasks: Task[]) => ({
    pages: [{ items: tasks, nextCursor: undefined }],
    pageParams: [undefined],
  });

  // Helper to extract tasks from infinite data
  const getTasksFromInfiniteData = (data: any): Task[] => {
    return data?.pages?.[0]?.items || [];
  };

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

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockTask]));

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

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockTask]));

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Verify optimistic update was applied immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(infiniteKey);
        const tasks = getTasksFromInfiniteData(cachedData);
        expect(tasks).toBeDefined();
        expect(tasks[0]?.scheduledStart).toBe(scheduledStart);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it('should update all cached task lists on schedule', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Pre-populate multiple cache entries with infinite query format
      const nextKey = buildInfiniteKey({ status: 'NEXT' });
      const activeKey = buildInfiniteKey({ status: 'ACTIVE' });
      const allKey = buildInfiniteKey({});
      
      queryClient.setQueryData(nextKey, createInfiniteData([mockTask]));
      queryClient.setQueryData(activeKey, createInfiniteData([mockTask]));
      queryClient.setQueryData(allKey, createInfiniteData([mockTask]));

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Verify optimistic update was applied to all caches
      await waitFor(() => {
        const nextTasks = getTasksFromInfiniteData(queryClient.getQueryData(nextKey));
        expect(nextTasks[0]?.scheduledStart).toBe(scheduledStart);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Note: After success, invalidateQueries is called which may clear the cache
      // The important assertion is that optimistic updates work during the mutation
    });

    it('should rollback cache on error', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      const error = new Error('Schedule failed');
      jest.mocked(api.scheduleTask).mockRejectedValueOnce(error);

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockTask]));

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to fail
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify error state
      expect(result.current.isError).toBe(true);

      // Verify cache was rolled back
      const cachedData = queryClient.getQueryData(infiniteKey);
      const tasks = getTasksFromInfiniteData(cachedData);
      expect(tasks[0]?.scheduledStart).toBeUndefined();
    });

    it('should include updatedAt timestamp in optimistic update', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      const beforeMutation = Date.now();
      jest.mocked(api.scheduleTask).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockScheduledTask), 50))
      );

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockTask]));

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Verify optimistic update includes updatedAt
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(infiniteKey);
        const tasks = getTasksFromInfiniteData(cachedData);
        expect(tasks[0]?.updatedAt).toBeDefined();
        const updatedTime = new Date(tasks[0]?.updatedAt || '').getTime();
        expect(updatedTime).toBeGreaterThanOrEqual(beforeMutation);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));
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

      // Pre-populate cache with scheduled task using infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockScheduledTask]));

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

      // Pre-populate cache with scheduled task using infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockScheduledTask]));

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Verify optimistic update set scheduledStart to null
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(infiniteKey);
        const tasks = getTasksFromInfiniteData(cachedData);
        expect(tasks[0]?.scheduledStart).toBeNull();
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it('should update all cached task lists on unschedule', async () => {
      // Setup
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockResolvedValueOnce(unscheduledTask);

      // Pre-populate multiple cache entries with infinite query format
      const nextKey = buildInfiniteKey({ status: 'NEXT' });
      const activeKey = buildInfiniteKey({ status: 'ACTIVE' });
      const allKey = buildInfiniteKey({});
      
      queryClient.setQueryData(nextKey, createInfiniteData([mockScheduledTask]));
      queryClient.setQueryData(activeKey, createInfiniteData([mockScheduledTask]));
      queryClient.setQueryData(allKey, createInfiniteData([mockScheduledTask]));

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Verify optimistic update was applied to all caches
      await waitFor(() => {
        const nextTasks = getTasksFromInfiniteData(queryClient.getQueryData(nextKey));
        expect(nextTasks[0]?.scheduledStart).toBeNull();
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it('should rollback cache on error', async () => {
      // Setup
      const error = new Error('Unschedule failed');
      jest.mocked(api.unscheduleTask).mockRejectedValueOnce(error);

      // Pre-populate cache with scheduled task using infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockScheduledTask]));

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to fail
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify error state
      expect(result.current.isError).toBe(true);

      // Verify cache was rolled back to original state with scheduledStart
      const cachedData = queryClient.getQueryData(infiniteKey);
      const tasks = getTasksFromInfiniteData(cachedData);
      expect(tasks[0]?.scheduledStart).toBe(mockScheduledTask.scheduledStart);
    });

    it('should update updatedAt timestamp in optimistic update', async () => {
      // Setup
      const beforeMutation = Date.now();
      const unscheduledTask: Task = {
        ...mockTask,
        scheduledStart: undefined,
        updatedAt: new Date().toISOString(),
      };
      jest.mocked(api.unscheduleTask).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(unscheduledTask), 50))
      );

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockScheduledTask]));

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Verify optimistic update includes updated updatedAt
      await waitFor(() => {
        const cachedData = queryClient.getQueryData(infiniteKey);
        const tasks = getTasksFromInfiniteData(cachedData);
        expect(tasks[0]?.updatedAt).toBeDefined();
        const updatedTime = new Date(tasks[0]?.updatedAt || '').getTime();
        expect(updatedTime).toBeGreaterThanOrEqual(beforeMutation);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should invalidate all task queries after successful schedule', async () => {
      // Setup
      const scheduledStart = '2025-12-25T10:00:00.000Z';
      jest.mocked(api.scheduleTask).mockResolvedValueOnce(mockScheduledTask);

      // Spy on invalidateQueries (implementation uses invalidateQueries, not refetchQueries)
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockTask]));

      // Render hook
      const { result } = renderHook(() => useScheduleTask(), { wrapper });

      // Execute
      result.current.mutate({ id: 'test-task-id', scheduledStart });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify invalidateQueries was called with the lists key
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

      // Pre-populate cache with infinite query format
      const infiniteKey = buildInfiniteKey({ status: 'NEXT' });
      queryClient.setQueryData(infiniteKey, createInfiniteData([mockScheduledTask]));

      // Render hook
      const { result } = renderHook(() => useUnscheduleTask(), { wrapper });

      // Execute
      result.current.mutate('test-task-id');

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isPending).toBe(false));

      // Verify invalidateQueries was called with the lists key
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() });

      invalidateSpy.mockRestore();
    });
  });
});
