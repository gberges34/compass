# Generic Planning Blocks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Replace hard-coded Daily Plan time block fields (deep/admin/buffer) with a generic list of user-defined planned time blocks that render in Orient + Calendar.

**Architecture:** Store planned blocks on `DailyPlan` as a JSON array (`plannedBlocks`). Accept/validate planned blocks in `POST /api/orient/east` (idempotent “create-or-update today”). Frontend provides an editor (add/remove blocks), displays blocks on Today/Orient West, and renders blocks on Calendar as non-draggable overlays.

**Tech Stack:** Express 5 + Prisma 7 + Zod 4 (backend), React 19 + React Query 5 + react-big-calendar (frontend), Jest (backend + frontend).

## Definitions (Contracts)

### Data shape

```ts
export type PlannedBlock = {
  id: string;    // UUID string
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  label: string; // non-empty
};
```

### API (Orient East)

`POST /api/orient/east`

```json
{
  "energyLevel": "HIGH" | "MEDIUM" | "LOW",
  "plannedBlocks": [{ "id": "uuid", "start": "09:00", "end": "11:00", "label": "…" }],
  "topOutcomes": ["...", "...", "..."],
  "reward": "..." // optional
}
```

Behavior: Upsert “today” plan by `DailyPlan.date` (start-of-day). First call creates; subsequent calls update.

## Acceptance Criteria

- Backend persists `DailyPlan.plannedBlocks` and no longer requires `deepWorkBlock1/deepWorkBlock2/adminBlock/bufferBlock`.
- `POST /api/orient/east` accepts `plannedBlocks` (min 1), rejects invalid block ids/times/labels, and is idempotent for today.
- Frontend Orient East allows editing a variable-length list of blocks (add/remove), prevents overlaps client-side, and submits `plannedBlocks`.
- Today + Orient West display planned blocks using the generic label.
- Calendar renders planned blocks as a single overlay type (“Plan: {label}”) and prevents drag/resize for these events.
- iOS shortcut doc `shortcuts/04-orient-east-morning.md` matches the new API payload.
- Tests updated/added: backend integration test covers plannedBlocks + upsert; frontend tests still pass.

---

## Task 0: Set up isolated workspace + baseline

**Files:** None

**Step 1: Create a worktree (recommended)**

Run:
`git worktree add ../compass-generic-planning-blocks -b feat/generic-planning-blocks`

Expected: new worktree directory created.

**Step 2: Install deps**

Run:
`npm run setup`

Expected: installs root/backend/frontend deps, Prisma generate, seed (per `scripts/setup.sh`).

**Step 3: Run backend tests (baseline)**

Run:
`cd backend && npm test`

Expected: PASS (or capture failures unrelated to this work).

**Step 4: Run frontend tests (baseline)**

Run:
`cd frontend && npm test`

Expected: PASS (or capture failures unrelated to this work).

**Step 5: Commit a “baseline recorded” note (optional)**

If you changed nothing, skip committing.

---

## Task 1: Add failing backend integration tests for plannedBlocks

**Files:**
- Modify: `backend/tests/integration/orient.test.ts`

**Step 1: Write failing test for plannedBlocks create**

Update `backend/tests/integration/orient.test.ts` to send this payload:

```ts
const orientPayload = {
  energyLevel: 'HIGH',
  plannedBlocks: [
    { id: '11111111-1111-1111-1111-111111111111', start: '08:00', end: '10:00', label: 'Build' },
  ],
  topOutcomes: ['Ship feature'],
  reward: 'Coffee',
};
```

And assert:
- status is `201`
- response includes `plannedBlocks` matching request

**Step 2: Run the single test file**

Run:
`cd backend && npm test -- tests/integration/orient.test.ts`

Expected: FAIL (route schema doesn’t accept `plannedBlocks` yet).

**Step 3: Add failing test for “upsert today”**

Add a test:
- first POST returns `201`
- second POST returns `200` and same `id` as first
- second response reflects updates (e.g., reward changes)

**Step 4: Run tests again**

Run:
`cd backend && npm test -- tests/integration/orient.test.ts`

Expected: FAIL (still).

**Step 5: Commit**

Run:
`git add backend/tests/integration/orient.test.ts && git commit -m "test(backend): add orient plannedBlocks contract"`

---

## Task 2: Update Orient East backend to accept plannedBlocks + upsert

**Files:**
- Modify: `backend/src/routes/orient.ts`

**Step 1: Update Zod schemas (minimal)**

Replace the old block fields schema with:

```ts
const plannedBlockSchema = z
  .object({
    id: z.string().uuid(),
    start: z.string(),
    end: z.string(),
    label: z.string().min(1),
  })
  .refine((block) => block.start < block.end, { message: 'Planned block start must be before end' });

const orientEastSchema = z.object({
  energyLevel: energyEnum,
  plannedBlocks: z.array(plannedBlockSchema).min(1),
  topOutcomes: z.array(z.string()).max(3),
  reward: z.string().optional(),
});
```

**Step 2: Implement atomic upsert by unique `date`**

Use Prisma `upsert` (preferred over find+create/update) with `date`:

```ts
const today = startOfDay(new Date());

const existing = await prisma.dailyPlan.findUnique({ where: { date: today }, select: { id: true } });

const dailyPlan = await prisma.dailyPlan.upsert({
  where: { date: today },
  create: {
    date: today,
    energyLevel: validatedData.energyLevel,
    plannedBlocks: validatedData.plannedBlocks,
    topOutcomes: validatedData.topOutcomes,
    reward: validatedData.reward,
  },
  update: {
    energyLevel: validatedData.energyLevel,
    plannedBlocks: validatedData.plannedBlocks,
    topOutcomes: validatedData.topOutcomes,
    reward: validatedData.reward,
  },
});

res.status(existing ? 200 : 201).json(dailyPlan);
```

Note: the `existing` read is only for the status code; upsert is the write path.

**Step 3: Run backend tests**

Run:
`cd backend && npm test -- tests/integration/orient.test.ts`

Expected: still FAIL until Prisma schema/migrations land (next tasks).

**Step 4: Sanity-check TypeScript build**

Run:
`cd backend && npm run build`

Expected: PASS.

**Step 5: Commit**

Run:
`git add backend/src/routes/orient.ts && git commit -m "feat(backend): accept plannedBlocks and upsert daily plan"`

---

## Task 3: Migrate Prisma schema from fixed blocks → plannedBlocks

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_planned_blocks/migration.sql` (generated)

**Step 1: Update Prisma model**

In `backend/prisma/schema.prisma`, update `DailyPlan` morning fields to:

```prisma
plannedBlocks Json @default("[]") // [{ id, start, end, label }]
```

and remove:
`deepWorkBlock1`, `deepWorkBlock2`, `adminBlock`, `bufferBlock`.

**Step 2: Generate migration**

Run:
`cd backend && npx prisma migrate dev --name planned_blocks`

Expected: new migration created; local DB migrated.

**Step 3: Run Prisma generate (if not already)**

Run:
`cd backend && npx prisma generate`

Expected: generated client updated.

**Step 4: Run backend tests**

Run:
`cd backend && npm test -- tests/integration/orient.test.ts`

Expected: PASS.

**Step 5: Commit**

Run:
`git add backend/prisma/schema.prisma backend/prisma/migrations && git commit -m "feat(db): replace daily plan blocks with plannedBlocks"`

---

## Task 4: Update frontend type contracts to plannedBlocks

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Replace block types**

Remove `DeepWorkBlock` and `TimeBlock`. Add:

```ts
export interface PlannedBlock {
  id: string;
  start: string;
  end: string;
  label: string;
}
```

Update `DailyPlan`:

```ts
plannedBlocks: PlannedBlock[];
```

Update `CreateDailyPlanRequest`:

```ts
plannedBlocks: PlannedBlock[];
```

Update `CalendarEvent.type`:

```ts
type: 'task' | 'plannedBlock';
```

**Step 2: Typecheck frontend**

Run:
`cd frontend && npm run build`

Expected: FAIL (pages/hooks still reference old fields).

**Step 3: Run frontend tests**

Run:
`cd frontend && npm test`

Expected: likely FAIL until pages/hooks updated.

**Step 4: Fix obvious TS fallout in tests (only compilation issues)**

If any test fixtures need updating due to strict typing, update them minimally.

**Step 5: Commit**

Run:
`git add frontend/src/types/index.ts && git commit -m "feat(frontend): add PlannedBlock and plannedBlocks contracts"`

---

## Task 5: Update frontend Calendar event generation for plannedBlocks

**Files:**
- Modify: `frontend/src/hooks/useCalendarEvents.ts`
- Modify: `frontend/src/pages/CalendarPage.tsx`

**Step 1: Update `useCalendarEvents` to map `plannedBlocks`**

Replace the old config-driven deep/admin/buffer mapping with:

```ts
if (todayPlan) {
  const today = getTodayDateString();
  todayPlan.plannedBlocks.forEach((block) => {
    planEvents.push({
      id: `plan-${block.id}`,
      title: `Plan: ${block.label}`,
      start: combineISODateAndTime(today, block.start),
      end: combineISODateAndTime(today, block.end),
      type: 'plannedBlock',
    });
  });
}
```

Also remove `DeepWorkBlock/TimeBlock` imports.

**Step 2: Update Calendar styling + legend**

In `frontend/src/pages/CalendarPage.tsx`:
- handle `plannedBlock` in `eventStyleGetter` (single color)
- legend label should be “Planned Blocks”
- keep `draggableAccessor` returning `event.type === 'task'`
- ensure resize handler rejects non-tasks (already does)

**Step 3: Run frontend tests**

Run:
`cd frontend && npm test`

Expected: PASS (or only failures directly related to the changes above).

**Step 4: Run frontend build**

Run:
`cd frontend && npm run build`

Expected: PASS (or remaining failures come from Orient pages still).

**Step 5: Commit**

Run:
`git add frontend/src/hooks/useCalendarEvents.ts frontend/src/pages/CalendarPage.tsx && git commit -m "feat(frontend): render plannedBlocks on calendar"`

---

## Task 6: Rebuild Orient East UI as Planned Blocks editor

**Files:**
- Modify: `frontend/src/pages/OrientEastPage.tsx`

**Step 1: Add client helpers**

Add:
- `createUUID()` using `crypto.randomUUID()` with a safe fallback
- `timeToMinutes("HH:mm")` parser

**Step 2: Replace form state with `plannedBlocks` list**

Use:

```ts
const [plannedBlocks, setPlannedBlocks] = useState<PlannedBlock[]>([
  { id: createUUID(), start: '09:00', end: '11:00', label: '' },
]);
```

Provide handlers:
- `addPlannedBlock()`
- `removePlannedBlock(id)` (disable when only 1 block)
- `updatePlannedBlock(id, partial)`

**Step 3: Client-side validation**

Validate:
- at least 1 block
- each block has start/end/label
- `start < end`
- times parse as valid `HH:mm`
- no overlaps (convert to minutes and sort)

**Step 4: Submit request with `plannedBlocks`**

Build `CreateDailyPlanRequest` with:

```ts
plannedBlocks: plannedBlocks.map((b) => ({ ...b, label: b.label.trim() })),
```

**Step 5: Run frontend tests + build**

Run:
`cd frontend && npm test`

Run:
`cd frontend && npm run build`

Expected: PASS.

**Step 6: Commit**

Run:
`git add frontend/src/pages/OrientEastPage.tsx && git commit -m "feat(frontend): orient east planned blocks editor"`

---

## Task 7: Update Today page planned blocks display

**Files:**
- Modify: `frontend/src/pages/TodayPage.tsx`

**Step 1: Replace “Deep Work Blocks” section**

Render:

```tsx
{plan.plannedBlocks.map((block) => (
  <div key={block.id}>
    <span>{block.label}</span>
    <span>{block.start} - {block.end}</span>
  </div>
))}
```

**Step 2: Run frontend tests**

Run:
`cd frontend && npm test`

Expected: PASS.

**Step 3: Run frontend build**

Run:
`cd frontend && npm run build`

Expected: PASS.

**Step 4: Commit**

Run:
`git add frontend/src/pages/TodayPage.tsx && git commit -m "feat(frontend): show planned blocks on Today"`

---

## Task 8: Update Orient West page planned blocks display

**Files:**
- Modify: `frontend/src/pages/OrientWestPage.tsx`

**Step 1: Replace “Deep Work Blocks” section**

Mirror Today page: iterate `plan.plannedBlocks` and render label + time range.

**Step 2: Run frontend tests**

Run:
`cd frontend && npm test`

Expected: PASS.

**Step 3: Run frontend build**

Run:
`cd frontend && npm run build`

Expected: PASS.

**Step 4: Commit**

Run:
`git add frontend/src/pages/OrientWestPage.tsx && git commit -m "feat(frontend): show planned blocks on Orient West"`

---

## Task 9: Update iOS shortcut docs for Orient East payload

**Files:**
- Modify: `shortcuts/04-orient-east-morning.md`

**Step 1: Replace old deep/admin/buffer dictionary**

Document building a `plannedBlocks` list:

```text
[
  { "id": UUID1, "start": DW1Start, "end": DW1End, "label": DW1Focus },
  { "id": UUID2, "start": DW2Start, "end": DW2End, "label": DW2Focus },        // optional
  { "id": UUID3, "start": AdminStart, "end": AdminEnd, "label": "Admin" },     // optional
  { "id": UUID4, "start": BufferStart, "end": BufferEnd, "label": "Buffer" }   // optional
]
```

**Step 2: Ensure payload matches API**

Final dictionary should include:
- `energyLevel`
- `plannedBlocks`
- `topOutcomes`
- `reward`

**Step 3: Commit**

Run:
`git add shortcuts/04-orient-east-morning.md && git commit -m "docs(shortcuts): update orient east plannedBlocks payload"`

---

## Task 10: End-to-end verification

**Files:** None

**Step 1: Run full backend test suite**

Run:
`cd backend && npm test`

Expected: PASS.

**Step 2: Run full frontend test suite**

Run:
`cd frontend && npm test`

Expected: PASS.

**Step 3: Run workspace health check (optional)**

Run:
`npm run health`

Expected: PASS (requires local env configured).

**Step 4: Format touched files**

Run (adjust globs as needed):
`npx prettier --write backend/src/**/*.ts frontend/src/**/*.{ts,tsx} backend/prisma/schema.prisma`

Expected: clean formatting.

**Step 5: Final commit (if any formatting changes)**

Run:
`git add -A && git commit -m "chore: format planned blocks changes"`

