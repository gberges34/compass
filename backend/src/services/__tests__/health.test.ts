import axios from 'axios';
import { prisma } from '../../prisma';
import { runHealthChecks } from '../health';

jest.mock('../../prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('axios');

jest.mock('../../config/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://localhost:5432/compass',
    ANTHROPIC_API_KEY: 'test-key',
    PORT: 3001,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    TODOIST_API_TOKEN: 'todoist-token',
    TOGGL_API_TOKEN: 'toggl-token',
  },
}));

const mockedQueryRaw = prisma.$queryRaw as jest.Mock;
const mockedAxiosGet = axios.get as jest.Mock;

describe('runHealthChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when required dependencies are healthy', async () => {
    mockedQueryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    mockedAxiosGet.mockResolvedValueOnce({ status: 200 });

    const result = await runHealthChecks();

    expect(result.overallStatus).toBe('ok');
    expect(result.dependencies.database.status).toBe('up');
    expect(result.dependencies.todoist.status).toBe('up');
    expect(result.dependencies.healthKit.status).toBe('unknown');
    expect(result.dependencies.toggl.status).toBe('unknown');
  });

  it('marks service unhealthy when the database check fails', async () => {
    mockedQueryRaw.mockRejectedValueOnce(new Error('database offline'));

    const result = await runHealthChecks();

    expect(result.overallStatus).toBe('fail');
    expect(result.dependencies.database.status).toBe('down');
    expect(result.dependencies.database.error).toContain('database offline');
  });

  it('marks todoist down when the check times out but keeps overall status ok', async () => {
    mockedQueryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    mockedAxiosGet.mockImplementationOnce(
      () => new Promise(() => {
        // never resolve to simulate hang
      })
    );

    const result = await runHealthChecks({
      overrides: {
        todoist: { timeoutMs: 10 },
      },
    });

    expect(result.overallStatus).toBe('ok');
    expect(result.dependencies.todoist.status).toBe('down');
    expect(result.dependencies.todoist.error).toContain('timeout');
  });

  it('reports stubbed services as unknown', async () => {
    mockedQueryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    mockedAxiosGet.mockResolvedValueOnce({ status: 200 });

    const result = await runHealthChecks();

    expect(result.dependencies.healthKit.status).toBe('unknown');
    expect(result.dependencies.healthKit.error).toMatch(/not implemented/i);
    expect(result.dependencies.toggl.status).toBe('unknown');
  });
});
