# Reviews Page Info Tooltips: Technical Foundation

## Goal
Add an ⓘ icon next to specific UI elements on the Reviews page (starting with **Category Balance** and **Primary Activities**) that shows a hover tooltip on desktop and a tap-to-toggle tooltip on touch devices. Tooltip copy will be authored separately; this document covers the reusable technical foundation.

## Non-goals (v1)
- Viewport-aware positioning (auto-flip, portal, clamping).
- Backend-driven tooltip content.
- Global search/analytics for tooltips.
- Keyboard-accessible interactive tooltip content (links navigable via Tab) beyond basic focus styling; v1 is hover + touch toggle.

## UX / Interaction Model
- **Desktop / fine pointer (hover available):** tooltip appears on hover of the ⓘ icon and remains open when the cursor moves from the icon to the tooltip bubble (so links can be clicked).
- **Touch / coarse pointer (no hover):** tapping the ⓘ toggles the tooltip open/closed.
  - Close on outside tap.
  - Close on `Escape` (covers attached keyboards).
- Tooltip triggers are **icon-only**: hovering the title does not open the tooltip.
- Hit target meets accessibility sizing guidance: **44×44** clickable area, with a small visible icon.

## Architecture

### 1) `InfoTooltip` UI Primitive
- File: `frontend/src/components/InfoTooltip.tsx`
- Purpose: render the ⓘ trigger and anchored bubble; provide desktop hover + touch toggle behavior without introducing new dependencies.
- Props (minimal v1):
  - `content: React.ReactNode`
  - `ariaLabel: string`
  - Optional: `className?: string`, `tooltipClassName?: string`

**Behavior implementation notes**
- Use a wrapper `ref` for outside-tap detection in touch mode.
- Detect touch mode via `window.matchMedia('(hover: none), (pointer: coarse)')` (and subscribe to changes to support hybrid devices).
- Only attach `document` listeners while the tooltip is open (touch mode), to keep overhead low.
- Use a component name that does not conflict with `recharts`’ `Tooltip` import (e.g. `InfoTooltip`).

**Styling**
- Trigger button uses Tailwind tokens already in the project:
  - 44×44 min size (hit area), focus ring, subtle hover affordance.
- Bubble uses token-ish styling:
  - `bg-snow text-ink border border-stone shadow-e02 rounded-default p-12 max-w-[320px] z-50`
- Positioning:
  - `absolute left-0 top-full mt-8` anchored to the icon; accept that it may clip in edge cases (v1).

### 2) `SectionTitleWithInfo` Layout Helper
- File: `frontend/src/components/SectionTitleWithInfo.tsx` (or page-local if preferred, but global makes reuse easy).
- Purpose: standardize the header row layout so callers don’t repeat `flex`/spacing markup.
- Render order: `[InfoTooltip] [Title]` (icon on the left).
- Props (minimal v1):
  - `title: React.ReactNode`
  - `tooltipContent: React.ReactNode`
  - `tooltipAriaLabel: string`
  - Optional: `as?: 'h2' | 'h3' | 'div'`, `titleClassName?: string`, `className?: string`

### 3) Page-local help content registry (static)
- File: `frontend/src/pages/reviews/helpContent.tsx`
- Export a typed map of IDs to `ReactNode` for this page, e.g.:
  - `export type ReviewsHelpId = 'reviews.categoryBalance' | 'reviews.primaryActivities';`
  - `export const reviewsHelpContent: Record<ReviewsHelpId, React.ReactNode> = { ... }`
- `ReviewsPage.tsx` imports the map and passes `content={...}` into `InfoTooltip`.

## Integration Points (ReviewsPage)
- File: `frontend/src/pages/ReviewsPage.tsx`
- Replace section headings for:
  - Category Balance
  - Primary Activities
with `SectionTitleWithInfo` (or an equivalent header row) using `reviewsHelpContent[...]`.

## Testing Notes (later)
- Add a lightweight component test verifying:
  - hover shows bubble (jsdom + `userEvent.hover`)
  - in “touch mode” (mock `matchMedia`), tap toggles open/closed
  - outside click closes when open

## Future Enhancements
- Viewport-safe placement (portal + measurement, or adopt a positioning library).
- Keyboard-accessible interactive tooltip content (keep open on `focus-within`, roving focus rules).
- Optional global registry aggregation (only if cross-page discovery is needed).
