import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../errors/AppError';
import { energyEnum, energyMatchEnum } from '../schemas/enums';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';

const router = Router();

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const plannedBlockSchema = z
  .object({
    id: z.string().uuid(),
    start: z.string().regex(hhmmRegex, { message: 'Start time must be HH:mm' }),
    end: z.string().regex(hhmmRegex, { message: 'End time must be HH:mm' }),
    label: z.string().min(1),
  })
  .refine((block) => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    return toMinutes(block.start) < toMinutes(block.end);
  }, {
    message: 'Planned block start must be before end',
  });

const orientEastSchema = z.object({
  energyLevel: energyEnum,
  plannedBlocks: z.array(plannedBlockSchema).min(1),
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

  const existingPlan = await prisma.dailyPlan.findUnique({
    where: { date: today },
    select: { id: true },
  });

  const planData = {
    energyLevel: validatedData.energyLevel,
    plannedBlocks: validatedData.plannedBlocks,
    topOutcomes: validatedData.topOutcomes,
    reward: validatedData.reward,
  };

  const dailyPlan = await prisma.dailyPlan.upsert({
    where: { date: today },
    create: {
      date: today,
      ...planData,
    },
    update: {
      ...planData,
    },
  });

  res.status(existingPlan ? 200 : 201).json(dailyPlan);
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
router.get('/today', cacheControl(CachePolicies.LONG), asyncHandler(async (req: Request, res: Response) => {
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
router.get('/:date', cacheControl(CachePolicies.LONG), asyncHandler(async (req: Request, res: Response) => {
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
