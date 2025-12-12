const mockGet = jest.fn();
const mockCreate = jest.fn(() => ({
  get: mockGet,
  post: jest.fn(),
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

import { getTogglContext, resolveProjectIdForCategory } from '../timery';

describe('getTogglContext', () => {
  beforeEach(() => mockGet.mockReset());

  it('returns default workspace id and project name->id map', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') return Promise.resolve({ data: [{ id: 1, name: 'School' }] });
      return Promise.resolve({ data: null });
    });

    const ctx = await getTogglContext();
    expect(ctx.workspaceId).toBe(999);
    expect(ctx.projectNameToId.get('School')).toBe(1);
  });
});

describe('resolveProjectIdForCategory', () => {
  beforeEach(() => mockGet.mockReset());

  it('maps Compass Category to Toggl project id', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') return Promise.resolve({ data: [{ id: 1, name: 'School' }] });
      return Promise.resolve({ data: null });
    });

    const projectId = await resolveProjectIdForCategory('SCHOOL');
    expect(projectId).toBe(1);
  });
});
