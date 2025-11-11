# Centralized Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 32+ duplicated try-catch blocks with centralized Express error middleware and eliminate 8+ duplicated P2025 checks.

**Architecture:** Create custom error classes (ValidationError, NotFoundError, BadRequestError, InternalError), global error middleware to catch and format errors, asyncHandler wrapper for routes, and updated frontend interceptor to handle new error format.

**Tech Stack:** Express.js, TypeScript, Zod validation, Axios interceptors

---

## Task 1: Create Custom Error Classes

**Files:**
- Create: `backend/src/errors/AppError.ts`

**Step 1: Create error class file**

Create `backend/src/errors/AppError.ts` with the following complete code:

```typescript
// Custom error classes for centralized error handling

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation error', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 3: Commit error classes**

```bash
git add backend/src/errors/AppError.ts
git commit -m "feat: add custom error classes for centralized error handling"
```

---

## Task 2: Create Error Handler Middleware

**Files:**
- Create: `backend/src/middleware/errorHandler.ts`

**Step 1: Create error handler middleware file**

Create `backend/src/middleware/errorHandler.ts` with the following complete code:

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Prisma P2025 error (record not found)
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found',
      code: 'NOT_FOUND'
    });
  }

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.issues
    });
  }

  // Handle custom AppError instances
  if (err instanceof AppError) {
    const response: any = {
      error: err.message,
      code: err.code
    };

    if (err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Log unhandled errors
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Fallback for unknown errors
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};
```

**Step 2: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 3: Commit error handler middleware**

```bash
git add backend/src/middleware/errorHandler.ts
git commit -m "feat: add global error handler middleware"
```

---

## Task 3: Create Async Handler Wrapper

**Files:**
- Create: `backend/src/middleware/asyncHandler.ts`

**Step 1: Create async handler wrapper file**

Create `backend/src/middleware/asyncHandler.ts` with the following complete code:

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Step 2: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 3: Commit async handler wrapper**

```bash
git add backend/src/middleware/asyncHandler.ts
git commit -m "feat: add async handler wrapper for route error handling"
```

---

## Task 4: Register Error Middleware in Express App

**Files:**
- Modify: `backend/src/index.ts` (add error middleware registration)

**Step 1: Import error handler at top of index.ts**

Add this import after the existing imports in `backend/src/index.ts`:

```typescript
import { errorHandler } from './middleware/errorHandler';
```

**Step 2: Register error middleware LAST**

Find the section where routes are registered (after all `app.use('/api/...')` lines) and add the error handler as the VERY LAST middleware:

```typescript
// Error handling middleware (MUST be last)
app.use(errorHandler);
```

The error handler must be registered after all routes to catch errors from route handlers.

**Step 3: Verify the order**

Ensure your `backend/src/index.ts` has this structure:
1. Imports
2. App initialization
3. CORS, JSON parser
4. Route registrations (`app.use('/api/tasks', ...)`)
5. Error handler (LAST)
6. Server start

**Step 4: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 5: Commit error middleware registration**

```bash
git add backend/src/index.ts
git commit -m "feat: register global error handler middleware"
```

---

## Task 5: Refactor tasks.ts Routes (Proof of Concept)

**Files:**
- Modify: `backend/src/routes/tasks.ts`

**Step 1: Add imports at top of tasks.ts**

Add these imports after existing imports:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```

**Step 2: Refactor GET /api/tasks route**

Find the `router.get('/', async (req: Request, res: Response) => {` handler and replace it with:

```typescript
// GET /api/tasks - List tasks with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, category, scheduledDate } = req.query;

  log('[GET /tasks] Query params:', { status, priority, category, scheduledDate });

  const where: any = {};

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.category = category;
  if (scheduledDate) {
    const date = new Date(scheduledDate as string);
    where.scheduledStart = {
      gte: startOfDay(date),
      lte: endOfDay(date),
    };
  }

  log('[GET /tasks] Query where clause:', JSON.stringify(where));

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { priority: 'asc' },
      { scheduledStart: 'asc' },
    ],
  });

  log('[GET /tasks] Found tasks:', tasks.length);
  res.json(tasks);
}));
```

Note: Removed try-catch block entirely. asyncHandler catches errors automatically.

**Step 3: Refactor GET /api/tasks/:id route**

Replace the entire `router.get('/:id', ...)` handler with:

```typescript
// GET /api/tasks/:id - Get single task
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: { postDoLog: true },
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  res.json(task);
}));
```

Note: Replaced `return res.status(404).json(...)` with `throw new NotFoundError('Task')`. Removed try-catch and P2025 check.

**Step 4: Refactor POST /api/tasks route**

Replace the entire `router.post('/', ...)` handler with:

```typescript
// POST /api/tasks - Create task
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createTaskSchema.parse(req.body);

  const task = await prisma.task.create({
    data: validatedData,
  });

  log('[POST /tasks] Created task:', task.id);
  res.status(201).json(task);
}));
```

Note: Removed try-catch around Zod validation. Error middleware catches ZodError automatically.

**Step 5: Refactor PUT /api/tasks/:id route**

Replace the entire `router.put('/:id', ...)` handler with:

```typescript
// PUT /api/tasks/:id - Update task
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateTaskSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data: validatedData,
  });

  log('[PUT /tasks/:id] Updated task:', task.id);
  res.json(task);
}));
```

Note: Prisma throws P2025 if task not found. Error middleware handles it automatically.

**Step 6: Refactor DELETE /api/tasks/:id route**

Replace the entire `router.delete('/:id', ...)` handler with:

```typescript
// DELETE /api/tasks/:id - Delete task
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.task.delete({
    where: { id },
  });

  log('[DELETE /tasks/:id] Deleted task:', id);
  res.status(204).send();
}));
```

**Step 7: Refactor POST /api/tasks/:id/activate route**

Replace the entire `router.post('/:id/activate', ...)` handler with:

```typescript
// POST /api/tasks/:id/activate - Activate task
router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      startedAt: getCurrentTimestamp(),
    },
  });

  log('[POST /tasks/:id/activate] Activated task:', task.id);
  res.json(task);
}));
```

**Step 8: Refactor POST /api/tasks/:id/complete route**

Replace the entire `router.post('/:id/complete', ...)` handler with:

```typescript
// POST /api/tasks/:id/complete - Complete task
router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = completeTaskSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'DONE',
      completedAt: getCurrentTimestamp(),
      postDoLog: {
        create: {
          outcome: validatedData.outcome,
          effortLevel: validatedData.effortLevel,
          keyInsight: validatedData.keyInsight,
          actualDuration: validatedData.actualDuration,
          startTime: new Date(validatedData.startTime),
          endTime: new Date(validatedData.endTime),
          timeryEntryId: validatedData.timeryEntryId,
        },
      },
    },
    include: { postDoLog: true },
  });

  log('[POST /tasks/:id/complete] Completed task:', task.id);
  res.json(task);
}));
```

**Step 9: Refactor PATCH /api/tasks/:id/schedule route**

Replace the entire `router.patch('/:id/schedule', ...)` handler with:

```typescript
// PATCH /api/tasks/:id/schedule - Schedule task
router.patch('/:id/schedule', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = scheduleTaskSchema.parse(req.body);

  const task = await prisma.task.update({
    where: { id },
    data: {
      scheduledStart: new Date(validatedData.scheduledStart),
    },
  });

  log('[PATCH /tasks/:id/schedule] Scheduled task:', task.id);
  res.json(task);
}));
```

**Step 10: Refactor POST /api/tasks/enrich route**

Replace the entire `router.post('/enrich', ...)` handler with:

```typescript
// POST /api/tasks/enrich - Enrich task from temp capture
router.post('/enrich', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = enrichTaskSchema.parse(req.body);

  const tempTask = await prisma.tempCapturedTask.findUnique({
    where: { id: validatedData.tempTaskId },
  });

  if (!tempTask) {
    throw new NotFoundError('Temporary task');
  }

  // Enrich the task with LLM
  const enrichedTask = await enrichTask({
    name: tempTask.name,
    priority: validatedData.priority,
    duration: validatedData.duration,
    energy: validatedData.energy,
  });

  // Create the enriched task
  const task = await prisma.task.create({
    data: {
      name: enrichedTask.name,
      priority: enrichedTask.priority,
      category: enrichedTask.category,
      context: enrichedTask.context,
      energyRequired: enrichedTask.energyRequired,
      duration: enrichedTask.duration,
      definitionOfDone: enrichedTask.definitionOfDone,
      status: 'NEXT',
    },
  });

  // Delete the temp task
  await prisma.tempCapturedTask.delete({
    where: { id: validatedData.tempTaskId },
  });

  log('[POST /tasks/enrich] Enriched and created task:', task.id);
  res.status(201).json(task);
}));
```

**Step 11: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 12: Test the refactored tasks routes**

Start the development server:
```bash
cd /Users/gberges/compass && npm run dev
```

Test each endpoint manually:
1. GET /api/tasks → expect 200 with task list
2. GET /api/tasks/invalid-id → expect 404 with `{"error": "Task not found", "code": "NOT_FOUND"}`
3. POST /api/tasks with invalid data → expect 400 with validation error details
4. POST /api/tasks with valid data → expect 201 with created task

**Step 13: Commit tasks.ts refactor**

```bash
git add backend/src/routes/tasks.ts
git commit -m "refactor: centralize error handling in tasks routes"
```

---

## Task 6: Refactor orient.ts Routes

**Files:**
- Modify: `backend/src/routes/orient.ts`

**Step 1: Add imports at top of orient.ts**

Add these imports after existing imports:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```

**Step 2: Wrap all route handlers with asyncHandler**

Find each route handler (there are 4 try-catch blocks according to grep) and:
1. Wrap the handler function with `asyncHandler()`
2. Remove the entire `try-catch` block
3. Replace `return res.status(404).json(...)` with `throw new NotFoundError('...')`
4. Remove manual P2025 checks
5. Remove Zod error handling (let middleware catch it)

Pattern to follow:
```typescript
// Before
router.get('/', async (req, res) => {
  try {
    // ... logic
  } catch (error) {
    // ... error handling
  }
});

// After
router.get('/', asyncHandler(async (req, res) => {
  // ... logic (no try-catch)
}));
```

**Step 3: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 4: Test orient routes**

Test GET /api/orient/today, POST /api/orient/east, PATCH /api/orient/west/:id

**Step 5: Commit orient.ts refactor**

```bash
git add backend/src/routes/orient.ts
git commit -m "refactor: centralize error handling in orient routes"
```

---

## Task 7: Refactor reviews.ts Routes

**Files:**
- Modify: `backend/src/routes/reviews.ts`

**Step 1: Add imports at top of reviews.ts**

Add these imports after existing imports:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```

**Step 2: Wrap all route handlers with asyncHandler**

Find each route handler (4 try-catch blocks) and apply the same refactoring pattern as orient.ts:
1. Wrap with `asyncHandler()`
2. Remove try-catch blocks
3. Replace status responses with thrown errors
4. Remove manual error handling

**Step 3: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 4: Test review routes**

Test GET /api/reviews, POST /api/reviews/daily, POST /api/reviews/weekly

**Step 5: Commit reviews.ts refactor**

```bash
git add backend/src/routes/reviews.ts
git commit -m "refactor: centralize error handling in reviews routes"
```

---

## Task 8: Refactor todoist.ts Routes

**Files:**
- Modify: `backend/src/routes/todoist.ts`

**Step 1: Add imports at top of todoist.ts**

Add these imports after existing imports:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```

**Step 2: Wrap all route handlers with asyncHandler**

Find each route handler (3 try-catch blocks) and apply the same refactoring pattern.

**Step 3: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 4: Test todoist routes**

Test GET /api/todoist/pending, POST /api/todoist/import

**Step 5: Commit todoist.ts refactor**

```bash
git add backend/src/routes/todoist.ts
git commit -m "refactor: centralize error handling in todoist routes"
```

---

## Task 9: Refactor postdo.ts Routes

**Files:**
- Modify: `backend/src/routes/postdo.ts`

**Step 1: Add imports at top of postdo.ts**

Add these imports after existing imports:

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../errors/AppError';
```

**Step 2: Wrap all route handlers with asyncHandler**

Find each route handler (2 try-catch blocks) and apply the same refactoring pattern.

**Step 3: Verify TypeScript compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No compilation errors

**Step 4: Test postdo routes**

Test the postdo endpoints

**Step 5: Commit postdo.ts refactor**

```bash
git add backend/src/routes/postdo.ts
git commit -m "refactor: centralize error handling in postdo routes"
```

---

## Task 10: Refactor timery.ts Service

**Files:**
- Modify: `backend/src/services/timery.ts`

**Step 1: Review timery.ts error handling**

Check if timery.ts has try-catch blocks that need refactoring. Services typically handle their own errors gracefully and return defaults, so this may not need changes.

If there are try-catch blocks that should throw errors instead of returning defaults, refactor them to throw AppError instances.

**Step 2: Commit if changes made**

```bash
git add backend/src/services/timery.ts
git commit -m "refactor: improve error handling in timery service"
```

---

## Task 11: Refactor llm.ts Service

**Files:**
- Modify: `backend/src/services/llm.ts`

**Step 1: Review llm.ts error handling**

Check if llm.ts has try-catch blocks (2 blocks found). LLM service should fail gracefully with fallback responses, so keep try-catch blocks but ensure consistent error logging.

**Step 2: No changes needed**

LLM service error handling is appropriate as-is (graceful degradation).

---

## Task 12: Update Frontend Error Interceptor

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Step 1: Locate the response interceptor**

Find the `api.interceptors.response.use()` section in `frontend/src/lib/api.ts`.

**Step 2: Update the error interceptor**

Replace the error handling function in the interceptor with:

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from new backend format
    const errorMessage = error.response?.data?.error || 'An error occurred. Please try again.';
    const errorCode = error.response?.data?.code;
    const errorDetails = error.response?.data?.details;

    // Attach user-friendly message to error object
    error.userMessage = errorMessage;
    error.errorCode = errorCode;

    // Log for debugging in development
    if (DEBUG) {
      console.error('API Error:', {
        status: error.response?.status,
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        url: error.config?.url
      });
    }

    return Promise.reject(error);
  }
);
```

**Step 3: Remove getUserFriendlyError function**

If there's a `getUserFriendlyError` function that's no longer used, remove it. The interceptor now handles error message extraction directly.

**Step 4: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No compilation errors

**Step 5: Test frontend error handling**

1. Start the app: `npm run dev`
2. Trigger validation error (submit invalid form) → verify toast shows meaningful message
3. Trigger 404 error (request non-existent resource) → verify toast shows "not found" message
4. Open browser dev tools and verify error logging in development

**Step 6: Commit frontend interceptor update**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update frontend interceptor for new error format"
```

---

## Task 13: End-to-End Testing

**Files:**
- No file changes, just testing

**Step 1: Test validation errors**

1. POST /api/tasks with empty name → expect 400 with validation details
2. POST /api/tasks with invalid priority → expect 400 with validation details
3. Verify frontend toast shows "Validation error" message

**Step 2: Test not found errors**

1. GET /api/tasks/non-existent-id → expect 404 with "Task not found"
2. PUT /api/tasks/non-existent-id → expect 404 (Prisma P2025 caught)
3. DELETE /api/tasks/non-existent-id → expect 404
4. Verify frontend toast shows "not found" message

**Step 3: Test each route file**

Go through each refactored route file and test:
- `routes/tasks.ts` - All CRUD operations, enrich, activate, complete, schedule
- `routes/orient.ts` - Get today, create east plan, update west reflection
- `routes/reviews.ts` - Get reviews, create daily, create weekly
- `routes/todoist.ts` - Get pending, import tasks
- `routes/postdo.ts` - PostDo log operations

**Step 4: Verify error format consistency**

All error responses should have this format:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

With optional `details` field for validation errors:
```json
{
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [...]
}
```

**Step 5: Check backend logs**

Verify that:
- Normal errors (404, 400) are NOT logged
- Unhandled errors (500) ARE logged with full stack traces
- No more scattered `console.error()` calls in route files

**Step 6: Document test results**

Create a test results summary noting any issues found.

---

## Task 14: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md` (Error Handling section)

**Step 1: Update the Error Handling section**

Find the "Error Handling" section in `CLAUDE.md` and replace it with:

```markdown
#### Error Handling

**Architecture:**
- Custom error classes in `src/errors/AppError.ts` (ValidationError, NotFoundError, BadRequestError, InternalError)
- Global error middleware in `src/middleware/errorHandler.ts` catches all errors
- Async handler wrapper in `src/middleware/asyncHandler.ts` catches async route errors
- All routes wrapped with `asyncHandler()` - no try-catch blocks needed

**Error response format:**
```typescript
// Standard errors
{ error: 'Human-readable message', code: 'ERROR_CODE' }

// Validation errors include details
{ error: 'Validation error', code: 'VALIDATION_ERROR', details: [...] }
```

**When adding new endpoints:**
1. Wrap handler with `asyncHandler(async (req, res) => { ... })`
2. Use `schema.parse()` for validation - ZodError automatically caught
3. Throw error classes instead of returning status codes:
   - `throw new NotFoundError('Resource')` for 404
   - `throw new BadRequestError('message')` for 400
   - `throw new ValidationError('message', details)` for validation
4. DO NOT add try-catch blocks (let middleware handle errors)
5. Prisma P2025 errors automatically converted to 404

**Handled automatically by middleware:**
- Zod validation errors → 400 with details
- Prisma P2025 (not found) → 404
- Custom AppError instances → appropriate status code
- Unhandled errors → 500 (logged with stack trace)
```

**Step 2: Add note about error classes import**

In the "When adding new endpoints" section, add:

```markdown
**Required imports for new routes:**
```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, BadRequestError } from '../errors/AppError';
```
```

**Step 3: Commit documentation update**

```bash
git add CLAUDE.md
git commit -m "docs: update error handling documentation"
```

---

## Task 15: Final Verification and Cleanup

**Files:**
- Review all modified files

**Step 1: Verify no try-catch blocks remain in routes**

Run: `cd backend && grep -r "try {" src/routes/`
Expected: No results (all try-catch blocks removed from route files)

**Step 2: Verify no P2025 checks remain in routes**

Run: `cd backend && grep -r "P2025" src/routes/`
Expected: No results (all P2025 checks removed, middleware handles them)

**Step 3: Verify all routes use asyncHandler**

Check that each route file imports and uses `asyncHandler` wrapper for all async route handlers.

**Step 4: Run TypeScript compilation**

Run: `cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`
Expected: No compilation errors in backend or frontend

**Step 5: Run the full application**

Run: `npm run dev` from root directory
Expected: Both frontend and backend start successfully with no errors

**Step 6: Create final commit if needed**

If any cleanup was performed, commit it:
```bash
git add .
git commit -m "chore: final cleanup for error handling refactor"
```

---

## Success Criteria

✅ Zero try-catch blocks in route files (verified by grep)
✅ Zero P2025 checks in route files (verified by grep)
✅ All route handlers wrapped with asyncHandler
✅ Consistent error response format: `{ error, code, details? }`
✅ Frontend toasts show backend error messages
✅ TypeScript compilation passes
✅ All manual tests pass
✅ Unhandled errors logged with stack traces
✅ Documentation updated in CLAUDE.md

---

## Rollback Plan

If issues arise during implementation:

1. **Rollback entire branch:**
   ```bash
   git reset --hard main
   ```

2. **Rollback specific commit:**
   ```bash
   git revert <commit-hash>
   ```

3. **Test with curl if frontend issues:**
   ```bash
   curl -X GET http://localhost:3001/api/tasks
   curl -X GET http://localhost:3001/api/tasks/invalid-id
   ```

---

## Estimated Time: 3 hours

- Task 1-4: Infrastructure setup (30 min)
- Task 5: tasks.ts refactor (30 min)
- Task 6-11: Remaining routes (60 min)
- Task 12: Frontend update (15 min)
- Task 13-15: Testing & verification (45 min)
