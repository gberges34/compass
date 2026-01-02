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
  // Generate task events from scheduled tasks using flatMap for single-pass efficiency
  const taskEvents = useMemo(() => {
    log('[useCalendarEvents] Generating events from tasks:', scheduledTasks.length);

    return scheduledTasks.flatMap((task: Task) => {
      // Defensive: ensure scheduledStart exists and is valid
      if (!task.scheduledStart) {
        log('[useCalendarEvents] Task missing scheduledStart:', task.id);
        return [];
      }

      // new Date() never throws, it returns Invalid Date
      const start = new Date(task.scheduledStart);
      if (!isValidDate(start)) {
        log('[useCalendarEvents] Invalid scheduledStart date:', task.scheduledStart);
        return [];
      }

      const end = addMinutesToDate(start, task.duration);
      return [{
        id: task.id,
        title: task.name,
        start,
        end,
        task,
        type: 'task' as const,
      }];
    });
  }, [scheduledTasks]);

  // Generate combined events from tasks and daily plan blocks
  const events = useMemo(() => {
    // Generate plan events if today's plan exists
    const planEvents: CalendarEvent[] = [];
    if (todayPlan) {
      const today = getTodayDateString();

      const blocks = (todayPlan as DailyPlan & { plannedBlocks?: any }).plannedBlocks ?? [];
      blocks.forEach((block) => {
        planEvents.push({
          id: `plan-${block.id}`,
          title: `Plan: ${block.label}`,
          start: combineISODateAndTime(today, block.start),
          end: combineISODateAndTime(today, block.end),
          type: 'plannedBlock',
        });
      });
    }

    return [...taskEvents, ...planEvents];
  }, [taskEvents, todayPlan]);

  return { events, taskEvents };
}
