# Implementation Plan: Update Git Repository

**Objective:** Commit all local changes and push to origin/main to ensure the remote repository reflects the latest working state.

**Current State:**
- Branch: main (19 commits ahead of origin/main)
- Unstaged changes: 9 files modified (design system updates across all pages)
- Untracked files: Design docs, new components, backend route, docs directory
- Backend dist/ directory exists (build artifacts - should be ignored)

**Risk Assessment:** LOW - All changes are additive (design system implementation), no breaking changes

---

## Task 1: Verify .gitignore is properly configured

**Objective:** Ensure build artifacts (backend/dist/) are ignored

**Current State:** .gitignore exists at root with /dist entry

**Steps:**
1. Verify backend/dist/ is properly ignored by running: `git status | grep "backend/dist"`
2. If backend/dist/ appears in untracked files, it means .gitignore pattern needs adjustment
3. The current pattern `/dist` only matches dist/ in root, not backend/dist/

**Expected Result:** Backend dist directory should not appear in `git status`

**Verification:** Run `git status` and confirm backend/dist/ is not listed

---

## Task 2: Review and stage design system components

**Objective:** Add new reusable component files that implement the design system

**Files to add:**
- `frontend/src/components/Badge.tsx` - Badge component for status indicators
- `frontend/src/components/Button.tsx` - Primary button component
- `frontend/src/components/CalendarToolbar.tsx` - Calendar navigation toolbar
- `frontend/src/components/Card.tsx` - Card container component
- `frontend/src/components/Input.tsx` - Form input component
- `frontend/src/lib/designTokens.ts` - Design token utilities

**Steps:**
1. Run: `git add frontend/src/components/Badge.tsx frontend/src/components/Button.tsx frontend/src/components/CalendarToolbar.tsx frontend/src/components/Card.tsx frontend/src/components/Input.tsx frontend/src/lib/designTokens.ts`

**Expected Result:** 6 new files staged for commit

**Verification:** Run `git status` and confirm files are in "Changes to be committed"

---

## Task 3: Stage design system configuration files

**Objective:** Add Tailwind config and CSS updates that support the design system

**Files to add:**
- `frontend/tailwind.config.js` - Extended Tailwind configuration with design tokens
- `frontend/src/index.css` - Global styles and CSS utilities
- `frontend/public/index.html` - Updated HTML template

**Steps:**
1. Run: `git add frontend/tailwind.config.js frontend/src/index.css frontend/public/index.html`

**Expected Result:** 3 configuration files staged

**Verification:** Run `git status` and confirm files are staged

---

## Task 4: Stage page refactors with design system

**Objective:** Add refactored pages that use new design system components

**Files to add:**
- `frontend/src/pages/TodayPage.tsx` - Uses Card, Badge, Button, design tokens
- `frontend/src/pages/TasksPage.tsx` - Uses Card, Badge, Button, design tokens
- `frontend/src/pages/ClarifyPage.tsx` - Updated with design system
- `frontend/src/pages/OrientEastPage.tsx` - Updated with design system
- `frontend/src/pages/OrientWestPage.tsx` - Updated with design system
- `frontend/src/pages/ReviewsPage.tsx` - Updated with design system

**Steps:**
1. Run: `git add frontend/src/pages/TodayPage.tsx frontend/src/pages/TasksPage.tsx frontend/src/pages/ClarifyPage.tsx frontend/src/pages/OrientEastPage.tsx frontend/src/pages/OrientWestPage.tsx frontend/src/pages/ReviewsPage.tsx`

**Expected Result:** 6 page files staged with design system updates

**Verification:** Run `git diff --cached --stat` to see all staged changes

---

## Task 5: Stage backend post-do route

**Objective:** Add new backend route for post-do logging functionality

**Files to add:**
- `backend/src/routes/postdo.ts` - Analytics endpoint for completed tasks

**Steps:**
1. Run: `git add backend/src/routes/postdo.ts`

**Expected Result:** Backend route file staged

**Verification:** Run `git status` and confirm file is staged

---

## Task 6: Stage documentation files

**Objective:** Add brand guidelines and design documentation

**Files to add:**
- `COMPASS_Brand_Guidelines_v1.0.md` - Brand guidelines document
- `CompassVisualDesignGuidelines.md` - Visual design system documentation
- `docs/` directory - Session notes and plans

**Steps:**
1. Run: `git add COMPASS_Brand_Guidelines_v1.0.md CompassVisualDesignGuidelines.md docs/`

**Expected Result:** Documentation files and directory staged

**Verification:** Run `git status` and confirm docs are staged

---

## Task 7: Create design system commit

**Objective:** Commit all design system changes with descriptive message

**Commit Message:**
```
feat(design-system): implement comprehensive design system across all pages

- Add reusable component library:
  - Badge: Status and category indicators with semantic colors
  - Button: Primary/secondary/danger variants with consistent styling
  - Card: Container component with elevation levels
  - Input: Form input with validation states
  - CalendarToolbar: Specialized calendar navigation

- Add design token utilities:
  - getPriorityStyle: MUST/SHOULD/COULD/MAYBE priority colors
  - getCategoryStyle: Category-specific color schemes
  - getEnergyStyle: HIGH/MEDIUM/LOW energy indicators
  - Centralized design system constants

- Extend Tailwind configuration:
  - Custom color palette (snow, cloud, fog, stone, slate, ink)
  - Semantic colors (action, danger, warning, success)
  - Typography scale (h1, h2, h3, body, caption)
  - Spacing scale (4px base unit)
  - Shadow elevation system (e01-e04)
  - Border radius tokens

- Refactor all pages to use design system:
  - TodayPage: Replace inline styles with Card, Badge, Button
  - TasksPage: Consistent styling with design tokens
  - ClarifyPage: Updated with component library
  - OrientEastPage: Design system integration
  - OrientWestPage: Design system integration
  - ReviewsPage: Design system integration

- Add backend analytics route:
  - POST /api/postdo/logs: Log completed task data
  - GET /api/postdo/logs: Retrieve analytics with filters

- Add brand documentation:
  - COMPASS_Brand_Guidelines_v1.0.md: Brand identity and usage
  - CompassVisualDesignGuidelines.md: Design system specifications

Benefits:
- Consistent visual language across entire application
- Maintainable component-based architecture
- Type-safe design tokens
- Improved developer experience with reusable components
- Better user experience with cohesive design

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Steps:**
1. Run: `git commit -m "<commit message from above>"`

**Expected Result:** Single commit containing all design system work

**Verification:** Run `git log -1 --stat` to verify commit was created with all files

---

## Task 8: Push all commits to origin

**Objective:** Push 20 commits (19 existing + 1 new) to origin/main

**Current Commits to Push:**
- efbdfc8: React Query setup
- 67a17ce: Task hooks
- a1cc7b5: Daily plan hooks
- 27345a6: Review/todoist/analytics hooks
- 76080ee: CalendarPage migration + caching
- [NEW]: Design system implementation
- Plus 14 earlier commits (drag-and-drop, calendar features, etc.)

**Steps:**
1. Run: `git push origin main`
2. Wait for push to complete
3. Verify no errors

**Expected Result:** All 20 commits pushed to origin/main

**Verification:**
- Run `git status` - should show "Your branch is up to date with 'origin/main'"
- Visit repository URL to confirm commits are visible

---

## Task 9: Verify repository state

**Objective:** Confirm remote repository matches local state

**Steps:**
1. Run: `git log origin/main -5 --oneline` to see latest remote commits
2. Run: `git status` to confirm working tree is clean
3. Verify no unpushed commits: `git log origin/main..main` should show nothing

**Expected Result:**
- Working tree clean
- No unpushed commits
- Remote matches local

**Verification:** `git status` shows "nothing to commit, working tree clean"

---

## Summary

**Total Tasks:** 9
**Estimated Time:** 5-10 minutes
**Risk Level:** LOW

**Files to Commit:**
- 6 new component files
- 1 new design tokens utility
- 3 configuration files (Tailwind, CSS, HTML)
- 6 refactored page files
- 1 new backend route
- 2 documentation files
- 1 docs directory

**Commits to Push:** 20 total (19 existing + 1 new design system commit)

**Success Criteria:**
- ✅ All local changes committed
- ✅ All commits pushed to origin/main
- ✅ Working tree clean
- ✅ Remote repository matches local state
