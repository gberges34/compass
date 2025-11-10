import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

export const postDoLogKeys = {
  all: ['postDoLogs'] as const,
  lists: () => [...postDoLogKeys.all, 'list'] as const,
  list: (filters?: { startDate?: string; endDate?: string; category?: string }) =>
    [...postDoLogKeys.lists(), { filters }] as const,
};

export function usePostDoLogs(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: postDoLogKeys.list(filters),
    queryFn: () => api.getPostDoLogs(filters),
  });
}
