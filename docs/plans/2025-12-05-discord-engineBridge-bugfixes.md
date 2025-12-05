# Discord Engine Bridge Bugfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two presence-handling bugs in `backend/src/discord/engineBridge.ts`: (1) clear pending Gaming stop timers when presence resumes with a game, and (2) treat denylisted-only presence as “no game” when Gaming is active so slices stop correctly.

**Architecture:** Add targeted state/timer management in the presence handler: cancel stop timers when new game presence arrives, and route denylisted-only presence through the stop debounce when Gaming is active. Extend unit tests to lock in the intended behavior.

**Tech Stack:** Node.js, TypeScript, Jest.

---

### Task 1: Add failing tests covering stop timer clearing and denylisted-only stop

**Files:**
- Modify: `backend/src/discord/__tests__/engineBridge.test.ts`

**Step 1: Write failing test for clearing stop timer on resumed game presence**

Add a test that:
- Starts with Gaming active (`state.gaming.gamingActive = true`, `stopTimer` set to a fake timeout).
- Calls `handlePresenceUpdate` with a new game presence and `forceStartNow: true`.
- Expects the stop timer to be cleared (null) and no stop scheduled.

**Step 2: Write failing test for denylisted-only presence stopping Gaming**

Add a test that:
- Sets `state.gaming.gamingActive = true`.
- Calls `handlePresenceUpdate` with `isOnlyDenylisted = true`, `hasGame = false`, `gameName = null`.
- Expects a stop to be scheduled immediately (you can assert via a mock `stopSlice` call using a `forceStartNow` or direct invocation pattern, or by invoking the stop path directly if you structure the test with a short debounce and `forceStartNow` flag).

**Step 3: Run the specific test file and observe failures**

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/engineBridge.test.ts
```

Expected: new tests fail (missing logic).

---

### Task 2: Fix presence handling in engineBridge

**Files:**
- Modify: `backend/src/discord/engineBridge.ts`

**Step 1: Clear pending stop timers when handling a new game presence**

In `handlePresenceUpdate`, before scheduling/starting a new game (after denylist/no-game handling), add:

```ts
if (state.gaming.stopTimer) {
  clearTimeout(state.gaming.stopTimer);
  state.gaming.stopTimer = null;
}
```

**Step 2: Route denylisted-only presence through the stop path when Gaming is active**

Change the `isOnlyDenylisted` branch to:
- If `state.gaming.gamingActive`, behave like the “no game” branch: clear any existing stop timer and schedule the 60s stop debounce (or invoke stop immediately when `forceStartNow` is used in tests).
- If Gaming is not active, simply return (no action).

**Step 3: Re-run tests**

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/engineBridge.test.ts
```

Expected: tests pass.

---

### Task 3: Optional cleanup for timer warnings in tests

**Files:**
- Modify (optional): `backend/src/discord/__tests__/engineBridge.test.ts`

**Step 1: Use fake timers or explicit cleanup**

If Jest warns about open handles, add `afterEach` to clear any timers you create in tests (e.g., `jest.useFakeTimers()` + `jest.runAllTimers()` or manual `clearTimeout` references).

**Step 2: Re-run tests**

```bash
cd backend
npm test -- --runTestsByPath src/discord/__tests__/engineBridge.test.ts
```

Expected: tests pass without open-handle warnings (optional).

---

### Task 4: Full test sweep

**Files:**
- Existing tests

**Step 1: Run Discord test suite**

```bash
cd backend
npm test -- src/discord/__tests__
```

Expected: all Discord tests pass.

**Step 2: Run build**

```bash
cd backend
npm run build
```

Expected: typecheck/build passes.

---

Plan complete and saved to `docs/plans/2025-12-05-discord-engineBridge-bugfixes.md`. Two execution options:

1. **Subagent-Driven (this session)** – we dispatch fresh subagent per task with code review between tasks.
2. **Parallel Session** – open a new session with `superpowers:executing-plans` to implement in batches.

Which approach?***
