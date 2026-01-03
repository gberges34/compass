# Reviews "Load More" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Show only the latest 3 reviews by default, with a "Load more" button that expands to 30 (already prefetched), then loads additional pages of 30 (3/30/60/90…).

**Architecture:** Keep the existing `useInfiniteQuery` pagination (`limit: 30`) so charts and the page still have recent history immediately available. Add UI-level pagination state in `ReviewsPage` that controls how many loaded items are rendered and decides when to call `fetchNextPage()`.

**Tech Stack:** React 19, TypeScript, `@tanstack/react-query` (infinite queries), Jest + Testing Library.

### Task 1: Add UI-level pagination state

**Files:**
- Modify: `frontend/src/pages/ReviewsPage.tsx`

**Step 1: Add constants and state**
- Add `PAGE_SIZE = 30` and `INITIAL_VISIBLE_REVIEWS = 3`
- Add `visibleReviewCount` state initialized to `INITIAL_VISIBLE_REVIEWS`
- Add `pendingExpandTo` state used when a click triggers a fetch and we need to expand once data arrives

**Step 2: Reset visibility on tab change**
- When switching Daily/Weekly, reset `visibleReviewCount` back to `INITIAL_VISIBLE_REVIEWS`
- Clear `pendingExpandTo` and any expanded review (so the view doesn’t open a now-hidden review)

**Step 3: Implement "Load more" click behavior**
- If `visibleReviewCount < PAGE_SIZE`, set it to `PAGE_SIZE` and do not fetch (this is the “first click takes us to current implementation” requirement).
- Else compute `target = visibleReviewCount + PAGE_SIZE`
  - If the already-loaded `reviews.length >= target`, just set `visibleReviewCount = target`
  - Otherwise call `fetchNextPage()`, set `pendingExpandTo = target`, and expand to `reviews.length` for now

**Step 4: Expand after fetch**
- Add an effect that watches `reviews.length` and, if `pendingExpandTo` is set, expands `visibleReviewCount` to `min(pendingExpandTo, reviews.length)` and clears `pendingExpandTo`.

**Step 5: Render the sliced list**
- Replace `reviews.map(...)` with `reviews.slice(0, visibleReviewCount).map(...)`.
- Render a centered `Button` after the list when `visibleReviewCount < reviews.length || hasNextPage`.
- Disable the button and show a loading label while `isFetchingNextPage` is true.

### Task 2: Add a focused test for 3/30/60 behavior

**Files:**
- Create: `frontend/src/pages/__tests__/ReviewsPage-load-more.test.tsx`

**Step 1: Write the failing test**
- Mock `../hooks/useReviews` so `useFlatReviews()` returns 30 items, `hasNextPage: true`, and a `fetchNextPage` mock.
- Mock heavy chart components (`recharts`, `RadialClockChart`, `DaySelector`, `CreateReviewModal`) to simple placeholders.
- Assert only 3 review headers are shown initially.
- Click "Load more" once: assert 30 are shown and `fetchNextPage` was not called.
- Click "Load more" again: assert `fetchNextPage` called once, then rerender with 60 items and assert 60 shown.

**Step 2: Run the test**
Run: `cd frontend && npm test -- --watch=false ReviewsPage-load-more.test.tsx`
Expected: PASS

### Task 3: Verify no regressions

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS

