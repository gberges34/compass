// backend/src/routes/__tests__/tasks-pagination.test.ts
import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';
import { prisma } from '../../prisma';

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

jest.mock('../../prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/tasks - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first page with nextCursor when more items exist', async () => {
    const mockTasks = Array.from({ length: 31 }, (_, i) => ({
      id: `task-${i}`,
      name: `Task ${i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    const response = await request(app)
      .get('/api/tasks?limit=30')
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('nextCursor');
    expect(response.body.items).toHaveLength(30);
    expect(response.body.nextCursor).toBe('task-29');
  });

  it('should return last page with null nextCursor', async () => {
    const mockTasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      name: `Task ${i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    const response = await request(app)
      .get('/api/tasks?limit=30')
      .expect(200);

    expect(response.body.items).toHaveLength(20);
    expect(response.body.nextCursor).toBeNull();
  });

  it('should use cursor to fetch next page', async () => {
    const mockTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${30 + i}`,
      name: `Task ${30 + i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    await request(app)
      .get('/api/tasks?cursor=task-29&limit=30')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { gt: 'task-29' },
        }),
      })
    );
  });

  it('should limit page size to max 100', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/tasks?limit=200')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // max 100 + 1 for hasMore check
      })
    );
  });

  it('should work with filters and cursor', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/tasks?status=NEXT&priority=MUST&cursor=task-10')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'NEXT',
          priority: 'MUST',
          id: { gt: 'task-10' },
        }),
      })
    );
  });
});
