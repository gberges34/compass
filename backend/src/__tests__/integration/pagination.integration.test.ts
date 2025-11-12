// backend/src/__tests__/integration/pagination.integration.test.ts
/**
 * Integration tests for pagination functionality
 *
 * These tests use real Prisma queries against a test database.
 *
 * Requirements:
 * - Set DATABASE_URL environment variable to a test database
 * - Run migrations: `npx prisma migrate deploy`
 *
 * Example:
 *   export DATABASE_URL="postgresql://user:password@localhost:5432/compass_test?schema=public"
 *   npx prisma migrate deploy
 *   npm test -- src/__tests__/integration/pagination.integration.test.ts
 */
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../prisma';

describe('Pagination Integration Tests', () => {
  let isDatabaseAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    try {
      await prisma.$connect();
      isDatabaseAvailable = true;

      // Setup: Create test data
      await prisma.task.createMany({
        data: Array.from({ length: 50 }, (_, i) => ({
          name: `Test Task ${i}`,
          status: 'NEXT',
          priority: 'MUST',
          category: 'PERSONAL',
          context: 'ANYWHERE',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Complete',
        })),
      });
    } catch (error) {
      console.warn('Database not available for integration tests. Tests will be skipped.');
      console.warn('Set DATABASE_URL environment variable to run integration tests.');
    }
  });

  afterAll(async () => {
    if (isDatabaseAvailable) {
      // Cleanup
      await prisma.task.deleteMany({
        where: { name: { startsWith: 'Test Task' } },
      });
      await prisma.$disconnect();
    }
  });

  it('should paginate through all tasks', async () => {
    if (!isDatabaseAvailable) {
      console.warn('Skipping test: Database not available');
      return;
    }

    let allTasks: any[] = [];
    let cursor: string | null | undefined = undefined;
    let pageCount = 0;

    // Fetch all pages
    while (pageCount === 0 || cursor !== null) {
      const url: string = cursor ? `/api/tasks?cursor=${cursor}&limit=20` : '/api/tasks?limit=20';
      const response: any = await request(app).get(url).expect(200);

      allTasks.push(...response.body.data);
      cursor = response.body.pagination.nextCursor;
      pageCount++;

      // Safety check
      if (pageCount > 10) break;
    }

    expect(allTasks.length).toBe(50);
    expect(pageCount).toBe(3); // 20 + 20 + 10
  });

  it('should handle pagination with filters', async () => {
    if (!isDatabaseAvailable) {
      console.warn('Skipping test: Database not available');
      return;
    }

    const response1 = await request(app)
      .get('/api/tasks?status=NEXT&limit=10')
      .expect(200);

    expect(response1.body.items.length).toBeLessThanOrEqual(10);
    expect(response1.body.items.every((t: any) => t.status === 'NEXT')).toBe(true);

    if (response1.body.nextCursor) {
      const response2 = await request(app)
        .get(`/api/tasks?status=NEXT&cursor=${response1.body.nextCursor}&limit=10`)
        .expect(200);

      expect(response2.body.items.every((t: any) => t.status === 'NEXT')).toBe(true);
    }
  });
});
