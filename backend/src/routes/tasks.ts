import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { enrichTask } from '../services/llm';
import { calculateTimeOfDay, getDayOfWeek } from '../utils/timeUtils';
import { getCurrentTimestamp, dateToISO } from '../utils/dateHelpers';

// Development-only logging
const DEBUG = process.env.NODE_ENV === 'development';
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, category, scheduledDate } = req.query;

    log('[GET /tasks] Query params:', { status, priority, category, scheduledDate });

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (scheduledDate) {
      const date = new Date(scheduledDate as string);
      where.scheduledStart = {
        gte: startOfDay(date),
        lte: endOfDay(date),
      };
    }

    log('[GET /tasks] Query where clause:', JSON.stringify(where));

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { scheduledStart: 'asc' },
      ],
    });

    log('[GET /tasks] Found tasks:', tasks.length);
    res.json(tasks);
  } catch (error: any) {
    console.error('[GET /tasks] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        postDoLog: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        ...validatedData,
        status: validatedData.status || (validatedData.priority === 'MUST' || validatedData.priority === 'SHOULD' ? 'NEXT' : 'WAITING'),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      },
    });

    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/enrich - Enrich and create task from temp task (Northbound)
router.post('/enrich', async (req: Request, res: Response) => {
  try {
    const { tempTaskId, priority, duration, energy } = enrichTaskSchema.parse(req.body);

    // Get temp task
    const tempTask = await prisma.tempCapturedTask.findUnique({
      where: { id: tempTaskId }
    });

    if (!tempTask) {
      return res.status(404).json({ error: 'Temp task not found' });
    }

    if (tempTask.processed) {
      return res.status(400).json({ error: 'Task already processed' });
    }

    // Map priority number to enum
    const priorityMap: Record<number, 'MUST' | 'SHOULD' | 'COULD' | 'MAYBE'> = {
      1: 'MUST',
      2: 'SHOULD',
      3: 'COULD',
      4: 'MAYBE'
    };

    // Enrich with LLM
    const enrichment = await enrichTask({
      rawTaskName: tempTask.name,
      priority,
      duration,
      energy
    });

    // Create full task
    const task = await prisma.task.create({
      data: {
        name: enrichment.rephrasedName,
        status: priority <= 2 ? 'NEXT' : 'WAITING',
        priority: priorityMap[priority],
        category: enrichment.category as any,
        context: enrichment.context as any,
        energyRequired: energy,
        duration,
        definitionOfDone: enrichment.definitionOfDone,
        dueDate: tempTask.dueDate
      }
    });

    // Mark temp task as processed
    await prisma.tempCapturedTask.update({
      where: { id: tempTaskId },
      data: { processed: true }
    });

    res.status(201).json({
      task,
      enrichment
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error enriching task:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateTaskSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      },
    });

    res.json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id/status - Update status only
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id },
      data: { status },
    });

    res.json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id/schedule - Schedule task
router.patch('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scheduledStart } = scheduleTaskSchema.parse(req.body);

    log('[PATCH /schedule] Request for task:', { id, scheduledStart });

    // Get task BEFORE update for logging
    const taskBefore = await prisma.task.findUnique({
      where: { id },
    });

    if (!taskBefore) {
      log('[PATCH /schedule] Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    log('[PATCH /schedule] Task state BEFORE:', {
      id: taskBefore.id,
      name: taskBefore.name,
      scheduledStart: taskBefore.scheduledStart,
      updatedAt: taskBefore.updatedAt,
    });

    // Validate not scheduling in the past
    const scheduledDate = new Date(scheduledStart);
    const now = new Date();

    if (scheduledDate < now) {
      log('[PATCH /schedule] Validation failed - past date:', {
        requestedDate: dateToISO(scheduledDate),
        currentTime: dateToISO(now),
      });
      return res.status(400).json({
        error: 'Cannot schedule task in the past',
        scheduledStart,
        now: dateToISO(now),
      });
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
      previousScheduledStart: taskBefore.scheduledStart,
      newScheduledStart: task.scheduledStart,
      durationMinutes: task.duration,
    });

    res.json(task);
  } catch (error: any) {
    console.error('[PATCH /schedule] Error:', {
      taskId: req.params.id,
      error: error.message,
      code: error.code,
    });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: 'Failed to schedule task' });
  }
});

// PATCH /api/tasks/:id/unschedule - Unschedule task
router.patch('/:id/unschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    log('[PATCH /unschedule] Request for task:', { id });

    // Get task BEFORE update for logging
    const taskBefore = await prisma.task.findUnique({
      where: { id },
    });

    if (!taskBefore) {
      log('[PATCH /unschedule] Task not found:', id);
      return res.status(404).json({ error: 'Task not found' });
    }

    log('[PATCH /unschedule] Task state BEFORE:', {
      id: taskBefore.id,
      name: taskBefore.name,
      scheduledStart: taskBefore.scheduledStart,
      updatedAt: taskBefore.updatedAt,
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
      previousScheduledStart: taskBefore.scheduledStart,
      newScheduledStart: task.scheduledStart,
    });

    res.json(task);
  } catch (error: any) {
    console.error('[PATCH /unschedule] Error:', {
      taskId: req.params.id,
      error: error.message,
      code: error.code,
    });
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: 'Failed to unschedule task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/calendar/:date - Get tasks for calendar view (week)
router.get('/calendar/:date', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/scheduled/:date - Get scheduled tasks for a specific date
router.get('/scheduled/:date', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/activate - Activate task (Navigate shortcut)
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
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

    res.json({
      task,
      focusMode,
      timeryProject: task.category,
      definitionOfDone: task.definitionOfDone,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:id/complete - Complete task (Portside shortcut)
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = completeTaskSchema.parse(req.body);

    // Get task
    const task = await prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Calculate metrics
    const variance = validatedData.actualDuration - task.duration;
    const efficiency = (task.duration / validatedData.actualDuration) * 100;
    const startTime = new Date(validatedData.startTime);
    const endTime = new Date(validatedData.endTime);
    const timeOfDay = calculateTimeOfDay(startTime);
    const dayOfWeek = getDayOfWeek(startTime);

    // Create Post-Do Log
    const postDoLog = await prisma.postDoLog.create({
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
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: 'DONE' }
    });

    res.json({
      task: updatedTask,
      postDoLog,
      metrics: {
        variance,
        efficiency: Math.round(efficiency * 100) / 100,
        timeOfDay,
        dayOfWeek
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
