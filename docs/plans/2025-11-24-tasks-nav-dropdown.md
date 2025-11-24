# Tasks Nav Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the Clarify and Tasks top-nav items under a new Tasks parent with hover/click/focus dropdown behavior that matches the existing Orient submenu and Compass design system.

**Architecture:** Keep the data-driven nav config in `frontend/src/components/Layout.tsx`, reuse the existing dropdown state/handlers for multiple parents, and ensure prefetch stays on leaf links only. Add accessible roles/ARIA on the new Tasks trigger and submenu while keeping styling neutral (Snow/Cloud/Stone, E-02 shadow, 160–240 ms transitions) until further visual refinements.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind (Compass tokens), React Query (prefetch), React Testing Library + Jest.

---

### Task 1: Add the Tasks parent with Clarify/Tasks submenu

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Step 1: Update nav config**

Replace the standalone Clarify/Tasks items with a Tasks parent that has two children:

```ts
const navItems: NavItem[] = [
  { id: 'orient', label: 'Orient', children: [/* existing East/West */] },
  {
    id: 'tasks-menu',
    label: 'Tasks',
    children: [
      { id: 'clarify-link', label: 'Clarify', to: '/clarify' },
      { id: 'tasks-link', label: 'Tasks', to: '/tasks' },
    ],
  },
  { id: 'today', label: 'Today', to: '/' },
  { id: 'calendar', label: 'Calendar', to: '/calendar' },
  { id: 'reviews', label: 'Reviews', to: '/reviews' },
];
```

Remove the prior Clarify/Tasks leaf entries. Keep `prefetchHandlers` for `/clarify` and `/tasks` as-is; the existing `handlePrefetch` will cover the submenu.

**Step 2: Ensure unique IDs**

Confirm Orient child IDs don’t conflict with the new tasks IDs (e.g., keep `orient-east`/`orient-west`). `openMenu` should receive the parent IDs `orient` and `tasks-menu`.

---

### Task 2: Support multiple parent dropdowns cleanly

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

**Step 1: Guard for parent items without `to`**

Keep the early return for items lacking `to` in the leaf renderer to avoid rendering stray NavLinks. Ensure `handlePrefetch` is only called for items with paths.

**Step 2: Verify interaction handlers are shared**

Reuse the existing hover/click/focus/onBlur/onMouseLeave/onMouseEnter handling for the new Tasks parent. Confirm `toggleMenu`, `openMenuNow`, and `queueCloseMenu` work with multiple parent IDs (no special-casing Orient).

**Step 3: Neutral dropdown styling**

Keep the submenu hidden by default (`opacity-0 -translate-y-1 pointer-events-none`) and visible when open (`opacity-100 translate-y-0`). Retain the neutral Compass tokens (Snow/Cloud/Stone, shadow-e02, rounded-default) so no visible style shift occurs beyond the new submenu when opened.

---

### Task 3: Add regression tests for both dropdown parents

**Files:**
- Create: `frontend/src/components/__tests__/LayoutNav.test.tsx`

**Step 1: Write failing tests**

Use React Testing Library with `MemoryRouter`, `QueryClientProvider`, and a minimal AuthContext mock to render `Layout`. Add tests that:

```tsx
it('opens Orient submenu on hover and closes on mouse leave', async () => {
  // hover Orient button -> expect Orient East/West links visible
  // mouse leave -> expect submenu hidden
});

it('toggles Tasks submenu on click and keeps links keyboard focusable', async () => {
  // click Tasks button -> Clarify/Tasks links visible with role="menuitem"
  // tab into first link -> menu stays open (focus handler)
  // click outside -> menu closes
});
```

**Step 2: Run tests to see failures**

Run: `cd frontend && npm test -- --watch=false --testPathPattern=LayoutNav.test.tsx`  
Expect: Tests fail because submenu isn’t wired for Tasks yet.

**Step 3: Implement functionality**

Apply Tasks parent changes from Task 1 and ensure the shared dropdown logic covers both parents. Keep ARIA (`aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`).

**Step 4: Re-run tests and confirm pass**

Run: `cd frontend && npm test -- --watch=false --testPathPattern=LayoutNav.test.tsx`  
Expect: All tests pass.

---

### Task 4: Quick manual smoke

**Step 1: Local run**

`cd frontend && npm start` then hover/click the Tasks parent to confirm Clarify/Tasks appear, and Today/Orient/Reviews still behave.

**Step 2: Record notes**

If behavior matches, note in PR summary; if visual tweaks are needed, add TODOs rather than styling now.
