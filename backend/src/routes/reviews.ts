import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma, ReviewType, Review } from '@prisma/client';
import { z } from 'zod';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import { reviewTypeEnum, energyEnum } from '../schemas/enums';
import { calculateMetrics } from '../utils/reviewMetrics';
import { paginationSchema, PaginatedResponse } from '../schemas/pagination';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';

const router = Router();

// Validation schema
const createReviewSchema = z.object({
  type: reviewTypeEnum,
  wins: z.array(z.string()).max(3),
  misses: z.array(z.string()).max(3),
  lessons: z.array(z.string()).max(3),
  nextGoals: z.array(z.string()).max(3),
  energyAssessment: energyEnum.optional(),
});

const listReviewsQuerySchema = z.object({
  type: z.nativeEnum(ReviewType).optional(),
}).merge(paginationSchema);

// Helper function to calculate daily metrics
async function calculateDailyMetrics(date: Date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  // Get daily plan
  const dailyPlan = await prisma.dailyPlan.findUnique({
    where: { date: dayStart },
    select: { topOutcomes: true },
  });

  // Calculate metrics using shared utility
  const metrics = await calculateMetrics({
    startDate: dayStart,
    endDate: dayEnd,
    dailyPlan,
  });

  return metrics;
}

// Helper function to calculate weekly metrics
async function calculateWeeklyMetrics(weekStart: Date, weekEnd: Date) {
  // Calculate metrics using shared utility
  const metrics = await calculateMetrics({
    startDate: weekStart,
    endDate: weekEnd,
    dailyPlan: null, // No daily plan for weekly reviews
    isWeekly: true, // Flag to query all daily plans in the range
  });

  return metrics;
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
router.get('/', cacheControl(CachePolicies.MEDIUM), asyncHandler(async (req: Request, res: Response) => {
  const { type, cursor, limit } = listReviewsQuerySchema.parse(req.query);
  const pageSize = limit;

  const where: Prisma.ReviewWhereInput = {};
  if (type) where.type = type;

  const reviews = await prisma.review.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { periodStart: 'desc' }, // Newest first
      { id: 'desc' }, // Stable sort
    ],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = reviews.length > pageSize;
  const items = hasMore ? reviews.slice(0, pageSize) : reviews;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const response: PaginatedResponse<Review> = { items, nextCursor };
  res.json(response);
}));

// GET /api/reviews/:id - Get single review
router.get('/:id', cacheControl(CachePolicies.MEDIUM), asyncHandler(async (req: Request, res: Response) => {
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
