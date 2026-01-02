import { useMemo } from 'react';
import type { Task, CalendarEvent, DailyPlan, DeepWorkBlock, TimeBlock } from '../types';
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

      // Config-driven block generation for maintainability
      const blockConfigs: {
        key: keyof Pick<DailyPlan, 'deepWorkBlock1' | 'deepWorkBlock2' | 'adminBlock' | 'bufferBlock'>;
        idPrefix: string;
        type: 'deepWork' | 'admin' | 'buffer';
        getTitle: (block: DeepWorkBlock | TimeBlock) => string;
      }[] = [
        { key: 'deepWorkBlock1', idPrefix: 'dw1', type: 'deepWork', getTitle: (b) => `Deep Work: ${(b as DeepWorkBlock).focus}` },
        { key: 'deepWorkBlock2', idPrefix: 'dw2', type: 'deepWork', getTitle: (b) => `Deep Work: ${(b as DeepWorkBlock).focus}` },
        { key: 'adminBlock', idPrefix: 'admin', type: 'admin', getTitle: () => 'Admin Time' },
        { key: 'bufferBlock', idPrefix: 'buffer', type: 'buffer', getTitle: () => 'Buffer Time' },
      ];

      blockConfigs.forEach(({ key, idPrefix, type, getTitle }) => {
        const block = todayPlan[key];
        if (block) {
          planEvents.push({
            id: `${idPrefix}-${todayPlan.id}`,
            title: getTitle(block),
            start: combineISODateAndTime(today, block.start),
            end: combineISODateAndTime(today, block.end),
            type,
          });
        }
      });
    }

    return [...taskEvents, ...planEvents];
  }, [taskEvents, todayPlan]);

  return { events, taskEvents };
}

