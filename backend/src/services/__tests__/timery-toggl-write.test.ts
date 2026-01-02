const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockCreate = jest.fn(() => ({
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  put: mockPut,
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

import { createRunningTimeEntry, stopTimeEntry, stopTimeEntryAt, updateTimeEntryTags } from '../timery';

describe('Toggl write helpers', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockPut.mockReset();
  });

  it('creates a running entry in workspace', async () => {
    mockPost.mockResolvedValue({ data: { id: 123 } });
    const entry = await createRunningTimeEntry({
      workspaceId: 999,
      description: 'Coding',
      start: new Date('2025-01-01T10:00:00Z'),
      projectId: 1,
      tags: ['compass', 'deep-work'],
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/workspaces/999/time_entries',
      expect.objectContaining({
        description: 'Coding',
        duration: -1,
        project_id: 1,
        tags: ['compass', 'deep-work'],
      })
    );
    expect(entry.id).toBe(123);
  });

  it('stops an entry by id', async () => {
    mockPatch.mockResolvedValue({ data: { id: 123 } });
    await stopTimeEntry({ workspaceId: 999, entryId: 123 });
    expect(mockPatch).toHaveBeenCalledWith('/workspaces/999/time_entries/123/stop');
  });

  it('stops and backdates an entry by id', async () => {
    const start = new Date('2025-01-01T10:00:00Z');
    const stop = new Date('2025-01-01T10:20:00Z');

    mockPatch.mockResolvedValue({ data: { id: 123 } });
    mockPut.mockResolvedValue({ data: { id: 123 } });

    await stopTimeEntryAt({ workspaceId: 999, entryId: 123, start, stop });

    expect(mockPatch).toHaveBeenCalledWith('/workspaces/999/time_entries/123/stop');
    expect(mockPut).toHaveBeenCalledWith(
      '/workspaces/999/time_entries/123',
      expect.objectContaining({
        stop: stop.toISOString(),
        duration: 1200,
      })
    );
  });

  it('adds tags using tag_action', async () => {
    mockPut.mockResolvedValue({ data: { id: 123 } });
    await updateTimeEntryTags({ workspaceId: 999, entryId: 123, tags: ['deep-work'], action: 'add' });
    expect(mockPut).toHaveBeenCalledWith(
      '/workspaces/999/time_entries/123',
      expect.objectContaining({ tag_action: 'add', tags: ['deep-work'] })
    );
  });

  it('removes tags by replacing tag list', async () => {
    mockGet.mockResolvedValue({ data: { id: 123, tags: ['compass', 'deep-work'] } });
    mockPut.mockResolvedValue({ data: { id: 123 } });

    await updateTimeEntryTags({ workspaceId: 999, entryId: 123, tags: ['deep-work'], action: 'delete' });

    expect(mockGet).toHaveBeenCalledWith('/me/time_entries/123');
    expect(mockPut).toHaveBeenCalledWith(
      '/workspaces/999/time_entries/123',
      expect.objectContaining({ tags: ['compass'] })
    );
    const putBody = mockPut.mock.calls[0][1];
    expect(putBody.tag_action).toBeUndefined();
  });
});
