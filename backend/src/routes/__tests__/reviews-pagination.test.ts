import request from 'supertest';
import express from 'express';
import reviewsRouter from '../reviews';
import { prisma } from '../../prisma';
import { createTestUUID } from '../../utils/testHelpers';

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

jest.mock('../../prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/reviews - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first page with nextCursor', async () => {
    const mockReviews = Array.from({ length: 31 }, (_, i) => ({
      id: createTestUUID(i),
      type: 'DAILY',
      periodStart: new Date(),
    }));

    (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);

    const response = await request(app)
      .get('/api/reviews?limit=30')
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('nextCursor');
    expect(response.body.items).toHaveLength(30);
    expect(response.body.nextCursor).toBe(createTestUUID(29));
  });

  it('should return last page with null nextCursor', async () => {
    const mockReviews = Array.from({ length: 15 }, (_, i) => ({
      id: createTestUUID(i),
      type: 'DAILY',
      periodStart: new Date(),
    }));

    (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);

    const response = await request(app)
      .get('/api/reviews?limit=30')
      .expect(200);

    expect(response.body.items).toHaveLength(15);
    expect(response.body.nextCursor).toBeNull();
  });

  it('should use cursor for DESC ordering (lt for next page)', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get(`/api/reviews?cursor=${createTestUUID(29)}`)
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { lt: createTestUUID(29) },
        }),
      })
    );
  });

  it('should work with type filter', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get(`/api/reviews?type=WEEKLY&cursor=${createTestUUID(10)}`)
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'WEEKLY',
          id: { lt: createTestUUID(10) },
        }),
      })
    );
  });

  it('should order by periodStart DESC with id DESC', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/reviews')
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { periodStart: 'desc' },
          { id: 'desc' },
        ],
      })
    );
  });
});
