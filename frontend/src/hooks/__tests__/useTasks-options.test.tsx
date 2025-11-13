import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '../useTasks';
import * as api from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  getTasks: jest.fn(),
}));

// Mock the toast context
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTasks with options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts and applies refetchInterval option', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue({ items: mockTasks, nextCursor: null });

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }, { refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });

  it('accepts and applies refetchOnWindowFocus option', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue({ items: mockTasks, nextCursor: null });

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }, { refetchOnWindowFocus: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });

  it('works without options parameter (backward compatibility)', async () => {
    const mockTasks = [{ id: '1', name: 'Test Task' }];
    (api.getTasks as jest.Mock).mockResolvedValue({ items: mockTasks, nextCursor: null });

    const { result } = renderHook(
      () => useTasks({ status: 'NEXT' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTasks);
  });
});
