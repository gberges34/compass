# Phase 8: Code Patterns - Practical Refactoring Guide

## Ready-to-Use Refactoring Code

This guide provides copy-paste solutions for the top findings.

---

## 1. Badge Variant Mappers (Findings #1, #2, #12)

**File**: `frontend/src/lib/designTokens.ts` (ADD to existing file)

```typescript
// Add these utility functions after existing exports

/**
 * Maps Priority enum to Badge variant for consistent styling
 * Usage: <Badge variant={getPriorityBadgeVariant(task.priority)}>
 */
export const getPriorityBadgeVariant = (priority: Priority): BadgeVariant => {
  const variants: Record<Priority, BadgeVariant> = {
    MUST: 'danger',
    SHOULD: 'warn',
    COULD: 'sun',
    MAYBE: 'neutral',
  };
  return variants[priority] || 'neutral';
};

/**
 * Maps Energy enum to Badge variant
 * Usage: <Badge variant={getEnergyBadgeVariant(task.energyRequired)}>
 */
export const getEnergyBadgeVariant = (energy: Energy): BadgeVariant => {
  const variants: Record<Energy, BadgeVariant> = {
    HIGH: 'mint',
    MEDIUM: 'sun',
    LOW: 'blush',
  };
  return variants[energy] || 'sun';
};

/**
 * Maps EnergyMatch enum to Badge variant
 * Usage: <Badge variant={getEnergyMatchBadgeVariant(plan.energyMatch)}>
 */
export const getEnergyMatchBadgeVariant = (match: EnergyMatch): BadgeVariant => {
  const variants: Record<EnergyMatch, BadgeVariant> = {
    PERFECT: 'success',
    MOSTLY_ALIGNED: 'sky',
    SOME_MISMATCH: 'warn',
    POOR: 'danger',
  };
  return variants[match] || 'neutral';
};
```

**Usage After**:
```typescript
// BEFORE (TasksPage.tsx:225)
<Badge variant={task.priority === 'MUST' ? 'danger' : task.priority === 'SHOULD' ? 'warn' : task.priority === 'COULD' ? 'sun' : 'neutral'} size="small">
  {task.priority}
</Badge>

// AFTER
<Badge variant={getPriorityBadgeVariant(task.priority)} size="small">
  {task.priority}
</Badge>
```

**Files to Update**:
- TodayPage.tsx: lines 258, 293
- TasksPage.tsx: lines 225, 235, 286, 292
- CalendarPage.tsx: lines 369, 544, 564

---

## 2. Date Formatting Utilities (Finding #3)

**File**: `frontend/src/lib/dateUtils.ts` (CREATE NEW)

```typescript
/**
 * Compass Date Utilities
 * Centralized date formatting to ensure consistency across the app
 */

export const FORMAT_OPTIONS = {
  FULL_DATE: {
    weekday: 'long' as const,
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
  },
  SHORT_DATE: {
    month: 'short' as const,
    day: 'numeric' as const,
  },
  DATE_ONLY: {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
  },
};

/**
 * Format today's date with full details (e.g., "Monday, November 10, 2025")
 * Usage: const today = formatTodayLong();
 */
export const formatTodayLong = (): string => {
  return new Date().toLocaleDateString('en-US', FORMAT_OPTIONS.FULL_DATE);
};

/**
 * Format any date with full details
 * Usage: const display = formatDateLong(new Date('2025-11-10'));
 */
export const formatDateLong = (date: Date): string => {
  return date.toLocaleDateString('en-US', FORMAT_OPTIONS.FULL_DATE);
};

/**
 * Format date in short form (e.g., "Nov 10")
 * Usage: const short = formatDateShort(new Date());
 */
export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', FORMAT_OPTIONS.SHORT_DATE);
};

/**
 * Format date for API/storage (e.g., "2025-11-10")
 * Usage: const iso = formatDateISO(new Date());
 */
export const formatDateISO = (date: Date): string => {
  return date.toLocaleDateString('en-US', FORMAT_OPTIONS.DATE_ONLY);
};
```

**Usage After**:
```typescript
// BEFORE (TodayPage.tsx:20-25)
const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// AFTER
import { formatTodayLong } from '../lib/dateUtils';
const today = formatTodayLong();
```

**Files to Update**:
- TodayPage.tsx: line 20
- OrientEastPage.tsx: line 54
- OrientWestPage.tsx: line 26
- ReviewsPage.tsx: lines 81-87, 101

---

## 3. Constants File (Finding #16)

**File**: `frontend/src/lib/constants.ts` (CREATE NEW)

```typescript
/**
 * Compass Application Constants
 * Centralized configuration values used throughout the app
 */

// Review pagination limits
export const REVIEW_LIMITS = {
  DAILY: 30,
  WEEKLY: 12,
} as const;

// Calendar and layout dimensions
export const DIMENSIONS = {
  CALENDAR_SIDEBAR_WIDTH: 'w-1/4',
  CALENDAR_SIDEBAR_HEIGHT: 600,
  CALENDAR_SIDEBAR_MAX_HEIGHT: 'max-h-[600px]',
  WAKING_MINUTES: 960, // 16 hours = 960 minutes
  FOOTER_HEIGHT: 80,
} as const;

// API Cache durations (in seconds)
export const CACHE_DURATIONS = {
  TASKS: 60,
  PLANS: 600,
  REVIEWS: 300,
  TODOIST: 120,
  POSTDO: 300,
} as const;

// Pagination settings
export const PAGINATION = {
  REVIEWS_DAILY: 30,
  REVIEWS_WEEKLY: 12,
  TASKS_PER_PAGE: 20,
  CALENDAR_EVENT_LIMIT: 7,
} as const;

// UI timing constants
export const TIMINGS = {
  TRANSITION_DURATION: 'duration-micro',
  REDIRECT_DELAY: 1500, // milliseconds
  TOAST_DURATION: 3000,
} as const;

// Category list (for dropdowns, filters, etc)
export const CATEGORIES = [
  'SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 
  'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 
  'PERSONAL', 'ADMIN'
] as const;

// Priority levels
export const PRIORITIES = ['MUST', 'SHOULD', 'COULD', 'MAYBE'] as const;

// Energy levels
export const ENERGY_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
```

**Usage After**:
```typescript
// BEFORE (ReviewsPage.tsx:44)
const limit = activeTab === 'DAILY' ? 30 : 12;

// AFTER
import { REVIEW_LIMITS } from '../lib/constants';
const limit = REVIEW_LIMITS[activeTab];
```

---

## 4. LoadingSkeleton Enhancement (Finding #4)

**File**: `frontend/src/components/LoadingSkeleton.tsx` (MODIFY existing)

```typescript
import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'stat' | 'list' | 'fullpage';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'fullpage':
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action mb-16"></div>
              <p className="text-slate">Loading...</p>
            </div>
          </div>
        );

      case 'stat':
        return (
          <div className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
            <div className="h-10 bg-gray-300 rounded w-1/3"></div>
          </div>
        );

      // ... rest of cases remain the same ...

      case 'card':
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        );
    }
  };

  // Return single element for fullpage variant
  if (variant === 'fullpage') {
    return <>{renderSkeleton()}</>;
  }

  // Return multiple elements for other variants
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default LoadingSkeleton;
```

**Usage After**:
```typescript
// BEFORE (TasksPage.tsx:198-201)
{loading ? (
  <div className="flex justify-center items-center py-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
      <p className="mt-16 text-slate">Loading tasks...</p>
    </div>
  </div>
) : ...}

// AFTER
{loading ? <LoadingSkeleton variant="fullpage" /> : ...}
```

**Files to Update**:
- TasksPage.tsx: lines 198-201
- ReviewsPage.tsx: lines 138-146
- CalendarPage.tsx: lines 322-331
- ClarifyPage.tsx: lines 137-142
- OrientEastPage.tsx: lines 168-174
- OrientWestPage.tsx: lines 101-108

---

## 5. TimeBlockCard Component (Finding #8)

**File**: `frontend/src/components/TimeBlockCard.tsx` (CREATE NEW)

```typescript
import React from 'react';
import type { DeepWorkBlock, TimeBlock } from '../types';

interface TimeBlockCardProps {
  type: 'deepWork' | 'admin' | 'buffer';
  focus?: string;
  start: string;
  end: string;
  className?: string;
}

const TimeBlockCard: React.FC<TimeBlockCardProps> = ({
  type,
  focus,
  start,
  end,
  className = '',
}) => {
  const styles = {
    deepWork: 'bg-sky border-sky text-blue-900 text-blue-700',
    admin: 'bg-lavender border-lavender text-purple-900 text-purple-700',
    buffer: 'bg-fog border-fog text-slate text-slate',
  };

  const [bgBorder, textPrimary, textSecondary] = styles[type].split(' ');

  return (
    <div className={`border rounded-default p-12 ${bgBorder} ${className}`}>
      <div className="flex items-center justify-between">
        {focus && (
          <span className={`font-medium ${textPrimary}`}>
            {focus}
          </span>
        )}
        <span className={`text-small ${textSecondary}`}>
          {start} - {end}
        </span>
      </div>
    </div>
  );
};

export default TimeBlockCard;
```

**Usage After**:
```typescript
// BEFORE (TodayPage.tsx:178-187)
<div className="bg-sky border border-sky rounded-default p-12">
  <div className="flex items-center justify-between">
    <span className="font-medium text-blue-900">
      {plan.deepWorkBlock1.focus}
    </span>
    <span className="text-small text-blue-700">
      {plan.deepWorkBlock1.start} - {plan.deepWorkBlock1.end}
    </span>
  </div>
</div>

// AFTER
<TimeBlockCard
  type="deepWork"
  focus={plan.deepWorkBlock1.focus}
  start={plan.deepWorkBlock1.start}
  end={plan.deepWorkBlock1.end}
/>
```

**Files to Update**:
- TodayPage.tsx: lines 178-200
- OrientEastPage.tsx: lines 212-233
- OrientWestPage.tsx: lines 228-245
- CalendarPage.tsx: legend section (lines 414-456)

---

## 6. Backend Error Handler Middleware (Finding #14)

**File**: `backend/src/middleware/errorHandler.ts` (CREATE NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Wraps async route handlers to catch errors automatically
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: Function) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Standardized error handler middleware
 * Add to app: app.use(errorHandler)
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.issues,
    });
  }

  // Prisma not found errors
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Resource not found',
      code: 'NOT_FOUND',
    });
  }

  // Prisma unique constraint violations
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'CONFLICT',
      field: err.meta?.target?.[0],
    });
  }

  // Generic database errors
  if (err.code?.startsWith('P')) {
    console.error('[Prisma Error]', err);
    return res.status(500).json({
      error: 'Database error',
      code: 'DB_ERROR',
    });
  }

  // Generic server errors
  console.error('[Server Error]', err);
  return res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};
```

**Usage After in backend/src/index.ts**:
```typescript
import { errorHandler } from './middleware/errorHandler';

// ... existing setup ...

// Add this AFTER all route registrations
app.use(errorHandler);

// Then update all routes to use asyncHandler:
// BEFORE:
router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AFTER:
router.get('/', asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
}));
```

---

## 7. Backend Validation Schemas (Finding #13)

**File**: `backend/src/validation/schemas.ts` (CREATE NEW)

```typescript
import { z } from 'zod';

// Shared enums
const PRIORITIES = ['MUST', 'SHOULD', 'COULD', 'MAYBE'] as const;
const CATEGORIES = ['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN'] as const;
const ENERGIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
const CONTEXTS = ['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE'] as const;
const TASK_STATUSES = ['NEXT', 'WAITING', 'ACTIVE', 'DONE', 'SOMEDAY'] as const;

// Reusable enums for all schemas
export const priorityEnum = z.enum(PRIORITIES);
export const categoryEnum = z.enum(CATEGORIES);
export const energyEnum = z.enum(ENERGIES);
export const contextEnum = z.enum(CONTEXTS);
export const taskStatusEnum = z.enum(TASK_STATUSES);

// Base task schema (shared between create and update)
export const baseTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  priority: priorityEnum,
  category: categoryEnum,
  context: contextEnum,
  energyRequired: energyEnum,
  duration: z.number().positive('Duration must be positive'),
  definitionOfDone: z.string().min(1, 'Definition of done is required'),
});

// Create task schema
export const createTaskSchema = baseTaskSchema.extend({
  dueDate: z.string().datetime().optional(),
  status: taskStatusEnum.optional().default('NEXT'),
});

// Update task schema (all fields optional)
export const updateTaskSchema = baseTaskSchema.partial();

// Reusable by route files:
export const scheduleTaskSchema = z.object({
  scheduledStart: z.string().datetime(),
});

export const enrichTaskSchema = z.object({
  tempTaskId: z.string().uuid(),
  priority: z.number().min(1).max(4),
  duration: z.number().positive(),
  energy: energyEnum,
});
```

**Usage in routes**:
```typescript
// BEFORE (tasks.ts)
const createTaskSchema = z.object({
  name: z.string().min(1),
  priority: z.enum(['MUST', 'SHOULD', 'COULD', 'MAYBE']),
  category: z.enum(['SCHOOL', 'MUSIC', ...]),
  // ... repeated
});

// AFTER
import { createTaskSchema } from '../validation/schemas';

router.post('/', asyncHandler(async (req, res) => {
  const data = createTaskSchema.parse(req.body);
  const task = await prisma.task.create({ data });
  res.json(task);
}));
```

---

## Implementation Checklist

### Phase 1: Quick Wins (1 day)
- [ ] Add badge variant utilities to designTokens.ts
- [ ] Create dateUtils.ts with date formatters
- [ ] Update TodayPage, TasksPage, CalendarPage, OrientEastPage, OrientWestPage, ReviewsPage
- [ ] Enhance LoadingSkeleton with 'fullpage' variant
- [ ] Update all pages using inline spinners

### Phase 2: Infrastructure (3-5 days)
- [ ] Create constants.ts file
- [ ] Update ReviewsPage and CalendarPage to use constants
- [ ] Create backend errorHandler middleware
- [ ] Create backend validation schemas module
- [ ] Add asyncHandler to all backend routes

### Phase 3: Components (3-5 days)
- [ ] Create TimeBlockCard component
- [ ] Update TodayPage, OrientEastPage, OrientWestPage to use TimeBlockCard
- [ ] Create Modal component wrapper
- [ ] Update TasksPage and CalendarPage modals

### Phase 4: Migrations (Ongoing)
- [ ] Migrate TodayPage to React Query
- [ ] Migrate ReviewsPage to React Query
- [ ] Migrate OrientEastPage/OrientWestPage to React Query
- [ ] Refactor OrientEastPage form with useReducer or Formik

---

## Testing After Refactoring

Run these commands to verify no regressions:

```bash
# Frontend
npm test
npm run lint
npm run build

# Backend
npm test
npm run lint
npm run build
```

Each refactoring should maintain identical behavior while improving code quality.

