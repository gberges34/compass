# Categories Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new web UI page under Tasks where users can view/create/edit/archive/reorder categories, backed by `/api/categories`.

**Architecture:** Introduce a new Prisma `Category` model (runtime) and CRUD routes in the backend. Add a table-like React page with inline autosave and drag-and-drop reorder that persists `sortOrder`.

**Tech Stack:** Prisma, Express, Zod, React 19, React Router, TanStack React Query, Tailwind tokens, dnd-kit.

---

## Task 1: Expand accent color tokens

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/lib/designTokens.ts`
- Modify: `CompassVisualDesignGuidelines.md`

**Steps:**
1. Add 20 new accent tokens to Tailwind config.
2. Add `CategoryAccentToken` allowlist + helpers for rendering swatches.
3. Document the extended palette in design guidelines.

**Test:**
- Run: `cd frontend && npm test -- --runTestsByPath src/components/__tests__/LayoutNav.test.tsx`

---

## Task 2: Add backend Category model + routes

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/src/routes/categories.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/routes/__tests__/categories.test.ts`

**Steps:**
1. Rename the legacy Prisma enum from `Category` → `TaskCategory` (to free the `Category` model name).
2. Add Prisma `model Category` with `nameKey` uniqueness and category fields.
3. Implement CRUD routes:
   - `GET /api/categories`
   - `POST /api/categories`
   - `PATCH /api/categories/:id`
   - `DELETE /api/categories/:id` (archives)
4. Add Zod validation, name normalization (`nameKey`), and lock enforcement (no rename/archive/delete for locked categories).

**Test:**
- Run: `cd backend && npm test -- --runTestsByPath src/routes/__tests__/categories.test.ts`

**DB:**
- Run: `cd backend && npx prisma migrate dev -n categories-model`
- Run: `cd backend && npx prisma generate`

---

## Task 3: Add frontend Categories API + hooks

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/hooks/useCategories.ts`

**Steps:**
1. Add `CategoryEntity` type for `/api/categories`.
2. Add API client methods: `getCategories`, `createCategory`, `updateCategory`, `deleteCategory`.
3. Add React Query hooks with optimistic updates and invalidation.

---

## Task 4: Build Categories page (table-like, inline autosave)

**Files:**
- Create: `frontend/src/pages/CategoriesPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Test: `frontend/src/components/__tests__/LayoutNav.test.tsx`

**Steps:**
1. Add new route: `/tasks/categories`.
2. Add Tasks submenu child: “Categories”.
3. Implement table-like layout with columns:
   - Drag handle, Icon, Name, Color, Toggl ID, Status, Active toggle
4. Inline autosave per field (blur/change), archive confirm modal, show-archived toggle, drag-and-drop reordering persisted via `sortOrder`.

**Test:**
- Run: `cd frontend && npm test -- --runTestsByPath src/components/__tests__/LayoutNav.test.tsx`
