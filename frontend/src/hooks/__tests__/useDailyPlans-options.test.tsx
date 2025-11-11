import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodayPlan } from '../useDailyPlans';
import * as api from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  getTodayPlan: jest.fn(),
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

describe('useTodayPlan with options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts and applies refetchInterval option', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan({ refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('accepts and applies refetchOnWindowFocus option', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan({ refetchOnWindowFocus: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('works without options parameter (backward compatibility)', async () => {
    const mockPlan = { id: '1', date: new Date(), goals: [] };
    (api.getTodayPlan as jest.Mock).mockResolvedValue(mockPlan);

    const { result } = renderHook(
      () => useTodayPlan(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlan);
  });

  it('handles 404 responses gracefully with options', async () => {
    const error = { response: { status: 404 } };
    (api.getTodayPlan as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useTodayPlan({ refetchInterval: 1000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(null);
  });
});
