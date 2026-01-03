import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';
import AuthContext from '../../contexts/AuthContext';

const renderLayout = () => {
  const queryClient = new QueryClient();
  const logout = jest.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ logout }}>
        <MemoryRouter>
          <Layout>
            <div data-testid="content">Content</div>
          </Layout>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('Layout nav dropdowns', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('opens Orient submenu on hover and closes on mouse leave', async () => {
    renderLayout();

    const orientButton = screen.getByRole('button', { name: /orient/i });
    await userEvent.hover(orientButton);

    expect(await screen.findByText(/orient east/i)).toBeInTheDocument();
    expect(screen.getByText(/orient west/i)).toBeInTheDocument();
    await waitFor(() => expect(orientButton).toHaveAttribute('aria-expanded', 'true'));

    await userEvent.unhover(orientButton);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(orientButton).toHaveAttribute('aria-expanded', 'false'));
  });

  it('toggles Tasks submenu on click, keeps focus, and closes on outside click', async () => {
    renderLayout();

    const tasksButton = screen.getByRole('button', { name: /^tasks$/i });
    fireEvent.click(tasksButton);

	    await waitFor(() => expect(tasksButton).toHaveAttribute('aria-expanded', 'true'));
	    const clarifyLink = await screen.findByRole('link', { name: /clarify/i });
	    expect(clarifyLink).toBeInTheDocument();
	    const categoriesLink = screen.getByRole('link', { name: /categories/i });
	    expect(categoriesLink).toBeInTheDocument();
	    const tasksLink = screen.getByRole('link', { name: /^tasks$/i });
	    expect(tasksLink).toBeInTheDocument();
	    expect(tasksLink.compareDocumentPosition(clarifyLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	    expect(clarifyLink.compareDocumentPosition(categoriesLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    act(() => {
      clarifyLink.focus();
    });
    expect(tasksButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(document.body);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(tasksButton).toHaveAttribute('aria-expanded', 'false'));
  });
});
