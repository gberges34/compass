import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CompleteTaskRequest, Task } from '../types';
import { useCompleteTask, useFlatTasks } from '../hooks/useTasks';
import { useTodayPlan } from '../hooks/useDailyPlans';
import { usePostDoLogs } from '../hooks/usePostDoLogs';
import { useTimeHistory } from '../hooks/useTimeHistory';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import TimeEngineStateWidget from '../components/TimeEngineStateWidget';
import StartActivityModal from '../components/StartActivityModal';
import EmptyState from '../components/EmptyState';
import CompleteTaskModal from '../components/CompleteTaskModal';
import { useToast } from '../contexts/ToastContext';
import { getEnergyStyle } from '../lib/designTokens';
import { getPriorityBadgeVariant, getEnergyBadgeVariant } from '../lib/badgeUtils';
import { getTodayDateString, formatLongDate } from '../lib/dateUtils';
import { addDays, startOfDay } from 'date-fns';

const TodayPage: React.FC = () => {
  const today = formatLongDate();
  const toast = useToast();
  const [showStartActivityModal, setShowStartActivityModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  // Replace ALL manual state with React Query hooks - parallel fetching
  const { data: plan = null, isLoading: planLoading } = useTodayPlan();
  const { tasks: activeTasks = [], isLoading: activeLoading } = useFlatTasks({ status: 'ACTIVE' });
  const { tasks: allNextTasks = [], isLoading: nextLoading } = useFlatTasks({ status: 'NEXT' });
  const completeTaskMutation = useCompleteTask();

  const todayDate = getTodayDateString();
  const { data: todayLogs = [], isLoading: logsLoading } = usePostDoLogs({
    startDate: todayDate,
    endDate: todayDate,
  });

  const dayStart = useMemo(() => startOfDay(new Date()), []);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);
  const { slices: todaySlices = [], loading: slicesLoading } = useTimeHistory({
    startDate: dayStart,
    endDate: dayEnd,
    dimension: 'PRIMARY',
  });

  // No isMounted checks needed - React Query handles cleanup
  // No useEffect needed - React Query handles data fetching
  // No manual error handling needed - handled by axios interceptor
  // No cleanup function needed - React Query handles it
  // Parallel API calls automatically

  // Sort and limit next tasks
  const nextTasks = useMemo(() => {
    const priorityOrder: Record<string, number> = { MUST: 0, SHOULD: 1, COULD: 2, MAYBE: 3 };
    const sorted = [...allNextTasks].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    return sorted.slice(0, 5);
  }, [allNextTasks]);

  const loading = planLoading || activeLoading || nextLoading || logsLoading;

  const handleCompleteTask = async (completionData: CompleteTaskRequest) => {
    if (!taskToComplete) return;
    await completeTaskMutation.mutateAsync({
      id: taskToComplete.id,
      request: completionData,
    });
    toast.showSuccess('Task completed successfully!');
    setTaskToComplete(null);
  };

  // Calculate stats
  const tasksCompletedToday = todayLogs.length;
  const trackedHoursToday = useMemo(() => {
    const trackedMinutes = todaySlices.reduce((sum, slice) => {
      const sliceStart = new Date(slice.start);
      const sliceEnd = slice.end ? new Date(slice.end) : new Date();
      const clampedStart = sliceStart < dayStart ? dayStart : sliceStart;
      const clampedEnd = sliceEnd > dayEnd ? dayEnd : sliceEnd;
      const minutes = Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 60000);
      return sum + Math.max(0, minutes);
    }, 0);

    return Math.round((trackedMinutes / 60) * 10) / 10;
  }, [dayEnd, dayStart, todaySlices]);

  if (loading || slicesLoading) {
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
              <p className="text-small font-medium text-blue-700">Tracked Hours</p>
              <p className="text-display text-ink mt-8">{trackedHoursToday.toFixed(1)}</p>
            </div>
            <div className="text-5xl opacity-20">⏱</div>
          </div>
        </div>
      </div>

      {/* Time Engine State Widget */}
      <Card padding="none">
        <div className="p-24 border-b border-fog flex items-center justify-between">
          <h2 className="text-h2 text-ink">Time Tracking</h2>
          <Button
            variant="primary"
            size="medium"
            onClick={() => setShowStartActivityModal(true)}
          >
            + Start Activity
          </Button>
        </div>
        <div className="p-24">
          <TimeEngineStateWidget />
        </div>
      </Card>

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
                  variant={getEnergyBadgeVariant(plan.energyLevel)}
                >
                  {getEnergyStyle(plan.energyLevel).icon} {plan.energyLevel}
                </Badge>
              </div>

              {/* Planned Blocks */}
              <div>
                <h3 className="text-h3 text-ink mb-8">Planned Blocks</h3>
                <div className="space-y-8">
                  {plan.plannedBlocks.map((block) => (
                    <div key={block.id} className="bg-sky border border-sky rounded-default p-12">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-900">{block.label}</span>
                        <span className="text-small text-blue-700">
                          {block.start} - {block.end}
                        </span>
                      </div>
                    </div>
                  ))}
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

            </div>
          ) : (
            <EmptyState
              title="No plan set for today"
              description="Create your morning plan to set energy, planned blocks, and outcomes."
              action={
                <Link to="/orient/east">
                  <Button variant="primary">Create Today&apos;s Plan</Button>
                </Link>
              }
              className="py-8"
            />
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
              {activeTasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="border border-mint bg-mint rounded-card p-16 hover:shadow-e02 transition-shadow duration-micro"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">{task.name}</h3>
                      <p className="text-small text-slate mt-4">{task.definitionOfDone}</p>
	                      <div className="flex items-center space-x-12 mt-8">
	                        <Badge variant={getPriorityBadgeVariant(task.priority)} size="small">
	                          {task.priority}
	                        </Badge>
	                        <span className="text-micro text-slate">{task.duration} min</span>
	                        <span className="text-micro text-slate">{task.category.name}</span>
	                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTaskToComplete(task)}
                      disabled={completeTaskMutation.isPending}
                      className="ml-16 rounded-default p-8 text-green-800 hover:text-green-900 hover:bg-green-100 transition-standard disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Complete "${task.name}"`}
                    >
                      <svg
                        className="w-20 h-20"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
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
	                        <Badge variant={getPriorityBadgeVariant(task.priority)} size="small">
	                          {task.priority}
	                        </Badge>
	                        <span className="text-micro text-slate">{task.duration} min</span>
	                        <span className="text-micro text-slate">{task.category.name}</span>
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

      {/* Start Activity Modal */}
      {showStartActivityModal && (
        <StartActivityModal onClose={() => setShowStartActivityModal(false)} />
      )}

      {/* Complete Task Modal */}
      {taskToComplete && (
        <CompleteTaskModal
          task={taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onComplete={handleCompleteTask}
        />
      )}
    </div>
  );
};

export default TodayPage;
