# Timery Integration Improvements

**Date:** 2025-11-12
**Branch:** feature/timery-category-balance
**Status:** Design Complete

## Overview

Three critical improvements to the Toggl/Timery integration added in the initial PR:

1. **Add retry logic** to external API calls (compliance with CLAUDE.md)
2. **Skip unmapped projects** instead of defaulting to PERSONAL category
3. **Deduplicate time entries** to prevent double-counting when tasks are tracked in both Compass and Toggl

## Problem Statement

### 1. Missing Retry Logic (CRITICAL)
Current implementation violates CLAUDE.md requirement that all external API calls use `withRetry()` utility. Toggl API calls in `getTimeEntriesForDateRange()` and `getProjects()` lack retry wrappers.

**Impact:** Transient network failures or rate limits cause silent data loss in review metrics.

### 2. Unmapped Project Defaulting (IMPORTANT)
Line 193 in `timery.ts` defaults unmapped Toggl projects to PERSONAL category without warning.

**Impact:** Misconfiguration silently pollutes metrics. User doesn't know they're missing project mappings.

### 3. Double-Counting Risk (IMPORTANT)
If a user completes a Compass task (which records actualDuration in PostDoLog) AND manually tracks the same work in Toggl, both time entries are summed together.

**Example:** 60-minute task → counted as 120 minutes in category balance.

## Solution Design

### 1. Retry Logic Implementation

**File:** `backend/src/services/timery.ts`

Add import:
```typescript
import { withRetry } from '../utils/retry';
```

Wrap API calls in both functions:
- `getTimeEntriesForDateRange()` (line 134)
- `getProjects()` (line 152)

Example:
```typescript
const response = await withRetry(() =>
  togglAPI.get('/me/time_entries', { params })
);
```

**Configuration:** Uses default retry behavior (4 retries, exponential backoff, handles 5xx/429/network errors)

**Graceful degradation:** Still returns empty array/map on final failure.

### 2. Skip Unmapped Projects

**File:** `backend/src/services/timery.ts`, function `getCategoryBalanceFromToggl()` (lines 181-199)

**Change:** Instead of defaulting to PERSONAL, skip unmapped entries:

```typescript
const category = projectName && TOGGL_PROJECT_CATEGORY_MAP[projectName]
  ? TOGGL_PROJECT_CATEGORY_MAP[projectName]
  : null;

if (!category) {
  console.warn(
    `Skipping Toggl entry: unmapped project "${projectName || 'No Project'}" ` +
    `(ID: ${entry.project_id || 'none'}, duration: ${Math.floor(entry.duration / 60)}m). ` +
    `Add to TOGGL_PROJECT_CATEGORY_MAP to include in metrics.`
  );
  return;
}
```

**Warning message includes:**
- Project name (or "No Project" if null)
- Project ID
- Duration being skipped
- Actionable fix (add to map)

### 3. Time-Based Deduplication

**Architecture decision:** Deduplication logic lives in `reviews.ts` (not `timery.ts`) because:
- Requires PostDoLog data from Compass (Prisma access)
- Timery service should remain pure (only Toggl API interaction)
- Merging happens in review calculation layer

**Implementation:**

**Step 1:** Add helper function to `backend/src/routes/reviews.ts` (after line 35):

```typescript
function isTogglEntryDuplicate(
  togglEntry: { start: string; stop: string | null },
  postDoLogs: Array<{ completionDate: Date; actualDuration: number }>
): boolean {
  const TOLERANCE_MINUTES = 15;
  const toleranceMs = TOLERANCE_MINUTES * 60 * 1000;

  const togglStart = new Date(togglEntry.start);
  const togglEnd = togglEntry.stop ? new Date(togglEntry.stop) : new Date();

  return postDoLogs.some(log => {
    const compassEnd = log.completionDate;
    const compassStart = new Date(compassEnd.getTime() - log.actualDuration * 60 * 1000);

    const compassStartWithTolerance = new Date(compassStart.getTime() - toleranceMs);
    const compassEndWithTolerance = new Date(compassEnd.getTime() + toleranceMs);

    return togglStart <= compassEndWithTolerance && togglEnd >= compassStartWithTolerance;
  });
}
```

**Step 2:** Modify `getCategoryBalanceFromToggl()` signature in `timery.ts`:

```typescript
export async function getCategoryBalanceFromToggl(
  startDate: Date,
  endDate: Date,
  postDoLogs: Array<{ completionDate: Date; actualDuration: number }> = []
): Promise<Record<string, number>>
```

**Step 3:** Add deduplication check in entries loop (timery.ts line 181):

```typescript
if (isTogglEntryDuplicate(entry, postDoLogs)) {
  console.log(
    `Skipping duplicate Toggl entry (overlaps with Compass task): ` +
    `${entry.description || 'No description'}, ${Math.floor(entry.duration / 60)}m`
  );
  return;
}
```

**Step 4:** Update call sites in `reviews.ts` to pass postDoLogs:

```typescript
// Daily metrics (line 89)
const togglCategoryBalance = await getCategoryBalanceFromToggl(
  dayStart, dayEnd, postDoLogs
);

// Weekly metrics (line 174)
const togglCategoryBalance = await getCategoryBalanceFromToggl(
  weekStart, weekEnd, postDoLogs
);
```

**Deduplication Logic:**
1. Reconstruct Toggl time range: `start` → `stop`
2. Reconstruct Compass time range: `completionDate - actualDuration` → `completionDate`
3. Check overlap with ±15 minute tolerance
4. If overlap detected, skip Toggl entry (Compass data takes priority)

**Tolerance rationale:** 15 minutes accounts for real-world delays in stopping timers or completing tasks without being overly permissive.

## Files Changed

- `backend/src/services/timery.ts` - Add retry logic, skip unmapped projects, accept postDoLogs parameter
- `backend/src/routes/reviews.ts` - Add deduplication helper, pass postDoLogs to Toggl service

## Testing Considerations

**Manual testing scenarios:**
1. Toggl API failure → Verify retry attempts, graceful degradation
2. Unmapped Toggl project → Verify warning log, skipped from metrics
3. Same task tracked in both systems → Verify only counted once
4. Tasks with 14-minute gap → Not deduplicated (within tolerance)
5. Tasks with 16-minute gap → Not deduplicated (outside tolerance)

**Edge cases:**
- Running Toggl entry (negative duration) → Already skipped
- Toggl entry with no project → Correctly logged as "No Project"
- Empty PostDoLogs array → No deduplication (all Toggl entries counted)

## Migration Notes

**No database changes required** - purely logic improvements.

**Backward compatible** - PostDoLogs parameter has default value, existing behavior preserved if not passed.

**Observability improvements:**
- Retry attempts logged by `withRetry()` utility
- Unmapped projects logged with actionable warnings
- Duplicate entries logged with descriptions

## Success Metrics

- Zero silent failures from Toggl API (retry handling)
- Clear visibility into unmapped projects (warning logs)
- Accurate time metrics (no double-counting)
