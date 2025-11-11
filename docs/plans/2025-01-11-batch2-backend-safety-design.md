# Batch 2: Database & Backend Safety - Design

**Date**: 2025-01-11
**Status**: Approved
**Estimated Time**: 6.5 hours

## Overview

Improve backend safety through transaction management, environment validation, and type safety across route handlers.

### Current Status
- ✅ REQ-DB-002: PostDoLog unique constraint (completed)
- ❌ REQ-BE-003: No transactions (1 file has transaction reference)
- ❌ REQ-BE-006: No env validation (dotenv called, no validation)
- ❌ REQ-BE-001: `any` types remain (3+ occurrences in routes)

### Goals
1. Audit and implement database transactions for critical operations
2. Add zod-based environment variable validation with fail-fast startup
3. Replace all `any` types in route handlers with proper TypeScript types

## Scope

**In Scope**:
- Transaction audit across all database operations
- Transaction implementation for top 3-4 critical operations
- Environment validation with zod schema
- Type safety improvements in all route handlers
- Documentation of findings and changes

**Out of Scope**:
- Database schema refactoring
- Performance optimization (unless transactions impact it)
- New feature development
- Comprehensive integration test suite (focus on transaction tests)

## Implementation Plan

### 1. Environment Validation with Zod (1 hour)

**Goal**: Fail-fast on startup if environment is misconfigured.

**Implementation**:

Create `backend/src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Required variables
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),

  // Optional with defaults
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Optional (for features)
  TOGGL_API_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Parse and export validated environment
export const env = envSchema.parse(process.env);
```

**Integration Steps**:
1. Create `src/config/env.ts` with schema
2. Update `src/index.ts` to import `env` before any other code
3. Replace all `process.env.X` references with `env.X` throughout codebase
4. Update `.env.example` to document all variables

**Files to Update**:
- `src/index.ts` - Import and use validated env
- `src/routes/*.ts` - Replace process.env with env import
- `src/services/*.ts` - Replace process.env with env import
- `.env.example` - Document all variables with examples

**Benefits**:
- Server fails immediately on startup if config is invalid
- Type-safe environment access (`env.PORT` is `number`, not `string | undefined`)
- Clear error messages from zod validation
- Single source of truth for required vs optional variables

**Testing**:
- Test with missing required var (DATABASE_URL) - should fail
- Test with invalid value - should fail with clear message
- Test with all valid vars - should succeed

### 2. Type Safety - Remove `any` Types (1.5 hours)

**Goal**: Replace all `any` types in route handlers with proper TypeScript types.

**Current Issues**:
Found `any` types in:
- `routes/tasks.ts` - Dynamic where clause building
- `routes/reviews.ts` - Similar filtering logic
- `routes/postdo.ts` - Request/response handling
- `middleware/errorHandler.ts` - Error handling (if needed)
- `utils/retry.ts` - Partially fixed already

**Replacement Patterns**:

**Pattern 1: Route handlers**
```typescript
// Before
router.get('/', async (req: any, res: any) => { ... })

// After
import { Request, Response } from 'express';
router.get('/', asyncHandler(async (req: Request, res: Response) => { ... }))
```

**Pattern 2: Dynamic Prisma queries**
```typescript
// Before
const where: any = {};
if (status) where.status = status;

// After
import { Prisma } from '@prisma/client';
const where: Prisma.TaskWhereInput = {};
if (status) where.status = status as TaskStatus;
```

**Pattern 3: Error handling**
```typescript
// Before
catch (error: any) {
  console.error(error.message);
}

// After
catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

**Files to Fix**:
- `routes/tasks.ts` - Use `Prisma.TaskWhereInput` for where clauses
- `routes/reviews.ts` - Use `Prisma.ReviewWhereInput`
- `routes/postdo.ts` - Use proper Request/Response types
- Any other files found during audit

**Verification**:
- Run `npm run build` - TypeScript compilation must succeed
- No `any` types should remain (can verify with: `grep -r ": any" src/routes`)

### 3. Transaction Audit (2 hours)

**Goal**: Identify all operations that need atomic transactions.

**Audit Criteria**:
- Multi-step operations that must succeed or fail together
- Operations creating/updating multiple related records
- Operations where partial failure leaves inconsistent state

**Audit Process**:

1. **Review each route file** systematically:
   - `routes/tasks.ts` - Task CRUD, scheduling, completion
   - `routes/todoist.ts` - Task enrichment from Todoist
   - `routes/orient.ts` - Daily planning operations
   - `routes/reviews.ts` - Review generation
   - `routes/postdo.ts` - Post-task analytics

2. **Document findings** in this format:
   ```
   Operation: [Name]
   File: [Path]
   Priority: [High/Medium/Low]
   Reason: [Why transaction needed]
   Steps: [List of database operations]
   ```

3. **Prioritize** based on:
   - Frequency of use (high = implement first)
   - Data integrity impact (high = implement first)
   - Complexity (low = implement first if tied)

**Expected Findings** (to be verified):

**High Priority**:
1. **Task completion with PostDo** (`routes/tasks.ts`)
   - Updates task status to DONE
   - Creates PostDoLog entry
   - Most frequent operation, high data integrity need

2. **Task enrichment from Todoist** (`routes/todoist.ts`)
   - Creates task record
   - Enriches with LLM data
   - Critical for data consistency

3. **Orient operations** (`routes/orient.ts`)
   - Creates/updates DailyPlan
   - Schedules multiple tasks
   - Planning integrity is important

**Medium Priority**:
4. **Bulk task updates** (if any exist)
5. **Review generation** (if it creates multiple records)

**Low Priority**:
6. Single-record operations (already atomic)

**Deliverable**:
- Document in this file under "Transaction Audit Results" section
- Prioritized list of operations to implement

### 4. Transaction Implementation (2 hours)

**Goal**: Implement transactions for top 3-4 critical operations.

**Prisma Transaction Patterns**:

**Pattern 1: Interactive Transaction** (preferred for complex logic)
```typescript
await prisma.$transaction(async (tx) => {
  const task = await tx.task.update({
    where: { id },
    data: { status: 'DONE' }
  });

  await tx.postDoLog.create({
    data: {
      taskId: id,
      outcome: data.outcome,
      // ... more fields
    }
  });

  return task;
});
```

**Pattern 2: Sequential Transaction** (simpler, less flexible)
```typescript
await prisma.$transaction([
  prisma.task.update({ where: { id }, data: { status: 'DONE' } }),
  prisma.postDoLog.create({ data: { taskId: id, ... } })
]);
```

**Implementation Priority** (based on audit):
1. Task completion (routes/tasks.ts - `POST /api/tasks/:id/complete`)
2. Task enrichment (routes/todoist.ts - enrichment endpoint)
3. Orient planning (routes/orient.ts - orient-east or orient-west)
4. Other high-priority operations from audit

**Error Handling**:
- Transactions automatically roll back on any error
- Existing `asyncHandler` middleware catches errors
- No additional error handling needed beyond current pattern

**Testing**:
Write integration tests for each transaction:

```typescript
describe('Task Completion Transaction', () => {
  it('should rollback task update if PostDoLog creation fails', async () => {
    // Setup: Create task
    // Act: Attempt completion with invalid PostDoLog data
    // Assert: Task status unchanged, no PostDoLog created
  });

  it('should commit both operations on success', async () => {
    // Setup: Create task
    // Act: Complete with valid data
    // Assert: Task status updated, PostDoLog created
  });
});
```

**Files to Update**:
- Route files identified in audit
- Add integration tests in `__tests__/integration/transactions.test.ts`

## Testing Strategy

### Unit Tests
- Environment validation: Test missing vars, invalid values, valid config
- Type safety: TypeScript compilation is the test

### Integration Tests
Focus on transaction behavior:

1. **Happy path**: All operations succeed, commit happens
2. **Rollback on error**: Second operation fails, first operation rolls back
3. **Concurrent transactions**: Ensure no deadlocks under load

Example test structure:
```typescript
describe('Transactions', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.task.deleteMany();
    await prisma.postDoLog.deleteMany();
  });

  it('rolls back task completion if PostDo fails', async () => {
    const task = await prisma.task.create({ /* ... */ });

    const response = await request(app)
      .post(`/api/tasks/${task.id}/complete`)
      .send({ outcome: '' }); // Invalid - will fail validation

    expect(response.status).toBe(400);

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updatedTask.status).toBe('NEXT'); // Not changed

    const postDo = await prisma.postDoLog.findFirst({ where: { taskId: task.id } });
    expect(postDo).toBeNull(); // Not created
  });
});
```

### Manual Testing
- Start server with missing env var - should fail immediately
- Complete task via UI - verify transaction behavior
- Check logs for clear error messages

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Transaction deadlocks | Low | High | Keep transactions short, proper error handling |
| Breaking env on deploy | Medium | High | Document all vars in .env.example, fail-fast behavior |
| Type changes break code | Low | Medium | TypeScript catches at compile time before deploy |
| Transaction overhead | Low | Low | Only critical operations use transactions |

## Implementation Order

Execute in this order for incremental safety improvements:

1. **Environment validation** (1h)
   - Foundation for other work
   - Server fails fast on misconfiguration
   - Makes debugging easier

2. **Type safety** (1.5h)
   - Makes transaction code cleaner
   - Catches bugs at compile time
   - Independent of other changes

3. **Transaction audit** (2h)
   - Document what needs transactions
   - Provides roadmap for implementation
   - Can be reviewed independently

4. **Transaction implementation** (2h)
   - Apply safest operations
   - Test thoroughly
   - Deploy incrementally if needed

**Total: 6.5 hours**

## Success Criteria

- ✅ Server fails immediately on startup if required env vars missing
- ✅ All environment access is type-safe (no `process.env` references)
- ✅ Zero `any` types in route handlers
- ✅ Top 3-4 critical operations use transactions
- ✅ Transaction audit document complete
- ✅ Integration tests for transactions pass
- ✅ TypeScript compilation succeeds with no errors

## Requirements Status

After completion:

- ✅ **REQ-DB-002**: PostDoLog unique constraint - Complete
- ✅ **REQ-BE-003**: Transactions - Complete (critical operations covered)
- ✅ **REQ-BE-006**: Environment validation - Complete
- ✅ **REQ-BE-001**: Type safety - Complete (no `any` types in routes)

## Future Work

**Post-batch improvements**:
- Add transaction monitoring/metrics
- Comprehensive integration test suite
- Performance testing for transactions
- Consider moving more operations to transactions as needed

## Transaction Audit Results

**Note**: This section will be filled in during the audit phase.

### High Priority Operations

[To be documented during audit]

### Medium Priority Operations

[To be documented during audit]

### Low Priority Operations

[To be documented during audit]

## Implementation Notes

**Note**: This section will be updated during implementation with:
- Specific changes made
- Issues encountered
- Performance observations
- Any deviations from plan
