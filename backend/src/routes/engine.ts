import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';
import { startSliceSchema, stopSliceSchema, querySlicesSchema, summarySlicesSchema, updateSliceSchema, sliceIdParamSchema } from '../schemas/timeEngine';
import * as TimeEngine from '../services/timeEngine';
import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

const router = Router();

// POST /api/engine/start - Start a new time slice
router.post(
  '/start',
  asyncHandler(async (req: Request, res: Response) => {
    const validatedData = startSliceSchema.parse(req.body);
    const slice = await TimeEngine.startSlice(validatedData);
    res.status(201).json(slice);
  })
);

// POST /api/engine/stop - Stop the active slice for a dimension
router.post(
  '/stop',
  asyncHandler(async (req: Request, res: Response) => {
    const validatedData = stopSliceSchema.parse(req.body);
    const slice = await TimeEngine.stopSlice(validatedData);
    res.json(slice);
  })
);

// GET /api/engine/state - Get current state of all active slices
router.get(
  '/state',
  cacheControl({ maxAge: 30, staleWhileRevalidate: 60 }),
  asyncHandler(async (_req: Request, res: Response) => {
    const state = await TimeEngine.getCurrentState();
    res.json(state);
  })
);

// GET /api/engine/slices - Query historical time slices
router.get(
  '/slices',
  asyncHandler(async (req: Request, res: Response) => {
    const query = querySlicesSchema.parse(req.query);
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    
    const where: Prisma.TimeSliceWhereInput = {
      // Slice overlaps with date range if:
      // - slice starts before endDate AND
      // - (slice ends after startDate OR slice is still active)
      start: { lte: endDate },
      OR: [
        { end: { gte: startDate } }, // Closed slice that overlaps
        { end: null }, // Active slice
      ],
    };
    
    if (query.dimension) {
      where.dimension = query.dimension;
    }
    
    if (query.category) {
      where.category = query.category;
    }
    
    if (query.linkedTaskId) {
      where.linkedTaskId = query.linkedTaskId;
    }
    
    const slices = await prisma.timeSlice.findMany({
      where,
      orderBy: { start: 'desc' },
    });
    
    res.json(slices);
  })
);

// PATCH /api/engine/slices/:id - Update a time slice
router.patch(
  '/slices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = sliceIdParamSchema.parse(req.params);
    const validatedData = updateSliceSchema.parse(req.body);
    
    // Convert ISO strings to Date objects
    const updateData = {
      ...(validatedData.start && { start: new Date(validatedData.start) }),
      ...(validatedData.end !== undefined && { end: validatedData.end ? new Date(validatedData.end) : null }),
      ...(validatedData.category && { category: validatedData.category }),
    };
    
    const slice = await TimeEngine.updateSlice(id, updateData);
    res.json(slice);
  })
);

// DELETE /api/engine/slices/:id - Delete a time slice
router.delete(
  '/slices/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = sliceIdParamSchema.parse(req.params);
    const slice = await TimeEngine.deleteSlice(id);
    res.json(slice);
  })
);

// GET /api/engine/summary - Aggregate time by category
router.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const query = summarySlicesSchema.parse(req.query);
    
    const slices = await prisma.timeSlice.findMany({
      where: {
        dimension: 'PRIMARY',
        start: { gte: new Date(query.startDate) },
        end: { not: null, lte: new Date(query.endDate) },
      },
    });
    
    // Calculate duration by category (in minutes)
    const categoryBalance: Record<string, number> = {};
    slices.forEach(slice => {
      if (slice.end) {
        const duration = Math.floor((slice.end.getTime() - slice.start.getTime()) / 60000);
        categoryBalance[slice.category] = (categoryBalance[slice.category] || 0) + duration;
      }
    });
    
    res.json({ categoryBalance });
  })
);

export default router;


