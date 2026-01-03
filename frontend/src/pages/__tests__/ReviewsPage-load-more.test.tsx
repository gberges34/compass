import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Review } from '../../types';
import ReviewsPage from '../ReviewsPage';

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

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => ({ data: undefined, isLoading: false })),
  };
});

jest.mock('recharts', () => {
  const React = require('react');
  const Mock = ({ children }: any) => <div>{children}</div>;
  return {
    LineChart: Mock,
    Line: Mock,
    PieChart: Mock,
    Pie: Mock,
    BarChart: Mock,
    Bar: Mock,
    XAxis: Mock,
    YAxis: Mock,
    CartesianGrid: Mock,
    Tooltip: Mock,
    Cell: Mock,
    ResponsiveContainer: Mock,
  };
});

jest.mock('../../components/RadialClockChart', () => () => <div data-testid="radial-clock-chart" />);
jest.mock('../../components/DaySelector', () => () => <div data-testid="day-selector" />);
jest.mock('../../components/CreateReviewModal', () => () => null);

jest.mock('../../hooks/useReviews', () => {
  const actual = jest.requireActual('../../hooks/useReviews');
  return {
    ...actual,
    useFlatReviews: jest.fn(),
    useCreateDailyReview: jest.fn(() => ({ mutateAsync: jest.fn() })),
    useCreateWeeklyReview: jest.fn(() => ({ mutateAsync: jest.fn() })),
  };
});

import { useFlatReviews } from '../../hooks/useReviews';

function buildReviews(count: number): Review[] {
  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  return Array.from({ length: count }).map((_, idx) => {
    const periodStart = new Date(baseDate.getTime() + idx * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(periodStart.getTime() + 23 * 60 * 60 * 1000);
    return {
      id: `review-${idx + 1}`,
      type: 'DAILY',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      wins: ['Win A', 'Win B'],
      misses: ['Miss A'],
      lessons: ['Lesson A'],
      nextGoals: ['Goal A'],
      executionRate: 75,
      tasksCompleted: 3,
      deepWorkHours: 1,
      categoryBalance: { ADMIN: 1 },
      activityBreakdown: { ADMIN: 60 },
      totalTrackedTime: 5,
      timeCoverage: 80,
      createdAt: periodEnd.toISOString(),
    };
  });
}

describe('ReviewsPage load more behavior', () => {
  it('shows 3 initially, expands to 30, then fetches next 30', async () => {
    let currentReviews = buildReviews(30);
    const fetchNextPage = jest.fn(async () => {
      currentReviews = buildReviews(60);
    });

    (useFlatReviews as jest.Mock).mockImplementation(() => ({
      reviews: currentReviews,
      isLoading: false,
      isError: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    }));

    render(<ReviewsPage />);

    expect(screen.getAllByText('Execution Rate')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(fetchNextPage).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getAllByText('Execution Rate')).toHaveLength(30);
    });

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    await waitFor(() => {
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText('Execution Rate')).toHaveLength(60);
    });
  });
});
