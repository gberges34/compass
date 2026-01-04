import request from 'supertest';
import express from 'express';
import categoriesRouter from '../categories';
import { prisma } from '../../prisma';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/categories', categoriesRouter);
app.use(errorHandler);

jest.mock('../../prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Categories API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/categories returns categories', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      { id: 'a', name: 'School', nameKey: 'school', color: 'sky', icon: '📚' },
    ]);

    const response = await request(app).get('/api/categories').expect(200);
    expect(response.body).toHaveLength(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isArchived: false },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
    );
  });

  it('POST /api/categories normalizes name and sets nameKey', async () => {
    (prisma.category.create as jest.Mock).mockResolvedValue({
      id: 'id-1',
      name: 'My Category',
      nameKey: 'my category',
      color: 'mint',
      icon: '📁',
      togglProjectId: null,
    });

    await request(app)
      .post('/api/categories')
      .send({ name: '  My   Category ', color: 'mint', icon: '📁', togglProjectId: '' })
      .expect(201);

    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'My Category',
          nameKey: 'my category',
          togglProjectId: null,
        }),
      })
    );
  });

  it('PATCH /api/categories/:id blocks renaming locked categories', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({
      id,
      name: 'Sleep',
      nameKey: 'sleep',
      isLocked: true,
      isArchived: false,
    });

    const response = await request(app)
      .patch(`/api/categories/${id}`)
      .send({ name: 'Nap', color: 'sky' })
      .expect(400);

    expect(response.body.code).toBe('BAD_REQUEST');
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('DELETE /api/categories/:id archives unlocked categories', async () => {
    const id = '22222222-2222-2222-2222-222222222222';
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({
      id,
      name: 'School',
      isLocked: false,
      isArchived: false,
    });
    (prisma.category.update as jest.Mock).mockResolvedValue({
      id,
      isArchived: true,
    });

    const response = await request(app).delete(`/api/categories/${id}`).expect(200);
    expect(response.body.isArchived).toBe(true);
    expect(prisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isArchived: true } })
    );
  });
});
