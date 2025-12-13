import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { prefetchTasks } from '../hooks/useTasks';
import { prefetchTodayPlan } from '../hooks/useDailyPlans';
import { prefetchReviews } from '../hooks/useReviews';
import { prefetchTimeHistory } from '../hooks/useTimeHistory';
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
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
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
  const prefetchForTodayPage = () => {
    prefetchTasks(queryClient, { status: 'ACTIVE' });
    prefetchTodayPlan(queryClient);
  };

  const prefetchHandlers: Record<string, () => void> = {
    '/': () => {
      // Today page: prefetch active tasks + today's plan
      prefetchForTodayPage();
    },
    '/today': () => {
      // Today page: prefetch active tasks + today's plan
      prefetchForTodayPage();
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
    '/time-history': () => {
      // Time History page: prefetch last 7 days
      prefetchTimeHistory(queryClient);
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

  const leftNavItems: NavItem[] = [
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
    {
      id: 'reviews-menu',
      label: 'Reviews',
      children: [
        { id: 'reviews-link', label: 'Reviews', to: '/reviews' },
        { id: 'time-history-link', label: 'Time History', to: '/time-history' },
      ],
    },
  ];

  const todayItem: NavItem = { id: 'today', label: 'Today', to: '/today' };
  const calendarItem: NavItem = { id: 'calendar', label: 'Calendar', to: '/calendar' };

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
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-8 md:gap-24 py-16 w-full"
          >
            {/* Left group: dropdown menus */}
            <div className="flex flex-wrap items-center gap-8 md:gap-24 min-w-0">
              {leftNavItems.map((item) => {
                const isOpen = openMenu === item.id;
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => openMenuNow(item.id)}
                    onMouseLeave={queueCloseMenu}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
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
                      <div className="flex flex-col gap-4 p-8 bg-cloud/40 rounded-default">
                        {item.children?.map((child) => (
                          <NavLink
                            key={child.id}
                            to={child.to}
                            className={({ isActive }) =>
                              `px-16 py-12 rounded-default font-medium transition-standard text-left border ${
                                isActive
                                  ? 'bg-sky text-ink border-sky shadow-e01 border-l-4 border-l-action'
                                  : 'bg-snow text-ink border-stone hover:bg-fog hover:shadow-e01'
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
              })}
            </div>

            {/* Center: Today (home) */}
            <NavLink
              to={todayItem.to!}
              end
              onMouseEnter={() => handlePrefetch(todayItem.to)}
              className={({ isActive }) =>
                `justify-self-center inline-flex items-center justify-center rounded-default font-medium transition-standard border ${
                  isActive
                    ? 'bg-action text-snow shadow-e02 border-action'
                    : 'bg-snow text-ink border-stone hover:bg-fog hover:shadow-e01'
                } min-h-[53px] px-24 py-12`
              }
            >
              <span className="text-body font-semibold">{todayItem.label}</span>
            </NavLink>

            {/* Right: Calendar icon + Logout */}
            <div className="justify-self-end flex items-center gap-8 md:gap-24">
              <NavLink
                to={calendarItem.to!}
                onMouseEnter={() => handlePrefetch(calendarItem.to)}
                aria-label={calendarItem.label}
                title={calendarItem.label}
                className={({ isActive }) =>
                  `inline-flex items-center justify-center rounded-default transition-standard border min-w-[44px] min-h-[44px] ${
                    isActive
                      ? 'bg-action text-snow shadow-e02 border-action'
                      : 'bg-snow text-ink border-stone hover:bg-fog hover:shadow-e01'
                  }`
                }
              >
                <Calendar size={20} aria-hidden="true" />
              </NavLink>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-16 py-12 rounded-default transition-standard bg-snow text-slate border border-fog hover:bg-cloud hover:text-ink"
              >
                <span className="text-small font-medium">Logout</span>
              </button>
            </div>
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
