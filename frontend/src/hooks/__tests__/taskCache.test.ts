import { QueryClient } from '@tanstack/react-query';
import {
  getInfiniteTasksCache,
  restoreInfiniteTasksCache,
  updateInfiniteTasksCache,
} from '../taskCache';
import type { PaginatedResponse, Task } from '../../types';

const queryKey = ['tasks', 'list', { status: 'NEXT' }, 'infinite'] as const;

const baseTask: Task = {
  id: 'task-1',
  name: 'Test Task',
  status: 'NEXT',
  priority: 'MUST',
  category: 'PERSONAL',
  context: 'ANYWHERE',
  energyRequired: 'MEDIUM',
  duration: 60,
  definitionOfDone: 'done',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const buildInfiniteData = (pages: PaginatedResponse<Task>[]) => ({
  pages,
  pageParams: pages.map((_, index) => (index === 0 ? undefined : `cursor-${index}`)),
});

describe('taskCache helpers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('updates matching tasks across pages and returns snapshot', () => {
    const snapshot = buildInfiniteData([
      { items: [baseTask], nextCursor: 'cursor-1' },
      { items: [{ ...baseTask, id: 'task-2' }], nextCursor: null },
    ]);

    queryClient.setQueryData(queryKey, snapshot);

    const result = updateInfiniteTasksCache({
      queryClient,
      queryKey,
      predicate: (task) => task.id === 'task-2',
      updater: (task) => ({ ...task, scheduledStart: '2025-02-02T12:00:00.000Z' }),
    });

    expect(result?.updatedCount).toBe(1);
    expect(result?.snapshot).toBe(snapshot);

    const updated = getInfiniteTasksCache(queryClient, queryKey);
    expect(updated).toBeDefined();
    expect(updated).not.toBe(snapshot);
    expect(updated?.pages[1].items[0].scheduledStart).toBe('2025-02-02T12:00:00.000Z');
    expect(snapshot.pages[1].items[0].scheduledStart).toBeUndefined();
  });

  it('returns undefined when predicate matches no tasks', () => {
    queryClient.setQueryData(queryKey, buildInfiniteData([{ items: [baseTask], nextCursor: null }]));

    const result = updateInfiniteTasksCache({
      queryClient,
      queryKey,
      predicate: () => false,
      updater: (task) => ({ ...task, scheduledStart: 'never' }),
    });

    expect(result).toBeUndefined();
    const cached = getInfiniteTasksCache(queryClient, queryKey);
    expect(cached?.pages[0].items[0]).toEqual(baseTask);
  });

  it('restores snapshot after rollback', () => {
    const snapshot = buildInfiniteData([{ items: [baseTask], nextCursor: null }]);
    queryClient.setQueryData(queryKey, snapshot);

    const updateResult = updateInfiniteTasksCache({
      queryClient,
      queryKey,
      predicate: () => true,
      updater: (task) => ({ ...task, scheduledStart: '2025-03-03T10:00:00.000Z' }),
    });

    expect(updateResult).toBeDefined();

    restoreInfiniteTasksCache(queryClient, queryKey, updateResult?.snapshot);

    const restored = getInfiniteTasksCache(queryClient, queryKey);
    expect(restored).toEqual(updateResult?.snapshot);
    expect(restored?.pages[0].items[0].scheduledStart).toBeUndefined();
  });
});
