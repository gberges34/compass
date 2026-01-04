# Compass v2 — User‑Managed Categories (Design)

## Goal

Replace the compile‑time `enum Category` with a runtime, user‑managed `Category` model so users can create/rename/color/icon/archiving and manually map categories to Toggl projects.

This is a **rip‑and‑replace** migration: we will seed defaults for a fresh start and **not** attempt complex historical migrations.

## Non‑Goals

- Automatic Toggl project creation.
- Automatic Toggl project mapping by name.
- Backward compatibility for existing `DailyPlan.plannedBlocks` JSON shape.

## Key Decisions (Locked)

- **Time Engine scope:** Categories apply to **Tasks + PRIMARY TimeSlices only**.
- **PRIMARY slice shape:** PRIMARY time slices are category‑based (`categoryId`), and the human label is derived from the category (**renames update history**).
- **Start slice inputs (PRIMARY):** `POST /api/engine/start` accepts **either** `categoryId` or `categoryName` (normalized lookup). If not found → **400**.
- **Archived categories:** Hidden in dropdowns by default, but **allowed** to be referenced by Tasks and PRIMARY slices; engine start by name can resolve archived categories.
- **Locked categories:** `Sleep`, `Other`, and `Fitness` are **hard‑locked**: cannot rename/archive/delete; can still edit `color/icon/togglProjectId/sortOrder`.
- **Focus Modes:** Backend does **not** return or manage `focusMode`; iOS automations map Focus Mode → category selection themselves.
- **Toggl mapping:** strictly manual via `Category.togglProjectId` (string). If missing, create Toggl entry **without** `project_id`.
- **Engine state:** `/api/engine/state` returns PRIMARY as `{ categoryId, categoryName, start }`, other dimensions as `{ label, start }`.
- **Stop validation:** `/api/engine/stop` supports an optional `label` validation field; match is **normalized** (trim/collapse spaces/case‑insensitive).
- **Colors:** `Category.color` must be chosen from a predefined **accent token** palette (25 total).
- **Category name uniqueness:** case/whitespace insensitive (enforced via a derived unique key).

## Data Model

### Category

New Prisma model:

- `id: String @id @default(uuid())`
- `name: String` (Title Case display name; user editable except locked categories)
- `nameKey: String @unique` (derived from `name`: trim → collapse spaces → lowercase)
- `color: String` (accent token)
- `icon: String` (emoji)
- `togglProjectId: String?` (manual mapping; string of digits in practice)
- `isSystem: Boolean @default(false)` (seeded defaults)
- `isLocked: Boolean @default(false)` (hard‑lock semantics; prevents rename/archive/delete)
- `isArchived: Boolean @default(false)` (visibility flag; still referenceable)
- `sortOrder: Int @default(0)`
- `createdAt/updatedAt`

### Task

Replace `Task.category: enum` with:

- `categoryId: String`
- `category: Category @relation(fields: [categoryId], references: [id])`

Tasks may reference archived categories.

### TimeSlice (Time Engine)

Split the current `TimeSlice.category: String` into:

- `label: String` (free‑form label for non‑PRIMARY dimensions)
- `categoryId: String?` (PRIMARY only; stored for strict grouping/filtering)
- `category: Category? @relation(fields: [categoryId], references: [id])`

Rules:
- For `dimension='PRIMARY'`, `categoryId` is required at creation time (via `categoryId` or `categoryName` lookup).
- For non‑PRIMARY dimensions, `categoryId` remains `null`, and `label` stays free‑form.
- Historical display for PRIMARY uses `Category.name` (renames update history).

### DailyPlan planned blocks (Orient East)

`DailyPlan.plannedBlocks` remains JSON, but the **shape changes** (breaking):

- Old: `{ id, start, end, label }`
- New: `{ id, start, end, categoryId }`

All planned blocks require `categoryId`. “Other” is a real seeded category; when `categoryId` points to “Other”, the UI must require a non‑empty details string on the client (and backend should validate it by resolving the referenced category and checking its locked identity).

Note: Since we are doing a rip‑and‑replace, existing plans in DB using the old shape are not supported.

## API Contracts

### Categories API

`GET /api/categories`
- Returns **all** categories (including archived), ordered by `sortOrder`, then `createdAt`.

`POST /api/categories`
- Body: `{ name, color, icon, togglProjectId? }`
- Server normalizes `name`, computes `nameKey`, and enforces uniqueness.
- Server validates `color` is one of the allowed accent tokens.

`PATCH /api/categories/:id`
- Allows updating `{ name, color, icon, togglProjectId, sortOrder }` and `isArchived`.
- If `isLocked=true`: reject `name` changes and reject `isArchived=true` and reject delete.

`DELETE /api/categories/:id`
- Soft delete: sets `isArchived=true`.
- If `isLocked=true`: reject.

### Tasks

- Task create/update accept `categoryId` (required on create).
- Task reads include `category: { id, name, color, icon, togglProjectId, isArchived, isLocked }`.
- Task list filtering uses `categoryId` (not enum string).

`POST /api/tasks/:id/activate`
- Creates a PRIMARY slice with `categoryId = task.categoryId`.
- Toggl projection uses task name as description and category mapping for `project_id`.
- Response includes integration helpers:
  - `category: { id, name, togglProjectId, isArchived, color, icon }`
  - `slice`
  - `definitionOfDone`

### Time Engine

`POST /api/engine/start`
- Body includes `{ dimension, source, linkedTaskId? }` plus:
  - If `dimension='PRIMARY'`: require **either** `categoryId` or `categoryName`
  - If non‑PRIMARY: require `label`
- PRIMARY label is derived from the resolved category; clients may omit `label`.

`POST /api/engine/stop`
- Body: `{ dimension, label? }`
- If `label` provided, stop only if active slice label matches by **normalized** comparison.

`GET /api/engine/state`
- Response:
  - `primary: { categoryId, categoryName, start } | null`
  - `work_mode/social/segment: { label, start } | null`

`GET /api/engine/slices`
- Query filters:
  - `dimension?: ...`
  - `categoryId?: string` (PRIMARY only)
  - `label?: string` (non‑PRIMARY only)
  - `linkedTaskId?: string`

`PATCH /api/engine/slices/:id`
- For `dimension='PRIMARY'`: allow updating `categoryId` only; label derives from category.
- For non‑PRIMARY: allow updating `label` (and times); categoryId stays null.

## Toggl/Timery Integration

- Remove static maps (`TOGGL_PROJECT_CATEGORY_MAP`) and auto‑create project behavior.
- Resolve Toggl project by reading `Category.togglProjectId`.
- If missing, create entries with no `project_id`.

## Seeding

Seed defaults include:
- Legacy Compass categories (Title Case names).
- Locked categories: `Sleep`, `Fitness`, `Other`.

Seeded categories get `isSystem=true` and reasonable `sortOrder`.

## Category Color Token Palette (Accents Only)

Existing 5:
- `mint` `#C9F0DE`
- `sky` `#CFE9FF`
- `lavender` `#E1D9FF`
- `blush` `#FFDDE6`
- `sun` `#FFEFC6`

Add 20 (for 25 total):
- `rose` `#F4AFAF`
- `peach` `#F4D1C2`
- `apricot` `#F7DDB6`
- `butter` `#F4F0CD`
- `lime` `#E6F4AF`
- `pistachio` `#DBF4C2`
- `leaf` `#C3F7B6`
- `spearmint` `#CDF4D0`
- `jade` `#AFF4CA`
- `aqua` `#C2F4E5`
- `glacier` `#B6F7F7`
- `ice` `#CDE8F4`
- `azure` `#AFCAF4`
- `periwinkle` `#C2C7F4`
- `iris` `#C3B6F7`
- `lilac` `#E0CDF4`
- `orchid` `#E6AFF4`
- `mauve` `#F4C2EF`
- `pink` `#F7B6DD`
- `petal` `#F4CDD8`

## Rollout Notes

- This change is intentionally breaking. Expect to reset local DBs (`prisma migrate reset`) and rely on seed data.
- Update iOS automations to start/stop PRIMARY slices using `categoryName` (or `categoryId` if desired).
