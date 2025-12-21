import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './contexts/ToastContext';
import LoginGate from './components/LoginGate';
import Layout from './components/Layout';
import TodayPage from './pages/TodayPage';
import TasksPage from './pages/TasksPage';
import OrientEastPage from './pages/OrientEastPage';
import OrientWestPage from './pages/OrientWestPage';
import TimeHistoryPage from './pages/TimeHistoryPage';
import ClarifyPage from './pages/ClarifyPage';

// Lazy load heavy pages with their own chunk
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));

// Reusable loading fallback for Suspense boundaries
const LoadingFallback = (
  <div className="flex items-center justify-center py-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
      <p className="mt-16 text-slate">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LoginGate>
          <Router>
            <Layout>
              <Suspense fallback={LoadingFallback}>
                <Routes>
                  <Route path="/" element={<Navigate to="/today" replace />} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/clarify" element={<ClarifyPage />} />
                  <Route path="/orient/east" element={<OrientEastPage />} />
                  <Route path="/orient/west" element={<OrientWestPage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/time-history" element={<TimeHistoryPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
        </LoginGate>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
