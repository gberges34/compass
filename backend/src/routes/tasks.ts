import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma, TaskStatus, Priority, Category } from '@prisma/client';
import { z } from 'zod';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { enrichTask } from '../services/llm';
import { calculateTimeOfDay, getDayOfWeek } from '../utils/timeUtils';
import { getCurrentTimestamp, dateToISO } from '../utils/dateHelpers';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import { env } from '../config/env';

// Development-only logging
const DEBUG = env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(['MUST', 'SHOULD', 'COULD', 'MAYBE']),
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']),
  context: z.enum(['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE']),
  energyRequired: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  duration: z.number().positive(),
  definitionOfDone: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['NEXT', 'WAITING', 'ACTIVE', 'DONE', 'SOMEDAY']).optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const scheduleTaskSchema = z.object({
  scheduledStart: z.string().datetime(),
});

const updateStatusSchema = z.object({
  status: z.enum(['NEXT', 'WAITING', 'ACTIVE', 'DONE', 'SOMEDAY']),
});

const enrichTaskSchema = z.object({
  tempTaskId: z.string().uuid(),
  priority: z.number().min(1).max(4),
  duration: z.number().positive(),
  energy: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

const completeTaskSchema = z.object({
  outcome: z.string().min(1),
  effortLevel: z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  keyInsight: z.string().min(1),
  actualDuration: z.number().positive(), // minutes
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timeryEntryId: z.string().optional(),
});

// GET /api/tasks - List tasks with filters
// Pagination schema
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).default(50).transform(val => Math.min(val, 100)),
});

// GET /api/tasks - List tasks with filters and pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, category, scheduledDate, cursor, limit } = req.query;

  // Validate pagination params
  const pagination = paginationSchema.parse({ cursor, limit });

  log('[GET /tasks] Query params:', {
    status,
    priority,
    category,
    scheduledDate,
    cursor: pagination.cursor,
    limit: pagination.limit
  });

  const where: Prisma.TaskWhereInput = {};

  if (status) where.status = status as TaskStatus;
  if (priority) where.priority = priority as Priority;
  if (category) where.category = category as Category;
  if (scheduledDate) {
    const date = new Date(scheduledDate as string);
    where.scheduledStart = {
      gte: startOfDay(date),
      lte: endOfDay(date),
    };
  }

  // Add cursor filter
  if (pagination.cursor) {
    where.id = { gt: pagination.cursor };
  }

  log('[GET /tasks] Query where clause:', JSON.stringify(where));

  // Cursor-based pagination
  const tasks = await prisma.task.findMany({
    where,
    take: pagination.limit + 1, // Fetch one extra to determine if there's a next page
    ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    orderBy: [
      { status: 'asc' },
      { priority: 'asc' },
      { scheduledStart: 'asc' },
      { createdAt: 'desc' }, // Tiebreaker for stable pagination
    ],
  });

  // Determine if there's a next page
  const hasMore = tasks.length > pagination.limit;
  const results = hasMore ? tasks.slice(0, pagination.limit) : tasks;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  log('[GET /tasks] Found tasks:', results.length, 'hasMore:', hasMore);

  res.json({
    items: results,
    nextCursor,
  });
}));

// GET /api/tasks/:id - Get single task
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
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

  // Get task BEFORE update for logging
  // Note: No explicit existence check needed - the subsequent update will throw NotFoundError via Prisma extension
  const taskBefore = await prisma.task.findUnique({
    where: { id },
  });

  log('[PATCH /schedule] Task state BEFORE:', {
    id: taskBefore?.id,
    name: taskBefore?.name,
    scheduledStart: taskBefore?.scheduledStart,
    updatedAt: taskBefore?.updatedAt,
  });

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
    previousScheduledStart: taskBefore?.scheduledStart,
    newScheduledStart: task.scheduledStart,
    durationMinutes: task.duration,
  });

  res.json(task);
}));

// PATCH /api/tasks/:id/unschedule - Unschedule task
router.patch('/:id/unschedule', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  log('[PATCH /unschedule] Request for task:', { id });

  // Get task BEFORE update for logging
  // Note: No explicit existence check needed - the subsequent update will throw NotFoundError via Prisma extension
  const taskBefore = await prisma.task.findUnique({
    where: { id },
  });

  log('[PATCH /unschedule] Task state BEFORE:', {
    id: taskBefore?.id,
    name: taskBefore?.name,
    scheduledStart: taskBefore?.scheduledStart,
    updatedAt: taskBefore?.updatedAt,
  });

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
    previousScheduledStart: taskBefore?.scheduledStart,
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
router.get('/calendar/:date', asyncHandler(async (req: Request, res: Response) => {
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
router.get('/scheduled/:date', asyncHandler(async (req: Request, res: Response) => {
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

  // Get task for calculations
  // Note: We still need findUnique here to get task data for metric calculations
  // If task doesn't exist, the subsequent update in transaction will throw NotFoundError via Prisma extension
  const task = await prisma.task.findUnique({
    where: { id }
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  // Calculate metrics
  const variance = validatedData.actualDuration - task.duration;
  const efficiency = (task.duration / validatedData.actualDuration) * 100;
  const startTime = new Date(validatedData.startTime);
  const endTime = new Date(validatedData.endTime);
  const timeOfDay = calculateTimeOfDay(startTime);
  const dayOfWeek = getDayOfWeek(startTime);

  // TRANSACTION: Atomic task completion
  const result = await prisma.$transaction(async (tx) => {
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

    return { updatedTask, postDoLog };
  });

  log('[POST /tasks/:id/complete] Completed task:', task.id);
  res.json({
    task: result.updatedTask,
    postDoLog: result.postDoLog,
    metrics: {
      variance,
      efficiency: Math.round(efficiency * 100) / 100,
      timeOfDay,
      dayOfWeek
    }
  });
}));

export default router;
