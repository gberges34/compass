# Debugging Report Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove bandaid fixes called out in DEBUGGING_REPORT.md so the backend trusts its error architecture, relies on database constraints, and sheds redundant queries.

**Architecture:** Express routes already flow through Zod validation + centralized AppError middleware with Prisma error extensions. The plan keeps that structure but introduces a conflict error, lets Prisma surface uniqueness violations, and trims route-level defensive code.

**Tech Stack:** Node 20, Express 4, TypeScript, Prisma, Zod, Jest + Supertest integration harness.

---

### Task 1: Standardize Orient East conflict handling

**Files:**
- Create: `backend/tests/integration/orient.test.ts`
- Modify: `backend/src/errors/AppError.ts:1-40`
- Modify: `backend/src/routes/orient.ts:1-80`
- Modify: `backend/src/middleware/errorHandler.ts:1-40`

**Step 1: Write the failing integration test**
```ts
// backend/tests/integration/orient.test.ts
import request from 'supertest';
import { startOfDay } from 'date-fns';
import { app } from '../../src/index';
import { prisma } from '../../src/prisma';

const payload = {
  energyLevel: 'HIGH',
  deepWorkBlock1: { start: '08:00', end: '10:00', focus: 'Deep Work' },
  deepWorkBlock2: { start: '13:00', end: '15:00', focus: 'Writing' },
  adminBlock: { start: '15:00', end: '15:30' },
  bufferBlock: { start: '15:30', end: '16:00' },
  topOutcomes: ['Ship feature'],
  reward: 'Coffee'
};

describe('Orient API', () => {
  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());
  afterEach(async () => {
    await prisma.dailyPlan.deleteMany({
      where: { date: startOfDay(new Date()) }
    });
  });

  it('surfaces ConflictError via middleware when plan already exists', async () => {
    const first = await request(app).post('/api/orient/east').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/orient/east').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('CONFLICT');
    expect(second.body.error).toContain('Daily plan already exists');
  });
});
```

**Step 2: Run the new test and ensure it fails**
```
cd backend && npm test -- --runTestsByPath tests/integration/orient.test.ts
```
Expected: FAIL because response lacks `code: 'CONFLICT'` (route currently bypasses middleware).

**Step 3: Implement ConflictError + rely on Prisma unique constraint**
- Extend `backend/src/errors/AppError.ts` with:
```ts
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}
```
- In `backend/src/routes/orient.ts`, import `ConflictError`, delete the manual `findUnique`/409 block, and wrap `prisma.dailyPlan.create` in try/catch:
```ts
try {
  const dailyPlan = await prisma.dailyPlan.create({ data: { ...validatedData, date: today } });
  return res.status(201).json(dailyPlan);
} catch (error: any) {
  if (error.code === 'P2002' && error.meta?.target?.includes('DailyPlan_date_key')) {
    throw new ConflictError('Daily plan already exists for today', { date: today.toISOString() });
  }
  throw error;
}
```
- Remove the redundant existence query entirely.
- While touching error plumbing, delete the dead `P2025` branch at the top of `backend/src/middleware/errorHandler.ts` so all errors flow through AppError.

**Step 4: Re-run orient tests**
```
cd backend && npm test -- --runTestsByPath tests/integration/orient.test.ts
```
Expected: PASS, proving middleware now returns the standardized payload.

**Step 5: Commit**
```
git add backend/src/errors/AppError.ts backend/src/routes/orient.ts backend/src/middleware/errorHandler.ts backend/tests/integration/orient.test.ts
git commit -m "fix(backend): standardize orient conflict handling"
```

---

### Task 2: Remove redundant task existence queries

**Files:**
- Modify: `backend/tests/integration/tasks.test.ts:1-220`
- Modify: `backend/src/routes/tasks.ts:250-360`

**Step 1: Add failing spies proving schedule/unschedule must not call `findUnique`**
Append to `backend/tests/integration/tasks.test.ts`:
```ts
describe('Task scheduling relies on Prisma errors', () => {
  let taskId: string;

  beforeEach(async () => {
    const task = await prisma.task.create({
      data: {
        name: 'Spy task',
        status: 'NEXT',
        priority: 'MUST',
        category: 'ADMIN',
        context: 'COMPUTER',
        energyRequired: 'MEDIUM',
        duration: 30,
        definitionOfDone: 'Log once'
      }
    });
    taskId = task.id;
  });

  afterEach(async () => {
    await prisma.task.deleteMany({ where: { id: taskId } });
  });

  it('schedules task without extra findUnique calls', async () => {
    const findUniqueSpy = jest.spyOn(prisma.task, 'findUnique');

    const response = await request(app)
      .patch(`/api/tasks/${taskId}/schedule`)
      .send({ scheduledStart: new Date(Date.now() + 3600000).toISOString() });

    expect(response.status).toBe(200);
    expect(findUniqueSpy).not.toHaveBeenCalled();
    findUniqueSpy.mockRestore();
  });

  it('unschedules task without extra findUnique calls', async () => {
    await prisma.task.update({
      where: { id: taskId },
      data: { scheduledStart: new Date(Date.now() + 3600000) }
    });

    const findUniqueSpy = jest.spyOn(prisma.task, 'findUnique');

    const response = await request(app)
      .patch(`/api/tasks/${taskId}/unschedule`)
      .send();

    expect(response.status).toBe(200);
    expect(findUniqueSpy).not.toHaveBeenCalled();
    findUniqueSpy.mockRestore();
  });
});
```

**Step 2: Run the focused task tests (expect fail)**
```
cd backend && npm test -- --runTestsByPath tests/integration/tasks.test.ts
```
Expected: The new cases fail because the routes still call `prisma.task.findUnique` for logging.

**Step 3: Remove redundant queries from routes**
- Delete the `taskBefore` `findUnique` blocks in `PATCH /:id/schedule` and `PATCH /:id/unschedule`.
- Update logging to only reference the updated task:
```ts
const task = await prisma.task.update({ ... });
log('...', { previousScheduledStart: task.scheduledStart ?? null, newScheduledStart: task.scheduledStart });
```
- Ensure any references to `taskBefore` are removed so TypeScript compiles.

**Step 4: Re-run task integration tests**
```
cd backend && npm test -- --runTestsByPath tests/integration/tasks.test.ts
```
Expected: All suites pass and spies confirm no extra queries occur.

**Step 5: Commit**
```
git add backend/src/routes/tasks.ts backend/tests/integration/tasks.test.ts
git commit -m "fix(backend): trust prisma errors for scheduling"
```

---

### Task 3: Regression sweep

**Files:**
- N/A (verification-only)

**Step 1: Run the backend verification bundle**
```
cd backend && npm test
```
Expected: PASS, ensuring new tests integrate cleanly.

**Step 2: Surface remaining risks**
- Note in PR description that orient + task routes now rely on Prisma errors; highlight any follow-up work (e.g., optimistic updates on frontend).

**Step 3: Final commit (if Task 3 introduces doc updates)**
```
git status -sb
```
Confirm tree clean and ready for implementation handoff.
