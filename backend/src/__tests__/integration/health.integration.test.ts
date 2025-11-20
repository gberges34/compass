jest.mock('../../config/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://localhost:5432/compass',
    API_SECRET: 'test-api-secret',
    PORT: 3999,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

jest.mock('../../services/health', () => ({
  runHealthChecks: jest.fn(),
}));

import request from 'supertest';
import { app } from '../../app';
import { runHealthChecks } from '../../services/health';

const mockedRunHealthChecks = runHealthChecks as jest.Mock;

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildDependencies(overrides: Partial<Record<string, any>> = {}) {
    return {
      database: { status: 'up', latencyMs: 5 },
      todoist: { status: 'unknown', latencyMs: 0, error: 'not configured' },
      healthKit: { status: 'unknown', latencyMs: 0, error: 'stub' },
      toggl: { status: 'unknown', latencyMs: 0, error: 'stub' },
      ...overrides,
    };
  }

  it('responds with 200 and dependency data when healthy', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      overallStatus: 'ok',
      dependencies: buildDependencies(),
    });

    const response = await request(app).get('/api/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.dependencies.database.status).toBe('up');
  });

  it('responds with 503 when any required dependency is down', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      overallStatus: 'fail',
      dependencies: buildDependencies({
        database: { status: 'down', latencyMs: 12, error: 'db offline' },
      }),
    });

    const response = await request(app).get('/api/health').expect(503);

    expect(response.body.status).toBe('fail');
    expect(response.body.dependencies.database.status).toBe('down');
  });
});
