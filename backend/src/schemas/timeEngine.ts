import { z } from 'zod';

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
// Extended to allow offsets without a colon (e.g., +0000) which iOS Shortcuts can emit.
const isoDateTimeString = z.string().refine((value) => {
  const isoWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
  if (!isoWithOffset.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}, { message: 'Invalid ISO datetime' });

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
