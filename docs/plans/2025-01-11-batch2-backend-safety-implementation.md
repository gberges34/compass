# Batch 2: Backend Safety Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve backend safety through environment validation, type safety, and database transactions.

**Architecture:** Add zod validation for environment variables at startup, replace `any` types with proper TypeScript types in route handlers, audit database operations and wrap critical multi-step operations in Prisma transactions for atomicity.

**Tech Stack:** TypeScript, Express, Prisma, Zod (already in project), Jest

---

## PHASE 1: Environment Validation (1 hour)

### Task 1: Create Environment Configuration Module

**Files:**
- Create: `backend/src/config/env.ts`
- Modify: `backend/src/index.ts` (top of file, before other imports)
- Create: `backend/.env.example`

**Step 1: Create env.ts with zod schema**

```typescript
// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required variables
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  // Optional with defaults
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Optional (for features)
  TOGGL_API_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables.
 * Server will fail on startup if any required variables are missing or invalid.
 */
export const env = envSchema.parse(process.env);
```

**Step 2: Update index.ts to use validated env**

Modify `backend/src/index.ts`:

```typescript
// MUST be first import - validates environment before anything else
import { env } from './config/env';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// ... rest of imports

dotenv.config();

const app = express();
const PORT = env.PORT; // Use env instead of process.env

// Middleware
app.use(cors({
  origin: env.FRONTEND_URL, // Use env instead of process.env
  credentials: true
}));
// ... rest of file
```

**Step 3: Create .env.example**

```bash
# backend/.env.example
# Copy this file to .env and fill in your values

# Database - PostgreSQL connection URL (REQUIRED)
DATABASE_URL="postgresql://user:password@host:port/database"

# API Keys (REQUIRED)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Optional - Timery/Toggl integration
TOGGL_API_TOKEN="your-api-token-here"

# Server Configuration (optional, has defaults)
PORT=3001
NODE_ENV="development"

# CORS Configuration (optional, has default)
FRONTEND_URL="http://localhost:3000"
```

**Step 4: Test with missing variable**

```bash
cd backend

# Temporarily rename .env to test validation
mv .env .env.backup

# Try to start server - should fail immediately
npm run dev
```

**Expected output:** Server fails with clear zod validation error showing which env vars are missing.

**Step 5: Test with invalid variable**

```bash
# Restore .env
mv .env.backup .env

# Temporarily set invalid DATABASE_URL in .env
# Change DATABASE_URL to "not-a-url"

# Try to start server
npm run dev
```

**Expected output:** Server fails with zod error: "DATABASE_URL must be a valid PostgreSQL connection URL"

**Step 6: Restore and verify**

```bash
# Restore correct .env values
# Start server - should succeed
npm run dev
```

**Expected output:** Server starts successfully on port 3001.

**Step 7: Commit**

```bash
git add backend/src/config/env.ts backend/src/index.ts backend/.env.example
git commit -m "feat: add zod-based environment validation

- Create env.ts with zod schema for all environment variables
- Fail fast on startup if required vars missing
- Type-safe environment access throughout app
- Add .env.example documentation"
```

---

### Task 2: Replace process.env with validated env

**Files:**
- Modify: `backend/src/routes/orient.ts`
- Modify: `backend/src/routes/postdo.ts`
- Modify: `backend/src/routes/reviews.ts`
- Modify: `backend/src/routes/tasks.ts`
- Modify: `backend/src/routes/todoist.ts`
- Modify: `backend/src/services/llm.ts`
- Modify: `backend/src/services/timery.ts`

**Step 1: Update llm.ts**

```typescript
// backend/src/services/llm.ts
import { env } from '../config/env'; // Add this import at top

// Find line with: apiKey: process.env.ANTHROPIC_API_KEY
// Replace with: apiKey: env.ANTHROPIC_API_KEY
```

**Step 2: Update timery.ts (if it uses env vars)**

Check file for any `process.env` references and replace with `env` import.

**Step 3: Verify no process.env references remain**

```bash
cd backend
grep -r "process\.env" src/ --exclude-dir=node_modules
```

**Expected output:** Only matches in `src/config/env.ts` (which is expected).

**Step 4: Run TypeScript compilation**

```bash
cd backend
npm run build
```

**Expected output:** Build succeeds with no errors. TypeScript now knows `env.PORT` is a number, not `string | undefined`.

**Step 5: Commit**

```bash
git add backend/src/services/llm.ts backend/src/services/timery.ts
git commit -m "refactor: use validated env instead of process.env

- Replace process.env references with type-safe env import
- Improves type safety throughout application"
```

---

## PHASE 2: Type Safety - Remove `any` Types (1.5 hours)

### Task 3: Fix `any` types in tasks.ts

**Files:**
- Modify: `backend/src/routes/tasks.ts` (lines with `: any`)

**Step 1: Find all `any` types**

```bash
cd backend
grep -n ": any" src/routes/tasks.ts
```

**Expected output:** Shows line numbers with `any` types (likely in where clause building).

**Step 2: Replace route handler `any` types**

Find lines like:
```typescript
router.get('/', asyncHandler(async (req: Request, res: Response) => {
```

Verify they already use proper types. If you find:
```typescript
async (req: any, res: any) => {
```

Replace with:
```typescript
import { Request, Response } from 'express';
async (req: Request, res: Response) => {
```

**Step 3: Replace Prisma where clause `any`**

Find lines like:
```typescript
const where: any = {};
```

Replace with:
```typescript
import { Prisma } from '@prisma/client';
const where: Prisma.TaskWhereInput = {};
```

**Step 4: Run TypeScript compilation**

```bash
cd backend
npm run build
```

**Expected output:** Build succeeds. TypeScript catches any type errors.

**Step 5: Commit**

```bash
git add backend/src/routes/tasks.ts
git commit -m "refactor: replace any types with proper types in tasks.ts

- Use Prisma.TaskWhereInput for dynamic where clauses
- Ensures type safety for task filtering"
```

---

### Task 4: Fix `any` types in reviews.ts

**Files:**
- Modify: `backend/src/routes/reviews.ts`

**Step 1: Find `any` types**

```bash
grep -n ": any" backend/src/routes/reviews.ts
```

**Step 2: Replace where clause `any`**

```typescript
// Find
const where: any = {};

// Replace with
import { Prisma } from '@prisma/client';
const where: Prisma.ReviewWhereInput = {};
```

**Step 3: Run TypeScript compilation**

```bash
cd backend
npm run build
```

**Expected output:** Build succeeds.

**Step 4: Commit**

```bash
git add backend/src/routes/reviews.ts
git commit -m "refactor: replace any types in reviews.ts

- Use Prisma.ReviewWhereInput for type safety"
```

---

### Task 5: Fix `any` types in postdo.ts

**Files:**
- Modify: `backend/src/routes/postdo.ts`

**Step 1: Find `any` types**

```bash
grep -n ": any" backend/src/routes/postdo.ts
```

**Step 2: Replace with proper types**

Follow same pattern as previous tasks. Use `Prisma.PostDoLogWhereInput` if needed.

**Step 3: Run TypeScript compilation**

```bash
cd backend
npm run build
```

**Expected output:** Build succeeds.

**Step 4: Commit**

```bash
git add backend/src/routes/postdo.ts
git commit -m "refactor: replace any types in postdo.ts

- Use proper Prisma types for type safety"
```

---

### Task 6: Verify zero `any` types in routes

**Step 1: Search for remaining `any` types**

```bash
cd backend
grep -r ": any" src/routes/ --exclude-dir=__tests__
```

**Expected output:** No matches (all `any` types removed from route handlers).

**Step 2: Run full test suite**

```bash
cd backend
npm test
```

**Expected output:** All tests pass.

**Step 3: Document completion**

Update `docs/plans/2025-01-11-batch2-backend-safety-design.md`:

Add under "Implementation Notes":
```markdown
## Type Safety Completion

**Date**: 2025-01-11
**Status**: Complete

All `any` types removed from route handlers:
- tasks.ts: Replaced with Prisma.TaskWhereInput
- reviews.ts: Replaced with Prisma.ReviewWhereInput
- postdo.ts: Replaced with proper Prisma types

Verification: `grep -r ": any" src/routes/` returns no matches.
Build: ✅ Succeeds with no errors
Tests: ✅ All passing
```

---

## PHASE 3: Transaction Audit (2 hours)

### Task 7: Audit tasks.ts for transaction needs

**Files:**
- Create: `backend/docs/transaction-audit.md`

**Step 1: Review all database operations in tasks.ts**

Read through `backend/src/routes/tasks.ts` and identify operations that:
- Modify multiple records
- Have dependent operations (create X, then create Y)
- Would leave inconsistent state if partially failed

**Step 2: Document findings**

Create `backend/docs/transaction-audit.md`:

```markdown
# Transaction Audit Results

## tasks.ts

### POST /api/tasks/:id/complete
**Priority:** HIGH
**Reason:** Updates task status + creates PostDoLog. Must be atomic.
**Current code:** Lines 200-220 (approximate)
**Operations:**
1. Update task: `prisma.task.update({ where: { id }, data: { status: 'DONE' } })`
2. Create PostDoLog: `prisma.postDoLog.create({ data: { taskId: id, ... } })`
**Risk:** If step 2 fails, task is marked done but no log exists.
**Recommendation:** Wrap in transaction.

### POST /api/tasks/:id/schedule
**Priority:** MEDIUM
**Reason:** Updates task with schedule
**Current code:** Single operation
**Operations:** `prisma.task.update({ ... })`
**Risk:** Low - single operation is already atomic
**Recommendation:** No transaction needed.

[Continue for all endpoints...]
```

**Step 3: Review remaining route files**

Repeat analysis for:
- `orient.ts` - Planning operations
- `todoist.ts` - Task enrichment
- `postdo.ts` - Analytics
- `reviews.ts` - Review generation

Document each in the audit file.

**Step 4: Prioritize operations**

Add priority summary to audit:

```markdown
## Priority Summary

### HIGH (implement first)
1. Task completion (tasks.ts POST /:id/complete)
2. Task enrichment (todoist.ts enrichment endpoint)
3. [Other high-priority ops]

### MEDIUM (implement if time)
1. Orient planning (orient.ts POST /orient-east)
2. [Other medium-priority ops]

### LOW (document as future work)
1. Single-record operations (already atomic)
2. Read-only operations
```

**Step 5: Commit audit**

```bash
git add backend/docs/transaction-audit.md
git commit -m "docs: complete transaction audit for all routes

- Identified 3 high-priority operations needing transactions
- Documented current code and risk assessment
- Prioritized implementation order"
```

---

## PHASE 4: Transaction Implementation (2 hours)

### Task 8: Implement transaction for task completion

**Files:**
- Modify: `backend/src/routes/tasks.ts` (complete task endpoint)
- Create: `backend/src/__tests__/integration/transactions.test.ts`

**Step 1: Write failing integration test**

```typescript
// backend/src/__tests__/integration/transactions.test.ts
import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../prisma';

describe('Task Completion Transaction', () => {
  let testTaskId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.postDoLog.deleteMany();
    await prisma.task.deleteMany();

    // Create test task
    const task = await prisma.task.create({
      data: {
        name: 'Test Task',
        status: 'NEXT',
        priority: 'MUST',
        category: 'PERSONAL',
        context: 'ANYWHERE',
        energyRequired: 'MEDIUM',
        duration: 30,
        definitionOfDone: 'Test complete',
      },
    });
    testTaskId = task.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should rollback task update if PostDoLog creation fails', async () => {
    // Attempt to complete with invalid PostDoLog data (empty outcome)
    const response = await request(app)
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        outcome: '', // Invalid - will fail validation
        effortLevel: 'MEDIUM',
        keyInsight: 'Test',
        actualDuration: 30,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });

    // Should return 400 validation error
    expect(response.status).toBe(400);

    // Task status should NOT be changed (rollback)
    const task = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(task?.status).toBe('NEXT'); // Still NEXT, not DONE

    // PostDoLog should NOT be created
    const postDo = await prisma.postDoLog.findFirst({
      where: { taskId: testTaskId },
    });
    expect(postDo).toBeNull();
  });

  it('should commit both operations on success', async () => {
    const response = await request(app)
      .post(`/api/tasks/${testTaskId}/complete`)
      .send({
        outcome: 'Completed successfully',
        effortLevel: 'MEDIUM',
        keyInsight: 'Learned something',
        actualDuration: 30,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      });

    expect(response.status).toBe(200);

    // Task should be marked done
    const task = await prisma.task.findUnique({ where: { id: testTaskId } });
    expect(task?.status).toBe('DONE');

    // PostDoLog should be created
    const postDo = await prisma.postDoLog.findFirst({
      where: { taskId: testTaskId },
    });
    expect(postDo).not.toBeNull();
    expect(postDo?.outcome).toBe('Completed successfully');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- transactions.test.ts
```

**Expected output:** Test FAILS - transaction not implemented yet, operations might partially succeed/fail.

**Step 3: Implement transaction in tasks.ts**

Find the complete task endpoint (likely around line 200-220):

```typescript
// Before (no transaction)
router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = completeTaskSchema.parse(req.body);

  // Update task
  const task = await prisma.task.update({
    where: { id },
    data: { status: 'DONE' },
  });

  // Create PostDoLog
  await prisma.postDoLog.create({
    data: {
      taskId: id,
      outcome: validatedData.outcome,
      effortLevel: validatedData.effortLevel,
      keyInsight: validatedData.keyInsight,
      actualDuration: validatedData.actualDuration,
      startTime: validatedData.startTime,
      endTime: validatedData.endTime,
      timeryEntryId: validatedData.timeryEntryId,
    },
  });

  res.json(task);
}));
```

```typescript
// After (with transaction)
router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = completeTaskSchema.parse(req.body);

  // Wrap both operations in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update task status
    const task = await tx.task.update({
      where: { id },
      data: { status: 'DONE' },
    });

    // Create PostDoLog
    await tx.postDoLog.create({
      data: {
        taskId: id,
        outcome: validatedData.outcome,
        effortLevel: validatedData.effortLevel,
        keyInsight: validatedData.keyInsight,
        actualDuration: validatedData.actualDuration,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        timeryEntryId: validatedData.timeryEntryId,
      },
    });

    return task;
  });

  res.json(result);
}));
```

**Step 4: Run tests to verify they pass**

```bash
cd backend
npm test -- transactions.test.ts
```

**Expected output:** Both tests PASS. Transaction ensures atomicity.

**Step 5: Commit**

```bash
git add backend/src/routes/tasks.ts backend/src/__tests__/integration/transactions.test.ts
git commit -m "feat: add transaction for task completion

- Wrap task update + PostDoLog creation in transaction
- Ensures atomic operation (both succeed or both fail)
- Add integration tests to verify rollback behavior

Fixes: REQ-BE-003 (partial)"
```

---

### Task 9: Implement transaction for task enrichment

**Files:**
- Modify: `backend/src/routes/todoist.ts` (enrichment endpoint)
- Modify: `backend/src/__tests__/integration/transactions.test.ts`

**Step 1: Write failing test**

Add to `transactions.test.ts`:

```typescript
describe('Task Enrichment Transaction', () => {
  it('should rollback task creation if enrichment fails', async () => {
    // Test implementation similar to task completion
    // Mock LLM service to fail after task creation
    // Verify task is not created (rolled back)
  });

  it('should commit both task creation and enrichment', async () => {
    // Test successful enrichment flow
  });
});
```

**Step 2: Run test to see it fail**

```bash
npm test -- transactions.test.ts
```

**Step 3: Implement transaction**

Find enrichment endpoint in `todoist.ts` and wrap in `prisma.$transaction()`.

**Step 4: Run test to verify it passes**

```bash
npm test -- transactions.test.ts
```

**Step 5: Commit**

```bash
git add backend/src/routes/todoist.ts backend/src/__tests__/integration/transactions.test.ts
git commit -m "feat: add transaction for task enrichment

- Wrap task creation + enrichment in transaction
- Ensures atomic operation
- Add integration tests"
```

---

### Task 10: Implement transaction for Orient planning

**Files:**
- Modify: `backend/src/routes/orient.ts`
- Modify: `backend/src/__tests__/integration/transactions.test.ts`

**Step 1: Write failing test**

```typescript
describe('Orient Planning Transaction', () => {
  it('should rollback DailyPlan if task scheduling fails', async () => {
    // Test plan creation + task scheduling as atomic operation
  });

  it('should commit both plan and scheduled tasks', async () => {
    // Test successful flow
  });
});
```

**Step 2: Run test to see it fail**

```bash
npm test -- transactions.test.ts
```

**Step 3: Implement transaction**

Wrap DailyPlan creation + task scheduling in transaction.

**Step 4: Run test to verify it passes**

```bash
npm test -- transactions.test.ts
```

**Step 5: Commit**

```bash
git add backend/src/routes/orient.ts backend/src/__tests__/integration/transactions.test.ts
git commit -m "feat: add transaction for Orient planning

- Wrap DailyPlan creation + task scheduling in transaction
- Ensures planning atomicity
- Add integration tests

Completes: REQ-BE-003"
```

---

### Task 11: Final verification and documentation

**Step 1: Run full test suite**

```bash
cd backend
npm test
```

**Expected output:** All tests pass, including new transaction tests.

**Step 2: Run TypeScript compilation**

```bash
npm run build
```

**Expected output:** Build succeeds with no errors.

**Step 3: Start server and verify**

```bash
npm run dev
```

**Expected output:** Server starts successfully, validates environment on startup.

**Step 4: Update design doc with results**

Update `docs/plans/2025-01-11-batch2-backend-safety-design.md`:

```markdown
## Implementation Notes

**Completed**: 2025-01-11
**Actual Time**: [Fill in actual time]

### Environment Validation
✅ Complete - All env vars validated with zod at startup
✅ Type-safe environment access throughout app
✅ Fails fast with clear errors on misconfiguration

### Type Safety
✅ Complete - Zero `any` types in route handlers
✅ All Prisma queries use proper types
✅ TypeScript compilation successful

### Transactions
✅ Complete - Implemented for 3 critical operations:
1. Task completion (tasks.ts)
2. Task enrichment (todoist.ts)
3. Orient planning (orient.ts)

✅ Integration tests verify rollback behavior
✅ All tests passing

### Requirements Status
- ✅ REQ-DB-002: PostDoLog unique constraint
- ✅ REQ-BE-003: Database transactions
- ✅ REQ-BE-006: Environment validation
- ✅ REQ-BE-001: Type safety (no any types)
```

**Step 5: Final commit**

```bash
git add docs/plans/2025-01-11-batch2-backend-safety-design.md
git commit -m "docs: mark Batch 2 backend safety as complete

All requirements satisfied:
- Environment validation with zod
- Type safety (zero any types)
- Transactions for critical operations
- Integration tests for transaction behavior"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] Server fails on missing DATABASE_URL
- [ ] Server fails on invalid DATABASE_URL format
- [ ] Server starts successfully with valid .env
- [ ] `grep -r ": any" backend/src/routes/` returns no matches
- [ ] `npm run build` succeeds with no errors
- [ ] `npm test` passes all tests (including new transaction tests)
- [ ] Integration tests verify transaction rollback
- [ ] All route files use `env` instead of `process.env`
- [ ] Transaction audit document exists
- [ ] Design document updated with results

## Time Tracking

**Estimated:** 6.5 hours
- Phase 1 (Env validation): 1 hour
- Phase 2 (Type safety): 1.5 hours
- Phase 3 (Transaction audit): 2 hours
- Phase 4 (Transaction implementation): 2 hours

**Actual:** [Fill in during execution]

---

## Notes for Engineer

**Testing transactions:**
- Transactions automatically roll back on ANY error
- Test both success and failure cases
- Use integration tests with real database (not unit tests)
- Check database state after failed operations

**Environment validation:**
- Server MUST fail immediately if env is invalid
- Don't catch validation errors - let them bubble up
- Use descriptive error messages in zod schema

**Type safety:**
- Use Prisma-generated types (`Prisma.TaskWhereInput`, etc.)
- Avoid `as any` casts - fix the types properly
- TypeScript is your friend - listen to compilation errors

**Commits:**
- Commit after each task (small, focused commits)
- Include test changes with implementation
- Use conventional commit format (feat:, refactor:, docs:)
