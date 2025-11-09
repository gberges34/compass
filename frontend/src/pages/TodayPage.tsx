import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTodayPlan, getTasks, getPostDoLogs } from '../lib/api';
import type { DailyPlan, Task, PostDoLog } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

const TodayPage: React.FC = () => {
  const toast = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [nextTasks, setNextTasks] = useState<Task[]>([]);
  const [todayLogs, setTodayLogs] = useState<PostDoLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch today's plan
        let dailyPlan: DailyPlan | null = null;
        try {
          dailyPlan = await getTodayPlan();
          setPlan(dailyPlan);
        } catch (err) {
          // No plan yet, that's okay
          setPlan(null);
        }

        // Fetch active tasks
        const active = await getTasks({ status: 'ACTIVE' });
        setActiveTasks(active);

        // Fetch next tasks (limit to 5 most important)
        const next = await getTasks({ status: 'NEXT' });
        // Sort by priority: MUST > SHOULD > COULD > MAYBE
        const priorityOrder = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
        const sortedNext = next.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        setNextTasks(sortedNext.slice(0, 5));

        // Fetch today's completed tasks
        const todayDate = new Date().toISOString().split('T')[0];
        const logs = await getPostDoLogs({
          startDate: todayDate,
          endDate: todayDate,
        });
        setTodayLogs(logs);
      } catch (err) {
        toast.showError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error loading today page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Calculate stats
  const tasksCompletedToday = todayLogs.length;
  const deepWorkHoursToday = todayLogs.reduce(
    (total, log) => total + log.actualDuration / 60,
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <LoadingSkeleton variant="card" count={1} />

        {/* Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton variant="stat" count={1} />
          <LoadingSkeleton variant="stat" count={1} />
        </div>

        {/* Plan Skeleton */}
        <LoadingSkeleton variant="card" count={1} />

        {/* Tasks Skeletons */}
        <LoadingSkeleton variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">{today}</h1>
        <p className="text-gray-600 mt-1">Your daily command center</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tasks Completed</p>
              <p className="text-4xl font-bold mt-2">{tasksCompletedToday}</p>
            </div>
            <div className="text-5xl opacity-20">✓</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Deep Work Hours</p>
              <p className="text-4xl font-bold mt-2">{deepWorkHoursToday.toFixed(1)}</p>
            </div>
            <div className="text-5xl opacity-20">⏱</div>
          </div>
        </div>
      </div>

      {/* Daily Plan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Today's Plan</h2>
        </div>
        <div className="p-6">
          {plan ? (
            <div className="space-y-4">
              {/* Energy Level */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-600 font-medium">Energy Level:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    plan.energyLevel === 'HIGH'
                      ? 'bg-green-100 text-green-800'
                      : plan.energyLevel === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {plan.energyLevel}
                </span>
              </div>

              {/* Deep Work Blocks */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Deep Work Blocks</h3>
                <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">
                        {plan.deepWorkBlock1.focus}
                      </span>
                      <span className="text-sm text-blue-700">
                        {plan.deepWorkBlock1.start} - {plan.deepWorkBlock1.end}
                      </span>
                    </div>
                  </div>
                  {plan.deepWorkBlock2 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">
                          {plan.deepWorkBlock2.focus}
                        </span>
                        <span className="text-sm text-blue-700">
                          {plan.deepWorkBlock2.start} - {plan.deepWorkBlock2.end}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top 3 Outcomes */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Top 3 Outcomes</h3>
                <ul className="space-y-1">
                  {plan.topOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 font-bold mr-2">{index + 1}.</span>
                      <span className="text-gray-700">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reward */}
              {plan.reward && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">🎁</span>
                    <div>
                      <span className="font-medium text-amber-900">Reward: </span>
                      <span className="text-amber-800">{plan.reward}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No plan set for today yet</p>
              <Link
                to="/orient/east"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Today's Plan
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Active Tasks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Active Tasks</h2>
        </div>
        <div className="p-6">
          {activeTasks.length > 0 ? (
            <div className="space-y-3">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{task.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.definitionOfDone}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'MUST'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'SHOULD'
                              ? 'bg-orange-100 text-orange-800'
                              : task.priority === 'COULD'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-500">{task.duration} min</span>
                        <span className="text-xs text-gray-500">{task.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No active tasks</p>
          )}
        </div>
      </div>

      {/* Next Tasks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Next Up (Top 5)</h2>
        </div>
        <div className="p-6">
          {nextTasks.length > 0 ? (
            <div className="space-y-3">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{task.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.definitionOfDone}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'MUST'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'SHOULD'
                              ? 'bg-orange-100 text-orange-800'
                              : task.priority === 'COULD'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs text-gray-500">{task.duration} min</span>
                        <span className="text-xs text-gray-500">{task.category}</span>
                        <span className="text-xs text-gray-500">
                          Energy: {task.energyRequired}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">No tasks in the queue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayPage;
