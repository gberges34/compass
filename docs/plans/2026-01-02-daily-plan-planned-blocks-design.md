# Daily Plan: Generic Planned Blocks (Replace Deep/Admin/Buffer)

## Goal

Remove the hard-coded planning taxonomy (“Deep Work”, “Admin”, “Buffer”) and replace it with a generic, user-defined set of planned time blocks, while keeping the core Compass value: planning time and reviewing how time was actually spent.

## Summary

- Replace `DailyPlan`’s fixed fields (`deepWorkBlock1`, `deepWorkBlock2`, `adminBlock`, `bufferBlock`) with a single required list: `plannedBlocks`.
- Each planned block has a stable `id` (uuid) to support reliable edit/delete without relying on array index.
- Calendar renders planned blocks as non-draggable overlays, but they are no longer typed as deep/admin/buffer.

## Data Model

`DailyPlan.plannedBlocks` is a required JSON array:

```ts
type PlannedBlock = {
  id: string;    // uuid
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  label: string; // required
};
```

Constraints:

- `plannedBlocks.length >= 1`
- For each block: `start < end` and `label` non-empty
- (Frontend) blocks should not overlap

## API Contract (Orient East)

`POST /api/orient/east`

```json
{
  "energyLevel": "HIGH" | "MEDIUM" | "LOW",
  "plannedBlocks": [{ "id": "uuid", "start": "09:00", "end": "11:00", "label": "…" }],
  "topOutcomes": ["...", "...", "..."],
  "reward": "..." // optional
}
```

Behavior:

- Upsert by `date` (start-of-day): creates a plan if none exists, otherwise updates the existing plan for today.

## UI Changes

- **Orient East:** Planned Blocks editor (add/remove blocks; start/end/label required).
- **Today:** Shows “Planned Blocks” instead of “Deep Work Blocks”.
- **Calendar:** Renders planned blocks as a single overlay type (“Plan: {label}”), non-draggable/non-resizable.

## Migration Notes

Existing plan data is not preserved (intentional): legacy block columns are removed in favor of `plannedBlocks`.

## Out of Scope

- A full “Planned vs Actual” metric framework (to be designed separately).
- Changing Time Engine `WORK_MODE` categories (independent of DailyPlan planning blocks).

