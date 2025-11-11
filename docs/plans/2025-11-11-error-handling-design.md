# Centralized Error Handling Design

**Date:** 2025-11-11
**Status:** Approved

## Problem Statement

**Current State:**
- 32+ try-catch blocks across 7 backend route files with duplicated error handling
- P2025 (Prisma "not found") checks duplicated 8+ times
- Inconsistent error response formats
- Generic error messages in frontend toasts
- No centralized error logging

**Root Cause:** No error handling middleware - every route manually handles errors

## Solution: Express Async Error Middleware

### Architecture

**Backend Components:**

1. **Custom Error Classes** (`backend/src/errors/AppError.ts`)
   - Base `AppError` class with statusCode, code, message, details
   - `ValidationError` (400) - Zod validation failures
   - `NotFoundError` (404) - P2025 and missing resources
   - `BadRequestError` (400) - Client errors
   - `InternalError` (500) - Server errors

2. **Global Error Middleware** (`backend/src/middleware/errorHandler.ts`)
   - Catches all thrown errors
   - Handles Prisma P2025 automatically
   - Handles Zod validation errors
   - Formats consistent error responses
   - Logs unhandled errors

3. **Async Handler Wrapper** (`backend/src/middleware/asyncHandler.ts`)
   - Wraps async route handlers
   - Catches promise rejections
   - Passes errors to middleware

**Frontend Component:**

- Updated Axios interceptor in `frontend/src/lib/api.ts`
- Extracts `error` and `code` from response
- Attaches `userMessage` to error object
- Components use `error.userMessage` for toasts

### Error Response Format

**Standard Format:**
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

**Validation Errors:**
```json
{
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["name"],
      "message": "Required"
    }
  ]
}
```

### Route Refactoring Pattern

**Before:**
```typescript
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Task not found' });
    }
    console.error('[GET /tasks/:id] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**After:**
```typescript
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id } });

  if (!task) {
    throw new NotFoundError('Task');
  }

  res.json(task);
}));
```

### Benefits

1. **Eliminates Duplication:** All 32+ try-catch blocks removed
2. **Consistent Errors:** Single source of truth for error formatting
3. **Better UX:** Backend controls error messages, frontend displays them
4. **Automatic P2025 Handling:** No more duplicated checks
5. **Cleaner Routes:** Focus on business logic, not error handling
6. **Centralized Logging:** Unhandled errors logged in one place

### Implementation Time

**Estimated:** 3 hours
- Infrastructure setup: 30 min
- Proof of concept (tasks.ts): 30 min
- Remaining routes: 60 min
- Frontend update: 15 min
- Testing & verification: 45 min

## Design Decisions

### Q1: Error handling approach?
**Decision:** Express async error middleware (Option A)
**Rationale:** Most Express-idiomatic, eliminates all try-catch blocks, cleanest pattern

### Q2: Error class granularity?
**Decision:** Minimal set of 4 classes (Option A)
**Rationale:** Covers all current use cases, can add more later as needed

### Q3: Error response format?
**Decision:** Simple `{ error, code }` format (Option A)
**Rationale:** Clean, consistent, frontend-friendly, optional details for validation

### Q4: Frontend error handling?
**Decision:** Trust backend messages (Option A)
**Rationale:** Backend owns error text, frontend just displays, simplest approach

## Success Criteria

- ✅ Zero try-catch blocks in route files
- ✅ Zero P2025 checks in route files
- ✅ All errors return `{ error, code }` format
- ✅ Frontend toasts show meaningful messages
- ✅ Backend logs unhandled errors only
- ✅ TypeScript compilation passes
- ✅ All manual tests pass

## Future Enhancements

- Add more error classes as auth/authorization is added (UnauthorizedError, ForbiddenError)
- Add error monitoring service integration (Sentry, Rollbar)
- Add structured logging with request IDs for error tracing
- Add error rate alerting
