import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';
import { startSliceSchema, stopSliceSchema } from '../schemas/timeEngine';
import * as TimeEngine from '../services/timeEngine';

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

export default router;


