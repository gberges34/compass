import React, { useEffect, useRef, useState } from 'react';
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

interface NavItem {
  id: string;
  label: string;
  to?: string;
  children?: Array<{
    id: string;
    label: string;
    to: string;
  }>;
}

const MENU_CLOSE_DELAY_MS = 160;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openMenuNow = (id: string) => {
    clearCloseTimer();
    setOpenMenu(id);
  };

  const queueCloseMenu = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), MENU_CLOSE_DELAY_MS);
  };

  const toggleMenu = (id: string) => {
    if (openMenu === id) {
      setOpenMenu(null);
      return;
    }
    openMenuNow(id);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Element | null)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

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

  const navItems: NavItem[] = [
    {
      id: 'orient',
      label: 'Orient',
      children: [
        { id: 'orient-east', label: 'Orient East', to: '/orient/east' },
        { id: 'orient-west', label: 'Orient West', to: '/orient/west' },
      ],
    },
    {
      id: 'tasks-menu',
      label: 'Tasks',
      children: [
        { id: 'clarify-link', label: 'Clarify', to: '/clarify' },
        { id: 'tasks-link', label: 'Tasks', to: '/tasks' },
      ],
    },
    { id: 'today', label: 'Today', to: '/' },
    { id: 'calendar', label: 'Calendar', to: '/calendar' },
    { id: 'reviews', label: 'Reviews', to: '/reviews' },
  ];

  const handlePrefetch = (path?: string) => {
    if (!path) return;
    const prefetchFn = prefetchHandlers[path];
    if (prefetchFn) {
      prefetchFn();
    }
  };

  return (
    <div className="min-h-screen bg-snow">
      {/* Top Navigation Bar */}
      <header className="bg-cloud border-b border-fog shadow-e01">
        <div className="max-w-7xl mx-auto px-24">
          <nav
            ref={navRef}
            className="flex items-center gap-8 md:gap-24 py-16 w-full"
          >
            <div className="flex flex-wrap items-center gap-8 md:gap-24">
              {navItems.map((item) => {
                if (item.children && item.children.length > 0) {
                  const isOpen = openMenu === item.id;
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => openMenuNow(item.id)}
                      onMouseLeave={queueCloseMenu}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Element | null)) {
                          queueCloseMenu();
                        }
                      }}
                    >
                      <button
                        type="button"
                        className={`px-24 py-12 rounded-default font-medium transition-standard bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01 ${
                          isOpen ? 'shadow-e02 border-fog' : ''
                        }`}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onFocus={() => openMenuNow(item.id)}
                        onClick={() => toggleMenu(item.id)}
                      >
                        <span className="text-body">{item.label}</span>
                      </button>
                      <div
                        className={`absolute left-0 mt-8 min-w-[200px] rounded-default border border-fog bg-snow shadow-e02 transition-standard origin-top ${
                          isOpen
                            ? 'opacity-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 -translate-y-1 pointer-events-none'
                        }`}
                        onMouseEnter={() => openMenuNow(item.id)}
                        onMouseLeave={queueCloseMenu}
                      >
                        <div className="flex flex-col gap-4 p-8">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.id}
                              to={child.to}
                              className={({ isActive }) =>
                                `px-16 py-12 rounded-default font-medium transition-standard text-left ${
                                  isActive
                                    ? 'bg-action text-snow shadow-e02'
                                    : 'bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01'
                                }`
                              }
                              onMouseEnter={() => handlePrefetch(child.to)}
                              onFocus={() => openMenuNow(item.id)}
                            >
                              <span className="text-body">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (!item.to) {
                  return null;
                }

                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === '/'}
                    onMouseEnter={() => handlePrefetch(item.to)}
                    className={({ isActive }) =>
                      `px-24 py-12 rounded-default font-medium transition-standard ${
                        isActive
                          ? 'bg-action text-snow shadow-e02'
                          : 'bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01'
                      }`
                    }
                  >
                    <span className="text-body">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            <button
              onClick={logout}
              className="ml-auto px-24 py-12 rounded-default font-medium transition-standard bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01"
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
