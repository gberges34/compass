# Dependency Health Checks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `/api/health` so it performs parallel, timeout-bound checks for critical dependencies (database, Todoist, HealthKit stub, Toggl stub), returning HTTP 503 when required services fail and emitting structured diagnostics for observability.

**Architecture:** Introduce a `runHealthChecks` service that encapsulates dependency metadata (name, required flag, timeout, checker). Each checker runs concurrently via `Promise.allSettled`, and the endpoint aggregates results into a JSON response with `.status` = `ok` only when all required dependencies report `up`. Failures log once per request with latency details.

**Tech Stack:** Node.js (Express), TypeScript, Prisma, Jest (backend tests), Supertest for integration coverage.

---

### Task 1: Build health check service utilities

**Files:**
- Create: `backend/src/services/health.ts`
- Create: `backend/src/services/__tests__/health.test.ts`
- Modify: `backend/tsconfig.json` if path aliases needed

**Step 1: Write failing unit tests**
- Mock Prisma client + axios/fetch to simulate: all dependencies up, DB failure, Todoist timeout, optional stub `unknown`.
- Ensure tests assert `overallStatus`, individual dependency payloads, timeout enforcement.
Run: `cd backend && npm test -- health.test.ts --watch=false` (expected FAIL).

**Step 2: Implement helpers**
- Export `DependencyStatus`, `DependencyCheck`, `runHealthChecks`, `withTimeout`.
- Implement `checkDatabase` (uses `prisma.$queryRaw` or `prisma.$runCommandRaw('SELECT 1')`), `checkTodoist` (HEAD request with API key if available, else `down`), `checkHealthKit`/`checkToggl` stubs returning `{ status: 'unknown', error: 'not-implemented' }`.
- Include latency measurement and conditional logging (log when status !== 'up' or latency exceeds `timeoutMs * 0.8`).

**Step 3: Re-run tests** (same command, expect PASS).

**Step 4: Commit**
```bash
git add backend/src/services/health.ts backend/src/services/__tests__/health.test.ts backend/tsconfig.json
git commit -m "feat(backend): add dependency health check service"
```

---

### Task 2: Wire service into `/api/health`

**Files:**
- Modify: `backend/src/index.ts`
- Optional: `backend/src/types/express.d.ts` if custom request IDs added

**Step 1: Update route handler**
- Replace static response with `const result = await runHealthChecks();`
- Determine HTTP status: `const statusCode = result.overallStatus === 'ok' ? 200 : 503;`
- Respond with payload containing `status`, `timestamp`, `dependencies`, `version` (optional), `service`.

**Step 2: Ensure express error handling covers async route (wrap or use `void runHealthChecks().then...`).**

**Step 3: Manual smoke test**
```bash
npm run start:backend
curl -s http://localhost:3001/api/health | jq
```
Expect JSON listing dependencies; kill DB or revoke ENV to simulate 503.

**Step 4: Commit**
```bash
git add backend/src/index.ts
git commit -m "feat(backend): enhance /api/health with dependency checks"
```

---

### Task 3: Add integration tests, scripts, and docs

**Files:**
- Add: `backend/src/__tests__/integration/health.integration.test.ts`
- Modify: `scripts/health-check.sh`
- Modify: `README.md` or `ANALYSIS_SUMMARY.md`

**Step 1: Integration test**
- Spin up Express app via `supertest`.
- Mock dependency functions (jest mocks) to force success/failure scenarios.
- Assert HTTP 200/503 responses and payload schema.

**Step 2: Update scripts**
- In `scripts/health-check.sh`, parse new `status` field; exit non-zero when HTTP 503 or `.status != "ok"`.

**Step 3: Document behavior**
- Add README section describing dependency checks, timeouts, how to add new dependencies, and stub statuses.

**Step 4: Run backend test suite + verify**
```bash
cd backend && npm test
cd .. && npm run verify   # ensure health script expects new format
```

**Step 5: Commit**
```bash
git add backend/src/__tests__/integration/health.integration.test.ts scripts/health-check.sh README.md
git commit -m "test(backend): cover dependency health endpoint"
```

---

Plan complete and saved to `docs/plans/2025-11-13-dependency-health-checks-plan.md`.

Execution options:
1. Subagent-Driven (this session) – I’ll dispatch superpowers:subagent-driven-development per task with checkpoints.
2. Parallel Session – Open a new session in this worktree and use superpowers:executing-plans.

Which would you prefer?
