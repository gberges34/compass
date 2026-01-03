import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../../types';
import TodayPage from '../TodayPage';
import * as api from '../../lib/api';

jest.mock('date-fns', () => ({
  format: () => 'Monday, January 1, 2024',
  addDays: (date: Date, amount: number) => new Date(date.getTime() + amount * 24 * 60 * 60 * 1000),
  startOfDay: (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()),
}));

jest.mock('../../lib/api', () => ({
  completeTask: jest.fn(),
}));

jest.mock('../../contexts/ToastContext', () => {
  const toast = {
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  };
  return {
    useToast: () => toast,
  };
});

jest.mock('../../hooks/useTasks', () => {
  const actual = jest.requireActual('../../hooks/useTasks');
  return {
    ...actual,
    useFlatTasks: jest.fn(),
  };
});

jest.mock('../../hooks/useDailyPlans', () => ({
  useTodayPlan: jest.fn(),
}));

jest.mock('../../hooks/usePostDoLogs', () => ({
  usePostDoLogs: jest.fn(),
}));

jest.mock('../../hooks/useTimeHistory', () => ({
  useTimeHistory: jest.fn(),
}));

jest.mock('../../components/TimeEngineStateWidget', () => () => (
  <div data-testid="time-engine-widget" />
));

jest.mock('../../components/StartActivityModal', () => () => (
  <div data-testid="start-activity-modal" />
));

jest.mock('../../components/CompleteTaskModal', () => {
  return ({ onComplete }: any) => (
    <div role="dialog" aria-label="Complete Task">
      <button
        type="button"
        onClick={() => {
          void Promise.resolve(
            onComplete({
              outcome: 'Shipped the report to stakeholders',
              effortLevel: 'MEDIUM',
              keyInsight: 'Batching edits earlier prevents last-minute chaos',
              actualDuration: 30,
              startTime: '2024-01-01T09:00',
              endTime: '2024-01-01T09:30',
            })
          ).catch(() => {});
        }}
      >
        Submit completion
      </button>
    </div>
  );
});

import { useFlatTasks } from '../../hooks/useTasks';
import { useTodayPlan } from '../../hooks/useDailyPlans';
import { usePostDoLogs } from '../../hooks/usePostDoLogs';
import { useTimeHistory } from '../../hooks/useTimeHistory';
import { useToast } from '../../contexts/ToastContext';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return { Wrapper, invalidateSpy };
};

describe('TodayPage active tasks completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useTodayPlan as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePostDoLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (useTimeHistory as jest.Mock).mockReturnValue({ slices: [], loading: false });
  });

  const activeTask: Task = {
    id: 'task-1',
    name: 'Write report',
    status: 'ACTIVE',
    priority: 'MUST',
    category: 'ADMIN',
    context: 'COMPUTER',
    energyRequired: 'MEDIUM',
    duration: 25,
    definitionOfDone: 'Ship the report',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
  };

  const mockCompletionData = {
    outcome: 'Shipped the report to stakeholders',
    effortLevel: 'MEDIUM',
    keyInsight: 'Batching edits earlier prevents last-minute chaos',
    actualDuration: 30,
    startTime: '2024-01-01T09:00',
    endTime: '2024-01-01T09:30',
  } as const;

  const arrangeTasks = () => {
    (useFlatTasks as jest.Mock).mockImplementation(({ status }: { status: string }) => {
      if (status === 'ACTIVE') return { tasks: [activeTask], isLoading: false };
      if (status === 'NEXT') return { tasks: [], isLoading: false };
      return { tasks: [], isLoading: false };
    });
  };

  it('opens the Complete Task modal when clicking the checkmark on an active task', () => {
    arrangeTasks();
    (api.completeTask as jest.Mock).mockResolvedValue({ task: activeTask });

    const { Wrapper } = createWrapper();
    render(<TodayPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Complete "Write report"' }));
    expect(screen.getByRole('dialog', { name: 'Complete Task' })).toBeInTheDocument();
  });

  it('calls completion API with correct payload, closes modal, invalidates cache, and shows success toast', async () => {
    arrangeTasks();
    (api.completeTask as jest.Mock).mockResolvedValue({ task: { ...activeTask, status: 'DONE' } });

    const toast = useToast();
    const { Wrapper, invalidateSpy } = createWrapper();
    render(<TodayPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Complete "Write report"' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit completion' }));

    await waitFor(() => {
      expect(api.completeTask).toHaveBeenCalledWith(activeTask.id, mockCompletionData);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Complete Task' })).not.toBeInTheDocument();
    });

    expect(invalidateSpy).toHaveBeenCalled();
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('keeps modal open and shows error toast when completion fails', async () => {
    arrangeTasks();
    (api.completeTask as jest.Mock).mockRejectedValue(new Error('nope'));

    const toast = useToast();
    const { Wrapper, invalidateSpy } = createWrapper();
    render(<TodayPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Complete "Write report"' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit completion' }));

    await waitFor(() => {
      expect(api.completeTask).toHaveBeenCalledWith(activeTask.id, mockCompletionData);
    });

    expect(screen.getByRole('dialog', { name: 'Complete Task' })).toBeInTheDocument();
    expect(invalidateSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(toast.showError).toHaveBeenCalled();
    });
  });
});
