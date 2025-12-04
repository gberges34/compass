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

export const updateSliceSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional().nullable(),
  category: z.string().min(1).optional(),
});

export const sliceIdParamSchema = z.object({
  id: z.string().uuid(),
});


