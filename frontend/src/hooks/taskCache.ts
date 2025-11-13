import type { QueryClient, QueryKey, InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse, Task } from '../types';

export type TasksInfiniteData = InfiniteData<PaginatedResponse<Task>>;

export interface CacheUpdateResult {
  snapshot: TasksInfiniteData;
  updatedCount: number;
}

export interface UpdateInfiniteTasksCacheOptions {
  queryClient: QueryClient;
  queryKey: QueryKey;
  predicate: (task: Task) => boolean;
  updater: (task: Task) => Task;
}

export function getInfiniteTasksCache(
  queryClient: QueryClient,
  queryKey: QueryKey
): TasksInfiniteData | undefined {
  return queryClient.getQueryData<TasksInfiniteData>(queryKey);
}

export function updateInfiniteTasksCache(
  options: UpdateInfiniteTasksCacheOptions
): CacheUpdateResult | undefined {
  const { queryClient, queryKey, predicate, updater } = options;
  const current = getInfiniteTasksCache(queryClient, queryKey);

  if (!current) return undefined;

  let updatedCount = 0;

  const pages = current.pages.map((page) => {
    let pageChanged = false;

    const updatedItems = page.items.map((task) => {
      if (!predicate(task)) {
        return task;
      }

      pageChanged = true;
      updatedCount += 1;
      return updater(task);
    });

    return pageChanged ? { ...page, items: updatedItems } : page;
  });

  if (updatedCount === 0) {
    return undefined;
  }

  const nextData: TasksInfiniteData = {
    ...current,
    pages,
  };

  queryClient.setQueryData(queryKey, nextData);

  return { snapshot: current, updatedCount };
}

export function restoreInfiniteTasksCache(
  queryClient: QueryClient,
  queryKey: QueryKey,
  snapshot?: TasksInfiniteData
) {
  if (!snapshot) return;
  queryClient.setQueryData(queryKey, snapshot);
}
