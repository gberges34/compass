import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma, $Enums, Task } from '@prisma/client';
import { z } from 'zod';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { enrichTask } from '../services/llm';
import { calculateTimeOfDay, getDayOfWeek } from '../utils/timeUtils';
import { getCurrentTimestamp, dateToISO } from '../utils/dateHelpers';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import { env } from '../config/env';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';
import {
  priorityEnum,
  statusEnum,
  categoryEnum,
  contextEnum,
  energyEnum,
  effortEnum,
} from '../schemas/enums';
import { paginationSchema } from '../schemas/pagination';
import type { PaginationResponse } from '@compass/dto/pagination';

// Development-only logging
const DEBUG = env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1),
  priority: priorityEnum,
  category: categoryEnum,
  context: contextEnum,
  energyRequired: energyEnum,
  duration: z.number().positive(),
  definitionOfDone: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  status: statusEnum.optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const scheduleTaskSchema = z.object({
  scheduledStart: z.string().datetime(),
});

const updateStatusSchema = z.object({
  status: statusEnum,
});

const enrichTaskSchema = z.object({
  tempTaskId: z.string().uuid(),
  priority: z.number().min(1).max(4),
  duration: z.number().positive(),
  energy: energyEnum,
});

const completeTaskSchema = z.object({
  outcome: z.string().min(1),
  effortLevel: effortEnum,
  keyInsight: z.string().min(1),
  actualDuration: z.number().positive(), // minutes
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timeryEntryId: z.string().optional(),
});

// GET /api/tasks - List tasks with filters
export const listTasksQuerySchema = z.object({
  status: z.nativeEnum($Enums.TaskStatus).optional(),
  priority: z.nativeEnum($Enums.Priority).optional(),
  category: z.nativeEnum($Enums.Category).optional(),
  scheduledFilter: z.string().optional(),
}).merge(paginationSchema);

// GET /api/tasks - List tasks with filters and pagination
router.get('/', cacheControl(CachePolicies.SHORT), asyncHandler(async (req: Request, res: Response) => {
  const query = listTasksQuerySchema.parse(req.query);

  log('[GET /tasks] Query params:', query);

  const where: Prisma.TaskWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.category) where.category = query.category;
  if (query.scheduledFilter) {
    if (query.scheduledFilter === 'true') {
      // All scheduled tasks (scheduledStart is not null)
      where.scheduledStart = { not: null };
    } else if (query.scheduledFilter === 'false') {
      // Unscheduled tasks only (scheduledStart is null)
      where.scheduledStart = null;
    } else {
      // Specific date (e.g., '2025-11-16')
      const date = new Date(query.scheduledFilter);
      where.scheduledStart = {
        gte: startOfDay(date),
        lte: endOfDay(date),
      };
    }
  }

  log('[GET /tasks] Query where clause:', JSON.stringify(where));

  // Cursor-based pagination
  const tasks = await prisma.task.findMany({
    where,
    take: query.limit + 1, // Fetch one extra to determine if there's a next page
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: [
      { status: 'asc' },
      { priority: 'asc' },
      { scheduledStart: 'asc' },
      { createdAt: 'desc' }, // Tiebreaker for stable pagination
    ],
  });

  // Determine if there's a next page
  const hasMore = tasks.length > query.limit;
  const results = hasMore ? tasks.slice(0, query.limit) : tasks;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  log('[GET /tasks] Found tasks:', results.length, 'hasMore:', hasMore);

  const response: PaginationResponse<Task> = {
    items: results,
    nextCursor,
  };

  res.json(response);
}));

// GET /api/tasks/:id - Get single task
router.get('/:id', cacheControl(CachePolicies.SHORT), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { postDoLog: true },
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  res.json(task);
}));

// POST /api/tasks - Create new task
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);

  const task = await prisma.task.create({
    data: {
      ...validatedData,
      status: validatedData.status || (validatedData.priority === 'MUST' || validatedData.priority === 'SHOULD' ? 'NEXT' : 'WAITING'),
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
    },
  });

  log('[POST /tasks] Created task:', task.id);
  res.status(201).json(task);
}));

// POST /api/tasks/enrich - Enrich and create task from temp task (Northbound)
router.post('/enrich', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = enrichTaskSchema.parse(req.body);

  const tempTask = await prisma.tempCapturedTask.findUnique({
    where: { id: validatedData.tempTaskId },
  });

  if (!tempTask) {
    throw new NotFoundError('Temporary task');
  }

  if (tempTask.processed) {
    throw new BadRequestError('Task already processed');
  }

  // Map priority number to enum
  const priorityMap: Record<number, 'MUST' | 'SHOULD' | 'COULD' | 'MAYBE'> = {
    1: 'MUST',
    2: 'SHOULD',
    3: 'COULD',
    4: 'MAYBE'
  };

  // Enrich with LLM (outside transaction - external API call)
  const enrichment = await enrichTask({
    rawTaskName: tempTask.name,
    priority: validatedData.priority,
    duration: validatedData.duration,
    energy: validatedData.energy
  });

  // TRANSACTION: Atomic task creation + temp task marking
  const result = await prisma.$transaction(async (tx) => {
    // Create full task
    const task = await tx.task.create({
      data: {
        name: enrichment.rephrasedName,
        status: validatedData.priority <= 2 ? 'NEXT' : 'WAITING',
        priority: priorityMap[validatedData.priority],
        category: enrichment.category as any,
        context: enrichment.context as any,
        energyRequired: validatedData.energy,
        duration: validatedData.duration,
        definitionOfDone: enrichment.definitionOfDone,
        dueDate: tempTask.dueDate
      }
    });

    // Mark temp task as processed
    const updatedTempTask = await tx.tempCapturedTask.update({
      where: { id: validatedData.tempTaskId },
      data: { processed: true }
    });

    return { task, updatedTempTask };
  });

  log('[POST /tasks/enrich] Enriched and created task:', result.task.id);
  res.status(201).json({
    task: result.task,
    enrichment
  });
}));

// PATCH /api/tasks/:id - Update task
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateTaskSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    },
  });

  log('[PATCH /tasks/:id] Updated task:', task.id);
  res.json(task);
}));

// PATCH /api/tasks/:id/status - Update status only
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = updateStatusSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data: { status },
  });

  res.json(task);
}));

// PATCH /api/tasks/:id/schedule - Schedule task
router.patch('/:id/schedule', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = scheduleTaskSchema.parse(req.body);

  log('[PATCH /schedule] Request for task:', { id, scheduledStart: validatedData.scheduledStart });

  // Validate not scheduling in the past
  const scheduledDate = new Date(validatedData.scheduledStart);
  const now = new Date();

  if (scheduledDate < now) {
    log('[PATCH /schedule] Validation failed - past date:', {
      requestedDate: dateToISO(scheduledDate),
      currentTime: dateToISO(now),
    });
    throw new BadRequestError('Cannot schedule task in the past');
  }

  // Update task
  const task = await prisma.task.update({
    where: { id },
    data: {
      scheduledStart: scheduledDate,
    },
  });

  log('[PATCH /schedule] Task state AFTER:', {
    id: task.id,
    name: task.name,
    scheduledStart: task.scheduledStart,
    updatedAt: task.updatedAt,
  });

  log('[PATCH /schedule] Success - task scheduled:', {
    taskId: id,
    newScheduledStart: task.scheduledStart,
    durationMinutes: task.duration,
  });

  res.json(task);
}));

// PATCH /api/tasks/:id/unschedule - Unschedule task
router.patch('/:id/unschedule', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  log('[PATCH /unschedule] Request for task:', { id });

  // Update task
  const task = await prisma.task.update({
    where: { id },
    data: {
      scheduledStart: null,
    },
  });

  log('[PATCH /unschedule] Task state AFTER:', {
    id: task.id,
    name: task.name,
    scheduledStart: task.scheduledStart,
    updatedAt: task.updatedAt,
  });

  log('[PATCH /unschedule] Success - task unscheduled:', {
    taskId: id,
    newScheduledStart: task.scheduledStart,
  });

  res.json(task);
}));

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.task.delete({
    where: { id },
  });

  log('[DELETE /tasks/:id] Deleted task:', id);
  res.status(204).send();
}));

// GET /api/tasks/calendar/:date - Get tasks for calendar view (week)
router.get('/calendar/:date', cacheControl(CachePolicies.SHORT), asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params;
  const targetDate = new Date(date);

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

  const tasks = await prisma.task.findMany({
    where: {
      scheduledStart: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

  res.json(tasks);
}));

// GET /api/tasks/scheduled/:date - Get scheduled tasks for a specific date
router.get('/scheduled/:date', cacheControl(CachePolicies.SHORT), asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params;
  const targetDate = new Date(date);
  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const tasks = await prisma.task.findMany({
    where: {
      scheduledStart: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: {
      scheduledStart: 'asc',
    },
  });

  res.json(tasks);
}));

// POST /api/tasks/:id/activate - Activate task (Navigate shortcut)
router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      activatedAt: new Date(),
    },
  });

  // Map category to Focus Mode
  const focusModeMap: Record<string, string> = {
    SCHOOL: 'School',
    MUSIC: 'Music Practice',
    FITNESS: 'Workout',
    GAMING: 'Gaming',
    NUTRITION: 'Meal Prep',
    HYGIENE: 'Personal Care',
    PET: 'Pet Care',
    SOCIAL: 'Social',
    PERSONAL: 'Deep Work',
    ADMIN: 'Deep Work',
  };

  const focusMode = focusModeMap[task.category] || 'Deep Work';

  log('[POST /tasks/:id/activate] Activated task:', task.id);
  res.json({
    task,
    focusMode,
    timeryProject: task.category,
    definitionOfDone: task.definitionOfDone,
  });
}));

// POST /api/tasks/:id/complete - Complete task (Portside shortcut)
router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = completeTaskSchema.parse(req.body);

  const startTime = new Date(validatedData.startTime);
  const endTime = new Date(validatedData.endTime);

  // TRANSACTION: Atomic task completion with consistent read
  const result = await prisma.$transaction(async (tx) => {
    // Get task for calculations inside transaction to ensure consistent read
    const task = await tx.task.findUnique({
      where: { id }
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Calculate metrics using task data fetched within transaction
    const variance = validatedData.actualDuration - task.duration;
    const efficiency = (task.duration / validatedData.actualDuration) * 100;
    const timeOfDay = calculateTimeOfDay(startTime);
    const dayOfWeek = getDayOfWeek(startTime);

    // Create Post-Do Log
    const postDoLog = await tx.postDoLog.create({
      data: {
        taskId: task.id,
        outcome: validatedData.outcome,
        effortLevel: validatedData.effortLevel,
        keyInsight: validatedData.keyInsight,
        estimatedDuration: task.duration,
        actualDuration: validatedData.actualDuration,
        variance,
        efficiency,
        startTime,
        endTime,
        timeOfDay: timeOfDay as any,
        dayOfWeek,
        timeryEntryId: validatedData.timeryEntryId,
      }
    });

    // Update task status
    const updatedTask = await tx.task.update({
      where: { id },
      data: { status: 'DONE' }
    });

    return { updatedTask, postDoLog, variance, efficiency, timeOfDay, dayOfWeek };
  });

  log('[POST /tasks/:id/complete] Completed task:', id);
  res.json({
    task: result.updatedTask,
    postDoLog: result.postDoLog,
    metrics: {
      variance: result.variance,
      efficiency: Math.round(result.efficiency * 100) / 100,
      timeOfDay: result.timeOfDay,
      dayOfWeek: result.dayOfWeek
    }
  });
}));

export default router;
