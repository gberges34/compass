import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

// Validation schema for query parameters
const getPostDoLogsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']).optional(),
});

// GET /api/postdo - Get Post-Do logs with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validatedQuery = getPostDoLogsSchema.parse(req.query);
    const { startDate, endDate, category } = validatedQuery;

    // Build where clause
    const where: any = {};

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

    // Query PostDoLog records with related Task data
    const postDoLogs = await prisma.postDoLog.findMany({
      where,
      include: {
        task: true, // Include full task details
      },
      orderBy: {
        completionDate: 'desc', // Most recent first
      },
    });

    res.json(postDoLogs);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.issues
      });
    }
    console.error('Error fetching Post-Do logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/postdo/:id - Get single Post-Do log by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const postDoLog = await prisma.postDoLog.findUnique({
      where: { id },
      include: {
        task: true,
      },
    });

    if (!postDoLog) {
      return res.status(404).json({ error: 'Post-Do log not found' });
    }

    res.json(postDoLog);
  } catch (error: any) {
    console.error('Error fetching Post-Do log:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
