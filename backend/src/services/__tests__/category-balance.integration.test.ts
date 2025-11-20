const mockGet = jest.fn();

jest.mock('../../config/env', () => ({
  env: {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/compass',
    API_SECRET: 'test-api-secret',
    TOGGL_API_TOKEN: 'test-toggl',
    PORT: 3001,
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

jest.mock('axios', () => ({
  create: () => ({
    get: mockGet,
    patch: jest.fn(),
  }),
}));

import { getCategoryBalanceFromToggl, type PostDoLogTimeRange } from '../timery';

describe('getCategoryBalanceFromToggl (integration)', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('combines Toggl and Compass data without double counting overlaps', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me/time_entries') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              duration: 1200,
              start: '2025-01-01T10:00:00Z',
              stop: '2025-01-01T10:20:00Z',
              description: 'Deep work',
              project_id: 1,
            },
            {
              id: 2,
              duration: 1800,
              start: '2025-01-01T11:00:00Z',
              stop: '2025-01-01T11:30:00Z',
              description: 'Gym',
              project_id: 2,
            },
          ],
        });
      }

      if (path === '/me/projects') {
        return Promise.resolve({
          data: [
            { id: 1, name: 'School' },
            { id: 2, name: 'Fitness' },
          ],
        });
      }

      return Promise.resolve({ data: null });
    });

    const postDoLogRanges: PostDoLogTimeRange[] = [
      { startTime: new Date('2025-01-01T10:00:00Z'), endTime: new Date('2025-01-01T10:20:00Z') },
    ];

    const balance = await getCategoryBalanceFromToggl(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z'),
      postDoLogRanges
    );

    expect(balance).toEqual({ FITNESS: 30 });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
