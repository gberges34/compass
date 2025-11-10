import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTodayPlan, getTasks, getPostDoLogs } from '../lib/api';
import type { DailyPlan, Task, PostDoLog } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getPriorityStyle, getEnergyStyle } from '../lib/designTokens';

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
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch today's plan
        let dailyPlan: DailyPlan | null = null;
        try {
          dailyPlan = await getTodayPlan();
          if (isMounted) {
            setPlan(dailyPlan);
          }
        } catch (err) {
          // No plan yet, that's okay
          if (isMounted) {
            setPlan(null);
          }
        }

        // Fetch active tasks
        const active = await getTasks({ status: 'ACTIVE' });
        if (!isMounted) return;
        setActiveTasks(active);

        // Fetch next tasks (limit to 5 most important)
        const next = await getTasks({ status: 'NEXT' });
        // Sort by priority: MUST > SHOULD > COULD > MAYBE
        const priorityOrder = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
        const sortedNext = next.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        if (!isMounted) return;
        setNextTasks(sortedNext.slice(0, 5));

        // Fetch today's completed tasks
        const todayDate = new Date().toISOString().split('T')[0];
        const logs = await getPostDoLogs({
          startDate: todayDate,
          endDate: todayDate,
        });
        if (!isMounted) return;
        setTodayLogs(logs);
      } catch (err) {
        if (isMounted) {
          toast.showError(err instanceof Error ? err.message : 'Failed to load data');
          console.error('Error loading today page data:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast removed - context functions are stable

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
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">{today}</h1>
        <p className="text-slate mt-4">Your daily command center</p>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
        <div className="gradient-aurora rounded-card shadow-e02 p-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small font-medium text-green-700">Tasks Completed</p>
              <p className="text-display text-ink mt-8">{tasksCompletedToday}</p>
            </div>
            <div className="text-5xl opacity-20">✓</div>
          </div>
        </div>

        <div className="gradient-dawn rounded-card shadow-e02 p-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small font-medium text-blue-700">Deep Work Hours</p>
              <p className="text-display text-ink mt-8">{deepWorkHoursToday.toFixed(1)}</p>
            </div>
            <div className="text-5xl opacity-20">⏱</div>
          </div>
        </div>
      </div>

      {/* Daily Plan */}
      <Card padding="none">
        <div className="p-24 border-b border-fog">
          <h2 className="text-h2 text-ink">Today's Plan</h2>
        </div>
        <div className="p-24">
          {plan ? (
            <div className="space-y-16">
              {/* Energy Level */}
              <div className="flex items-center space-x-12">
                <span className="text-slate font-medium">Energy Level:</span>
                <Badge
                  variant={
                    plan.energyLevel === 'HIGH'
                      ? 'mint'
                      : plan.energyLevel === 'MEDIUM'
                      ? 'sun'
                      : 'blush'
                  }
                >
                  {getEnergyStyle(plan.energyLevel).icon} {plan.energyLevel}
                </Badge>
              </div>

              {/* Deep Work Blocks */}
              <div>
                <h3 className="text-h3 text-ink mb-8">Deep Work Blocks</h3>
                <div className="space-y-8">
                  <div className="bg-sky border border-sky rounded-default p-12">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">
                        {plan.deepWorkBlock1.focus}
                      </span>
                      <span className="text-small text-blue-700">
                        {plan.deepWorkBlock1.start} - {plan.deepWorkBlock1.end}
                      </span>
                    </div>
                  </div>
                  {plan.deepWorkBlock2 && (
                    <div className="bg-sky border border-sky rounded-default p-12">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">
                          {plan.deepWorkBlock2.focus}
                        </span>
                        <span className="text-small text-blue-700">
                          {plan.deepWorkBlock2.start} - {plan.deepWorkBlock2.end}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top 3 Outcomes */}
              <div>
                <h3 className="text-h3 text-ink mb-8">Top 3 Outcomes</h3>
                <ul className="space-y-4">
                  {plan.topOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-action font-bold mr-8">{index + 1}.</span>
                      <span className="text-ink">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reward */}
              {plan.reward && (
                <div className="bg-sun border border-sun rounded-default p-12">
                  <div className="flex items-center">
                    <span className="text-2xl mr-8">🎁</span>
                    <div>
                      <span className="font-medium text-amber-900">Reward: </span>
                      <span className="text-amber-800">{plan.reward}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-32">
              <p className="text-slate mb-16">No plan set for today yet</p>
              <Link to="/orient/east">
                <Button variant="primary">Create Today's Plan</Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {/* Active Tasks */}
      <Card padding="none">
        <div className="p-24 border-b border-fog">
          <h2 className="text-h2 text-ink">Active Tasks</h2>
        </div>
        <div className="p-24">
          {activeTasks.length > 0 ? (
            <div className="space-y-12">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-mint bg-mint rounded-card p-16 hover:shadow-e02 transition-shadow duration-micro"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">{task.name}</h3>
                      <p className="text-small text-slate mt-4">{task.definitionOfDone}</p>
                      <div className="flex items-center space-x-12 mt-8">
                        <Badge variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'} size="small">
                          {task.priority}
                        </Badge>
                        <span className="text-micro text-slate">{task.duration} min</span>
                        <span className="text-micro text-slate">{task.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate text-center py-16">No active tasks</p>
          )}
        </div>
      </Card>

      {/* Next Tasks */}
      <Card padding="none">
        <div className="p-24 border-b border-fog">
          <h2 className="text-h2 text-ink">Next Up (Top 5)</h2>
        </div>
        <div className="p-24">
          {nextTasks.length > 0 ? (
            <div className="space-y-12">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-fog bg-snow rounded-card p-16 hover:shadow-e02 transition-shadow duration-micro"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">{task.name}</h3>
                      <p className="text-small text-slate mt-4">{task.definitionOfDone}</p>
                      <div className="flex items-center space-x-12 mt-8">
                        <Badge variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'} size="small">
                          {task.priority}
                        </Badge>
                        <span className="text-micro text-slate">{task.duration} min</span>
                        <span className="text-micro text-slate">{task.category}</span>
                        <span className="text-micro text-slate">
                          Energy: {task.energyRequired}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate">No tasks in the queue</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TodayPage;
