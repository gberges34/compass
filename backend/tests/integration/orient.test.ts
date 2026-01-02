import request from 'supertest';
import { startOfDay } from 'date-fns';
import { app } from '../../src/index';
import { prisma } from '../../src/prisma';

const orientPayload = {
  energyLevel: 'HIGH',
  plannedBlocks: [
    { id: '11111111-1111-1111-1111-111111111111', start: '08:00', end: '10:00', label: 'Build' },
    { id: '22222222-2222-2222-2222-222222222222', start: '13:00', end: '15:00', label: 'Write' },
  ],
  topOutcomes: ['Ship feature'],
  reward: 'Coffee',
};

describe('Orient API', () => {
  afterEach(async () => {
    await prisma.dailyPlan.deleteMany({
      where: { date: startOfDay(new Date()) },
    });
  });

  it('upserts today plan when plan already exists', async () => {
    const first = await request(app).post('/api/orient/east').send(orientPayload);
    expect(first.status).toBe(201);

    const secondPayload = {
      ...orientPayload,
      reward: 'Tea',
    };

    const second = await request(app).post('/api/orient/east').send(secondPayload);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.reward).toBe('Tea');
    expect(second.body.topOutcomes).toEqual(orientPayload.topOutcomes);
    expect(second.body.plannedBlocks).toEqual(orientPayload.plannedBlocks);
  });
});
