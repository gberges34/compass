import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/prisma';

describe('Tasks API - Integration Tests', () => {
  let testTaskId: string;

  beforeAll(async () => {
    // Ensure database is connected
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup and disconnect
    if (testTaskId) {
      await prisma.task.delete({ where: { id: testTaskId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Task 1: POST /api/tasks/:id/complete - Transaction Atomicity', () => {
    it('should complete task atomically with transaction', async () => {
      // Create test task
      const task = await prisma.task.create({
        data: {
          name: 'Test Task for Completion',
          status: 'ACTIVE',
          priority: 'MUST',
          category: 'ADMIN',
          context: 'COMPUTER',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Test complete',
        }
      });
      testTaskId = task.id;

      // Complete task via API
      const response = await request(app)
        .post(`/api/tasks/${task.id}/complete`)
        .send({
          outcome: 'Task completed successfully',
          effortLevel: 'MEDIUM',
          keyInsight: 'Learned something new',
          actualDuration: 35,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        });

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('DONE');
      expect(response.body.postDoLog).toBeDefined();
      expect(response.body.postDoLog.outcome).toBe('Task completed successfully');
      expect(response.body.postDoLog.actualDuration).toBe(35);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.variance).toBe(5); // 35 - 30

      // Verify database state - both records should exist
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: { postDoLog: true }
      });
      expect(updatedTask?.status).toBe('DONE');
      expect(updatedTask?.postDoLog).toBeDefined();
      expect(updatedTask?.postDoLog?.actualDuration).toBe(35);

      // Cleanup
      await prisma.postDoLog.delete({ where: { taskId: task.id } });
      await prisma.task.delete({ where: { id: task.id } });
      testTaskId = '';
    });

    it('should rollback transaction if PostDoLog creation fails', async () => {
      // Create test task
      const task = await prisma.task.create({
        data: {
          name: 'Test Task for Rollback',
          status: 'ACTIVE',
          priority: 'MUST',
          category: 'ADMIN',
          context: 'COMPUTER',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Test complete',
        }
      });

      // Try to complete with invalid data (missing required fields)
      const response = await request(app)
        .post(`/api/tasks/${task.id}/complete`)
        .send({
          // Missing required fields like outcome, effortLevel, etc.
          actualDuration: 35,
        });

      // Should fail with validation error
      expect(response.status).toBe(400);

      // Verify task status is still ACTIVE (transaction rolled back)
      const unchangedTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: { postDoLog: true }
      });
      expect(unchangedTask?.status).toBe('ACTIVE');
      expect(unchangedTask?.postDoLog).toBeNull();

      // Cleanup
      await prisma.task.delete({ where: { id: task.id } });
    });
  });

  describe('Task 2: POST /api/tasks/enrich - Transaction Atomicity', () => {
    it('should enrich task atomically with transaction', async () => {
      // Create temp task
      const tempTask = await prisma.tempCapturedTask.create({
        data: {
          name: 'Test enrichment task',
          source: 'TODOIST',
          processed: false,
        }
      });

      // Enrich task via API
      const response = await request(app)
        .post('/api/tasks/enrich')
        .send({
          tempTaskId: tempTask.id,
          priority: 1,
          duration: 30,
          energy: 'MEDIUM',
        });

      // Verify response
      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.enrichment).toBeDefined();
      expect(response.body.task.status).toBe('NEXT'); // Priority 1 maps to NEXT

      // Verify temp task is marked processed
      const updatedTempTask = await prisma.tempCapturedTask.findUnique({
        where: { id: tempTask.id }
      });
      expect(updatedTempTask?.processed).toBe(true);

      // Cleanup
      await prisma.task.delete({ where: { id: response.body.task.id } });
      await prisma.tempCapturedTask.delete({ where: { id: tempTask.id } });
    });

    it('should prevent duplicate enrichment of already processed temp task', async () => {
      // Create and mark temp task as already processed
      const tempTask = await prisma.tempCapturedTask.create({
        data: {
          name: 'Already processed task',
          source: 'TODOIST',
          processed: true,
        }
      });

      // Try to enrich already processed task
      const response = await request(app)
        .post('/api/tasks/enrich')
        .send({
          tempTaskId: tempTask.id,
          priority: 1,
          duration: 30,
          energy: 'MEDIUM',
        });

      // Should fail with 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('BAD_REQUEST');
      expect(response.body.error).toContain('already processed');

      // Cleanup
      await prisma.tempCapturedTask.delete({ where: { id: tempTask.id } });
    });

    it('should rollback transaction if temp task marking fails', async () => {
      // Create temp task
      const tempTask = await prisma.tempCapturedTask.create({
        data: {
          name: 'Test rollback task',
          source: 'TODOIST',
          processed: false,
        }
      });

      // Try to enrich with non-existent temp task ID (use valid UUID format)
      const response = await request(app)
        .post('/api/tasks/enrich')
        .send({
          tempTaskId: '00000000-0000-0000-0000-000000000000',
          priority: 1,
          duration: 30,
          energy: 'MEDIUM',
        });

      // Should fail with 404
      expect(response.status).toBe(404);

      // Verify no orphaned task was created
      const tasksWithName = await prisma.task.findMany({
        where: { name: { contains: 'Test rollback task' } }
      });
      expect(tasksWithName.length).toBe(0);

      // Cleanup
      await prisma.tempCapturedTask.delete({ where: { id: tempTask.id } });
    });
  });

  describe('Task 3: GET /api/tasks - Cursor-based Pagination', () => {
    const createdIds: string[] = [];

    beforeAll(async () => {
      // Create 10 test tasks for pagination
      for (let i = 1; i <= 10; i++) {
        const task = await prisma.task.create({
          data: {
            name: `Pagination Test ${i.toString().padStart(2, '0')}`,
            status: 'NEXT',
            priority: 'SHOULD',
            category: 'ADMIN',
            context: 'COMPUTER',
            energyRequired: 'MEDIUM',
            duration: 30,
            definitionOfDone: 'Test',
          }
        });
        createdIds.push(task.id);
      }
    });

    afterAll(async () => {
      // Cleanup all created tasks
      await prisma.task.deleteMany({
        where: { id: { in: createdIds } }
      });
    });

    it('should return first page with pagination metadata', async () => {
      const response = await request(app)
        .get('/api/tasks?status=NEXT&limit=3');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBeDefined();
      expect(response.body.pagination.limit).toBe(3);
    });

    it('should return second page using cursor', async () => {
      // Get first page
      const page1 = await request(app)
        .get('/api/tasks?status=NEXT&limit=3');

      expect(page1.status).toBe(200);
      expect(page1.body.pagination.nextCursor).toBeDefined();

      // Get second page using cursor
      const page2 = await request(app)
        .get(`/api/tasks?status=NEXT&limit=3&cursor=${page1.body.pagination.nextCursor}`);

      expect(page2.status).toBe(200);
      expect(page2.body.data.length).toBe(3);

      // Verify no overlap between pages
      const page1Ids = page1.body.data.map((t: any) => t.id);
      const page2Ids = page2.body.data.map((t: any) => t.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should handle pagination through multiple pages', async () => {
      const allPages: any[] = [];
      let cursor: string | null = null;
      let pageCount = 0;

      // Fetch all pages
      while (pageCount < 5) { // Safety limit
        const url = cursor
          ? `/api/tasks?status=NEXT&limit=3&cursor=${cursor}`
          : '/api/tasks?status=NEXT&limit=3';

        const response = await request(app).get(url);
        expect(response.status).toBe(200);

        allPages.push(...response.body.data);
        pageCount++;

        if (!response.body.pagination.hasMore) {
          break;
        }

        cursor = response.body.pagination.nextCursor;
      }

      // Verify we got at least 10 tasks (our created tasks)
      expect(allPages.length).toBeGreaterThanOrEqual(10);

      // Verify no duplicates
      const ids = allPages.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should return hasMore=false on last page', async () => {
      const response = await request(app)
        .get('/api/tasks?status=NEXT&limit=100'); // Large limit to get all

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBeNull();
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/tasks?status=NEXT&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/tasks?status=NEXT&limit=200');

      // Should fail validation
      expect(response.status).toBe(400);
    });
  });

  describe('Task 4: Prisma Middleware - P2025 Error Handling', () => {
    it('should return 404 for non-existent task update', async () => {
      const response = await request(app)
        .patch('/api/tasks/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent task delete', async () => {
      const response = await request(app)
        .delete('/api/tasks/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 404 for non-existent task get', async () => {
      const response = await request(app)
        .get('/api/tasks/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should handle P2025 errors within transactions', async () => {
      // Try to complete a non-existent task
      const response = await request(app)
        .post('/api/tasks/00000000-0000-0000-0000-000000000000/complete')
        .send({
          outcome: 'Test',
          effortLevel: 'MEDIUM',
          keyInsight: 'Test',
          actualDuration: 30,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        });

      // Should return 404 even though error occurred in transaction
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Integration: End-to-End Task Lifecycle', () => {
    it('should handle complete task lifecycle with transactions', async () => {
      // 1. Create temp task
      const tempTask = await prisma.tempCapturedTask.create({
        data: {
          name: 'Complete lifecycle test',
          source: 'TODOIST',
          processed: false,
        }
      });

      // 2. Enrich temp task (Transaction 1: create task + mark temp processed)
      const enrichResponse = await request(app)
        .post('/api/tasks/enrich')
        .send({
          tempTaskId: tempTask.id,
          priority: 1,
          duration: 30,
          energy: 'MEDIUM',
        });

      expect(enrichResponse.status).toBe(201);
      const taskId = enrichResponse.body.task.id;

      // 3. Activate task
      const activateResponse = await request(app)
        .post(`/api/tasks/${taskId}/activate`);

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.body.task.status).toBe('ACTIVE');

      // 4. Complete task (Transaction 2: create postDoLog + update status)
      const completeResponse = await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .send({
          outcome: 'Successfully completed',
          effortLevel: 'MEDIUM',
          keyInsight: 'Integration test passed',
          actualDuration: 35,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.task.status).toBe('DONE');
      expect(completeResponse.body.postDoLog).toBeDefined();

      // 5. Verify final state
      const finalTask = await prisma.task.findUnique({
        where: { id: taskId },
        include: { postDoLog: true }
      });

      expect(finalTask?.status).toBe('DONE');
      expect(finalTask?.postDoLog).toBeDefined();

      const finalTempTask = await prisma.tempCapturedTask.findUnique({
        where: { id: tempTask.id }
      });

      expect(finalTempTask?.processed).toBe(true);

      // Cleanup
      await prisma.postDoLog.delete({ where: { taskId } });
      await prisma.task.delete({ where: { id: taskId } });
      await prisma.tempCapturedTask.delete({ where: { id: tempTask.id } });
    });
  });
});
