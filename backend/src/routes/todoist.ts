import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';

const router = Router();

// Validation schema for import
const importTasksSchema = z.object({
  tasks: z.array(
    z.object({
      name: z.string().min(1),
      due: z.string().optional(),
    })
  ),
});

// POST /api/todoist/import
// Receives tasks from iOS Shortcut's Todoist query
router.post('/import', asyncHandler(async (req: Request, res: Response) => {
  const { tasks } = importTasksSchema.parse(req.body);

  // Store tasks temporarily for Northbound processing
  const tempTasks = await Promise.all(
    tasks.map(task =>
      prisma.tempCapturedTask.create({
        data: {
          name: task.name,
          dueDate: task.due ? new Date(task.due) : null,
          source: 'TODOIST',
          processed: false,
        }
      })
    )
  );

  res.json({
    success: true,
    count: tempTasks.length,
    tasks: tempTasks,
  });
}));

// GET /api/todoist/pending
// Returns tasks waiting for Northbound processing
router.get('/pending', asyncHandler(async (req: Request, res: Response) => {
  const pending = await prisma.tempCapturedTask.findMany({
    where: { processed: false },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    count: pending.length,
    tasks: pending,
  });
}));

// DELETE /api/todoist/temp/:id
// Delete a temp task (used after successful enrichment)
router.delete('/temp/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.tempCapturedTask.delete({
    where: { id },
  });

  res.status(204).send();
}));

export default router;
