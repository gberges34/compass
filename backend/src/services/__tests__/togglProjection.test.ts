import type { TimeSlice } from '@prisma/client';

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

const mockUpdate = jest.fn();
const mockFindFirst = jest.fn();
const mockTaskFindUnique = jest.fn();
jest.mock('../../prisma', () => ({
  prisma: {
    timeSlice: {
      update: mockUpdate,
      findFirst: mockFindFirst,
    },
    task: {
      findUnique: mockTaskFindUnique,
    },
  },
}));

const mockStopRunningEntry = jest.fn();
const mockCreateRunningTimeEntry = jest.fn();
const mockStopTimeEntryAt = jest.fn();
const mockUpdateTimeEntryTags = jest.fn();
const mockGetTogglContext = jest.fn();
const mockResolveProjectIdForCategory = jest.fn();
const mockGetCurrentRunningEntry = jest.fn();

jest.mock('../timery', () => ({
  stopRunningEntry: mockStopRunningEntry,
  createRunningTimeEntry: mockCreateRunningTimeEntry,
  stopTimeEntryAt: mockStopTimeEntryAt,
  updateTimeEntryTags: mockUpdateTimeEntryTags,
  getTogglContext: mockGetTogglContext,
  resolveProjectIdForCategory: mockResolveProjectIdForCategory,
  getCurrentRunningEntry: mockGetCurrentRunningEntry,
}));

import { syncPrimaryStart, syncPrimaryStop, syncWorkModeTags } from '../togglProjection';

const baseSlice = (overrides: Partial<TimeSlice> = {}): TimeSlice => ({
  id: 'slice-1',
  start: new Date('2025-01-01T10:00:00Z'),
  end: null,
  category: 'SCHOOL',
  dimension: 'PRIMARY',
  source: 'API',
  isLocked: false,
  linkedTaskId: null,
  togglEntryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('togglProjection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTogglContext.mockResolvedValue({ workspaceId: 999, projectNameToId: new Map([['School', 1]]) });
    mockResolveProjectIdForCategory.mockResolvedValue(1);
    mockTaskFindUnique.mockResolvedValue(null);
  });

  it('syncPrimaryStart creates running entry and stores togglEntryId', async () => {
    mockCreateRunningTimeEntry.mockResolvedValue({ id: 123 });
    mockFindFirst.mockResolvedValue({ category: 'Deep Work' });

    await syncPrimaryStart(baseSlice());

    expect(mockStopRunningEntry).toHaveBeenCalled();
    expect(mockCreateRunningTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 999,
        description: 'SCHOOL',
        tags: expect.arrayContaining(['compass', 'deep-work']),
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'slice-1' },
      data: { togglEntryId: '123' },
    });
  });

  it('syncPrimaryStop stops linked entry', async () => {
    const stop = new Date('2025-01-01T10:20:00Z');
    const start = new Date('2025-01-01T10:00:00Z');
    await syncPrimaryStop(
      baseSlice({ togglEntryId: '123', start, end: stop })
    );
    expect(mockStopTimeEntryAt).toHaveBeenCalledWith({
      workspaceId: 999,
      entryId: 123,
      start,
      stop,
    });
  });

  it('syncWorkModeTags adds tag to current primary', async () => {
    await syncWorkModeTags(baseSlice({ togglEntryId: '123' }), 'Deep Work', 'add');
    expect(mockUpdateTimeEntryTags).toHaveBeenCalledWith({
      workspaceId: 999,
      entryId: 123,
      tags: ['deep-work'],
      action: 'add',
    });
  });

  it('uses linked task name for description when present', async () => {
    mockCreateRunningTimeEntry.mockResolvedValue({ id: 456 });
    mockFindFirst.mockResolvedValue(null);
    mockTaskFindUnique.mockResolvedValue({ name: 'Write Essay' });

    await syncPrimaryStart(baseSlice({ linkedTaskId: 'task-1', category: 'SCHOOL' }));

    expect(mockCreateRunningTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Write Essay' })
    );
  });
});
