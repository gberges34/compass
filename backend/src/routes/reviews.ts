import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma, ReviewType } from '@prisma/client';
import { z } from 'zod';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';

const router = Router();

// Validation schema
const createReviewSchema = z.object({
  type: z.enum(['DAILY', 'WEEKLY']),
  wins: z.array(z.string()).max(3),
  misses: z.array(z.string()).max(3),
  lessons: z.array(z.string()).max(3),
  nextGoals: z.array(z.string()).max(3),
  energyAssessment: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
});

// Helper function to calculate daily metrics
async function calculateDailyMetrics(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Get completed tasks for the day
  const completedTasks = await prisma.task.count({
    where: {
      status: 'DONE',
      updatedAt: {
        gte: dayStart,
        lte: dayEnd,
      }
    }
  });

  // Get daily plan (if exists) to determine planned outcomes
  const dailyPlan = await prisma.dailyPlan.findUnique({
    where: { date: dayStart }
  });

  const plannedTasks = dailyPlan?.topOutcomes.length || 0;
  const executionRate = plannedTasks > 0
    ? (completedTasks / plannedTasks) * 100
    : 0;

  // Get all post-do logs for the day
  const postDoLogs = await prisma.postDoLog.findMany({
    where: {
      completionDate: {
        gte: dayStart,
        lte: dayEnd,
      }
    },
    include: { task: true }
  });

  // Calculate deep work hours (tasks with HIGH energy)
  const deepWorkMinutes = postDoLogs
    .filter((log: any) => log.task.energyRequired === 'HIGH')
    .reduce((sum: number, log: any) => sum + log.actualDuration, 0);

  const deepWorkHours = Math.round((deepWorkMinutes / 60) * 10) / 10;

  // Calculate category balance
  const categoryBreakdown: Record<string, number> = {};
  postDoLogs.forEach((log: any) => {
    const category = log.task.category;
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + log.actualDuration;
  });

  // Total tracked time in minutes
  const totalTrackedTime = Object.values(categoryBreakdown)
    .reduce((sum: number, mins: number) => sum + mins, 0);

  // Calculate time coverage (assuming 16 waking hours = 960 minutes)
  const wakingMinutes = 960;
  const timeCoverage = Math.round((totalTrackedTime / wakingMinutes) * 100 * 10) / 10;

  // Count context switches (approximation - tasks with different contexts in sequence)
  const contextSwitches = postDoLogs.length > 1 ? postDoLogs.length - 1 : 0;

  return {
    executionRate: Math.round(executionRate * 10) / 10,
    tasksCompleted: completedTasks,
    deepWorkHours,
    categoryBalance: categoryBreakdown,
    totalTrackedTime,
    timeCoverage,
    contextSwitches,
  };
}

// Helper function to calculate weekly metrics
async function calculateWeeklyMetrics(weekStart: Date, weekEnd: Date) {
  // Get all completed tasks for the week
  const completedTasks = await prisma.task.count({
    where: {
      status: 'DONE',
      updatedAt: {
        gte: weekStart,
        lte: weekEnd,
      }
    }
  });

  // Get all daily plans for the week
  const dailyPlans = await prisma.dailyPlan.findMany({
    where: {
      date: {
        gte: weekStart,
        lte: weekEnd,
      }
    }
  });

  const totalPlannedOutcomes = dailyPlans.reduce(
    (sum: number, plan: any) => sum + plan.topOutcomes.length,
    0
  );

  const executionRate = totalPlannedOutcomes > 0
    ? (completedTasks / totalPlannedOutcomes) * 100
    : 0;

  // Get all post-do logs for the week
  const postDoLogs = await prisma.postDoLog.findMany({
    where: {
      completionDate: {
        gte: weekStart,
        lte: weekEnd,
      }
    },
    include: { task: true }
  });

  // Calculate deep work hours
  const deepWorkMinutes = postDoLogs
    .filter((log: any) => log.task.energyRequired === 'HIGH')
    .reduce((sum: number, log: any) => sum + log.actualDuration, 0);

  const deepWorkHours = Math.round((deepWorkMinutes / 60) * 10) / 10;

  // Calculate category balance
  const categoryBreakdown: Record<string, number> = {};
  postDoLogs.forEach((log: any) => {
    const category = log.task.category;
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + log.actualDuration;
  });

  // Total tracked time
  const totalTrackedTime = Object.values(categoryBreakdown)
    .reduce((sum: number, mins: number) => sum + mins, 0);

  // 7 days × 16 hours = 6720 minutes
  const weeklyWakingMinutes = 7 * 960;
  const timeCoverage = Math.round((totalTrackedTime / weeklyWakingMinutes) * 100 * 10) / 10;

  const contextSwitches = postDoLogs.length > 1 ? postDoLogs.length - 1 : 0;

  return {
    executionRate: Math.round(executionRate * 10) / 10,
    tasksCompleted: completedTasks,
    deepWorkHours,
    categoryBalance: categoryBreakdown,
    totalTrackedTime,
    timeCoverage,
    contextSwitches,
  };
}

// POST /api/reviews/daily - Create daily review
router.post('/daily', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createReviewSchema.parse({
    ...req.body,
    type: 'DAILY'
  });

  const today = new Date();
  const periodStart = startOfDay(today);
  const periodEnd = endOfDay(today);

  // Calculate metrics
  const metrics = await calculateDailyMetrics(today);

  // Create review
  const review = await prisma.review.create({
    data: {
      type: 'DAILY',
      periodStart,
      periodEnd,
      wins: validatedData.wins,
      misses: validatedData.misses,
      lessons: validatedData.lessons,
      nextGoals: validatedData.nextGoals,
      energyAssessment: validatedData.energyAssessment || null,
      ...metrics,
    }
  });

  res.status(201).json(review);
}));

// POST /api/reviews/weekly - Create weekly review
router.post('/weekly', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createReviewSchema.parse({
    ...req.body,
    type: 'WEEKLY'
  });

  const today = new Date();
  const periodStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const periodEnd = endOfWeek(today, { weekStartsOn: 0 });

  // Calculate metrics
  const metrics = await calculateWeeklyMetrics(periodStart, periodEnd);

  // Create review
  const review = await prisma.review.create({
    data: {
      type: 'WEEKLY',
      periodStart,
      periodEnd,
      wins: validatedData.wins,
      misses: validatedData.misses,
      lessons: validatedData.lessons,
      nextGoals: validatedData.nextGoals,
      energyAssessment: validatedData.energyAssessment || null,
      ...metrics,
    }
  });

  res.status(201).json(review);
}));

// GET /api/reviews - Get all reviews with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type, cursor, limit } = req.query;

  const pageSize = Math.min(
    parseInt(limit as string) || 30,
    100
  );

  const where: Prisma.ReviewWhereInput = {};
  if (type) where.type = type as ReviewType;
  if (cursor) {
    where.id = { lt: cursor as string }; // Use 'lt' for DESC ordering
  }

  const reviews = await prisma.review.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { periodStart: 'desc' }, // Newest first
      { id: 'desc' }, // Stable sort
    ],
  });

  const hasMore = reviews.length > pageSize;
  const items = hasMore ? reviews.slice(0, pageSize) : reviews;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
}));

// GET /api/reviews/:id - Get single review
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const review = await prisma.review.findUnique({
    where: { id }
  });

  if (!review) {
    throw new NotFoundError('Review');
  }

  res.json(review);
}));

export default router;
