# Toggl Track / Timery ↔ Compass Time Engine Integration Design

**Date:** 2025-12-12  
**Status:** Validated design (brainstorm complete)  
**Goal:** Make Compass Time Engine canonical for live tracking while projecting PRIMARY time into Toggl Track so Timery provides the visible timer surface. Mirror WORK_MODE as Toggl tags. Avoid live polling of Toggl.

---

## Context

- Timery is the preferred UI for visible timers and is backed by Toggl Track.
- Automations (Focus, Discord, NFC/Shortcuts, task lifecycle) are the primary way tracking starts/stops.
- Toggl Track supports a single running timer; Compass supports multiple active slices (dimensions).
- Live polling `GET /me/time_entries/current` is not viable.

---

## Canonical Flow (Compass → Toggl Projection)

1. **Compass is source of truth for live state.**
   - All manual or automated starts/stops go through Time Engine endpoints:
     - `POST /api/engine/start`
     - `POST /api/engine/stop`
   - Timery is not used directly to start timers; it reflects Toggl entries created by Compass.

2. **PRIMARY slices are mirrored as Toggl time entries.**
   - On PRIMARY `startSlice`:
     - Create a running Toggl entry in the default workspace:
       - `POST /api/v9/workspaces/{workspace_id}/time_entries`
       - `start = now (UTC)`, `duration = -1`
       - `description = task name if linkedTaskId else category`
       - `project_id = derived from category↔project map`
       - `tags = [current WORK_MODE tag if any, "compass"]`
       - `created_with = "Compass Time Engine"`
     - Store returned `time_entry_id` on the TimeSlice.
   - On PRIMARY `stopSlice` / `stopSliceIfExists`:
     - Stop the linked Toggl entry:
       - `PATCH /api/v9/workspaces/{workspace_id}/time_entries/{id}/stop`

3. **WORK_MODE mirrored as Toggl tags on the current PRIMARY entry.**
   - When WORK_MODE starts/stops while a PRIMARY slice is active:
     - Update tags on the Toggl entry:
       - `PUT /api/v9/workspaces/{workspace_id}/time_entries/{id}`
       - Use `tag_action=add|delete` with `tags` (names) or `tag_ids`.
   - Suggested tags: `deep-work`, `shallow-work`, etc.

4. **Other dimensions stay Compass-only.**
   - `SOCIAL` and `SEGMENT` are not mirrored to Toggl due to single-timer limitations.

5. **Best-effort side effects.**
   - Never block Time Engine writes on Toggl failures.
   - Use retries; allow eventual consistency of the projection.

---

## Reconciliation, History, and Edits

1. **Foreign Toggl entries are history-only.**
   - Compass-created entries are marked via `tags` including `compass` and/or `created_with`.
   - Any Toggl entry without those markers is considered foreign/manual.
   - Foreign entries may be imported nightly or on demand as `source: TIMERY` TimeSlices, but do not affect live state.

2. **Metrics dedupe.**
   - When pulling Toggl entries for reviews, exclude Compass-created entries to avoid double counting.
   - Existing overlap dedupe with PostDoLogs remains for foreign entries.

3. **Edits propagate from Compass to Toggl for mirrored slices.**
   - If a TimeSlice has `togglEntryId`, Compass edits should update the Toggl entry to keep Timery consistent.
   - Foreign Toggl edits can optionally override imported `source: TIMERY` slices during import; locked slices remain Compass-authoritative.

4. **Conflict handling.**
   - If a foreign Toggl entry is running when Compass starts PRIMARY, Compass stops it before creating its own, logging a warning.

---

## Backend Components and Boundaries

1. **Keep Time Engine pure DB/domain.**
   - No Toggl calls inside `backend/src/services/timeEngine.ts`.
   - Avoid network calls inside Prisma transactions.

2. **Add projection service.**
   - New `backend/src/services/togglProjection.ts`:
     - `syncPrimaryStart(slice)`
     - `syncPrimaryStop(slice)`
     - `syncWorkModeTags(currentPrimarySlice, currentWorkModeSliceOrNull)`

3. **Call projection after DB commits at entrypoints.**
   - `backend/src/routes/engine.ts`
   - `backend/src/routes/tasks.ts`
   - `backend/src/discord/*` deps wrappers

4. **Persist Toggl link.**
   - Add nullable `togglEntryId String?` to `TimeSlice` (or a join table if future projections needed).

5. **Workspace/project resolution.**
   - On startup or first use:
     - `GET /api/v9/me` to get `default_workspace_id`
     - `GET /api/v9/me/projects` to map project name → id
   - Cache in memory with optional refresh.
   - Align client paths to v9 (`/me/time_entries/current`).

---

## Open Questions / Next Steps

- Define exact category → Toggl project mapping and fallback for unmapped categories.
- Decide import cadence (nightly vs on-demand) for foreign Toggl entries.
- Decide debounce thresholds for WORK_MODE tag churn.

