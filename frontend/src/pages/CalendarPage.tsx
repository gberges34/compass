import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Event as BigCalendarEvent, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import CalendarToolbar from '../components/CalendarToolbar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import type { Task, CalendarEvent } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTasks } from '../hooks/useTasks';
import { useTodayPlan } from '../hooks/useDailyPlans';
import { useScheduleTask, useUnscheduleTask, useUpdateTask } from '../hooks/useTasks';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getCategoryStyle } from '../lib/designTokens';

// Development-only logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// Category color mapping - defined outside component to prevent recreations
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    SCHOOL: '#3b82f6',
    MUSIC: '#8b5cf6',
    FITNESS: '#10b981',
    GAMING: '#f59e0b',
    NUTRITION: '#14b8a6',
    HYGIENE: '#06b6d4',
    PET: '#ec4899',
    SOCIAL: '#f97316',
    PERSONAL: '#6366f1',
    ADMIN: '#84cc16',
  };
  return colors[category] || '#6b7280';
};

const CalendarPage: React.FC = () => {
  const toast = useToast();

  // React Query hooks - replace manual state management
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ status: 'NEXT' });
  const { data: todayPlan, isLoading: planLoading } = useTodayPlan();
  const scheduleTaskMutation = useScheduleTask();
  const unscheduleTaskMutation = useUnscheduleTask();
  const updateTaskMutation = useUpdateTask();

  // Local UI state only
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>('week');

  // Derived data from queries
  const loading = tasksLoading || planLoading;
  const unscheduledTasks = useMemo(
    () => tasks.filter((task) => !task.scheduledStart),
    [tasks]
  );
  const scheduledTasks = useMemo(
    () => tasks.filter((task) => task.scheduledStart),
    [tasks]
  );

  // Generate calendar events from query data
  const events = useMemo(() => {
    log('[Calendar] Generating events from tasks:', scheduledTasks.length);

    // Convert scheduled tasks to calendar events with defensive null checks
    const taskEvents: CalendarEvent[] = scheduledTasks
      .filter((task) => {
        // Defensive: ensure scheduledStart exists and is valid
        if (!task.scheduledStart) {
          log('[Calendar] Task missing scheduledStart:', task.id);
          return false;
        }

        try {
          const start = new Date(task.scheduledStart);
          if (isNaN(start.getTime())) {
            log('[Calendar] Invalid scheduledStart date:', task.scheduledStart);
            return false;
          }
          return true;
        } catch (error) {
          console.error('[Calendar] Error parsing scheduledStart:', error);
          return false;
        }
      })
      .map((task) => {
        const start = new Date(task.scheduledStart!);
        const end = new Date(start.getTime() + task.duration * 60000);

        return {
          id: task.id,
          title: task.name,
          start,
          end,
          task,
          type: 'task' as const,
        };
      });

    log('[Calendar] Generated task events:', taskEvents.length);

    // Generate plan events if today's plan exists
    const planEvents: CalendarEvent[] = [];
    if (todayPlan) {
      const today = new Date().toISOString().split('T')[0];

      if (todayPlan.deepWorkBlock1) {
        planEvents.push({
          id: `dw1-${todayPlan.id}`,
          title: `Deep Work: ${todayPlan.deepWorkBlock1.focus}`,
          start: new Date(`${today}T${todayPlan.deepWorkBlock1.start}`),
          end: new Date(`${today}T${todayPlan.deepWorkBlock1.end}`),
          type: 'deepWork',
        });
      }

      if (todayPlan.deepWorkBlock2) {
        planEvents.push({
          id: `dw2-${todayPlan.id}`,
          title: `Deep Work: ${todayPlan.deepWorkBlock2.focus}`,
          start: new Date(`${today}T${todayPlan.deepWorkBlock2.start}`),
          end: new Date(`${today}T${todayPlan.deepWorkBlock2.end}`),
          type: 'deepWork',
        });
      }

      if (todayPlan.adminBlock) {
        planEvents.push({
          id: `admin-${todayPlan.id}`,
          title: 'Admin Time',
          start: new Date(`${today}T${todayPlan.adminBlock.start}`),
          end: new Date(`${today}T${todayPlan.adminBlock.end}`),
          type: 'admin',
        });
      }

      if (todayPlan.bufferBlock) {
        planEvents.push({
          id: `buffer-${todayPlan.id}`,
          title: 'Buffer Time',
          start: new Date(`${today}T${todayPlan.bufferBlock.start}`),
          end: new Date(`${today}T${todayPlan.bufferBlock.end}`),
          type: 'buffer',
        });
      }
    }

    return [...taskEvents, ...planEvents];
  }, [scheduledTasks, todayPlan]);

  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      if (unscheduledTasks.length === 0) {
        toast.showWarning('No unscheduled tasks available. Please select a task from the sidebar first.');
        return;
      }

      const taskId = prompt(
        `Enter task number (1-${unscheduledTasks.length}) to schedule at ${moment(start).format(
          'MMM D, YYYY h:mm A'
        )}:`
      );

      if (taskId) {
        const taskIndex = parseInt(taskId) - 1;
        if (taskIndex >= 0 && taskIndex < unscheduledTasks.length) {
          const task = unscheduledTasks[taskIndex];
          handleScheduleTask(task, start);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unscheduledTasks] // toast removed - context functions are stable
  );

  const handleSelectEvent = useCallback((event: BigCalendarEvent) => {
    const calendarEvent = event as unknown as CalendarEvent;
    if (calendarEvent.task) {
      setSelectedTask(calendarEvent.task);
    } else {
      toast.showInfo(`${calendarEvent.title}\nType: ${calendarEvent.type}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast removed - context functions are stable

  const handleScheduleTask = async (task: Task, scheduledStart: Date) => {
    try {
      await scheduleTaskMutation.mutateAsync({
        id: task.id,
        scheduledStart: scheduledStart.toISOString(),
      });
      toast.showSuccess(`Task scheduled for ${moment(scheduledStart).format('MMM D, h:mm A')}`);
    } catch (err) {
      toast.showError('Failed to schedule task. Please try again.');
      console.error('Error scheduling task:', err);
    }
  };

  const handleUnscheduleTask = async (task: Task) => {
    if (unscheduleTaskMutation.isPending) return; // Prevent double-clicks

    try {
      await unscheduleTaskMutation.mutateAsync(task.id);
      setSelectedTask(null);
      toast.showSuccess('Task unscheduled and moved back to unscheduled list');
    } catch (err) {
      toast.showError('Failed to unschedule task. Please try again.');
      console.error('Error unscheduling task:', err);
    }
  };

  const handleEventDrop = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    log('[handleEventDrop] Dropping event:', { event, start, end });

    // Only allow rescheduling task events, not time blocks
    if (event.type !== 'task' || !event.task) {
      toast.showError('Cannot reschedule time blocks');
      return;
    }

    // Prevent scheduling in the past (compare UTC times)
    const now = new Date();
    if (start < now) {
      toast.showError('Cannot schedule tasks in the past');
      return;
    }

    if (scheduleTaskMutation.isPending) return; // Prevent concurrent operations

    try {
      // Convert local Date to UTC ISO string
      const scheduledStartUTC = start.toISOString();

      log('[handleEventDrop] Scheduling task:', {
        taskId: event.task.id,
        scheduledStartUTC,
        localTime: start.toString(),
      });

      await scheduleTaskMutation.mutateAsync({
        id: event.task.id,
        scheduledStart: scheduledStartUTC,
      });
      toast.showSuccess('Task rescheduled successfully');
    } catch (err) {
      toast.showError('Failed to reschedule task. Please try again.');
      console.error('[handleEventDrop] Failed to schedule:', err);
    }
  };

  const handleEventResize = async ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    log('[handleEventResize] Resizing event:', { event, start, end });

    // Only allow resizing task events
    if (event.type !== 'task' || !event.task) {
      toast.showError('Cannot resize time blocks');
      return;
    }

    // Prevent scheduling in the past
    const now = new Date();
    if (start < now) {
      toast.showError('Cannot schedule tasks in the past');
      return;
    }

    if (scheduleTaskMutation.isPending) return;

    try {
      // Calculate new duration in minutes
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      // Validate minimum duration
      if (durationMinutes < 1) {
        toast.showError('Task duration must be at least 1 minute');
        return;
      }

      log('[handleEventResize] New duration:', { durationMinutes });

      // Update task with new scheduled time and duration
      await updateTaskMutation.mutateAsync({
        id: event.task.id,
        updates: {
          duration: durationMinutes,
          scheduledStart: start.toISOString(),
        },
      });

      toast.showSuccess('Task duration updated');
    } catch (err) {
      toast.showError('Failed to resize task. Please try again.');
      console.error('[handleEventResize] Failed to resize:', err);
    }
  };

  const eventStyleGetter = useCallback(
    (event: BigCalendarEvent) => {
      const calendarEvent = event as unknown as CalendarEvent;
      let backgroundColor = '#6b7280';
      let borderColor = '#4b5563';

      if (calendarEvent.type === 'task' && calendarEvent.task) {
        backgroundColor = getCategoryColor(calendarEvent.task.category);
        borderColor = backgroundColor;
      } else if (calendarEvent.type === 'deepWork') {
        backgroundColor = '#3b82f6';
        borderColor = '#2563eb';
      } else if (calendarEvent.type === 'admin') {
        backgroundColor = '#8b5cf6';
        borderColor = '#7c3aed';
      } else if (calendarEvent.type === 'buffer') {
        backgroundColor = '#6b7280';
        borderColor = '#4b5563';
      }

      // Add visual feedback for draggable events
      const isDraggable = calendarEvent.type === 'task';

      return {
        style: {
          backgroundColor,
          borderColor,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '4px',
          opacity: scheduleTaskMutation.isPending ? 0.6 : 0.9,
          color: 'white',
          display: 'block',
          cursor: isDraggable ? (scheduleTaskMutation.isPending ? 'wait' : 'move') : 'default',
          transition: 'opacity 0.2s ease, transform 0.1s ease',
        },
      };
    },
    [scheduleTaskMutation.isPending]
  );

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask) return;

    // This is a simplified version - in production you'd calculate the exact time based on drop position
    const dropTime = new Date();
    await handleScheduleTask(draggedTask, dropTime);
    setDraggedTask(null);
  };

  // Calendar navigation handlers
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  const tooltipAccessor = useCallback((event: BigCalendarEvent) => {
    const calendarEvent = event as unknown as CalendarEvent;
    if (calendarEvent.task) {
      return `${calendarEvent.title}\nDuration: ${calendarEvent.task.duration} min\nCategory: ${calendarEvent.task.category}`;
    }
    return calendarEvent.title;
  }, []);

  const draggableAccessor = useCallback((event: any) => {
    const calendarEvent = event as CalendarEvent;
    return calendarEvent.type === 'task';
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
          <p className="mt-16 text-slate">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">Calendar</h1>
        <p className="text-slate mt-4">Schedule and organize your tasks</p>
      </Card>

      {/* Main Layout */}
      <div className="flex gap-24">
        {/* Sidebar - Unscheduled Tasks */}
        <div className="w-1/4 space-y-16">
          <Card padding="medium">
            <h2 className="text-h2 text-ink mb-16">
              Unscheduled Tasks ({unscheduledTasks.length})
            </h2>
            <div className="space-y-12 max-h-[600px] overflow-y-auto">
              {unscheduledTasks.length === 0 ? (
                <p className="text-slate text-small text-center py-16">
                  All tasks are scheduled!
                </p>
              ) : (
                unscheduledTasks.map((task, index) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className="border border-stone rounded-card p-12 cursor-move hover:shadow-e02 transition-shadow duration-micro bg-snow"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: getCategoryColor(task.category),
                    }}
                  >
                    <div className="flex items-start justify-between mb-8">
                      <span className="text-micro font-bold text-slate">#{index + 1}</span>
                      <Badge
                        variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'}
                        size="small"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-ink text-small mb-8 line-clamp-2">
                      {task.name}
                    </h3>
                    <div className="flex items-center justify-between text-micro text-slate mb-8">
                      <span>{task.duration} min</span>
                      <span>{task.category}</span>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => {
                        const timeString = prompt(
                          'Enter scheduled time (e.g., "2:00 PM" or "14:00"):'
                        );
                        if (timeString) {
                          try {
                            const scheduledTime = moment(timeString, [
                              'h:mm A',
                              'HH:mm',
                            ]).toDate();
                            if (isNaN(scheduledTime.getTime())) {
                              toast.showError('Invalid time format');
                              return;
                            }
                            handleScheduleTask(task, scheduledTime);
                          } catch (err) {
                            toast.showError('Invalid time format');
                          }
                        }
                      }}
                      className="w-full text-small"
                    >
                      Schedule
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Legend */}
          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-12">Legend</h3>
            <div className="space-y-8 text-small">
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-default bg-sky mr-8"></div>
                <span className="text-ink">Deep Work</span>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-default bg-lavender mr-8"></div>
                <span className="text-ink">Admin Time</span>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-16 rounded-default bg-fog mr-8"></div>
                <span className="text-ink">Buffer Time</span>
              </div>
              <div className="pt-8 border-t border-fog">
                <p className="text-slate font-medium mb-8 text-small">Task Categories:</p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries({
                    SCHOOL: '#3b82f6',
                    MUSIC: '#8b5cf6',
                    FITNESS: '#10b981',
                    GAMING: '#f59e0b',
                    NUTRITION: '#14b8a6',
                    HYGIENE: '#06b6d4',
                    PET: '#ec4899',
                    SOCIAL: '#f97316',
                    PERSONAL: '#6366f1',
                    ADMIN: '#84cc16',
                  }).map(([category, color]) => (
                    <div key={category} className="flex items-center">
                      <div
                        className="w-12 h-12 rounded mr-4"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-ink text-micro">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <div className="bg-cloud rounded-card shadow-e01 border border-fog p-24 flex-1 relative" onDragOver={handleDragOver} onDrop={handleDrop}>
          {/* Loading Overlay */}
          {scheduleTaskMutation.isPending && (
            <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm flex items-center justify-center z-40 rounded-card">
              <div className="bg-cloud px-24 py-16 rounded-modal shadow-eglass border border-fog">
                <div className="flex items-center space-x-12">
                  <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-ink"></div>
                  <span className="text-ink text-body">Rescheduling task...</span>
                </div>
              </div>
            </div>
          )}
          <DnDCalendar
            localizer={localizer}
            events={events as BigCalendarEvent[]}
            startAccessor={(event: any) => event.start}
            endAccessor={(event: any) => event.end}
            style={{ height: 700 }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            view={currentView}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            components={{
              toolbar: CalendarToolbar,
            }}
            step={30}
            showMultiDayTimes
            tooltipAccessor={tooltipAccessor}
            draggableAccessor={draggableAccessor}
            resizable
            onEventDrop={handleEventDrop as any}
            onEventResize={handleEventResize as any}
          />
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-24"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-cloud rounded-modal shadow-eglass border border-fog max-w-2xl w-full p-32"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-16">
              <h2 className="text-h2 text-ink">{selectedTask.name}</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate hover:text-ink transition-colors duration-micro"
              >
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-16">
              <div>
                <h3 className="text-h3 text-ink mb-8">
                  Definition of Done
                </h3>
                <p className="text-body text-ink">{selectedTask.definitionOfDone}</p>
              </div>

              <div className="grid grid-cols-2 gap-16 text-body">
                <div>
                  <h3 className="font-medium text-ink mb-4">Priority</h3>
                  <Badge
                    variant={selectedTask.priority === 'MUST' ? 'danger' : selectedTask.priority === 'SHOULD' ? 'warn' : selectedTask.priority === 'COULD' ? 'sun' : 'neutral'}
                  >
                    {selectedTask.priority}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-medium text-ink mb-4">Category</h3>
                  <span className="text-slate">{selectedTask.category}</span>
                </div>

                <div>
                  <h3 className="font-medium text-ink mb-4">Duration</h3>
                  <span className="text-slate">{selectedTask.duration} minutes</span>
                </div>

                <div>
                  <h3 className="font-medium text-ink mb-4">
                    Energy Required
                  </h3>
                  <Badge variant={selectedTask.energyRequired === 'HIGH' ? 'mint' : selectedTask.energyRequired === 'MEDIUM' ? 'sun' : 'blush'}>
                    {selectedTask.energyRequired}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-medium text-ink mb-4">Context</h3>
                  <span className="text-slate">{selectedTask.context}</span>
                </div>

                {selectedTask.scheduledStart && (
                  <div>
                    <h3 className="font-medium text-ink mb-4">
                      Scheduled Time
                    </h3>
                    <span className="text-slate">
                      {moment(selectedTask.scheduledStart).format('MMM D, YYYY h:mm A')}
                    </span>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <h3 className="font-medium text-ink mb-4">Due Date</h3>
                    <span className="text-slate">
                      {moment(selectedTask.dueDate).format('MMM D, YYYY')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-24 flex justify-end space-x-12">
              {selectedTask.scheduledStart && (
                <Button
                  variant="danger"
                  onClick={() => handleUnscheduleTask(selectedTask)}
                  disabled={unscheduleTaskMutation.isPending}
                >
                  {unscheduleTaskMutation.isPending ? 'Unscheduling...' : 'Unschedule'}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setSelectedTask(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
