import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

const mockTransaction = jest.fn();
jest.mock('../../prisma', () => ({
  __esModule: true,
  prisma: {
    $transaction: mockTransaction,
  },
}));

jest.mock('../../services/timeEngine', () => {
  const startSlice = jest.fn();
  const stopSliceIfExists = jest.fn();
  return {
    __esModule: true,
    startSlice,
    stopSliceIfExists,
  };
});

jest.mock('../../services/togglProjection', () => {
  const syncPrimaryStart = jest.fn();
  const syncPrimaryStop = jest.fn();
  return {
    __esModule: true,
    syncPrimaryStart,
    syncPrimaryStop,
  };
});

const { startSlice, stopSliceIfExists } = require('../../services/timeEngine');
const { syncPrimaryStart, syncPrimaryStop } = require('../../services/togglProjection');

describe('tasks routes Toggl projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('projects slice on activate', async () => {
    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        task: { update: jest.fn().mockResolvedValue({ id: 't1', category: 'SCHOOL' }) },
      } as any)
    );
    startSlice.mockResolvedValue({
      id: 's1',
      category: 'SCHOOL',
      dimension: 'PRIMARY',
      start: new Date(),
      end: null,
    });

    await request(app).post('/api/tasks/t1/activate').send({}).expect(200);
    expect(syncPrimaryStart).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('projects stop on complete', async () => {
    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        task: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            status: 'ACTIVE',
            duration: 10,
            category: 'SCHOOL',
            postDoLog: null,
          }),
          update: jest.fn().mockResolvedValue({ id: 't1', status: 'DONE' }),
        },
        postDoLog: { upsert: jest.fn().mockResolvedValue({}) },
      } as any)
    );
    stopSliceIfExists.mockResolvedValue({
      id: 's1',
      category: 'SCHOOL',
      dimension: 'PRIMARY',
      start: new Date(),
      end: new Date(),
      togglEntryId: '123',
    });

    await request(app)
      .post('/api/tasks/t1/complete')
      .send({
        outcome: 'ok',
        effortLevel: 'SMALL',
        keyInsight: 'x',
        actualDuration: 10,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      })
      .expect(200);

    expect(syncPrimaryStop).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });
});
