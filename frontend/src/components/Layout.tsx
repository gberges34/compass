import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchTasks } from '../hooks/useTasks';
import { prefetchTodayPlan } from '../hooks/useDailyPlans';
import { prefetchReviews } from '../hooks/useReviews';
import { prefetchTodoistPending } from '../hooks/useTodoist';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  // Prefetch handlers for each route
  const prefetchHandlers: Record<string, () => void> = {
    '/': () => {
      // Today page: prefetch active tasks + today's plan
      prefetchTasks(queryClient, { status: 'ACTIVE' });
      prefetchTodayPlan(queryClient);
    },
    '/tasks': () => {
      // Tasks page: prefetch NEXT tasks
      prefetchTasks(queryClient, { status: 'NEXT' });
    },
    '/calendar': () => {
      // Calendar page: prefetch NEXT tasks + today's plan
      prefetchTasks(queryClient, { status: 'NEXT' });
      prefetchTodayPlan(queryClient);
    },
    '/reviews': () => {
      // Reviews page: prefetch recent reviews
      prefetchReviews(queryClient);
    },
    '/clarify': () => {
      // Clarify page: prefetch pending Todoist tasks
      prefetchTodoistPending(queryClient);
    },
    '/orient/east': () => {
      // Orient East: prefetch today's plan
      prefetchTodayPlan(queryClient);
    },
    '/orient/west': () => {
      // Orient West: prefetch today's plan
      prefetchTodayPlan(queryClient);
    },
  };

  const navLinks = [
    { to: '/orient/east', label: 'Orient East' },
    { to: '/clarify', label: 'Clarify' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/', label: 'Today' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/reviews', label: 'Reviews' },
    { to: '/orient/west', label: 'Orient West' },
  ];

  return (
    <div className="min-h-screen bg-snow">
      {/* Top Navigation Bar */}
      <header className="bg-cloud border-b border-fog shadow-e01">
        <div className="max-w-7xl mx-auto px-24">
          <nav className="flex flex-wrap items-center justify-center md:justify-between gap-8 md:gap-24 py-16">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onMouseEnter={() => {
                  const prefetchFn = prefetchHandlers[link.to];
                  if (prefetchFn) {
                    prefetchFn();
                  }
                }}
                className={({ isActive }) =>
                  `px-24 py-12 rounded-default font-medium transition-standard ${
                    isActive
                      ? 'bg-action text-snow shadow-e02'
                      : 'bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01'
                  }`
                }
              >
                <span className="text-body">{link.label}</span>
              </NavLink>
            ))}
            <button
              onClick={logout}
              className="px-24 py-12 rounded-default font-medium transition-standard bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01"
            >
              <span className="text-body">Logout</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-24 py-32">
        {children}
      </main>
    </div>
  );
};

export default Layout;
