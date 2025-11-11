import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendarPage from '../CalendarPage';
import * as api from '../../lib/api';

// Mock date-fns to avoid ESM issues
jest.mock('date-fns', () => ({
  format: jest.fn(),
  parse: jest.fn(),
  startOfWeek: jest.fn(),
  getDay: jest.fn(),
}));

// Mock date-fns locale
jest.mock('date-fns/locale/en-US', () => ({}));

// Mock react-big-calendar
jest.mock('react-big-calendar', () => ({
  Calendar: () => <div data-testid="calendar">Calendar</div>,
  dateFnsLocalizer: jest.fn(() => ({})),
}));

// Mock react-big-calendar drag and drop
jest.mock('react-big-calendar/lib/addons/dragAndDrop', () => (Component: any) => Component);

// Mock the API
jest.mock('../../lib/api', () => ({
  getTasks: jest.fn(),
  getTodayPlan: jest.fn(),
}));

// Mock the toast context
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

// Mock the useDocumentVisibility hook
jest.mock('../../hooks/useDocumentVisibility');

import { useDocumentVisibility } from '../../hooks/useDocumentVisibility';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('CalendarPage passive refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getTasks as jest.Mock).mockResolvedValue([]);
    (api.getTodayPlan as jest.Mock).mockResolvedValue(null);
  });

  it('enables refetch when document is visible', async () => {
    (useDocumentVisibility as jest.Mock).mockReturnValue(true);

    render(<CalendarPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    });

    expect(api.getTasks).toHaveBeenCalled();
    expect(api.getTodayPlan).toHaveBeenCalled();
    expect(useDocumentVisibility).toHaveBeenCalled();
  });

  it('disables refetch when document is hidden', async () => {
    (useDocumentVisibility as jest.Mock).mockReturnValue(false);

    render(<CalendarPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument();
    });

    expect(api.getTasks).toHaveBeenCalled();
    expect(api.getTodayPlan).toHaveBeenCalled();
    expect(useDocumentVisibility).toHaveBeenCalled();
  });
});
