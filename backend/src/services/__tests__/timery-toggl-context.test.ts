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

import { clearTogglContextCache, getTogglContext, resolveProjectIdForCategory } from '../timery';

describe('getTogglContext', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    clearTogglContextCache();
  });

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
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    clearTogglContextCache();
  });

  it('maps Compass Category to Toggl project id', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') return Promise.resolve({ data: [{ id: 1, name: 'School' }] });
      return Promise.resolve({ data: null });
    });

    const projectId = await resolveProjectIdForCategory('SCHOOL');
    expect(projectId).toBe(1);
  });

  it('maps enum categories even if Toggl project casing differs', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') return Promise.resolve({ data: [{ id: 1, name: 'school' }] });
      return Promise.resolve({ data: null });
    });

    const projectId = await resolveProjectIdForCategory('SCHOOL');
    expect(projectId).toBe(1);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('matches existing projects case-insensitively and whitespace-insensitively', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') {
        return Promise.resolve({
          data: [{ id: 22, name: '  deep   work  ' }],
        });
      }
      return Promise.resolve({ data: null });
    });

    const projectId = await resolveProjectIdForCategory('Deep Work');
    expect(projectId).toBe(22);
  });

  it('auto-creates a Toggl project for missing PRIMARY activities (normalized Title Case)', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: null });
    });
    mockPost.mockResolvedValue({ data: { id: 123, name: 'Sleep' } });

    const projectId = await resolveProjectIdForCategory('sleep');

    expect(mockPost).toHaveBeenCalledWith('/workspaces/999/projects', { name: 'Sleep' });
    expect(projectId).toBe(123);
  });

  it('refreshes context and resolves if project creation fails (race-safe)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let projectsCallCount = 0;

    mockGet.mockImplementation((path: string) => {
      if (path === '/me') return Promise.resolve({ data: { default_workspace_id: 999 } });
      if (path === '/me/projects') {
        projectsCallCount += 1;
        return Promise.resolve({
          data: projectsCallCount === 1 ? [] : [{ id: 555, name: 'Sleep' }],
        });
      }
      return Promise.resolve({ data: null });
    });
    mockPost.mockRejectedValue(new Error('project exists'));

    const projectId = await resolveProjectIdForCategory('sleep');
    expect(projectId).toBe(555);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
