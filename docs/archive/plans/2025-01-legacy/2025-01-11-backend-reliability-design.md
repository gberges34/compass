# Backend Reliability Design

**Date:** 2025-01-11
**Batch:** BATCH 5 - Backend Reliability
**Estimated Time:** 4 hours
**Dependencies:** BATCH 2

## Overview

This design addresses production readiness for the Compass backend by adding:
- Retry logic with exponential backoff for all external API calls
- Zod validation for LLM responses with partial recovery
- Cursor-based pagination for tasks and reviews endpoints

## Requirements

- **REQ-BE-005:** Add retry logic to external services
- **REQ-BE-002:** Add Zod validation to LLM responses
- **REQ-BE-007:** Add pagination to tasks endpoint
- **REQ-BE-008:** Add pagination to reviews endpoint

## Design Decisions

### Retry Logic Scope
- **Decision:** Apply to all external services (LLM, Todoist, Timery, future APIs)
- **Rationale:** Comprehensive resilience as system grows

### Retry Strategy
- **Decision:** Exponential backoff with 4 retries (1s, 2s, 4s, 8s delays)
- **Rationale:** Balances success rate with acceptable timeout (max 15s total)

### Retry Error Handling
- **Decision:** Retry on 5xx server errors and network issues; fail immediately on 4xx client errors
- **Rationale:** Industry standard - don't retry bad requests/auth failures

### LLM Validation Strategy
- **Decision:** Partial recovery - use valid fields, fill in defaults for invalid ones
- **Rationale:** Maximize value from LLM responses while maintaining safety

### Pagination Style
- **Decision:** Cursor-based using record ID
- **Rationale:** Avoids duplicate/missing records with frequently updated data

### Page Size Defaults
- **Decision:** 30 items default, 100 max
- **Rationale:** Fast response times, mobile-friendly, fewer requests than 20

### Pagination Response Format
- **Decision:** Minimal format `{ items: [...], nextCursor: string | null }`
- **Rationale:** Clean and easy to use with React Query

## Part 1: Retry Logic Architecture

### Core Utility (`src/utils/retry.ts`)

Create reusable `withRetry<T>()` utility function that wraps any async operation:

```typescript
interface RetryOptions {
  maxRetries?: number;        // Default: 4
  initialDelay?: number;      // Default: 1000ms
  shouldRetry?: (error: any) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>
```

**Configuration:**
- 4 retries max (5 total attempts)
- Initial delay: 1s, exponential backoff: 2s, 4s, 8s
- Max total time: ~15 seconds

**Retry triggers:**
- Network errors: `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`
- HTTP 5xx server errors (500, 502, 503, 504)
- Rate limit errors (429) - specific to Anthropic API

**Immediate failure:**
- 4xx client errors (400, 401, 403, 404)
- Validation errors
- Business logic errors

**Implementation details:**
1. Execute the wrapped function
2. On error, check if retryable (network/5xx)
3. If yes, wait with exponential backoff and retry
4. If no retries left or non-retryable error, throw
5. Log retry attempts for observability

**Logging:**
```typescript
console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${delay}ms...`)
console.error(`[Retry] All ${maxRetries} retries exhausted for operation`)
```

### Usage Locations

**LLM Service (`src/services/llm.ts`):**
```typescript
export async function enrichTask(input: TaskEnrichmentInput): Promise<TaskEnrichmentOutput> {
  const enrichment = await withRetry(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  );

  // ... parse and validate response
}
```

**Future external services:**
- Todoist API calls
- Timery API calls
- Any other external integrations

## Part 2: Zod Validation for LLM Responses

### Problem

Current validation in `llm.ts`:
- Manual field checking: `if (!enrichment.category || !enrichment.context...)`
- No type validation
- No enum value validation
- Brittle and hard to maintain

### Solution

Define Zod schemas for all LLM response types with partial recovery strategy.

### New Schemas (`src/services/llm.ts`)

```typescript
import { z } from 'zod';

const taskEnrichmentSchema = z.object({
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']),
  context: z.enum(['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE']),
  rephrasedName: z.string().min(1),
  definitionOfDone: z.string().min(1),
});

const voiceBlockSchema = z.object({
  type: z.string(),
  start: z.string(),
  end: z.string(),
  focus: z.string().optional(),
});

const voiceBlocksSchema = z.object({
  blocks: z.array(voiceBlockSchema)
});

const voiceOutcomesSchema = z.array(z.string()).max(3);

const voiceReflectionSchema = z.string();

const voiceWinsMissesLessonsSchema = z.object({
  items: z.array(z.string())
});
```

### Validation Strategy: Partial Recovery

**Approach:**
1. Parse JSON from LLM response (existing code)
2. Attempt Zod validation with `.safeParse()`
3. If fully valid: return parsed data
4. If invalid: Apply field-level recovery

**Field-level recovery:**
```typescript
function validateWithRecovery(data: any, input: TaskEnrichmentInput): TaskEnrichmentOutput {
  const result = taskEnrichmentSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Partial recovery: use valid fields, fill in defaults for invalid
  return {
    category: isValidCategory(data.category) ? data.category : 'PERSONAL',
    context: isValidContext(data.context) ? data.context : 'ANYWHERE',
    rephrasedName: typeof data.rephrasedName === 'string' && data.rephrasedName.length > 0
      ? data.rephrasedName
      : input.rawTaskName,
    definitionOfDone: typeof data.definitionOfDone === 'string' && data.definitionOfDone.length > 0
      ? data.definitionOfDone
      : 'Task completed as described',
  };
}
```

**Benefits:**
- Maximizes value from LLM responses
- If 3 out of 4 fields are valid, use those 3
- Only fill in defaults for truly invalid fields
- More resilient than all-or-nothing validation

### Error Logging

Log validation failures for monitoring LLM response quality:

```typescript
if (!result.success) {
  console.warn('[LLM Validation] Partial validation failure:', {
    errors: result.error.issues,
    rawResponse: data,
    recoveredFields: recoveredData,
  });
}
```

This enables tracking:
- Which fields fail most often
- LLM response quality over time
- Whether prompt engineering improvements are needed

## Part 3: Cursor-Based Pagination for Tasks

### Current Problem

`GET /api/tasks` returns all tasks with no limit:
```typescript
const tasks = await prisma.task.findMany({ where, orderBy });
res.json(tasks);
```

As task count grows:
- Slow response times
- Wasteful bandwidth
- Poor client performance

### Solution

Add cursor-based pagination using task ID.

### API Changes

**Endpoint:** `GET /api/tasks`

**Query parameters:**
- `cursor` (optional, string): UUID of last task from previous page
- `limit` (optional, number): Page size, default 30, max 100
- Existing filters: `status`, `priority`, `category`, `scheduledDate`

**Response format:**
```typescript
{
  items: Task[],           // Array of tasks
  nextCursor: string | null  // null when no more items
}
```

**Breaking change:** Response changes from `Task[]` to `{ items, nextCursor }`

### Implementation

**In `routes/tasks.ts`:**

```typescript
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, category, scheduledDate, cursor, limit } = req.query;

  // Parse and validate limit
  const pageSize = Math.min(
    parseInt(limit as string) || 30,
    100
  );

  // Build where clause
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

  // Add cursor filter
  if (cursor) {
    where.id = { gt: cursor };  // Get tasks after this ID
  }

  // Fetch one extra item to determine if more pages exist
  const tasks = await prisma.task.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { status: 'asc' },
      { priority: 'asc' },
      { id: 'asc' }  // Stable sort for cursor
    ],
  });

  // Determine if more pages exist
  const hasMore = tasks.length > pageSize;
  const items = hasMore ? tasks.slice(0, pageSize) : tasks;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
}));
```

### Key Implementation Details

**Cursor mechanism:**
- Use `id: { gt: cursor }` to fetch tasks after cursor
- Stable sort includes `id` field
- No index changes needed (UUID primary key already indexed)

**HasMore detection:**
- Fetch `pageSize + 1` items
- If we get the extra item, more pages exist
- Return only `pageSize` items to client

**Filter compatibility:**
- Cursor works with any combination of filters
- Frontend manages filter changes (resets pagination)
- No need to encode filters in cursor

**Backward compatibility:**
- No `cursor` param = first page (existing behavior)
- Old clients without pagination still work (get first 30 items)

### Frontend Integration

React Query example:
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['tasks', filters],
  queryFn: ({ pageParam }) => getTasks({ ...filters, cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

## Part 4: Cursor-Based Pagination for Reviews

### Current Problem

`GET /api/reviews` has `limit` param but no way to fetch beyond limit:
```typescript
const reviews = await prisma.review.findMany({
  where: type ? { type: type as any } : undefined,
  orderBy: { periodStart: 'desc' },
  take: limit ? parseInt(limit as string) : undefined,
});
res.json(reviews);
```

Cannot fetch older reviews beyond the limit.

### Solution

Apply same cursor-based pagination pattern as tasks.

### API Changes

**Endpoint:** `GET /api/reviews`

**Query parameters:**
- `type` (optional, string): 'DAILY' or 'WEEKLY' filter
- `cursor` (optional, string): UUID of last review from previous page
- `limit` (optional, number): Page size, default 30, max 100

**Response format:**
```typescript
{
  items: Review[],
  nextCursor: string | null
}
```

**Breaking change:** Response changes from `Review[]` to `{ items, nextCursor }`

### Implementation

**In `routes/reviews.ts`:**

```typescript
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type, cursor, limit } = req.query;

  const pageSize = Math.min(
    parseInt(limit as string) || 30,
    100
  );

  const where: any = {};
  if (type) where.type = type as any;
  if (cursor) where.id = { lt: cursor };  // Note: 'lt' for DESC order

  const reviews = await prisma.review.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { periodStart: 'desc' },  // Newest first
      { id: 'desc' }  // Stable sort
    ],
  });

  const hasMore = reviews.length > pageSize;
  const items = hasMore ? reviews.slice(0, pageSize) : reviews;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
}));
```

### Key Differences from Tasks

**Sort order:**
- Reviews: `periodStart DESC` (newest first)
- Tasks: `status ASC, priority ASC` (by workflow)
- Users typically want recent reviews first

**Cursor direction:**
- Reviews use `id: { lt: cursor }` (less than) for descending order
- Tasks use `id: { gt: cursor }` (greater than) for ascending order

**Data characteristics:**
- Reviews are mostly append-only (rarely updated)
- Less churn than tasks
- More predictable pagination behavior

## Migration Plan

### Phase 1: Retry Logic
1. Create `src/utils/retry.ts`
2. Add unit tests for retry utility
3. Wrap `enrichTask()` with retry
4. Wrap `structureVoiceInput()` with retry
5. Test with simulated failures

### Phase 2: Zod Validation
1. Add Zod schemas to `llm.ts`
2. Implement `validateWithRecovery()` helper
3. Replace manual validation with Zod
4. Add logging for validation failures
5. Test with malformed LLM responses

### Phase 3: Tasks Pagination
1. Update `GET /api/tasks` route
2. Update frontend `getTasks()` API client
3. Update React Query hooks (`useTasks`)
4. Test with large datasets
5. Verify filters still work

### Phase 4: Reviews Pagination
1. Update `GET /api/reviews` route
2. Update frontend `getReviews()` API client
3. Update React Query hooks (`useReviews`)
4. Test pagination flow
5. Verify type filter still works

## Testing Strategy

### Retry Logic Tests
- Network timeout scenarios
- 5xx server errors
- Exponential backoff timing
- Max retries exhaustion
- Non-retryable errors fail immediately

### Validation Tests
- Valid LLM responses pass through
- Invalid category falls back to 'PERSONAL'
- Invalid context falls back to 'ANYWHERE'
- Partial valid responses recover correctly
- Completely invalid responses use all defaults

### Pagination Tests
- First page (no cursor)
- Middle page (with cursor)
- Last page (nextCursor is null)
- Empty results
- Pagination with filters
- Limit validation (max 100)

## Success Metrics

**Reliability:**
- LLM calls succeed >99% after retries
- No user-facing errors from transient failures

**Performance:**
- Task list loads <500ms for 30 items
- Review list loads <300ms for 30 items

**Data Quality:**
- LLM validation failures logged for monitoring
- <5% of enrichments require partial recovery

## Future Enhancements

- Add retry telemetry/metrics (retry rate, success rate after N retries)
- Add pagination cursor encryption to prevent manipulation
- Add total count endpoint for UI (expensive, opt-in only)
- Add configurable page size per user preference
