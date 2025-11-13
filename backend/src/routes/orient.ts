import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError, ConflictError } from '../errors/AppError';
import { energyEnum, energyMatchEnum } from '../schemas/enums';

const router = Router();

// Validation schemas
const orientEastSchema = z.object({
  energyLevel: energyEnum,
  deepWorkBlock1: z.object({
    start: z.string(),
    end: z.string(),
    focus: z.string(),
  }),
  deepWorkBlock2: z.object({
    start: z.string(),
    end: z.string(),
    focus: z.string(),
  }).optional(),
  adminBlock: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  bufferBlock: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  topOutcomes: z.array(z.string()).max(3),
  reward: z.string().optional(),
});

const orientWestSchema = z.object({
  reflection: z.string().min(1),
  actualOutcomes: z.number().min(0).max(3),
  energyMatch: energyMatchEnum,
});

// POST /api/orient/east - Create morning daily plan (Orient East)
router.post('/east', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = orientEastSchema.parse(req.body);
  const today = startOfDay(new Date());

  try {
    const dailyPlan = await prisma.dailyPlan.create({
      data: {
        date: today,
        energyLevel: validatedData.energyLevel,
        deepWorkBlock1: validatedData.deepWorkBlock1,
        deepWorkBlock2: validatedData.deepWorkBlock2,
        adminBlock: validatedData.adminBlock,
        bufferBlock: validatedData.bufferBlock,
        topOutcomes: validatedData.topOutcomes,
        reward: validatedData.reward,
      }
    });

    res.status(201).json(dailyPlan);
  } catch (error: any) {
    const isUniqueDateViolation =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (
        (Array.isArray(error.meta?.target) && error.meta?.target.includes('DailyPlan_date_key')) ||
        error.meta?.target === 'DailyPlan_date_key'
      );

    if (isUniqueDateViolation) {
      const existingPlan = await prisma.dailyPlan.findUnique({
        where: { date: today }
      });

      throw new ConflictError('Daily plan already exists for today', {
        date: today.toISOString(),
        plan: existingPlan,
      });
    }

    throw error;
  }
}));

// PATCH /api/orient/west/:planId - Update plan with evening reflection (Orient West)
router.patch('/west/:planId', asyncHandler(async (req: Request, res: Response) => {
  const { planId } = req.params;
  const validatedData = orientWestSchema.parse(req.body);

  const updated = await prisma.dailyPlan.update({
    where: { id: planId },
    data: {
      reflection: validatedData.reflection,
      actualOutcomes: validatedData.actualOutcomes,
      energyMatch: validatedData.energyMatch,
    }
  });

  res.json(updated);
}));

// GET /api/orient/today - Get today's daily plan
router.get('/today', asyncHandler(async (req: Request, res: Response) => {
  const today = startOfDay(new Date());

  const plan = await prisma.dailyPlan.findUnique({
    where: { date: today }
  });

  if (!plan) {
    throw new NotFoundError('Daily plan for today');
  }

  res.json(plan);
}));

// GET /api/orient/:date - Get daily plan for specific date
router.get('/:date', asyncHandler(async (req: Request, res: Response) => {
  const date = startOfDay(new Date(req.params.date));

  const plan = await prisma.dailyPlan.findUnique({
    where: { date }
  });

  if (!plan) {
    throw new NotFoundError('Daily plan for this date');
  }

  res.json(plan);
}));

export default router;
