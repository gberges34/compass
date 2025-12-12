import request from 'supertest';
import express from 'express';
import engineRouter from '../engine';

const app = express();
app.use(express.json());
app.use('/api/engine', engineRouter);

jest.mock('../../services/timeEngine', () => {
  const startSlice = jest.fn();
  const stopSlice = jest.fn();
  return {
    __esModule: true,
    startSlice,
    stopSlice,
    getCurrentState: jest.fn(),
  };
});

jest.mock('../../services/togglProjection', () => {
  const syncPrimaryStart = jest.fn();
  const syncPrimaryStop = jest.fn();
  const syncWorkModeTags = jest.fn();
  return {
    __esModule: true,
    syncPrimaryStart,
    syncPrimaryStop,
    syncWorkModeTags,
  };
});

jest.mock('../../prisma', () => {
  const findFirst = jest.fn();
  return {
    __esModule: true,
    prisma: {
      timeSlice: {
        findFirst,
      },
    },
  };
});

const { startSlice, stopSlice } = require('../../services/timeEngine');
const { syncPrimaryStart, syncPrimaryStop, syncWorkModeTags } = require('../../services/togglProjection');
const { prisma } = require('../../prisma');

describe('engine routes Toggl projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('projects PRIMARY start', async () => {
    startSlice.mockResolvedValue({
      id: 's1',
      category: 'Coding',
      dimension: 'PRIMARY',
      start: new Date(),
      end: null,
    });

    await request(app)
      .post('/api/engine/start')
      .send({ category: 'Coding', dimension: 'PRIMARY', source: 'SHORTCUT' })
      .expect(201);

    expect(syncPrimaryStart).toHaveBeenCalled();
  });

  it('projects PRIMARY stop', async () => {
    stopSlice.mockResolvedValue({
      id: 's1',
      category: 'Coding',
      dimension: 'PRIMARY',
      start: new Date(),
      end: new Date(),
      togglEntryId: '123',
    });

    await request(app)
      .post('/api/engine/stop')
      .send({ dimension: 'PRIMARY' })
      .expect(200);

    expect(syncPrimaryStop).toHaveBeenCalled();
  });

  it('projects WORK_MODE start as tag add', async () => {
    startSlice.mockResolvedValue({
      id: 'wm1',
      category: 'Deep Work',
      dimension: 'WORK_MODE',
      start: new Date(),
      end: null,
    });
    prisma.timeSlice.findFirst.mockResolvedValue({
      id: 'p1',
      category: 'Coding',
      dimension: 'PRIMARY',
      start: new Date(),
      end: null,
      togglEntryId: '123',
    });

    await request(app)
      .post('/api/engine/start')
      .send({ category: 'Deep Work', dimension: 'WORK_MODE', source: 'SHORTCUT' })
      .expect(201);

    expect(syncWorkModeTags).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
      'Deep Work',
      'add'
    );
  });

  it('projects WORK_MODE stop as tag delete', async () => {
    stopSlice.mockResolvedValue({
      id: 'wm1',
      category: 'Deep Work',
      dimension: 'WORK_MODE',
      start: new Date(),
      end: new Date(),
    });
    prisma.timeSlice.findFirst.mockResolvedValue({
      id: 'p1',
      category: 'Coding',
      dimension: 'PRIMARY',
      start: new Date(),
      end: null,
      togglEntryId: '123',
    });

    await request(app)
      .post('/api/engine/stop')
      .send({ dimension: 'WORK_MODE' })
      .expect(200);

    expect(syncWorkModeTags).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
      'Deep Work',
      'delete'
    );
  });
});
