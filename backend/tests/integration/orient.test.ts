import request from 'supertest';
import { startOfDay } from 'date-fns';
import { app } from '../../src/index';
import { prisma } from '../../src/prisma';

const orientPayload = {
  energyLevel: 'HIGH',
  deepWorkBlock1: { start: '08:00', end: '10:00', focus: 'Deep Work' },
  deepWorkBlock2: { start: '13:00', end: '15:00', focus: 'Writing' },
  adminBlock: { start: '15:00', end: '15:30' },
  bufferBlock: { start: '15:30', end: '16:00' },
  topOutcomes: ['Ship feature'],
  reward: 'Coffee',
};

describe('Orient API', () => {
  afterEach(async () => {
    await prisma.dailyPlan.deleteMany({
      where: { date: startOfDay(new Date()) },
    });
  });

  it('surfaces ConflictError via middleware when plan already exists', async () => {
    const first = await request(app).post('/api/orient/east').send(orientPayload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/orient/east').send(orientPayload);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('CONFLICT');
    expect(second.body.error).toContain('Daily plan already exists');
    expect(second.body.details?.plan?.id).toBe(first.body.id);
    expect(second.body.details?.plan?.topOutcomes).toEqual(orientPayload.topOutcomes);
  });
});
