import { useMemo } from 'react';
import type { Task, CalendarEvent, DailyPlan } from '../types';
import {
  getTodayDateString,
  combineISODateAndTime,
  addMinutesToDate,
  isValidDate,
} from '../lib/dateUtils';

// Development-only logging
const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};

interface UseCalendarEventsParams {
  scheduledTasks: Task[];
  todayPlan: DailyPlan | null | undefined;
}

interface UseCalendarEventsResult {
  events: CalendarEvent[];
  taskEvents: CalendarEvent[];
}

/**
 * Custom hook to generate calendar events from scheduled tasks and daily plan blocks.
 * Extracts event generation logic from CalendarPage for better separation of concerns.
 */
export function useCalendarEvents({
  scheduledTasks,
  todayPlan,
}: UseCalendarEventsParams): UseCalendarEventsResult {
  // Generate task events from scheduled tasks
  const taskEvents = useMemo(() => {
    log('[useCalendarEvents] Generating events from tasks:', scheduledTasks.length);

    return scheduledTasks
      .filter((task: Task) => {
        // Defensive: ensure scheduledStart exists and is valid
        if (!task.scheduledStart) {
          log('[useCalendarEvents] Task missing scheduledStart:', task.id);
          return false;
        }

        // new Date() never throws, it returns Invalid Date
        const start = new Date(task.scheduledStart);
        if (!isValidDate(start)) {
          log('[useCalendarEvents] Invalid scheduledStart date:', task.scheduledStart);
          return false;
        }
        return true;
      })
      .map((task: Task) => {
        const start = new Date(task.scheduledStart!);
        const end = addMinutesToDate(start, task.duration);

        return {
          id: task.id,
          title: task.name,
          start,
          end,
          task,
          type: 'task' as const,
        };
      });
  }, [scheduledTasks]);

  // Generate combined events from tasks and daily plan blocks
  const events = useMemo(() => {
    // Generate plan events if today's plan exists
    const planEvents: CalendarEvent[] = [];
    if (todayPlan) {
      const today = getTodayDateString();

      if (todayPlan.deepWorkBlock1) {
        planEvents.push({
          id: `dw1-${todayPlan.id}`,
          title: `Deep Work: ${todayPlan.deepWorkBlock1.focus}`,
          start: combineISODateAndTime(today, todayPlan.deepWorkBlock1.start),
          end: combineISODateAndTime(today, todayPlan.deepWorkBlock1.end),
          type: 'deepWork',
        });
      }

      if (todayPlan.deepWorkBlock2) {
        planEvents.push({
          id: `dw2-${todayPlan.id}`,
          title: `Deep Work: ${todayPlan.deepWorkBlock2.focus}`,
          start: combineISODateAndTime(today, todayPlan.deepWorkBlock2.start),
          end: combineISODateAndTime(today, todayPlan.deepWorkBlock2.end),
          type: 'deepWork',
        });
      }

      if (todayPlan.adminBlock) {
        planEvents.push({
          id: `admin-${todayPlan.id}`,
          title: 'Admin Time',
          start: combineISODateAndTime(today, todayPlan.adminBlock.start),
          end: combineISODateAndTime(today, todayPlan.adminBlock.end),
          type: 'admin',
        });
      }

      if (todayPlan.bufferBlock) {
        planEvents.push({
          id: `buffer-${todayPlan.id}`,
          title: 'Buffer Time',
          start: combineISODateAndTime(today, todayPlan.bufferBlock.start),
          end: combineISODateAndTime(today, todayPlan.bufferBlock.end),
          type: 'buffer',
        });
      }
    }

    return [...taskEvents, ...planEvents];
  }, [taskEvents, todayPlan]);

  return { events, taskEvents };
}

