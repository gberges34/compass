import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { startOfDay, endOfDay } from 'date-fns';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
import { categoryEnum } from '../schemas/enums';
import { paginationSchema } from '../schemas/pagination';

const router = Router();

// Validation schema for query parameters
const getPostDoLogsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: categoryEnum.optional(),
}).merge(paginationSchema);

// GET /api/postdo - Get Post-Do logs with optional filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Validate query parameters
  const { startDate, endDate, category, cursor, limit } = getPostDoLogsSchema.parse(req.query);

  // Build where clause
  const where: Prisma.PostDoLogWhereInput = {};

  // Add date range filter if provided
  if (startDate || endDate) {
    where.completionDate = {};

    if (startDate) {
      const start = startOfDay(new Date(startDate));
      where.completionDate.gte = start;
    }

    if (endDate) {
      const end = endOfDay(new Date(endDate));
      where.completionDate.lte = end;
    }
  }

  // Add category filter if provided (filter by task category)
  if (category) {
    where.task = {
      category: category
    };
  }

  // Add cursor filter for descending order pagination
  if (cursor) {
    where.id = { lt: cursor };
  }

  // Query PostDoLog records with related Task data (cursor-based pagination)
  const postDoLogs = await prisma.postDoLog.findMany({
    where,
    take: limit + 1, // Fetch one extra to determine if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      task: true, // Include full task details
    },
    orderBy: [
      { completionDate: 'desc' }, // Most recent first
      { id: 'desc' }, // Tiebreaker for stable pagination
    ],
  });

  // Determine if there's a next page
  const hasMore = postDoLogs.length > limit;
  const results = hasMore ? postDoLogs.slice(0, limit) : postDoLogs;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  res.json({
    items: results,
    nextCursor,
  });
}));

// GET /api/postdo/:id - Get single Post-Do log by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const postDoLog = await prisma.postDoLog.findUnique({
    where: { id },
    include: {
      task: true,
    },
  });

  if (!postDoLog) {
    throw new NotFoundError('Post-Do log');
  }

  res.json(postDoLog);
}));

export default router;
