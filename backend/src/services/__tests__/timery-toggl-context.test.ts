const mockGet = jest.fn();
const mockPost = jest.fn();
const mockCreate = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('axios', () => ({ create: mockCreate }));
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

jest.mock('../../prisma', () => ({
  prisma: {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../prisma';
import { clearTogglContextCache, getTogglContext, resolveProjectIdForCategory } from '../timery';

describe('getTogglContext', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    clearTogglContextCache();
  });

  it('returns default workspace id', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      return Promise.resolve({ data: null });
    });

    const ctx = await getTogglContext();
    expect(ctx.workspaceId).toBe(999);
  });
});

describe('resolveProjectIdForCategory', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    (prisma.category.findUnique as jest.Mock).mockReset();
    clearTogglContextCache();
  });

  it('resolves project id via categoryId mapping', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ togglProjectId: '123' });

    const projectId = await resolveProjectIdForCategory({
      categoryId: '11111111-1111-1111-1111-111111111111',
    });
    expect(projectId).toBe(123);
  });

  it('resolves project id via categoryName mapping (nameKey lookup)', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ togglProjectId: '456' });

    const projectId = await resolveProjectIdForCategory({ categoryName: '  Deep   Work  ' });
    expect(projectId).toBe(456);
  });

  it('returns null when category is unmapped', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    const projectId = await resolveProjectIdForCategory({ categoryName: 'sleep' });
    expect(projectId).toBe(null);
  });
});
