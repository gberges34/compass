# Batch 4: Code Quality Quick Wins - Design

**Date**: 2025-01-11
**Status**: Approved
**Estimated Time**: 40 minutes

## Overview

Complete the remaining tasks from Batch 4 by cleaning up ESLint warnings and auditing moment.js dependencies.

### Current Status
- ✅ REQ-FE-007: Badge utilities (completed)
- ❌ REQ-FE-008: Date utils consolidation (has unused imports)
- ❌ REQ-FE-009: moment.js removal (needs audit)
- ❌ REQ-SEC-002: ESLint violations (6 warnings)

### Goal
Achieve a clean build with zero ESLint warnings and document the moment.js dependency situation.

## Scope

**In Scope**:
- Remove 6 unused import warnings across 3 files
- Audit moment.js dependency tree with `npm list moment`
- Document findings and update requirement status
- Verify clean build and working dev environment

**Out of Scope**:
- Replacing react-big-calendar (deferred to future work)
- Adding new linting rules
- Refactoring code structure
- Deep dependency replacement

## Implementation Plan

### 1. ESLint Warning Fixes (15 min)

**Current Warnings**:
1. `useTasks.ts:14` - `getCurrentTimestamp` imported but never used
2. `dateUtils.ts:4` - `formatISO` imported but never used
3. `TodayPage.tsx:6` - `DailyPlan`, `Task`, `PostDoLog` imported but never used
4. `TodayPage.tsx:11` - `getPriorityStyle` imported but never used

**Fix Strategy**:
- Remove unused imports from import statements
- No logic changes, only import cleanup
- TypeScript compiler will catch any actual usage

**Files to Edit**:
```
frontend/src/hooks/useTasks.ts
frontend/src/lib/dateUtils.ts
frontend/src/pages/TodayPage.tsx
```

### 2. Moment.js Audit (10 min)

**Audit Process**:

1. Check direct dependencies:
   ```bash
   grep -i moment frontend/package.json
   ```

2. Check transitive dependencies:
   ```bash
   cd frontend && npm list moment
   ```

3. Document findings based on outcome:

**Scenario A**: `react-big-calendar` depends on moment
- Document as "transitive dependency via react-big-calendar"
- Mark REQ-FE-009 as "Partially Complete - no direct dependency"
- Add note: "Future work: Consider calendar library alternatives"

**Scenario B**: No moment found
- Mark REQ-FE-009 as "Complete"

**Scenario C**: Unexpected dependency
- Document the source
- Assess criticality

### 3. Verification (5 min)

**Build Verification**:
```bash
cd frontend && npm run build
```
Expected: "Compiled successfully!" with no warnings

**Dev Server Check**:
- Verify no console errors
- Visit http://localhost:3000
- Confirm app loads correctly

**TypeScript Check**:
- No type errors
- All imports resolve

### 4. Documentation (10 min)

**Update Status**:
- Mark completed requirements
- Document moment.js audit results
- Commit changes with clear message

**Git Commit**:
```bash
git add frontend/src/hooks/useTasks.ts \
        frontend/src/lib/dateUtils.ts \
        frontend/src/pages/TodayPage.tsx \
        docs/plans/2025-01-11-batch4-code-quality-design.md

git commit -m "chore: clean up ESLint warnings and audit moment.js

- Remove unused imports from useTasks, dateUtils, TodayPage
- Document moment.js dependency status
- Achieve zero-warning build

Part of Batch 4: Code Quality Quick Wins"
```

## Success Criteria

- ✅ Zero ESLint warnings in build output
- ✅ Moment.js dependency chain documented
- ✅ All requirements status updated
- ✅ Changes committed with clear message
- ✅ Dev environment still functional

## Risk Assessment

**Risk**: Removing imports that are actually used
- **Likelihood**: Very Low
- **Impact**: High (breaks build)
- **Mitigation**: TypeScript compiler catches this immediately

**Risk**: Breaking dev server
- **Likelihood**: Very Low
- **Impact**: Medium
- **Mitigation**: Dev server auto-reloads, errors visible immediately

## Future Work

If moment.js is found as transitive dependency:
- Research moment-free calendar libraries
- Evaluate react-big-calendar configuration options
- Consider custom calendar implementation with date-fns

## Audit Results

### Moment.js Dependency Audit

**Finding**: moment.js v2.30.1 is present as a transitive dependency:

```
frontend@0.1.0
└─┬ react-big-calendar@1.19.4
  ├─┬ moment-timezone@0.5.48
  │ └── moment@2.30.1 deduped
  └── moment@2.30.1
```

**Status**: moment.js is NOT a direct dependency (not in package.json). It's pulled in by `react-big-calendar` and `moment-timezone`.

**Recommendation**: Accept this as transitive dependency. All application code uses `date-fns`. Replacing `react-big-calendar` would require significant effort and is beyond scope.

**Future Consideration**: Evaluate alternative calendar libraries that don't depend on moment.js (e.g., FullCalendar, custom implementation with date-fns).

### ESLint Cleanup

**Result**: Build now compiles with zero warnings ✅

**Files Fixed**:
- `frontend/src/hooks/useTasks.ts` - Removed unused `getCurrentTimestamp` import
- `frontend/src/lib/dateUtils.ts` - Removed unused `formatISO` import
- `frontend/src/pages/TodayPage.tsx` - Removed unused type imports and `getPriorityStyle`

## Requirements Status

Final status:

- ✅ **REQ-FE-007**: Badge utilities - Complete
- ✅ **REQ-FE-008**: Date utils consolidated - Complete (unused imports removed)
- 🟡 **REQ-FE-009**: moment.js removed - Partially Complete (no direct dependency, transitive via react-big-calendar)
- ✅ **REQ-SEC-002**: ESLint violations fixed - Complete (zero warnings)
