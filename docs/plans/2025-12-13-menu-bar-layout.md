# Menu Bar Layout Refresh (Grid A)

## Goals

- Keep dropdown groups (**Orient**, **Tasks**, **Reviews**) on the left.
- Make **Today** the “home” and keep it mathematically centered in the top bar.
- Replace the text **Calendar** button with a clear icon-only calendar button.
- Keep **Logout** on the far right but visually de-emphasize it without reducing the ≥44×44 target size.

## Constraints / Design System Alignment

- Use Compass design tokens (Tailwind theme + `frontend/src/index.css`).
- Maintain accessibility expectations:
  - Focus ring: 2px Action ring with 2px offset.
  - Targets: ≥44×44 px.
  - Icon-only controls must include `aria-label` and a tooltip/title.

## Layout Strategy (Chosen: A)

Use a true 3-column grid for the nav container:

- Column 1 (left, flexible): dropdown group (**Orient**, **Tasks**, **Reviews**)
- Column 2 (center, auto): **Today** pill link, always centered
- Column 3 (right, flexible): **Calendar icon** then **Logout**

This ensures Today remains centered regardless of left/right content widths.

## Component Behaviors

- Dropdowns keep existing behavior (hover/focus opens, click toggles, Escape/outside click closes).
- Today uses a slightly larger pill size (~10% larger) via padding/height.
- Calendar is icon-only with clear active/hover states.
- Logout is visually quieter (smaller type + lighter styling) but keeps the same click target.

## Routing Note

The app routes “Today” at `/today`. The navigation should link directly to `/today` to ensure active-state styling is correct.

