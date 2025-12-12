# Toggl Track Projection for Time Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Compass Time Engine canonical for live tracking and project PRIMARY time into Toggl Track (visible in Timery), mirroring WORK_MODE as Toggl tags without polling.

**Architecture:** Add a best‑effort Toggl projection layer above Time Engine. PRIMARY start/stop creates/stops a running Toggl entry; WORK_MODE start/stop adds/removes tags on the current PRIMARY entry. Persist a `togglEntryId` on `TimeSlice` for deterministic updates. Exclude Compass‑created Toggl entries from review metrics to prevent double counting.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, Axios, Jest, Toggl Track API v9.

---

### Task 1: Add `togglEntryId` to TimeSlice

**Files:**
- Modify: `backend/prisma/schema.prisma:153-166`
- Create (generated): `backend/prisma/migrations/<timestamp>_add_toggl_entry_id/migration.sql`

**Step 1: Update Prisma schema**

In `backend/prisma/schema.prisma`, add a nullable field to `model TimeSlice`:

```prisma
model TimeSlice {
  id           String        @id @default(uuid())
  start        DateTime
  end          DateTime?
  category     String
  dimension    TimeDimension
  source       TimeSource
  isLocked     Boolean       @default(false)
  linkedTaskId String?
  togglEntryId String?       // new: linked Toggl Track time_entry_id
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([start, end])
  @@index([dimension, end])
}
```

**Step 2: Generate migration**

Run:

```bash
cd backend
npm run prisma:migrate
```

Expected: a new migration folder is created adding a `togglEntryId` column.

**Step 3: Regenerate Prisma client**

Run:

```bash
cd backend
npm run prisma:generate
```

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(backend): add togglEntryId to TimeSlice"
```

---

### Task 2: Add Toggl context + project resolution helpers

**Files:**
- Modify: `backend/src/services/timery.ts:1-212`
- Test: `backend/src/services/__tests__/timery-toggl-context.test.ts`

**Step 1: Write failing test**

Create `backend/src/services/__tests__/timery-toggl-context.test.ts`:

```ts
const mockGet = jest.fn();
const mockCreate = jest.fn(() => ({ get: mockGet, post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() }));

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
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend
npm test -- timery-toggl-context.test.ts
```

Expected: FAIL with “getTogglContext is not a function”.

**Step 3: Implement helpers**

In `backend/src/services/timery.ts`, add near the top (after `TOGGL_PROJECT_CATEGORY_MAP`):

```ts
type TogglContext = {
  workspaceId: number;
  projectNameToId: Map<string, number>;
};

const CATEGORY_TO_TOGGL_PROJECT_NAME: Partial<Record<Category, string>> =
  Object.fromEntries(
    Object.entries(TOGGL_PROJECT_CATEGORY_MAP).map(([projectName, category]) => [category, projectName])
  );

let cachedContext: { value: TogglContext; fetchedAt: number } | null = null;
const TOGGL_CONTEXT_TTL_MS = 10 * 60 * 1000;

async function fetchDefaultWorkspaceId(): Promise<number> {
  const response = await withRetry(() => togglAPI.get('/me'));
  const wid = response.data?.default_workspace_id;
  if (!wid) {
    throw new InternalError('Failed to resolve default Toggl workspace');
  }
  return wid;
}

export async function getTogglContext(): Promise<TogglContext> {
  if (cachedContext && Date.now() - cachedContext.fetchedAt < TOGGL_CONTEXT_TTL_MS) {
    return cachedContext.value;
  }
  const [workspaceId, projectMap] = await Promise.all([
    fetchDefaultWorkspaceId(),
    getProjects(),
  ]);

  const projectNameToId = new Map<string, number>();
  projectMap.forEach((name, id) => projectNameToId.set(name, id));

  const value = { workspaceId, projectNameToId };
  cachedContext = { value, fetchedAt: Date.now() };
  return value;
}

export async function resolveProjectIdForCategory(category: string): Promise<number | null> {
  const ctx = await getTogglContext();
  const projectName = CATEGORY_TO_TOGGL_PROJECT_NAME[category as Category];
  if (!projectName) return null;
  return ctx.projectNameToId.get(projectName) ?? null;
}
```

**Step 4: Run tests**

Run:

```bash
cd backend
npm test -- timery-toggl-context.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/timery.ts backend/src/services/__tests__/timery-toggl-context.test.ts
git commit -m "feat(backend): add Toggl context caching helpers"
```

---

### Task 3: Add Toggl write helpers (create/stop/update tags)

**Files:**
- Modify: `backend/src/services/timery.ts:79-130`
- Modify: `backend/src/services/timery.ts:155-167`
- Test: `backend/src/services/__tests__/timery-toggl-write.test.ts`

**Step 1: Write failing test**

Create `backend/src/services/__tests__/timery-toggl-write.test.ts`:

```ts
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockCreate = jest.fn(() => ({ get: mockGet, post: mockPost, patch: mockPatch, put: mockPut }));

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

import { createRunningTimeEntry, stopTimeEntry, updateTimeEntryTags } from '../timery';

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
      expect.objectContaining({ description: 'Coding', duration: -1, project_id: 1 })
    );
    expect(entry.id).toBe(123);
  });

  it('stops an entry by id', async () => {
    mockPatch.mockResolvedValue({ data: { id: 123 } });
    await stopTimeEntry({ workspaceId: 999, entryId: 123 });
    expect(mockPatch).toHaveBeenCalledWith('/workspaces/999/time_entries/123/stop');
  });

  it('adds tags using tag_action', async () => {
    mockPut.mockResolvedValue({ data: { id: 123 } });
    await updateTimeEntryTags({ workspaceId: 999, entryId: 123, tags: ['deep-work'], action: 'add' });
    expect(mockPut).toHaveBeenCalledWith(
      '/workspaces/999/time_entries/123',
      expect.objectContaining({ tag_action: 'add', tags: ['deep-work'] })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend
npm test -- timery-toggl-write.test.ts
```

Expected: FAIL with missing exports.

**Step 3: Implement helpers**

In `backend/src/services/timery.ts`, update endpoints + add helpers:

1) Replace current-running endpoint at `getCurrentRunningEntry`:

```ts
const response = await withRetry(() => togglAPI.get('/me/time_entries/current'));
```

2) Replace stop-running endpoint at `stopRunningEntry`:

```ts
const currentEntry = await getCurrentRunningEntry();
if (!currentEntry) return null;
const { workspaceId } = await getTogglContext();
await withRetry(() => togglAPI.patch(`/workspaces/${workspaceId}/time_entries/${currentEntry.id}/stop`));
return await fetchTimeryEntry(currentEntry.id);
```

3) Add write helpers (below `stopRunningEntry`):

```ts
export async function createRunningTimeEntry(input: {
  workspaceId: number;
  description: string;
  start: Date;
  projectId: number | null;
  tags: string[];
}): Promise<{ id: number }> {
  const payload: any = {
    workspace_id: input.workspaceId,
    description: input.description,
    start: input.start.toISOString(),
    duration: -1,
    created_with: 'Compass Time Engine',
    tags: input.tags,
  };
  if (input.projectId) payload.project_id = input.projectId;

  const response = await withRetry(() =>
    togglAPI.post(`/workspaces/${input.workspaceId}/time_entries`, payload)
  );
  return response.data;
}

export async function stopTimeEntry(input: {
  workspaceId: number;
  entryId: number;
}): Promise<void> {
  await withRetry(() =>
    togglAPI.patch(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}/stop`)
  );
}

export async function updateTimeEntryTags(input: {
  workspaceId: number;
  entryId: number;
  tags: string[];
  action: 'add' | 'delete';
}): Promise<void> {
  await withRetry(() =>
    togglAPI.put(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}`, {
      tag_action: input.action,
      tags: input.tags,
    })
  );
}
```

**Step 4: Run tests**

Run:

```bash
cd backend
npm test -- timery-toggl-write.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/timery.ts backend/src/services/__tests__/timery-toggl-write.test.ts
git commit -m "feat(backend): add Toggl write helpers"
```

---

### Task 4: Implement Toggl projection service

**Files:**
- Create: `backend/src/services/togglProjection.ts`
- Test: `backend/src/services/__tests__/togglProjection.test.ts`

**Step 1: Write failing tests**

Create `backend/src/services/__tests__/togglProjection.test.ts`:

```ts
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
jest.mock('../../prisma', () => ({
  prisma: {
    timeSlice: {
      update: mockUpdate,
      findFirst: mockFindFirst,
    },
  },
}));

const mockStopRunningEntry = jest.fn();
const mockCreateRunningTimeEntry = jest.fn();
const mockStopTimeEntry = jest.fn();
const mockUpdateTimeEntryTags = jest.fn();
const mockGetTogglContext = jest.fn();
const mockResolveProjectIdForCategory = jest.fn();

jest.mock('../timery', () => ({
  stopRunningEntry: mockStopRunningEntry,
  createRunningTimeEntry: mockCreateRunningTimeEntry,
  stopTimeEntry: mockStopTimeEntry,
  updateTimeEntryTags: mockUpdateTimeEntryTags,
  getTogglContext: mockGetTogglContext,
  resolveProjectIdForCategory: mockResolveProjectIdForCategory,
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
  });

  it('syncPrimaryStart creates running entry and stores togglEntryId', async () => {
    mockCreateRunningTimeEntry.mockResolvedValue({ id: 123 });
    mockFindFirst.mockResolvedValue({ category: 'Deep Work' }); // active WORK_MODE

    await syncPrimaryStart(baseSlice());

    expect(mockStopRunningEntry).toHaveBeenCalled();
    expect(mockCreateRunningTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 999,
        description: expect.any(String),
        tags: expect.arrayContaining(['compass', 'deep-work']),
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'slice-1' },
      data: { togglEntryId: '123' },
    });
  });

  it('syncPrimaryStop stops linked entry', async () => {
    await syncPrimaryStop(baseSlice({ togglEntryId: '123' }));
    expect(mockStopTimeEntry).toHaveBeenCalledWith({ workspaceId: 999, entryId: 123 });
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
});
```

**Step 2: Run tests to verify failure**

Run:

```bash
cd backend
npm test -- togglProjection.test.ts
```

Expected: FAIL with missing module.

**Step 3: Implement minimal projection**

Create `backend/src/services/togglProjection.ts`:

```ts
import type { TimeSlice } from '@prisma/client';
import { prisma } from '../prisma';
import { env } from '../config/env';
import {
  stopRunningEntry,
  createRunningTimeEntry,
  stopTimeEntry,
  updateTimeEntryTags,
  getTogglContext,
  resolveProjectIdForCategory,
  getCurrentRunningEntry,
} from './timery';

	function workModeToTag(category: string): string {
	  return category.trim().toLowerCase().replace(/\s+/g, '-');
	}

	export async function syncPrimaryStart(slice: TimeSlice): Promise<void> {
	  if (!env.TOGGL_API_TOKEN || slice.dimension !== 'PRIMARY') return;
	  const { workspaceId } = await getTogglContext();

	  try {
	    await stopRunningEntry();
	  } catch (error) {
	    console.warn('Failed to stop running Toggl entry before PRIMARY start', error);
	  }

	  const workMode = await prisma.timeSlice.findFirst({
	    where: { dimension: 'WORK_MODE', end: null },
	    select: { category: true },
	  });

	  const projectId = await resolveProjectIdForCategory(slice.category);

	  const tags = ['compass'];
	  if (workMode?.category) tags.push(workModeToTag(workMode.category));

	  let description = slice.category;
	  if (slice.linkedTaskId) {
	    const task = await prisma.task.findUnique({
	      where: { id: slice.linkedTaskId },
	      select: { name: true },
	    });
	    if (task?.name) description = task.name;
	  }

	  const entry = await createRunningTimeEntry({
	    workspaceId,
	    description,
	    start: slice.start,
	    projectId,
	    tags,
	  });

  await prisma.timeSlice.update({
    where: { id: slice.id },
    data: { togglEntryId: entry.id.toString() },
  });
}

export async function syncPrimaryStop(slice: TimeSlice | null): Promise<void> {
  if (!env.TOGGL_API_TOKEN || !slice || slice.dimension !== 'PRIMARY') return;
  if (!slice.togglEntryId) return;
  const { workspaceId } = await getTogglContext();
  await stopTimeEntry({ workspaceId, entryId: Number(slice.togglEntryId) });
}

	export async function syncWorkModeTags(
	  primarySlice: TimeSlice | null,
	  workModeCategory: string | null,
	  action: 'add' | 'delete'
	): Promise<void> {
	  if (!env.TOGGL_API_TOKEN || !primarySlice || primarySlice.dimension !== 'PRIMARY') return;
	  const { workspaceId } = await getTogglContext();

  let entryId = primarySlice.togglEntryId ? Number(primarySlice.togglEntryId) : null;
  if (!entryId) {
    const running = await getCurrentRunningEntry();
    entryId = running ? Number(running.id) : null;
  }
  if (!entryId) return;

  const tag = workModeCategory ? workModeToTag(workModeCategory) : null;
  if (!tag) return;

	  await updateTimeEntryTags({
	    workspaceId,
	    entryId,
	    tags: [tag],
	    action,
	  });
	}
```

Then extend `syncWorkModeTags` to accept a delete action in the next step.

**Step 4: Extend implementation to support delete**

Update `syncWorkModeTags` signature and logic to:

```ts
export async function syncWorkModeTags(
  primarySlice: TimeSlice | null,
  workModeCategory: string | null,
  action: 'add' | 'delete'
): Promise<void> {
  ...
  if (!tag) return;
  await updateTimeEntryTags({ workspaceId, entryId, tags: [tag], action });
}
```

Update tests accordingly (add a delete test).

**Step 5: Run tests**

Run:

```bash
cd backend
npm test -- togglProjection.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/services/togglProjection.ts backend/src/services/__tests__/togglProjection.test.ts
git commit -m "feat(backend): add Toggl projection for Time Engine"
```

---

### Task 5: Call projection from Engine routes

**Files:**
- Modify: `backend/src/routes/engine.ts:11-29`
- Test: `backend/src/routes/__tests__/engine-toggl-projection.test.ts`

**Step 1: Write failing test**

Create `backend/src/routes/__tests__/engine-toggl-projection.test.ts`:

```ts
import request from 'supertest';
import express from 'express';
import engineRouter from '../engine';

const app = express();
app.use(express.json());
app.use('/api/engine', engineRouter);

const mockStartSlice = jest.fn();
const mockStopSlice = jest.fn();
jest.mock('../../services/timeEngine', () => ({
  startSlice: mockStartSlice,
  stopSlice: mockStopSlice,
  getCurrentState: jest.fn(),
}));

const mockSyncPrimaryStart = jest.fn();
const mockSyncPrimaryStop = jest.fn();
const mockSyncWorkModeTags = jest.fn();
jest.mock('../../services/togglProjection', () => ({
  syncPrimaryStart: mockSyncPrimaryStart,
  syncPrimaryStop: mockSyncPrimaryStop,
  syncWorkModeTags: mockSyncWorkModeTags,
}));

describe('engine routes Toggl projection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('projects PRIMARY start', async () => {
    mockStartSlice.mockResolvedValue({ id: 's1', category: 'Coding', dimension: 'PRIMARY', start: new Date().toISOString(), end: null });
    await request(app).post('/api/engine/start').send({ category: 'Coding', dimension: 'PRIMARY', source: 'SHORTCUT' }).expect(201);
    expect(mockSyncPrimaryStart).toHaveBeenCalled();
  });

  it('projects PRIMARY stop', async () => {
    mockStopSlice.mockResolvedValue({ id: 's1', category: 'Coding', dimension: 'PRIMARY', start: new Date().toISOString(), end: new Date().toISOString(), togglEntryId: '123' });
    await request(app).post('/api/engine/stop').send({ dimension: 'PRIMARY' }).expect(200);
    expect(mockSyncPrimaryStop).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify failure**

Run:

```bash
cd backend
npm test -- engine-toggl-projection.test.ts
```

Expected: FAIL because routes don’t call projection yet.

**Step 3: Implement projection calls**

In `backend/src/routes/engine.ts`:

1) Import projection:

```ts
import { syncPrimaryStart, syncPrimaryStop, syncWorkModeTags } from '../services/togglProjection';
```

2) After `startSlice`:

```ts
const slice = await TimeEngine.startSlice(validatedData);
if (slice.dimension === 'PRIMARY') {
  syncPrimaryStart(slice).catch((e) => console.error('Toggl projection failed (PRIMARY start)', e));
}
if (slice.dimension === 'WORK_MODE') {
  const state = await TimeEngine.getCurrentState();
  syncWorkModeTags(state.primary as any, slice.category, 'add')
    .catch((e) => console.error('Toggl projection failed (WORK_MODE add)', e));
}
res.status(201).json(slice);
```

3) After `stopSlice`:

```ts
const slice = await TimeEngine.stopSlice(validatedData);
if (slice.dimension === 'PRIMARY') {
  syncPrimaryStop(slice).catch((e) => console.error('Toggl projection failed (PRIMARY stop)', e));
}
if (slice.dimension === 'WORK_MODE') {
  const state = await TimeEngine.getCurrentState();
  syncWorkModeTags(state.primary as any, slice.category, 'delete')
    .catch((e) => console.error('Toggl projection failed (WORK_MODE delete)', e));
}
res.json(slice);
```

**Step 4: Run tests**

Run:

```bash
cd backend
npm test -- engine-toggl-projection.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/routes/engine.ts backend/src/routes/__tests__/engine-toggl-projection.test.ts
git commit -m "feat(backend): project engine starts/stops to Toggl"
```

---

### Task 6: Call projection from Task activation/completion

**Files:**
- Modify: `backend/src/routes/tasks.ts:424-553`
- Test: `backend/src/routes/__tests__/tasks-toggl-projection.test.ts`

**Step 1: Write failing test**

Create `backend/src/routes/__tests__/tasks-toggl-projection.test.ts`:

```ts
import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

const mockTransaction = jest.fn();
jest.mock('../../prisma', () => ({
  prisma: { $transaction: mockTransaction },
}));

const mockStartSlice = jest.fn();
const mockStopSliceIfExists = jest.fn();
jest.mock('../../services/timeEngine', () => ({
  startSlice: mockStartSlice,
  stopSliceIfExists: mockStopSliceIfExists,
}));

const mockSyncPrimaryStart = jest.fn();
const mockSyncPrimaryStop = jest.fn();
jest.mock('../../services/togglProjection', () => ({
  syncPrimaryStart: mockSyncPrimaryStart,
  syncPrimaryStop: mockSyncPrimaryStop,
}));

describe('tasks routes Toggl projection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('projects slice on activate', async () => {
    mockTransaction.mockImplementation(async (cb: any) => cb({
      task: { update: jest.fn().mockResolvedValue({ id: 't1', category: 'SCHOOL' }) },
    }));
    mockStartSlice.mockResolvedValue({ id: 's1', category: 'SCHOOL', dimension: 'PRIMARY', start: new Date(), end: null });

    await request(app).post('/api/tasks/t1/activate').send({}).expect(200);
    expect(mockSyncPrimaryStart).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('projects stop on complete', async () => {
    mockTransaction.mockImplementation(async (cb: any) => cb({
      task: { findUnique: jest.fn().mockResolvedValue({ id: 't1', status: 'ACTIVE', duration: 10, category: 'SCHOOL' }), update: jest.fn().mockResolvedValue({ id: 't1', status: 'DONE' }) },
      postDoLog: { upsert: jest.fn().mockResolvedValue({}) },
    }));
    mockStopSliceIfExists.mockResolvedValue({ id: 's1', dimension: 'PRIMARY', togglEntryId: '123' });

    await request(app).post('/api/tasks/t1/complete').send({
      outcome: 'ok',
      effortLevel: 'SMALL',
      keyInsight: 'x',
      actualDuration: 10,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    }).expect(200);
    expect(mockSyncPrimaryStop).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });
});
```

**Step 2: Run test to verify failure**

Run:

```bash
cd backend
npm test -- tasks-toggl-projection.test.ts
```

Expected: FAIL because tasks routes don’t call projection yet.

**Step 3: Implement projection calls**

In `backend/src/routes/tasks.ts`:

1) Import:

```ts
import { syncPrimaryStart, syncPrimaryStop } from '../services/togglProjection';
```

2) After activation transaction:

```ts
syncPrimaryStart(result.slice).catch((e) => console.error('Toggl projection failed (task activate)', e));
```

3) After completion stop:

```ts
const stopped = await TimeEngine.stopSliceIfExists({ dimension: 'PRIMARY' });
syncPrimaryStop(stopped).catch((e) => console.error('Toggl projection failed (task complete)', e));
```

**Step 4: Run tests**

Run:

```bash
cd backend
npm test -- tasks-toggl-projection.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/routes/tasks.ts backend/src/routes/__tests__/tasks-toggl-projection.test.ts
git commit -m "feat(backend): project task lifecycle slices to Toggl"
```

---

### Task 7: Call projection from Discord bot

**Files:**
- Modify: `backend/src/discord/client.ts:25-63`

**Step 1: Update deps wrappers**

In `buildDeps()`:

```ts
async startSlice(input) {
  await callWithRetry('discord-startSlice', async () => {
    const { startSlice } = await import('../services/timeEngine');
    const slice = await startSlice(input);
    if (input.dimension === 'PRIMARY') {
      const { syncPrimaryStart } = await import('../services/togglProjection');
      syncPrimaryStart(slice).catch((e) => console.error('Toggl projection failed (discord PRIMARY start)', e));
    }
  });
},
async stopSlice(input) {
  await callWithRetry('discord-stopSlice', async () => {
    const { stopSlice } = await import('../services/timeEngine');
    const slice = await stopSlice(input);
    if (input.dimension === 'PRIMARY') {
      const { syncPrimaryStop } = await import('../services/togglProjection');
      syncPrimaryStop(slice).catch((e) => console.error('Toggl projection failed (discord PRIMARY stop)', e));
    }
  });
},
async stopSliceIfExists(input) {
  await callWithRetry('discord-stopSliceIfExists', async () => {
    const { stopSliceIfExists } = await import('../services/timeEngine');
    const slice = await stopSliceIfExists(input);
    if (input.dimension === 'PRIMARY') {
      const { syncPrimaryStop } = await import('../services/togglProjection');
      syncPrimaryStop(slice).catch((e) => console.error('Toggl projection failed (discord PRIMARY stopIfExists)', e));
    }
  });
},
```

**Step 2: Manual smoke test**

Run backend with Discord bot enabled and confirm:
- Starting a game creates a running Toggl entry tagged `compass`.
- Stopping game stops the Toggl entry.

**Step 3: Commit**

```bash
git add backend/src/discord/client.ts
git commit -m "feat(backend): project Discord slices to Toggl"
```

---

### Task 8: Exclude Compass-created entries from Toggl metrics

**Files:**
- Modify: `backend/src/services/timery.ts:160-270`
- Test: `backend/src/services/__tests__/category-balance.integration.test.ts`

**Step 1: Write failing test**

In `backend/src/services/__tests__/category-balance.integration.test.ts`, add:

```ts
it('skips compass-tagged entries to avoid double counting', async () => {
  mockGet.mockImplementation((path: string) => {
    if (path === '/me/time_entries') {
      return Promise.resolve({
        data: [
          { id: 1, duration: 600, start: '2025-01-01T10:00:00Z', stop: '2025-01-01T10:10:00Z', description: 'Compass entry', project_id: 1, tags: ['compass'] },
          { id: 2, duration: 1800, start: '2025-01-01T11:00:00Z', stop: '2025-01-01T11:30:00Z', description: 'Gym', project_id: 2, tags: [] },
        ],
      });
    }
    if (path === '/me/projects') {
      return Promise.resolve({ data: [{ id: 1, name: 'School' }, { id: 2, name: 'Fitness' }] });
    }
    return Promise.resolve({ data: null });
  });

  const balance = await getCategoryBalanceFromToggl(
    new Date('2025-01-01T00:00:00Z'),
    new Date('2025-01-02T00:00:00Z'),
    []
  );
  expect(balance).toEqual({ FITNESS: 30 });
});
```

**Step 2: Run test to verify failure**

Run:

```bash
cd backend
npm test -- category-balance.integration.test.ts
```

Expected: FAIL because compass-tagged entry is included.

**Step 3: Implement skip**

In `backend/src/services/timery.ts`:

1) Extend `TogglTimeEntry` to include tags:

```ts
interface TogglTimeEntry {
  id: number;
  duration: number;
  start: string;
  stop: string | null;
  description: string;
  project_id: number | null;
  tags?: string[] | null;
}
```

2) At top of `entries.forEach` in `getCategoryBalanceFromToggl`:

```ts
const hasCompassTag = (entry.tags || []).some((t) => t.toLowerCase() === 'compass');
if (hasCompassTag) return;
```

**Step 4: Run tests**

Run:

```bash
cd backend
npm test -- category-balance.integration.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/timery.ts backend/src/services/__tests__/category-balance.integration.test.ts
git commit -m "fix(backend): skip compass-tagged Toggl entries in metrics"
```

---

## Verification Checklist

1. Start a PRIMARY activity via `/api/engine/start`.
   - Expected: Toggl shows a running entry in Timery within seconds, tagged `compass`.
2. Start WORK_MODE “Deep Work”.
   - Expected: current Timery timer gains tag `deep-work`.
3. Stop WORK_MODE.
   - Expected: `deep-work` tag removed, `compass` tag remains.
4. Activate a Compass task.
   - Expected: existing Toggl running entry stops; new task‑linked entry starts.
5. Complete a task.
   - Expected: Toggl entry stops.
6. Run: `cd backend && npm test`.
   - Expected: all updated unit tests pass. (If existing integration suite fails due to unrelated issues, run targeted tests listed above.)
