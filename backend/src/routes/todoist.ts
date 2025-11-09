import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { z } from 'zod';

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
router.post('/import', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error importing tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/todoist/pending
// Returns tasks waiting for Northbound processing
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const pending = await prisma.tempCapturedTask.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      count: pending.length,
      tasks: pending,
    });
  } catch (error: any) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/todoist/temp/:id
// Delete a temp task (used after successful enrichment)
router.delete('/temp/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.tempCapturedTask.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Temp task not found' });
    }
    console.error('Error deleting temp task:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
