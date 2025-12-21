import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './contexts/ToastContext';
import LoginGate from './components/LoginGate';
import Layout from './components/Layout';
import TodayPage from './pages/TodayPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import OrientEastPage from './pages/OrientEastPage';
import OrientWestPage from './pages/OrientWestPage';
import ReviewsPage from './pages/ReviewsPage';
import TimeHistoryPage from './pages/TimeHistoryPage';
import ClarifyPage from './pages/ClarifyPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LoginGate>
          <Router>
            <Layout>
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
            </Layout>
          </Router>
        </LoginGate>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
