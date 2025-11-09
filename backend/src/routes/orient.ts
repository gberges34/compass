import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { startOfDay } from 'date-fns';

const router = Router();

// Validation schemas
const orientEastSchema = z.object({
  energyLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']),
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
  energyMatch: z.enum(['PERFECT', 'MOSTLY_ALIGNED', 'SOME_MISMATCH', 'POOR']),
});

// POST /api/orient/east - Create morning daily plan (Orient East)
router.post('/east', async (req: Request, res: Response) => {
  try {
    const validatedData = orientEastSchema.parse(req.body);
    const today = startOfDay(new Date());

    // Check if plan already exists for today
    const existing = await prisma.dailyPlan.findUnique({
      where: { date: today }
    });

    if (existing) {
      return res.status(409).json({
        error: 'Daily plan already exists for today',
        plan: existing
      });
    }

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating Orient East:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orient/west/:planId - Update plan with evening reflection (Orient West)
router.patch('/west/:planId', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Daily plan not found' });
    }
    console.error('Error updating Orient West:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orient/today - Get today's daily plan
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = startOfDay(new Date());

    const plan = await prisma.dailyPlan.findUnique({
      where: { date: today }
    });

    if (!plan) {
      return res.status(404).json({ error: 'No plan found for today' });
    }

    res.json(plan);
  } catch (error: any) {
    console.error('Error fetching today\'s plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orient/:date - Get daily plan for specific date
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const date = startOfDay(new Date(req.params.date));

    const plan = await prisma.dailyPlan.findUnique({
      where: { date }
    });

    if (!plan) {
      return res.status(404).json({ error: 'No plan found for this date' });
    }

    res.json(plan);
  } catch (error: any) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
