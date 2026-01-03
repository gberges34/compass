import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodayPage from '../TodayPage';
import type { Task } from '../../types';

jest.mock('date-fns', () => ({
  format: () => 'Monday, January 1, 2024',
  addDays: (date: Date, amount: number) => new Date(date.getTime() + amount * 24 * 60 * 60 * 1000),
  startOfDay: (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()),
}));

jest.mock('../../hooks/useTasks', () => ({
  useFlatTasks: jest.fn(),
  useCompleteTask: jest.fn(),
}));

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

import { useFlatTasks, useCompleteTask } from '../../hooks/useTasks';
import { useTodayPlan } from '../../hooks/useDailyPlans';
import { usePostDoLogs } from '../../hooks/usePostDoLogs';
import { useTimeHistory } from '../../hooks/useTimeHistory';

describe('TodayPage active tasks completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useTodayPlan as jest.Mock).mockReturnValue({ data: null, isLoading: false });
    (usePostDoLogs as jest.Mock).mockReturnValue({ data: [], isLoading: false });
    (useTimeHistory as jest.Mock).mockReturnValue({ slices: [], loading: false });
  });

  it('opens the Complete Task modal when clicking the checkmark on an active task', () => {
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

    (useFlatTasks as jest.Mock).mockImplementation(({ status }: { status: string }) => {
      if (status === 'ACTIVE') return { tasks: [activeTask], isLoading: false };
      if (status === 'NEXT') return { tasks: [], isLoading: false };
      return { tasks: [], isLoading: false };
    });

    (useCompleteTask as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete "Write report"' }));

    expect(screen.getByRole('dialog', { name: 'Complete Task' })).toBeInTheDocument();
  });
});
