import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getTasks, scheduleTask, getTodayPlan } from '../lib/api';
import type { Task, CalendarEvent, DailyPlan } from '../types';
import { useToast } from '../contexts/ToastContext';

const localizer = momentLocalizer(moment);

const CalendarPage: React.FC = () => {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all NEXT tasks
      const allTasks = await getTasks({ status: 'NEXT' });
      setTasks(allTasks);

      // Separate scheduled and unscheduled tasks
      const scheduled = allTasks.filter((task) => task.scheduledStart);
      const unscheduled = allTasks.filter((task) => !task.scheduledStart);
      setUnscheduledTasks(unscheduled);

      // Convert scheduled tasks to calendar events
      const taskEvents: CalendarEvent[] = scheduled.map((task) => {
        const start = new Date(task.scheduledStart!);
        const end = new Date(start.getTime() + task.duration * 60000);
        return {
          id: task.id,
          title: task.name,
          start,
          end,
          task,
          type: 'task',
        };
      });

      // Fetch today's plan for time blocks
      let planEvents: CalendarEvent[] = [];
      try {
        const plan = await getTodayPlan();
        setTodayPlan(plan);

        const today = new Date().toISOString().split('T')[0];

        // Deep Work Block 1
        if (plan.deepWorkBlock1) {
          planEvents.push({
            id: `dw1-${plan.id}`,
            title: `Deep Work: ${plan.deepWorkBlock1.focus}`,
            start: new Date(`${today}T${plan.deepWorkBlock1.start}`),
            end: new Date(`${today}T${plan.deepWorkBlock1.end}`),
            type: 'deepWork',
          });
        }

        // Deep Work Block 2
        if (plan.deepWorkBlock2) {
          planEvents.push({
            id: `dw2-${plan.id}`,
            title: `Deep Work: ${plan.deepWorkBlock2.focus}`,
            start: new Date(`${today}T${plan.deepWorkBlock2.start}`),
            end: new Date(`${today}T${plan.deepWorkBlock2.end}`),
            type: 'deepWork',
          });
        }

        // Admin Block
        if (plan.adminBlock) {
          planEvents.push({
            id: `admin-${plan.id}`,
            title: 'Admin Time',
            start: new Date(`${today}T${plan.adminBlock.start}`),
            end: new Date(`${today}T${plan.adminBlock.end}`),
            type: 'admin',
          });
        }

        // Buffer Block
        if (plan.bufferBlock) {
          planEvents.push({
            id: `buffer-${plan.id}`,
            title: 'Buffer Time',
            start: new Date(`${today}T${plan.bufferBlock.start}`),
            end: new Date(`${today}T${plan.bufferBlock.end}`),
            type: 'buffer',
          });
        }
      } catch (err) {
        // No plan for today, that's okay
        setTodayPlan(null);
      }

      setEvents([...taskEvents, ...planEvents]);
    } catch (err) {
      toast.showError('Failed to load calendar data. Please try again.');
      console.error('Error fetching calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    [unscheduledTasks, toast]
  );

  const handleSelectEvent = useCallback((event: BigCalendarEvent) => {
    const calendarEvent = event as unknown as CalendarEvent;
    if (calendarEvent.task) {
      setSelectedTask(calendarEvent.task);
    } else {
      toast.showInfo(`${calendarEvent.title}\nType: ${calendarEvent.type}`);
    }
  }, [toast]);

  const handleScheduleTask = async (task: Task, scheduledStart: Date) => {
    try {
      const isoString = scheduledStart.toISOString();
      const updatedTask = await scheduleTask(task.id, isoString);

      // Update local state
      setUnscheduledTasks((prev) => prev.filter((t) => t.id !== task.id));
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, scheduledStart: isoString } : t))
      );

      // Add to calendar
      const end = new Date(scheduledStart.getTime() + task.duration * 60000);
      const newEvent: CalendarEvent = {
        id: task.id,
        title: task.name,
        start: scheduledStart,
        end,
        task: updatedTask,
        type: 'task',
      };
      setEvents((prev) => [...prev, newEvent]);
      toast.showSuccess(`Task scheduled for ${moment(scheduledStart).format('MMM D, h:mm A')}`);
    } catch (err) {
      toast.showError('Failed to schedule task. Please try again.');
      console.error('Error scheduling task:', err);
    }
  };

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

  const eventStyleGetter = (event: BigCalendarEvent) => {
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

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        display: 'block',
      },
    };
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">Schedule and organize your tasks</p>
      </div>

      {/* Main Layout */}
      <div className="flex gap-6">
        {/* Sidebar - Unscheduled Tasks */}
        <div className="w-1/4 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Unscheduled Tasks ({unscheduledTasks.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {unscheduledTasks.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">
                  All tasks are scheduled!
                </p>
              ) : (
                unscheduledTasks.map((task, index) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className="border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow bg-white"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: getCategoryColor(task.category),
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
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
                    </div>
                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                      {task.name}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{task.duration} min</span>
                      <span>{task.category}</span>
                    </div>
                    <button
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
                      className="mt-2 w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      Schedule
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-blue-500 mr-2"></div>
                <span className="text-gray-700">Deep Work</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-purple-500 mr-2"></div>
                <span className="text-gray-700">Admin Time</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-gray-500 mr-2"></div>
                <span className="text-gray-700">Buffer Time</span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600 font-medium mb-1">Task Categories:</p>
                <div className="grid grid-cols-2 gap-1">
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
                        className="w-3 h-3 rounded mr-1"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="text-gray-700 text-xs">{category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div
          className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Calendar
            localizer={localizer}
            events={events as BigCalendarEvent[]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 700 }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            defaultView="month"
            step={30}
            showMultiDayTimes
            tooltipAccessor={(event: BigCalendarEvent) => {
              const calendarEvent = event as unknown as CalendarEvent;
              if (calendarEvent.task) {
                return `${calendarEvent.title}\nDuration: ${calendarEvent.task.duration} min\nCategory: ${calendarEvent.task.category}`;
              }
              return calendarEvent.title;
            }}
          />
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedTask.name}</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">
                  Definition of Done
                </h3>
                <p className="text-gray-900">{selectedTask.definitionOfDone}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Priority</h3>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      selectedTask.priority === 'MUST'
                        ? 'bg-red-100 text-red-800'
                        : selectedTask.priority === 'SHOULD'
                        ? 'bg-orange-100 text-orange-800'
                        : selectedTask.priority === 'COULD'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedTask.priority}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Category</h3>
                  <span className="text-gray-900">{selectedTask.category}</span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Duration</h3>
                  <span className="text-gray-900">{selectedTask.duration} minutes</span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">
                    Energy Required
                  </h3>
                  <span className="text-gray-900">{selectedTask.energyRequired}</span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Context</h3>
                  <span className="text-gray-900">{selectedTask.context}</span>
                </div>

                {selectedTask.scheduledStart && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">
                      Scheduled Time
                    </h3>
                    <span className="text-gray-900">
                      {moment(selectedTask.scheduledStart).format('MMM D, YYYY h:mm A')}
                    </span>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Due Date</h3>
                    <span className="text-gray-900">
                      {moment(selectedTask.dueDate).format('MMM D, YYYY')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
