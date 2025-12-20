import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';

export const timeDimensionEnum = z.enum(['PRIMARY', 'WORK_MODE', 'SOCIAL', 'SEGMENT']);
export const timeSourceEnum = z.enum(['SHORTCUT', 'TIMERY', 'MANUAL', 'API']);

export const startSliceSchema = z.object({
  category: z.string().min(1),
  dimension: timeDimensionEnum,
  source: timeSourceEnum,
  linkedTaskId: z.string().uuid().optional(),
});

export const stopSliceSchema = z.object({
  dimension: timeDimensionEnum,
  category: z.string().optional(),
});

export const querySlicesSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  dimension: timeDimensionEnum.optional(),
  category: z.string().optional(),
  linkedTaskId: z.string().uuid().optional(),
});

export const summarySlicesSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Accepts ISO 8601 datetimes with explicit UTC suffix or timezone offset.
// iOS Shortcuts can emit offsets without a colon (+0000). Normalize those, then use date-fns parseISO/isValid to ensure the date is real (rejects impossible dates like Feb 30).
const isoDateTimeString = z.string().refine((value) => {
  // Normalize colonless offsets: 2025-12-04T12:00:00-0500 -> 2025-12-04T12:00:00-05:00
  const trimmed = value.trim();
  const normalized = trimmed.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const parsed = parseISO(normalized);
  return isValid(parsed);
}, { message: 'Invalid ISO datetime' });

// Deprecated: Use healthSyncSchema instead
export const healthSleepSyncSchema = z
  .object({
    windowStart: isoDateTimeString,
    windowEnd: isoDateTimeString,
    sleepStart: isoDateTimeString,
    sleepEnd: isoDateTimeString,
  })
  .refine((data) => {
    const windowStart = new Date(data.windowStart);
    const windowEnd = new Date(data.windowEnd);
    const sleepStart = new Date(data.sleepStart);
    const sleepEnd = new Date(data.sleepEnd);

    return (
      windowStart < windowEnd &&
      sleepStart < sleepEnd &&
      sleepStart >= windowStart &&
      sleepEnd <= windowEnd
    );
  }, { message: 'Invalid sleep/window bounds' });

// Unified health sync schema for Sleep, Workouts, and Activity metrics
export const healthSyncSchema = z.object({
  date: isoDateTimeString,  // The day being synced (usually yesterday)
  
  // Sleep sessions (array - HealthKit can report multiple)
  sleepSessions: z.array(z.object({
    start: isoDateTimeString,
    end: isoDateTimeString,
    quality: z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']).optional(),
  })).optional(),
  
  // Workout sessions
  workouts: z.array(z.object({
    start: isoDateTimeString,
    end: isoDateTimeString,
    type: z.string(),  // "Running", "Strength Training", etc.
    calories: z.number().optional(),
  })).optional(),
  
  // Daily activity metrics
  activity: z.object({
    steps: z.number().optional(),
    activeCalories: z.number().optional(),
    exerciseMinutes: z.number().optional(),
    standHours: z.number().optional(),
  }).optional(),
}).refine((data) => {
  // Validate that at least one data type is provided
  return !!(data.sleepSessions?.length || data.workouts?.length || data.activity);
}, { message: 'At least one health data type must be provided' });

export const updateSliceSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional().nullable(),
  category: z.string().min(1).optional(),
}).refine(
  (data) => data.start !== undefined || data.end !== undefined || data.category !== undefined,
  { message: 'At least one field (start, end, or category) must be provided' }
);

export const sliceIdParamSchema = z.object({
  id: z.string().uuid(),
});
