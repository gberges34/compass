# Timery Integration Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add retry logic, skip unmapped projects, and deduplicate overlapping time entries in Toggl integration.

**Architecture:** Wrap Toggl API calls with retry utility, add warning logs for unmapped projects, implement time-based deduplication to prevent double-counting when tasks are tracked in both Compass and Toggl.

**Tech Stack:** TypeScript, Express, Axios, existing withRetry utility

---

## Task 1: Add Retry Logic to getTimeEntriesForDateRange

**Files:**
- Modify: `backend/src/services/timery.ts:1-5` (imports)
- Modify: `backend/src/services/timery.ts:128-147` (getTimeEntriesForDateRange function)

**Step 1: Verify withRetry utility exists**

Run:
```bash
cat backend/src/utils/retry.ts
```

Expected: File exists with `withRetry` export

**Step 2: Add withRetry import to timery.ts**

In `backend/src/services/timery.ts`, modify imports section (after line 2):

```typescript
import axios from 'axios';
import { env } from '../config/env';
import { Category } from '@prisma/client';
import { withRetry } from '../utils/retry';
```

**Step 3: Wrap API call with withRetry**

In `backend/src/services/timery.ts`, replace the `getTimeEntriesForDateRange` function (lines 128-147):

```typescript
export async function getTimeEntriesForDateRange(startDate: Date, endDate: Date): Promise<TogglTimeEntry[]> {
  try {
    // Toggl API expects ISO 8601 format
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const response = await withRetry(() =>
      togglAPI.get('/me/time_entries', {
        params: {
          start_date: startISO,
          end_date: endISO,
        }
      })
    );

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching time entries:', error.response?.data || error.message);
    // Return empty array on error (graceful degradation)
    return [];
  }
}
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 5: Commit**

```bash
git add backend/src/services/timery.ts
git commit -m "feat: add retry logic to getTimeEntriesForDateRange

Wraps Toggl API call with withRetry utility for resilience
against transient failures and rate limits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add Retry Logic to getProjects

**Files:**
- Modify: `backend/src/services/timery.ts:149-165` (getProjects function)

**Step 1: Wrap API call with withRetry**

In `backend/src/services/timery.ts`, replace the `getProjects` function (lines 149-165):

```typescript
async function getProjects(): Promise<Map<number, string>> {
  try {
    const response = await withRetry(() =>
      togglAPI.get('/me/projects')
    );

    const projects: TogglProject[] = response.data || [];

    const projectMap = new Map<number, string>();
    projects.forEach(project => {
      projectMap.set(project.id, project.name);
    });

    return projectMap;
  } catch (error: any) {
    console.error('Error fetching projects:', error.response?.data || error.message);
    return new Map();
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add backend/src/services/timery.ts
git commit -m "feat: add retry logic to getProjects

Wraps Toggl API call with withRetry utility for resilience.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Skip Unmapped Projects with Warnings

**Files:**
- Modify: `backend/src/services/timery.ts:181-199` (entries.forEach loop in getCategoryBalanceFromToggl)

**Step 1: Modify category mapping logic**

In `backend/src/services/timery.ts`, replace the entries.forEach loop in `getCategoryBalanceFromToggl` (lines 181-199):

```typescript
    entries.forEach(entry => {
      // Skip running entries (negative duration)
      if (entry.duration < 0) return;

      // Get project name
      const projectName = entry.project_id
        ? projectMap.get(entry.project_id)
        : null;

      // Map project to category
      const category = projectName && TOGGL_PROJECT_CATEGORY_MAP[projectName]
        ? TOGGL_PROJECT_CATEGORY_MAP[projectName]
        : null;

      // Skip unmapped projects with warning
      if (!category) {
        console.warn(
          `Skipping Toggl entry: unmapped project "${projectName || 'No Project'}" ` +
          `(ID: ${entry.project_id || 'none'}, duration: ${Math.floor(entry.duration / 60)}m). ` +
          `Add to TOGGL_PROJECT_CATEGORY_MAP to include in metrics.`
        );
        return;
      }

      // Convert seconds to minutes
      const durationMinutes = Math.floor(entry.duration / 60);

      // Accumulate
      categoryBalance[category] = (categoryBalance[category] || 0) + durationMinutes;
    });
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 3: Test warning logs (manual)**

To test, you would need to:
1. Create a Toggl entry with an unmapped project
2. Trigger a review calculation
3. Check backend logs for warning message

Skip this step if you don't have test Toggl data.

**Step 4: Commit**

```bash
git add backend/src/services/timery.ts
git commit -m "feat: skip unmapped Toggl projects with warnings

Instead of defaulting to PERSONAL, skip entries with unmapped
projects and log detailed warnings. Prevents silent miscategorization
and gives visibility into configuration issues.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add Deduplication Helper Function

**Files:**
- Modify: `backend/src/services/timery.ts:112-126` (add new function after stopRunningEntry)

**Step 1: Add isTogglEntryDuplicate helper function**

In `backend/src/services/timery.ts`, add this function after `stopRunningEntry()` (around line 111):

```typescript
// Helper to detect if a Toggl entry overlaps with any Compass PostDoLog
function isTogglEntryDuplicate(
  togglEntry: { start: string; stop: string | null },
  postDoLogs: Array<{ completionDate: Date; actualDuration: number }>
): boolean {
  const TOLERANCE_MINUTES = 15;
  const toleranceMs = TOLERANCE_MINUTES * 60 * 1000;

  const togglStart = new Date(togglEntry.start);
  const togglEnd = togglEntry.stop ? new Date(togglEntry.stop) : new Date();

  return postDoLogs.some(log => {
    // Estimate Compass task end time: completionDate
    // Estimate Compass task start time: completionDate - actualDuration
    const compassEnd = log.completionDate;
    const compassStart = new Date(compassEnd.getTime() - log.actualDuration * 60 * 1000);

    // Apply tolerance to Compass time range
    const compassStartWithTolerance = new Date(compassStart.getTime() - toleranceMs);
    const compassEndWithTolerance = new Date(compassEnd.getTime() + toleranceMs);

    // Check if time ranges overlap (with tolerance)
    // Overlap if: toggl_start <= compass_end AND toggl_end >= compass_start
    return togglStart <= compassEndWithTolerance && togglEnd >= compassStartWithTolerance;
  });
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 3: Commit**

```bash
git add backend/src/services/timery.ts
git commit -m "feat: add time overlap deduplication helper

Detects if Toggl entry overlaps with Compass task using 15-minute
tolerance window. Prevents double-counting when same work is
tracked in both systems.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Update getCategoryBalanceFromToggl to Accept PostDoLogs

**Files:**
- Modify: `backend/src/services/timery.ts:167-171` (function signature)
- Modify: `backend/src/services/timery.ts:181-199` (add deduplication check)

**Step 1: Update function signature**

In `backend/src/services/timery.ts`, update the `getCategoryBalanceFromToggl` function signature (line 168):

```typescript
export async function getCategoryBalanceFromToggl(
  startDate: Date,
  endDate: Date,
  postDoLogs: Array<{ completionDate: Date; actualDuration: number }> = []
): Promise<Record<string, number>> {
```

**Step 2: Add deduplication check in entries loop**

In the `entries.forEach` loop, add deduplication check right after the running entry check (after line 183):

```typescript
    entries.forEach(entry => {
      // Skip running entries (negative duration)
      if (entry.duration < 0) return;

      // Skip if this overlaps with a Compass task (dedupe)
      if (isTogglEntryDuplicate(entry, postDoLogs)) {
        console.log(
          `Skipping duplicate Toggl entry (overlaps with Compass task): ` +
          `"${entry.description || 'No description'}", ${Math.floor(entry.duration / 60)}m`
        );
        return;
      }

      // Get project name
      const projectName = entry.project_id
        ? projectMap.get(entry.project_id)
        : null;

      // ... rest of existing logic
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add backend/src/services/timery.ts
git commit -m "feat: integrate deduplication into category balance calculation

Accepts postDoLogs parameter and skips Toggl entries that overlap
with Compass tasks. Logs skipped duplicates for visibility.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Update Review Routes to Pass PostDoLogs

**Files:**
- Modify: `backend/src/routes/reviews.ts:88-90` (daily metrics)
- Modify: `backend/src/routes/reviews.ts:173-175` (weekly metrics)

**Step 1: Update daily metrics call**

In `backend/src/routes/reviews.ts`, update the `getCategoryBalanceFromToggl` call in `calculateDailyMetrics` (around line 89):

```typescript
  // Get category balance from Toggl (gracefully handles errors)
  const togglCategoryBalance = await getCategoryBalanceFromToggl(
    dayStart,
    dayEnd,
    postDoLogs
  );
```

**Step 2: Update weekly metrics call**

In `backend/src/routes/reviews.ts`, update the `getCategoryBalanceFromToggl` call in `calculateWeeklyMetrics` (around line 174):

```typescript
  // Get category balance from Toggl (gracefully handles errors)
  const togglCategoryBalance = await getCategoryBalanceFromToggl(
    weekStart,
    weekEnd,
    postDoLogs
  );
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```

Expected: No type errors

**Step 4: Commit**

```bash
git add backend/src/routes/reviews.ts
git commit -m "feat: enable deduplication in review calculations

Passes postDoLogs to Toggl service so duplicate time entries
can be detected and excluded from metrics.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Manual Testing & Verification

**Files:**
- None (verification only)

**Step 1: Verify backend compiles and starts**

Run:
```bash
cd backend && npm run build
```

Expected: Build succeeds with no errors

**Step 2: Start backend and check logs**

Run:
```bash
cd backend && npm run dev
```

Expected: Server starts on port 3001

**Step 3: Optional - Test with real data**

If you have Toggl data configured:

1. **Test unmapped project warning:**
   - Create a Toggl entry with a project not in TOGGL_PROJECT_CATEGORY_MAP
   - Trigger a daily review: `curl -X POST http://localhost:3001/api/reviews/daily -H "Content-Type: application/json" -d '{"wins":["test"],"misses":[],"lessons":[],"nextGoals":[]}'`
   - Check backend logs for warning message

2. **Test deduplication:**
   - Complete a Compass task at a specific time
   - Create a Toggl entry overlapping that time (within 15 minutes)
   - Trigger a daily review
   - Check backend logs for "Skipping duplicate" message
   - Verify category balance only counts time once

**Step 4: Commit any final adjustments**

If you found bugs during testing:
```bash
git add <files>
git commit -m "fix: <description>"
```

---

## Manual Testing Scenarios

**Scenario 1: Transient API Failure**
- Simulate by temporarily setting invalid TOGGL_API_TOKEN
- Trigger review creation
- Verify retry attempts in logs
- Verify graceful degradation (empty Toggl data, Compass data still works)

**Scenario 2: Unmapped Project**
- Create Toggl entry with project "TestProject" (not in map)
- Trigger review creation
- Verify warning log appears with project name and duration
- Verify project is excluded from category balance

**Scenario 3: Overlapping Time Entries**
- Complete Compass task at 10:00 AM (30 minutes duration)
- Create Toggl entry from 10:05 AM to 10:35 AM
- Trigger review creation
- Verify "Skipping duplicate" log appears
- Verify only 30 minutes counted (not 60)

**Scenario 4: Non-Overlapping Time Entries**
- Complete Compass task at 10:00 AM (30 minutes duration)
- Create Toggl entry from 10:20 AM to 10:50 AM (more than 15 min gap)
- Trigger review creation
- Verify no "Skipping duplicate" log
- Verify both entries counted (60 minutes total)

---

## Completion Checklist

- [ ] All 7 tasks completed with commits
- [ ] TypeScript compiles with no errors
- [ ] Backend starts successfully
- [ ] (Optional) Manual testing scenarios passed
- [ ] Design document updated if implementation differs
- [ ] Ready for code review

---

## Notes for Future Testing

This PR adds error handling and deduplication logic but lacks automated tests. Consider adding:

1. **Unit tests for deduplication logic:**
   - Test exact overlap (0 min gap)
   - Test within tolerance (10 min gap)
   - Test outside tolerance (20 min gap)
   - Test edge cases (running entries, null stop times)

2. **Integration tests for retry logic:**
   - Mock Toggl API failures
   - Verify retry attempts
   - Verify graceful degradation

3. **Integration tests for unmapped projects:**
   - Mock Toggl response with unmapped project
   - Verify warning logged
   - Verify project excluded from balance

Consider using Jest + supertest pattern when backend testing infrastructure is added.
