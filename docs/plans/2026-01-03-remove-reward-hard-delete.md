# Remove Reward (Hard Delete) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Hard-delete the `reward` feature from Compass (data model, API, and UI) so Orient East and downstream pages no longer accept, store, or render rewards.

**Architecture:** Remove `reward` from the `DailyPlan` Prisma model and API contract. Remove `rewardTaken` from `PostDoLog` (unused). Update frontend types and pages that render reward fields. Keep behavior fully backward-safe for days without plans.

**Tech Stack:** Express + Prisma (backend), React + TypeScript (frontend), Zod (API validation).

## Task 1: Remove Reward fields from Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Write a failing check (optional quick grep)**

Run: `rg -n "\\breward\\b|rewardTaken" backend/prisma/schema.prisma`
Expected: matches exist for `DailyPlan.reward` and `PostDoLog.rewardTaken`.

**Step 2: Remove columns from Prisma models**

Edit `backend/prisma/schema.prisma`:
- Remove `DailyPlan.reward`
- Remove `PostDoLog.rewardTaken`

**Step 3: Create migration**

Run: `cd backend && npm run prisma:migrate -- --name remove-reward`
Expected: a new migration under `backend/prisma/migrations/*remove-reward*` with SQL dropping the columns.

**Step 4: Regenerate Prisma client**

Run: `cd backend && npm run prisma:generate`
Expected: succeeds.

## Task 2: Remove Reward from Orient API

**Files:**
- Modify: `backend/src/routes/orient.ts`
- Test: `backend/tests/integration/orient.test.ts`

**Step 1: Update Zod schema + upsert payload**

In `backend/src/routes/orient.ts`:
- Remove `reward` from `orientEastSchema`
- Remove `reward` from `planData`

**Step 2: Update integration tests**

In `backend/tests/integration/orient.test.ts`:
- Remove `reward` from request bodies and assertions.

**Step 3: Run backend tests**

Run: `cd backend && npm test`
Expected: PASS.

## Task 3: Remove Reward from frontend types and API calls

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/pages/OrientEastPage.tsx`

**Step 1: Remove `reward` from types**

In `frontend/src/types/index.ts`:
- Remove `reward?: string` from `DailyPlan`
- Remove `reward?: string` from `CreateDailyPlanRequest`

**Step 2: Stop sending reward in Orient East request**

In `frontend/src/pages/OrientEastPage.tsx`:
- Remove local `reward` state and inputs
- Remove `reward` from `CreateDailyPlanRequest`

## Task 4: Remove Reward UI rendering from Today + Orient West

**Files:**
- Modify: `frontend/src/pages/TodayPage.tsx`
- Modify: `frontend/src/pages/OrientWestPage.tsx`

**Step 1: Remove reward cards**

Delete the conditional reward sections (planned reward displays).

## Task 5: Verify and clean up

**Step 1: Frontend build**

Run: `cd frontend && npm run build`
Expected: PASS.

**Step 2: Workspace verification**

Run: `npm run verify`
Expected: PASS.

