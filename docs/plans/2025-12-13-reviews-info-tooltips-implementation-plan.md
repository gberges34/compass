# Reviews Info Tooltips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an ⓘ info tooltip (hover on desktop, tap-to-toggle on touch) next to three Reviews page chart titles, backed by a typed, page-local tooltip content registry.

**Architecture:** Implement a reusable `InfoTooltip` component that is CSS-hover driven on devices with hover support and state-driven on coarse pointers (touch). Wire three tooltips on `ReviewsPage.tsx` by passing `content={...}` from a page-local registry file.

**Tech Stack:** React 19, TailwindCSS, TypeScript, React Testing Library + Jest.

---

## Tooltip IDs and Copy (v1)

- `chart-execution` — Execution Rate Trend
  - What it is: Percentage of planned outcomes you actually achieved.
  - Where it comes from: Historical Review records.
  - How it’s derived: (Completed Outcomes / Planned Outcomes) × 100 per day.
- `chart-cat-balance` — Category Balance
  - What it is: Breakdown of time spent on structured work/tasks.
  - Where it comes from: Completed Compass tasks + Linked Toggl entries.
  - How it’s derived: Sum of PostDoLog durations grouped by category.
- `chart-activities` — Primary Activities
  - What it is: Breakdown of unstructured life time (e.g., Sleep, Commute, Chores).
  - Where it comes from: Time Engine slices not linked to specific tasks.
  - How it’s derived: PRIMARY dimension slices summed by category.

---

## Task 1: Add the page-local tooltip registry

**Files:**
- Create: `frontend/src/pages/reviews/reviewsHelpContent.tsx`

**Step 1: Write the file**

Implement a typed map keyed by the three IDs above. Keep content “rich but limited” as `ReactNode` (paragraphs + bold labels). Example structure:

```tsx
import React from 'react';

export type ReviewsHelpId = 'chart-execution' | 'chart-cat-balance' | 'chart-activities';

export const reviewsHelpContent: Record<ReviewsHelpId, React.ReactNode> = {
  'chart-execution': (
    <div className="space-y-8">
      <p>
        <span className="font-semibold">What it is:</span> Percentage of planned outcomes you actually achieved.
      </p>
      <p>
        <span className="font-semibold">Where it comes from:</span> Historical Review records.
      </p>
      <p>
        <span className="font-semibold">How it’s derived:</span> (Completed Outcomes / Planned Outcomes) × 100 per day.
      </p>
    </div>
  ),
  // ...other IDs
};
```

**Step 2: Commit**

```bash
git add frontend/src/pages/reviews/reviewsHelpContent.tsx
git commit -m "feat(frontend): add reviews help tooltip registry"
```

---

## Task 2: Create `InfoTooltip` component (desktop hover + touch toggle)

**Files:**
- Create: `frontend/src/components/InfoTooltip.tsx`
- Test: `frontend/src/components/__tests__/InfoTooltip.test.tsx`

### Step 1: Write the failing test (touch toggle + outside dismiss)

Create `frontend/src/components/__tests__/InfoTooltip.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InfoTooltip from '../InfoTooltip';

const setTouchMatchMedia = (isTouch: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: isTouch,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('InfoTooltip (touch mode)', () => {
  beforeEach(() => {
    setTouchMatchMedia(true);
  });

  it('toggles open on tap and closes on outside tap', () => {
    render(
      <div>
        <InfoTooltip ariaLabel="About execution rate" content={<div>Tooltip body</div>} />
        <button type="button">Outside</button>
      </div>
    );

    const trigger = screen.getByRole('button', { name: /about execution rate/i });
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');

    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'true');

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');
  });

  it('closes on Escape', () => {
    render(<InfoTooltip ariaLabel="About execution rate" content={<div>Tooltip body</div>} />);
    const trigger = screen.getByRole('button', { name: /about execution rate/i });

    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-open', 'false');
  });
});
```

**Run:** `cd frontend && npm test -- InfoTooltip.test.tsx --watch=false`  
**Expected:** FAIL because `InfoTooltip` doesn’t exist yet.

### Step 2: Implement the minimal component to make tests pass

Create `frontend/src/components/InfoTooltip.tsx` with:
- `content: React.ReactNode`, `ariaLabel: string`
- `const wrapperRef = useRef<HTMLSpanElement>(null)`
- `const [isOpen, setIsOpen] = useState(false)`
- `const [isTouch, setIsTouch] = useState(false)` (derived from `matchMedia('(hover: none), (pointer: coarse)')`)
- `useEffect` that:
  - sets initial `isTouch` and subscribes to media query changes
  - when `isTouch && isOpen`, attaches:
    - `mousedown`/`pointerdown` listener to close if click is outside `wrapperRef`
    - `keydown` listener to close on `Escape`
  - cleans up listeners

Markup requirements:
- wrapper: `span` with `ref={wrapperRef}` and `className="relative inline-flex group"`
- trigger: `<button type="button" aria-label={ariaLabel} aria-expanded={isTouch ? isOpen : undefined} ...>`
  - include `min-w-[44px] min-h-[44px]`
  - use either a lucide icon (e.g. `Info`) or literal `ⓘ`
- tooltip bubble: a `div` with `role="tooltip"` and `data-open={isOpen ? 'true' : 'false'}`
  - bubble must be in the DOM for tests; visibility is controlled by classes
  - class toggles:
    - base: `absolute left-0 top-full mt-8 ...`
    - desktop hover: `hidden group-hover:block`
    - touch open: add `block` when `isTouch && isOpen`

### Step 3: Run the test again

Run: `cd frontend && npm test -- InfoTooltip.test.tsx --watch=false`  
Expected: PASS.

### Step 4: Commit

```bash
git add frontend/src/components/InfoTooltip.tsx frontend/src/components/__tests__/InfoTooltip.test.tsx
git commit -m "feat(frontend): add InfoTooltip component"
```

---

## Task 3: Wire tooltips into the three Reviews charts

**Files:**
- Modify: `frontend/src/pages/ReviewsPage.tsx`
- Import: `frontend/src/components/InfoTooltip.tsx`
- Import: `frontend/src/pages/reviews/reviewsHelpContent.tsx`

### Step 1: Add imports

At the top of `frontend/src/pages/ReviewsPage.tsx`, import:
- `InfoTooltip` from `../components/InfoTooltip`
- `reviewsHelpContent` from `./reviews/reviewsHelpContent` (or adjust relative path based on folder choice)

### Step 2: Add ⓘ icon to each chart title (icon left)

For each chart card header:
- Execution Rate Trend (Last 7)
- Category Balance
- Primary Activities

Replace the existing `<h3 ...>` with a row like:

```tsx
<div className="flex items-center gap-8 mb-16">
  <InfoTooltip
    ariaLabel="About Execution Rate Trend"
    content={reviewsHelpContent['chart-execution']}
  />
  <h3 className="text-h3 text-ink">Execution Rate Trend (Last 7)</h3>
</div>
```

Repeat for the other two:
- `reviewsHelpContent['chart-cat-balance']`
- `reviewsHelpContent['chart-activities']`

### Step 3: Verify no naming collisions

`ReviewsPage.tsx` already imports `Tooltip` from `recharts`. Ensure you import `InfoTooltip` with that exact name.

### Step 4: Manual smoke check

Run: `npm run dev`  
Verify:
- Desktop: hovering the ⓘ shows tooltip; moving cursor onto the bubble keeps it open.
- Touch emulator/device: tapping ⓘ toggles; tapping outside closes; `Esc` closes when a keyboard is present.

### Step 5: Commit

```bash
git add frontend/src/pages/ReviewsPage.tsx
git commit -m "feat(frontend): add info tooltips to reviews charts"
```

---

## Task 4: Run verification

Run:
- `cd frontend && npm test -- --watch=false`
- (Optional) `npx prettier --write frontend/src/**/*.tsx`

Expected:
- Tests pass.
- No lint/build regressions.
