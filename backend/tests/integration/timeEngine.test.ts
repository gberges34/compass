import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/prisma';
import { TimeDimension, TimeSource } from '@prisma/client';

describe('Time Engine API - Integration Tests', () => {
  const testSliceIds: string[] = [];
  let testTaskId: string;

  afterAll(async () => {
    // Cleanup test slices
    await prisma.timeSlice.deleteMany({
      where: { id: { in: testSliceIds } },
    }).catch(() => {});
    
    // Cleanup test task if created
    if (testTaskId) {
      await prisma.postDoLog.deleteMany({ where: { taskId: testTaskId } });
      await prisma.task.deleteMany({ where: { id: testTaskId } });
    }
    
    // Note: Do not call prisma.$disconnect() here as it's a singleton
    // shared across all test files. Disconnecting here would break subsequent tests.
  });

  describe('POST /api/engine/start', () => {
    it('should create a new time slice', async () => {
      const response = await request(app)
        .post('/api/engine/start')
        .send({
          category: 'TEST_Gaming',
          dimension: 'PRIMARY',
          source: 'SHORTCUT',
        });

      expect(response.status).toBe(201);
      expect(response.body.category).toBe('TEST_Gaming');
      expect(response.body.dimension).toBe('PRIMARY');
      expect(response.body.end).toBeNull();
      
      testSliceIds.push(response.body.id);
    });

    it('should close previous slice in same dimension', async () => {
      // Start first slice
      const first = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Sleep', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(first.status).toBe(201);
      const firstId = first.body.id;
      testSliceIds.push(firstId);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));

      // Start second slice (should close first)
      const second = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Coding', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(second.status).toBe(201);
      testSliceIds.push(second.body.id);

      // Verify first is closed
      const firstSlice = await prisma.timeSlice.findUnique({ 
        where: { id: firstId } 
      });
      expect(firstSlice?.end).not.toBeNull();
    });

    it('should allow cross-dimension overlap', async () => {
      // Start PRIMARY slice
      const primary = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Coding', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(primary.status).toBe(201);
      testSliceIds.push(primary.body.id);

      // Start WORK_MODE slice (different dimension - should be allowed)
      const workMode = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_DeepWork', dimension: 'WORK_MODE', source: 'SHORTCUT' });

      expect(workMode.status).toBe(201);
      testSliceIds.push(workMode.body.id);

      // Verify both are active
      const state = await request(app).get('/api/engine/state');
      expect(state.status).toBe(200);
      expect(state.body.primary).not.toBeNull();
      expect(state.body.work_mode).not.toBeNull();
    });

    it('should return existing slice if same category is already active (idempotent)', async () => {
      // Start slice
      const first = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Idempotent', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(first.status).toBe(201);
      const firstId = first.body.id;
      testSliceIds.push(firstId);

      // Start same category again
      const second = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Idempotent', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(second.status).toBe(201);
      expect(second.body.id).toBe(firstId); // Same slice returned
    });
  });

  describe('POST /api/engine/stop', () => {
    it('should stop active slice for dimension', async () => {
      // Start a slice
      const startResponse = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_StopTest', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(startResponse.status).toBe(201);
      testSliceIds.push(startResponse.body.id);

      // Stop it
      const stopResponse = await request(app)
        .post('/api/engine/stop')
        .send({ dimension: 'PRIMARY' });

      expect(stopResponse.status).toBe(200);
      expect(stopResponse.body.end).not.toBeNull();
    });

    it('should return 404 when no active slice exists', async () => {
      const response = await request(app)
        .post('/api/engine/stop')
        .send({ dimension: 'SOCIAL' }); // Assuming no active SOCIAL slice

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should validate category if provided', async () => {
      // Start a slice
      const startResponse = await request(app)
        .post('/api/engine/start')
        .send({ category: 'TEST_Category', dimension: 'PRIMARY', source: 'SHORTCUT' });

      expect(startResponse.status).toBe(201);
      testSliceIds.push(startResponse.body.id);

      // Try to stop with wrong category
      const stopResponse = await request(app)
        .post('/api/engine/stop')
        .send({ dimension: 'PRIMARY', category: 'WrongCategory' });

      expect(stopResponse.status).toBe(404);
    });
  });

  describe('GET /api/engine/state', () => {
    it('should return current state across all dimensions', async () => {
      const response = await request(app).get('/api/engine/state');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('primary');
      expect(response.body).toHaveProperty('work_mode');
      expect(response.body).toHaveProperty('social');
      expect(response.body).toHaveProperty('segment');
    });
  });

  describe('GET /api/engine/slices', () => {
    it('should query historical slices with date range', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-01-02T00:00:00Z');

      const response = await request(app)
        .get('/api/engine/slices')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by dimension', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-12-31T23:59:59Z');

      const response = await request(app)
        .get('/api/engine/slices')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dimension: 'PRIMARY',
        });

      expect(response.status).toBe(200);
      response.body.forEach((slice: any) => {
        expect(slice.dimension).toBe('PRIMARY');
      });
    });
  });

  describe('GET /api/engine/summary', () => {
    it('should return aggregated category balance', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate = new Date('2025-12-31T23:59:59Z');

      const response = await request(app)
        .get('/api/engine/summary')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('categoryBalance');
      expect(typeof response.body.categoryBalance).toBe('object');
    });
  });

  describe('Task Integration', () => {
    it('should create TimeSlice when task is activated', async () => {
      // Create test task
      const task = await prisma.task.create({
        data: {
          name: 'Test Task for Time Engine',
          status: 'NEXT',
          priority: 'MUST',
          category: 'ADMIN',
          context: 'COMPUTER',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Test complete',
        },
      });
      testTaskId = task.id;

      // Activate task
      const response = await request(app)
        .post(`/api/tasks/${task.id}/activate`);

      expect(response.status).toBe(200);
      expect(response.body.slice).toBeDefined();
      expect(response.body.slice.category).toBe('ADMIN');
      expect(response.body.slice.dimension).toBe('PRIMARY');
      expect(response.body.slice.linkedTaskId).toBe(task.id);
      
      testSliceIds.push(response.body.slice.id);
    });

    it('should stop TimeSlice when task is completed', async () => {
      // Create and activate task
      const task = await prisma.task.create({
        data: {
          name: 'Test Task for Completion',
          status: 'NEXT',
          priority: 'MUST',
          category: 'ADMIN',
          context: 'COMPUTER',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Test complete',
        },
      });

      const activateResponse = await request(app)
        .post(`/api/tasks/${task.id}/activate`);

      expect(activateResponse.status).toBe(200);
      const sliceId = activateResponse.body.slice.id;
      testSliceIds.push(sliceId);

      // Complete task
      const completeResponse = await request(app)
        .post(`/api/tasks/${task.id}/complete`)
        .send({
          outcome: 'Task completed',
          effortLevel: 'MEDIUM',
          keyInsight: 'Test insight',
          actualDuration: 35,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        });

      expect(completeResponse.status).toBe(200);

      // Verify slice is closed
      const slice = await prisma.timeSlice.findUnique({ where: { id: sliceId } });
      expect(slice?.end).not.toBeNull();

      // Cleanup
      await prisma.postDoLog.deleteMany({ where: { taskId: task.id } });
      await prisma.task.deleteMany({ where: { id: task.id } });
    });
  });
});

