# Backend Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add retry logic, Zod validation, and cursor-based pagination to achieve production-ready backend reliability.

**Architecture:** Reusable retry utility with exponential backoff wraps all external API calls. Zod schemas validate LLM responses with partial recovery. Cursor-based pagination using record IDs for tasks and reviews endpoints.

**Tech Stack:** TypeScript, Express, Prisma, Zod, Anthropic SDK, React Query

---

## Task 1: Create Retry Utility

**Files:**
- Create: `backend/src/utils/retry.ts`
- Create: `backend/src/utils/__tests__/retry.test.ts`

### Step 1: Write failing test for retry utility

Create test file:

```typescript
// backend/src/utils/__tests__/retry.test.ts
import { withRetry } from '../retry';

describe('withRetry', () => {
  it('should succeed on first attempt when no error', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error and eventually succeed', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ECONNRESET' })
      .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should retry on 5xx server error', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' })
      .mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx client error', async () => {
    const mockFn = jest.fn()
      .mockRejectedValue({ status: 400, message: 'Bad Request' });

    await expect(withRetry(mockFn)).rejects.toEqual({
      status: 400,
      message: 'Bad Request',
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw after max attempts', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ECONNRESET' });

    await expect(withRetry(mockFn, { maxRetries: 2 })).rejects.toEqual({
      code: 'ECONNRESET',
    });

    expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should use exponential backoff delays', async () => {
    jest.useFakeTimers();
    const mockFn = jest.fn().mockRejectedValue({ code: 'ETIMEDOUT' });

    const promise = withRetry(mockFn, { maxRetries: 3, initialDelay: 100 });

    // First call
    await jest.advanceTimersByTimeAsync(0);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // First retry after 100ms
    await jest.advanceTimersByTimeAsync(100);
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Second retry after 200ms
    await jest.advanceTimersByTimeAsync(200);
    expect(mockFn).toHaveBeenCalledTimes(3);

    // Third retry after 400ms
    await jest.advanceTimersByTimeAsync(400);
    expect(mockFn).toHaveBeenCalledTimes(4);

    await expect(promise).rejects.toEqual({ code: 'ETIMEDOUT' });

    jest.useRealTimers();
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd backend
npm test -- src/utils/__tests__/retry.test.ts
```

Expected: FAIL - "Cannot find module '../retry'"

### Step 3: Implement retry utility

Create implementation file:

```typescript
// backend/src/utils/retry.ts

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 4,
  initialDelay: 1000,
  shouldRetry: defaultShouldRetry,
};

function defaultShouldRetry(error: any): boolean {
  // Retry on network errors
  const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
  if (error.code && networkErrors.includes(error.code)) {
    return true;
  }

  // Retry on 5xx server errors
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }

  // Retry on 429 rate limit
  if (error.status === 429) {
    return true;
  }

  // Don't retry 4xx client errors
  if (error.status && error.status >= 400 && error.status < 500) {
    return false;
  }

  // Default: don't retry unknown errors
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry(error);
      const isLastAttempt = attempt === opts.maxRetries;

      if (!shouldRetry || isLastAttempt) {
        // Don't retry, throw immediately
        if (!shouldRetry) {
          console.error('[Retry] Non-retryable error:', error);
        } else {
          console.error(`[Retry] All ${opts.maxRetries} retries exhausted`);
        }
        throw error;
      }

      // Calculate exponential backoff delay
      const delayMs = opts.initialDelay * Math.pow(2, attempt);
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. ` +
        `Retrying in ${delayMs}ms...`,
        { error: error.message || error.code }
      );

      await delay(delayMs);
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError;
}
```

### Step 4: Run tests to verify they pass

```bash
npm test -- src/utils/__tests__/retry.test.ts
```

Expected: PASS - All 6 tests passing

### Step 5: Commit

```bash
git add src/utils/retry.ts src/utils/__tests__/retry.test.ts
git commit -m "feat: add retry utility with exponential backoff

- Retries on network errors (ECONNRESET, ETIMEDOUT, etc)
- Retries on 5xx server errors and 429 rate limits
- Fails immediately on 4xx client errors
- Exponential backoff: 1s, 2s, 4s, 8s
- Default 4 retries (5 total attempts)"
```

---

## Task 2: Add Zod Validation to LLM Service

**Files:**
- Modify: `backend/src/services/llm.ts`
- Create: `backend/src/services/__tests__/llm.test.ts`

### Step 1: Write failing test for Zod validation

Create test file:

```typescript
// backend/src/services/__tests__/llm.test.ts
import { enrichTask } from '../llm';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('enrichTask with Zod validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate and return valid LLM response', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'SCHOOL',
          context: 'COMPUTER',
          rephrasedName: 'Complete physics homework',
          definitionOfDone: 'All problems solved and checked',
        }),
      }],
    });

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));

    const result = await enrichTask({
      rawTaskName: 'do physics hw',
      priority: 1,
      duration: 60,
      energy: 'HIGH',
    });

    expect(result).toEqual({
      category: 'SCHOOL',
      context: 'COMPUTER',
      rephrasedName: 'Complete physics homework',
      definitionOfDone: 'All problems solved and checked',
    });
  });

  it('should use partial recovery for invalid category', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'INVALID_CATEGORY',
          context: 'COMPUTER',
          rephrasedName: 'Complete physics homework',
          definitionOfDone: 'All problems solved',
        }),
      }],
    });

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));

    const result = await enrichTask({
      rawTaskName: 'do physics hw',
      priority: 1,
      duration: 60,
      energy: 'HIGH',
    });

    expect(result.category).toBe('PERSONAL'); // Default fallback
    expect(result.context).toBe('COMPUTER'); // Valid field kept
    expect(result.rephrasedName).toBe('Complete physics homework');
    expect(result.definitionOfDone).toBe('All problems solved');
  });

  it('should use partial recovery for multiple invalid fields', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'INVALID',
          context: 'INVALID',
          rephrasedName: '',
          definitionOfDone: 'Valid completion criteria',
        }),
      }],
    });

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));

    const result = await enrichTask({
      rawTaskName: 'original task',
      priority: 2,
      duration: 30,
      energy: 'MEDIUM',
    });

    expect(result.category).toBe('PERSONAL');
    expect(result.context).toBe('ANYWHERE');
    expect(result.rephrasedName).toBe('original task'); // Falls back to input
    expect(result.definitionOfDone).toBe('Valid completion criteria'); // Valid field kept
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/services/__tests__/llm.test.ts
```

Expected: FAIL - Tests fail because Zod validation not implemented

### Step 3: Add Zod schemas and validation to llm.ts

Modify the existing file:

```typescript
// backend/src/services/llm.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { withRetry } from '../utils/retry';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Zod schemas for validation
const taskEnrichmentSchema = z.object({
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']),
  context: z.enum(['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE']),
  rephrasedName: z.string().min(1),
  definitionOfDone: z.string().min(1),
});

export interface TaskEnrichmentInput {
  rawTaskName: string;
  priority: number;
  duration: number;
  energy: string;
}

export interface TaskEnrichmentOutput {
  category: string;
  context: string;
  rephrasedName: string;
  definitionOfDone: string;
}

function isValidCategory(value: any): boolean {
  return taskEnrichmentSchema.shape.category.safeParse(value).success;
}

function isValidContext(value: any): boolean {
  return taskEnrichmentSchema.shape.context.safeParse(value).success;
}

function validateWithRecovery(data: any, input: TaskEnrichmentInput): TaskEnrichmentOutput {
  const result = taskEnrichmentSchema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Partial recovery: use valid fields, fill in defaults for invalid
  const recovered: TaskEnrichmentOutput = {
    category: isValidCategory(data.category) ? data.category : 'PERSONAL',
    context: isValidContext(data.context) ? data.context : 'ANYWHERE',
    rephrasedName:
      typeof data.rephrasedName === 'string' && data.rephrasedName.length > 0
        ? data.rephrasedName
        : input.rawTaskName,
    definitionOfDone:
      typeof data.definitionOfDone === 'string' && data.definitionOfDone.length > 0
        ? data.definitionOfDone
        : 'Task completed as described',
  };

  // Log validation failures for monitoring
  console.warn('[LLM Validation] Partial validation failure:', {
    errors: result.error.issues,
    rawResponse: data,
    recoveredFields: recovered,
  });

  return recovered;
}

export async function enrichTask(
  input: TaskEnrichmentInput
): Promise<TaskEnrichmentOutput> {
  const prompt = `You are enriching a task for a productivity system called Compass.

Task: "${input.rawTaskName}"
Priority: ${input.priority} (1=Must, 2=Should, 3=Could, 4=Maybe)
Duration: ${input.duration} minutes
Energy: ${input.energy}

Please provide:
1. Category (choose ONE from: SCHOOL, MUSIC, FITNESS, GAMING, NUTRITION, HYGIENE, PET, SOCIAL, PERSONAL, ADMIN)
2. Context (choose ONE from: HOME, OFFICE, COMPUTER, PHONE, ERRANDS, ANYWHERE)
3. Rephrased task name in [Verb] + [Object] format (make it action-oriented and clear)
4. Definition of Done (specific, measurable completion criteria - what does "done" look like?)

Respond ONLY with valid JSON in this exact format:
{
  "category": "CATEGORY_NAME",
  "context": "CONTEXT_NAME",
  "rephrasedName": "Action-oriented task name",
  "definitionOfDone": "Specific completion criteria"
}`;

  try {
    const message = await withRetry(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    // Parse response
    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    // Extract JSON from response (Claude might include markdown code blocks)
    let jsonText = content.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const enrichment = JSON.parse(jsonText);

    // Validate with partial recovery
    return validateWithRecovery(enrichment, input);
  } catch (error: any) {
    console.error('Error enriching task:', error);

    // Fallback enrichment if all retries fail
    return {
      category: 'PERSONAL',
      context: 'ANYWHERE',
      rephrasedName: input.rawTaskName,
      definitionOfDone: 'Task completed as described',
    };
  }
}

// Keep existing structureVoiceInput function unchanged for now
export async function structureVoiceInput(
  voiceText: string,
  context: 'orient-blocks' | 'outcomes' | 'reflection' | 'wins-misses-lessons'
): Promise<any> {
  // ... existing implementation
}
```

### Step 4: Run tests to verify they pass

```bash
npm test -- src/services/__tests__/llm.test.ts
```

Expected: PASS - All tests passing

### Step 5: Commit

```bash
git add src/services/llm.ts src/services/__tests__/llm.test.ts
git commit -m "feat: add Zod validation with partial recovery to LLM service

- Define Zod schemas for task enrichment responses
- Implement partial recovery: use valid fields, default invalid ones
- Wrap API calls with retry utility
- Log validation failures for monitoring"
```

---

## Task 3: Add Pagination to Tasks Endpoint

**Files:**
- Modify: `backend/src/routes/tasks.ts:58-89`
- Create: `backend/src/routes/__tests__/tasks-pagination.test.ts`

### Step 1: Write failing test for tasks pagination

Create test file:

```typescript
// backend/src/routes/__tests__/tasks-pagination.test.ts
import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';
import { prisma } from '../../prisma';

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

jest.mock('../../prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/tasks - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first page with nextCursor when more items exist', async () => {
    const mockTasks = Array.from({ length: 31 }, (_, i) => ({
      id: `task-${i}`,
      name: `Task ${i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    const response = await request(app)
      .get('/api/tasks?limit=30')
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('nextCursor');
    expect(response.body.items).toHaveLength(30);
    expect(response.body.nextCursor).toBe('task-29');
  });

  it('should return last page with null nextCursor', async () => {
    const mockTasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      name: `Task ${i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    const response = await request(app)
      .get('/api/tasks?limit=30')
      .expect(200);

    expect(response.body.items).toHaveLength(20);
    expect(response.body.nextCursor).toBeNull();
  });

  it('should use cursor to fetch next page', async () => {
    const mockTasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task-${30 + i}`,
      name: `Task ${30 + i}`,
      status: 'NEXT',
      priority: 'MUST',
    }));

    (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);

    await request(app)
      .get('/api/tasks?cursor=task-29&limit=30')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { gt: 'task-29' },
        }),
      })
    );
  });

  it('should limit page size to max 100', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/tasks?limit=200')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 101, // max 100 + 1 for hasMore check
      })
    );
  });

  it('should work with filters and cursor', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/tasks?status=NEXT&priority=MUST&cursor=task-10')
      .expect(200);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'NEXT',
          priority: 'MUST',
          id: { gt: 'task-10' },
        }),
      })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/routes/__tests__/tasks-pagination.test.ts
```

Expected: FAIL - Response format doesn't match (returns array, not object with items/nextCursor)

### Step 3: Implement pagination in tasks route

Modify the GET / endpoint:

```typescript
// backend/src/routes/tasks.ts (modify lines 58-89)

// GET /api/tasks - List tasks with filters and pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, category, scheduledDate, cursor, limit } = req.query;

  log('[GET /tasks] Query params:', { status, priority, category, scheduledDate, cursor, limit });

  // Parse and validate limit
  const pageSize = Math.min(
    parseInt(limit as string) || 30,
    100
  );

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
    where.id = { gt: cursor };
  }

  log('[GET /tasks] Query where clause:', JSON.stringify(where));

  // Fetch one extra item to determine if more pages exist
  const tasks = await prisma.task.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { status: 'asc' },
      { priority: 'asc' },
      { id: 'asc' }, // Stable sort for cursor
    ],
  });

  // Determine if more pages exist
  const hasMore = tasks.length > pageSize;
  const items = hasMore ? tasks.slice(0, pageSize) : tasks;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  log('[GET /tasks] Found tasks:', items.length, 'hasMore:', hasMore);

  res.json({ items, nextCursor });
}));
```

### Step 4: Run tests to verify they pass

```bash
npm test -- src/routes/__tests__/tasks-pagination.test.ts
```

Expected: PASS - All pagination tests passing

### Step 5: Commit

```bash
git add src/routes/tasks.ts src/routes/__tests__/tasks-pagination.test.ts
git commit -m "feat: add cursor-based pagination to tasks endpoint

- Default page size: 30, max 100
- Cursor-based on task ID
- Response format: { items, nextCursor }
- Works with all existing filters"
```

---

## Task 4: Add Pagination to Reviews Endpoint

**Files:**
- Modify: `backend/src/routes/reviews.ts:236-246`
- Create: `backend/src/routes/__tests__/reviews-pagination.test.ts`

### Step 1: Write failing test for reviews pagination

Create test file:

```typescript
// backend/src/routes/__tests__/reviews-pagination.test.ts
import request from 'supertest';
import express from 'express';
import reviewsRouter from '../reviews';
import { prisma } from '../../prisma';

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewsRouter);

jest.mock('../../prisma', () => ({
  prisma: {
    review: {
      findMany: jest.fn(),
    },
  },
}));

describe('GET /api/reviews - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first page with nextCursor', async () => {
    const mockReviews = Array.from({ length: 31 }, (_, i) => ({
      id: `review-${i}`,
      type: 'DAILY',
      periodStart: new Date(),
    }));

    (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);

    const response = await request(app)
      .get('/api/reviews?limit=30')
      .expect(200);

    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('nextCursor');
    expect(response.body.items).toHaveLength(30);
    expect(response.body.nextCursor).toBe('review-29');
  });

  it('should return last page with null nextCursor', async () => {
    const mockReviews = Array.from({ length: 15 }, (_, i) => ({
      id: `review-${i}`,
      type: 'DAILY',
      periodStart: new Date(),
    }));

    (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);

    const response = await request(app)
      .get('/api/reviews?limit=30')
      .expect(200);

    expect(response.body.items).toHaveLength(15);
    expect(response.body.nextCursor).toBeNull();
  });

  it('should use cursor for DESC ordering (lt for next page)', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/reviews?cursor=review-29')
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { lt: 'review-29' },
        }),
      })
    );
  });

  it('should work with type filter', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/reviews?type=WEEKLY&cursor=review-10')
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'WEEKLY',
          id: { lt: 'review-10' },
        }),
      })
    );
  });

  it('should order by periodStart DESC with id DESC', async () => {
    (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/reviews')
      .expect(200);

    expect(prisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { periodStart: 'desc' },
          { id: 'desc' },
        ],
      })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/routes/__tests__/reviews-pagination.test.ts
```

Expected: FAIL - Response format mismatch

### Step 3: Implement pagination in reviews route

Modify the GET / endpoint:

```typescript
// backend/src/routes/reviews.ts (modify lines 236-246)

// GET /api/reviews - Get all reviews with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { type, cursor, limit } = req.query;

  const pageSize = Math.min(
    parseInt(limit as string) || 30,
    100
  );

  const where: any = {};
  if (type) where.type = type as any;
  if (cursor) {
    where.id = { lt: cursor }; // Use 'lt' for DESC ordering
  }

  const reviews = await prisma.review.findMany({
    where,
    take: pageSize + 1,
    orderBy: [
      { periodStart: 'desc' }, // Newest first
      { id: 'desc' }, // Stable sort
    ],
  });

  const hasMore = reviews.length > pageSize;
  const items = hasMore ? reviews.slice(0, pageSize) : reviews;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  res.json({ items, nextCursor });
}));
```

### Step 4: Run tests to verify they pass

```bash
npm test -- src/routes/__tests__/reviews-pagination.test.ts
```

Expected: PASS - All tests passing

### Step 5: Commit

```bash
git add src/routes/reviews.ts src/routes/__tests__/reviews-pagination.test.ts
git commit -m "feat: add cursor-based pagination to reviews endpoint

- Default page size: 30, max 100
- Cursor-based with DESC ordering (id < cursor)
- Response format: { items, nextCursor }
- Sorted by periodStart DESC (newest first)"
```

---

## Task 5: Update Frontend API Client for Tasks

**Files:**
- Modify: `frontend/src/lib/api.ts` (getTasks function)
- Modify: `frontend/src/types/index.ts` (add pagination types)

### Step 1: Add pagination types

```typescript
// frontend/src/types/index.ts (add these types)

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}
```

### Step 2: Update getTasks function

```typescript
// frontend/src/lib/api.ts (modify getTasks function)

export const getTasks = async (params?: {
  status?: TaskStatus;
  priority?: Priority;
  category?: Category;
  scheduledDate?: string;
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Task>> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.scheduledDate) queryParams.append('scheduledDate', params.scheduledDate);
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get<PaginatedResponse<Task>>(`/tasks?${queryParams}`);
  return response.data;
};
```

### Step 3: Commit

```bash
git add frontend/src/lib/api.ts frontend/src/types/index.ts
git commit -m "feat: update frontend API client for tasks pagination

- Add PaginatedResponse type
- Update getTasks to handle cursor and limit params
- Return { items, nextCursor } instead of Task[]"
```

---

## Task 6: Update Frontend React Query Hooks for Tasks

**Files:**
- Modify: `frontend/src/hooks/useTasks.ts`

### Step 1: Update useInfiniteQuery for tasks

```typescript
// frontend/src/hooks/useTasks.ts (modify useTasks hook)

// Update the useTasks hook to use useInfiniteQuery
export const useTasks = (filters?: TaskFilters) => {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam }) => getTasks({ ...filters, cursor: pageParam, limit: 30 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
};

// Helper to flatten pages for components that need a simple array
export const useFlatTasks = (filters?: TaskFilters) => {
  const { data, ...rest } = useTasks(filters);

  const tasks = useMemo(() => {
    return data?.pages.flatMap(page => page.items) ?? [];
  }, [data]);

  return { tasks, ...rest };
};
```

### Step 2: Commit

```bash
git add frontend/src/hooks/useTasks.ts
git commit -m "feat: update useTasks hook for infinite scroll pagination

- Use useInfiniteQuery with cursor-based pagination
- Add useFlatTasks helper for simple array access
- Fetch 30 items per page"
```

---

## Task 7: Update Frontend API Client for Reviews

**Files:**
- Modify: `frontend/src/lib/api.ts` (getReviews function)

### Step 1: Update getReviews function

```typescript
// frontend/src/lib/api.ts (modify getReviews function)

export const getReviews = async (params?: {
  type?: 'DAILY' | 'WEEKLY';
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Review>> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get<PaginatedResponse<Review>>(`/reviews?${queryParams}`);
  return response.data;
};
```

### Step 2: Commit

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: update frontend API client for reviews pagination

- Update getReviews to return PaginatedResponse
- Add cursor and limit params support"
```

---

## Task 8: Update Frontend React Query Hooks for Reviews

**Files:**
- Modify: `frontend/src/hooks/useReviews.ts` (or create if doesn't exist)

### Step 1: Create/update useReviews hook

```typescript
// frontend/src/hooks/useReviews.ts

import { useInfiniteQuery } from '@tanstack/react-query';
import { getReviews } from '../lib/api';
import { useMemo } from 'react';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (type?: 'DAILY' | 'WEEKLY') => [...reviewKeys.lists(), { type }] as const,
};

export const useReviews = (type?: 'DAILY' | 'WEEKLY') => {
  return useInfiniteQuery({
    queryKey: reviewKeys.list(type),
    queryFn: ({ pageParam }) => getReviews({ type, cursor: pageParam, limit: 30 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
};

export const useFlatReviews = (type?: 'DAILY' | 'WEEKLY') => {
  const { data, ...rest } = useReviews(type);

  const reviews = useMemo(() => {
    return data?.pages.flatMap(page => page.items) ?? [];
  }, [data]);

  return { reviews, ...rest };
};
```

### Step 2: Commit

```bash
git add frontend/src/hooks/useReviews.ts
git commit -m "feat: add useReviews hook with infinite scroll pagination

- Use useInfiniteQuery for cursor-based pagination
- Add useFlatReviews helper
- Support type filter (DAILY/WEEKLY)"
```

---

## Task 9: Integration Testing

**Files:**
- Create: `backend/src/__tests__/integration/pagination.integration.test.ts`

### Step 1: Write integration test

```typescript
// backend/src/__tests__/integration/pagination.integration.test.ts
import request from 'supertest';
import { app } from '../../index'; // Assumes Express app is exported
import { prisma } from '../../prisma';

describe('Pagination Integration Tests', () => {
  beforeAll(async () => {
    // Setup: Create test data
    await prisma.task.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        name: `Test Task ${i}`,
        status: 'NEXT',
        priority: 'MUST',
        category: 'PERSONAL',
        context: 'ANYWHERE',
        energyRequired: 'MEDIUM',
        duration: 30,
        definitionOfDone: 'Complete',
      })),
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.task.deleteMany({
      where: { name: { startsWith: 'Test Task' } },
    });
    await prisma.$disconnect();
  });

  it('should paginate through all tasks', async () => {
    let allTasks: any[] = [];
    let cursor: string | null = undefined;
    let pageCount = 0;

    // Fetch all pages
    while (pageCount === 0 || cursor !== null) {
      const url = cursor ? `/api/tasks?cursor=${cursor}&limit=20` : '/api/tasks?limit=20';
      const response = await request(app).get(url).expect(200);

      allTasks.push(...response.body.items);
      cursor = response.body.nextCursor;
      pageCount++;

      // Safety check
      if (pageCount > 10) break;
    }

    expect(allTasks.length).toBe(50);
    expect(pageCount).toBe(3); // 20 + 20 + 10
  });

  it('should handle pagination with filters', async () => {
    const response1 = await request(app)
      .get('/api/tasks?status=NEXT&limit=10')
      .expect(200);

    expect(response1.body.items.length).toBeLessThanOrEqual(10);
    expect(response1.body.items.every((t: any) => t.status === 'NEXT')).toBe(true);

    if (response1.body.nextCursor) {
      const response2 = await request(app)
        .get(`/api/tasks?status=NEXT&cursor=${response1.body.nextCursor}&limit=10`)
        .expect(200);

      expect(response2.body.items.every((t: any) => t.status === 'NEXT')).toBe(true);
    }
  });
});
```

### Step 2: Run integration test

```bash
npm test -- src/__tests__/integration/pagination.integration.test.ts
```

Expected: PASS - Integration tests verify end-to-end pagination

### Step 3: Commit

```bash
git add src/__tests__/integration/pagination.integration.test.ts
git commit -m "test: add integration tests for pagination

- Test paginating through multiple pages
- Test pagination with filters
- Verify cursor-based navigation works end-to-end"
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `backend/README.md` (or create if doesn't exist)
- Modify: `CLAUDE.md`

### Step 1: Document pagination in backend README

Add to backend README:

```markdown
## API Pagination

### Cursor-Based Pagination

Tasks and reviews endpoints use cursor-based pagination:

**Query Parameters:**
- `cursor` (optional): ID of last item from previous page
- `limit` (optional): Page size (default: 30, max: 100)

**Response Format:**
```json
{
  "items": [...],
  "nextCursor": "uuid-string" | null
}
```

**Example:**
```bash
# First page
GET /api/tasks?limit=30

# Next page
GET /api/tasks?cursor=previous-last-id&limit=30
```

**With filters:**
```bash
GET /api/tasks?status=NEXT&priority=MUST&cursor=abc-123&limit=30
```
```

### Step 2: Update CLAUDE.md with retry and validation info

Add sections to CLAUDE.md:

```markdown
#### Retry Logic

All external API calls (LLM, Todoist, Timery) are wrapped with `withRetry()` utility:

```typescript
import { withRetry } from '../utils/retry';

const result = await withRetry(() => externalAPI.call());
```

**Configuration:**
- 4 retries with exponential backoff: 1s, 2s, 4s, 8s
- Retries on: Network errors, 5xx server errors, 429 rate limits
- Fails immediately on: 4xx client errors

#### LLM Response Validation

LLM responses are validated with Zod schemas:
- Strict type checking for enums (category, context)
- Partial recovery: valid fields used, invalid fields get defaults
- Validation failures logged for monitoring

#### Pagination

**Backend:**
- All list endpoints support cursor-based pagination
- Default page size: 30, max: 100
- Response: `{ items: T[], nextCursor: string | null }`

**Frontend:**
- Use `useInfiniteQuery` for cursor-based pagination
- Use `useFlatTasks()` or `useFlatReviews()` for simple array access
```

### Step 3: Commit

```bash
git add backend/README.md CLAUDE.md
git commit -m "docs: document pagination, retry logic, and validation

- Add pagination API documentation
- Document retry utility usage
- Document LLM validation with partial recovery"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] All tests pass: `npm test` in backend
- [ ] All tests pass: `npm test` in frontend
- [ ] Backend builds: `npm run build` in backend
- [ ] Frontend builds: `npm run build` in frontend
- [ ] Manual test: Task list loads with pagination
- [ ] Manual test: Reviews list loads with pagination
- [ ] Manual test: LLM enrichment works with retry
- [ ] Manual test: Invalid LLM response recovers gracefully

## Final Commit

```bash
git add -A
git commit -m "feat: complete BATCH 5 - Backend Reliability

Implements:
- REQ-BE-005: Retry logic with exponential backoff
- REQ-BE-002: Zod validation for LLM responses
- REQ-BE-007: Pagination for tasks endpoint
- REQ-BE-008: Pagination for reviews endpoint

All tests passing. Ready for production."
```
