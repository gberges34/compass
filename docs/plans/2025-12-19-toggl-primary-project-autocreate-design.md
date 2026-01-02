# PRIMARY → Toggl Project Auto-Create (Design)

**Date:** 2025-12-19  
**Status:** Validated design  
**Goal:** Ensure every `PRIMARY` TimeSlice started in Compass is projected to Toggl Track with a `project_id`, auto-creating the project when missing.

## Background

Compass projects `PRIMARY` TimeSlices to Toggl as a single running time entry so Timery can be the visible timer surface. Today, `project_id` only resolves reliably when the slice category is a Prisma `Category` enum value (e.g. `SCHOOL`) that can be mapped to a known Toggl project name (e.g. `School`). Free-form `PRIMARY` categories (e.g. `Gaming`, `Sleep`) may fail to resolve and end up with no Toggl project.

## Requirements

1. `PRIMARY` activity should be passed as a Toggl Project (`project_id`) on the created time entry whenever possible.
2. If the project does not exist, Compass should auto-create it.
3. Matching should be case-insensitive and whitespace-insensitive before deciding to create a project.
4. For Prisma `Category` values, use the existing category→human project name mapping (e.g. `SCHOOL` → `School`).
5. For non-enum categories, normalize to a deterministic Title Case project name for creation (to reduce duplicates).
6. Best-effort: Toggl failures must not block Time Engine writes (projection stays async/best-effort).

## Proposed Changes

### Project name derivation

- If `slice.category` is one of Prisma `Category` enum values:
  - Derive project name via the existing mapping used for review metrics (e.g. `SCHOOL` → `School`).
- Else:
  - Normalize the input and Title Case it for creation (e.g. `deep   work` → `Deep Work`).

### Resolution and auto-create flow

1. Load cached Toggl context: `workspaceId`, and the set of existing project names.
2. Attempt match using a normalized lookup key:
   - `key = normalize(name)` where normalize collapses whitespace/separators and lowercases.
3. If found, return the matching `project_id`.
4. If not found:
   - Attempt to create the project in the workspace.
   - Update the in-memory cache on success.
   - If create fails (race or permission), refresh projects and retry lookup once.

### Cache behavior

Keep the existing TTL cache for context, but ensure successful project creation updates the cached context immediately so subsequent resolves don’t require waiting for TTL expiry.

## Test Plan

- `resolveProjectIdForCategory()`:
  - Resolves enum categories via mapped project names.
  - Matches existing projects case-insensitively and whitespace-insensitively.
  - Creates a project when missing and returns its id.
  - On create failure, refreshes and resolves if a project exists (race-safe).

