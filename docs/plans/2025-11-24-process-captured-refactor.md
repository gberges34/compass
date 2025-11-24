# Process Captured Task Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove server-side LLM enrichment, accept fully enriched tasks from the iOS Shortcut, and resolve backend build/test errors related to shared DTO imports and Prisma transactions.

**Architecture:** Keep the Express + Prisma backend intact while relying on client-enriched payloads validated by Zod; use TypeScript path aliases to target shared DTOs; loosen transaction helper typings to support the extended Prisma client; keep Jest tests aligned with Prisma 6 error shapes.

**Tech Stack:** Node.js, Express 5, Prisma 6, TypeScript 5, Zod, Jest/ts-jest.

### Task 1: Align backend path aliases with shared DTOs

**Files:**
- Modify: `backend/tsconfig.json`

**Step 1: Review current TypeScript config**  
Run: `cd backend && cat tsconfig.json`  
Expected: Existing compilerOptions without shared DTO paths.

**Step 2: Add DTO path aliases**  
Update compilerOptions with `baseUrl: "./src"` and:  
```json
"paths": {
  "@compass/dto/*": ["../../shared/dto/*"],
  "@compass/dto": ["../../shared/dto/index.d.ts"]
}
```
Ensure the rest of the config remains unchanged.

**Step 3: Type-check backend build**  
Run: `cd backend && npm run build`  
Expected: No module resolution errors for `@compass/dto/pagination` or other DTO imports.

### Task 2: Refactor POST /process-captured to accept enriched payloads

**Files:**
- Modify: `backend/src/routes/tasks.ts`
- (Verify unused): `backend/src/services/llm.ts`

**Step 1: Remove server-side enrichment dependency**  
Delete the `enrichTask` import and any related priority maps or enrichment calls.

**Step 2: Use validated payload directly**  
Rewrite the `/process-captured` handler to:
- Parse with `processCapturedTaskSchema`.
- Derive `status` from priority (`MUST`/`SHOULD` → `NEXT`, else `WAITING`).
- Create the task from validated fields (`name`, `priority`, `category`, `context`, `energyRequired`, `duration`, `definitionOfDone`, `dueDate`), marking `tempCapturedTask` as processed.

**Step 3: Confirm no stale enrichment references**  
Run: `cd backend && rg "enrichTask" src`  
Expected: No remaining references; if the file is unused, schedule deletion in a follow-up cleanup.

**Step 4: Re-run backend type-check**  
Run: `cd backend && npm run build`  
Expected: Build succeeds with updated route logic.

### Task 3: Relax Prisma transaction types in reviews helpers

**Files:**
- Modify: `backend/src/routes/reviews.ts`

**Step 1: Broaden helper signatures**  
Change `calculateDailyMetrics` and `calculateWeeklyMetrics` to accept the extended Prisma client by typing `tx?: any` (or `Prisma.TransactionClient | any`) while keeping existing logic.

**Step 2: Quick type-check**  
Run: `cd backend && npm run build`  
Expected: No `TransactionClient` incompatibility errors.

### Task 4: Update Prisma error middleware test for Prisma 6

**Files:**
- Modify: `backend/src/middleware/__tests__/prismaErrorMiddleware.test.ts`

**Step 1: Adjust error constructor usage**  
Instantiate `PrismaClientKnownRequestError` with the Prisma 6 config object:  
```ts
const err = new PrismaClientKnownRequestError('Simulated Prisma error', {
  code,
  clientVersion: '6.19.0',
});
(err as any).meta = meta;
```

**Step 2: Run targeted Jest test**  
Run: `cd backend && npm test -- prismaErrorMiddleware.test.ts`  
Expected: Test passes and error handling assertions still hold.

### Task 5: Final verification

**Files:**
- Modify: none

**Step 1: Full backend test sweep**  
Run: `cd backend && npm test`  
Expected: All suites pass.

**Step 2: Sanity check build artifacts**  
Run: `cd backend && npm run build`  
Expected: Compiles cleanly after all changes.
