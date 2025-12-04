# Compass Time Engine – Sample 2-Week Data

**Status:** Draft sample dataset  
**Scope:** Time Engine backend (`TimeSlice`) and Time History UI

This file defines a concrete, hand-crafted 2-week sample dataset for the Time Engine.  
It is designed to:

- Exercise all four dimensions: `PRIMARY`, `WORK_MODE`, `SOCIAL`, `SEGMENT`.
- Include overlapping contexts (e.g., `PRIMARY` + `WORK_MODE` + `SEGMENT`).
- Mix sources (`SHORTCUT`, `TIMERY`, `MANUAL`, `API`) and a few `linkedTaskId` values.
- Provide both closed slices and currently-active slices (`end: null`) so `/api/engine/state` and the Time History Page both have meaningful data.

**Time range covered:** roughly 2025‑11‑21 through 2025‑12‑03 (UTC, ISO timestamps).

You can copy the `sampleTimeSlices` array into a small seed script (for example, under `backend/scripts/`) and call `prisma.timeSlice.createMany({ data: sampleTimeSlices })` to populate a dev database.

```ts
// Example shape only – copy into a backend script to seed Prisma
export const sampleTimeSlices = [
  // PRIMARY dimension
  {
    start: '2025-11-21T09:00:00.000Z',
    end: '2025-11-21T11:00:00.000Z',
    category: 'Coding Sprint',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
    linkedTaskId: 'task-time-engine-spike',
  },
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T22:00:00.000Z',
    category: 'Gaming Session',
    dimension: 'PRIMARY',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T23:00:00.000Z',
    end: '2025-11-22T07:00:00.000Z',
    category: 'Sleep',
    dimension: 'PRIMARY',
    source: 'TIMERY',
  },
  {
    start: '2025-11-23T10:00:00.000Z',
    end: '2025-11-23T12:00:00.000Z',
    category: 'Gym & Sauna',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Deep Work – Weekly Planning',
    dimension: 'PRIMARY',
    source: 'API',
    linkedTaskId: 'task-weekly-planning',
  },
  {
    start: '2025-11-26T18:00:00.000Z',
    end: '2025-11-26T20:00:00.000Z',
    category: 'Evening Walk & Podcast',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T16:00:00.000Z',
    category: 'Project Meeting Block',
    dimension: 'PRIMARY',
    source: 'API',
  },
  {
    start: '2025-11-29T18:00:00.000Z',
    end: '2025-11-29T21:00:00.000Z',
    category: 'Date Night (Dinner)',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-30T16:00:00.000Z',
    end: '2025-11-30T18:30:00.000Z',
    category: 'Side Project – Compass UI',
    dimension: 'PRIMARY',
    source: 'API',
    linkedTaskId: 'task-side-project-compass-ui',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Coding – Time Engine',
    dimension: 'PRIMARY',
    source: 'SHORTCUT',
    linkedTaskId: 'task-implement-time-engine',
  },

  // WORK_MODE dimension
  {
    start: '2025-11-21T09:00:00.000Z',
    end: '2025-11-21T11:00:00.000Z',
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
    linkedTaskId: 'task-time-engine-spike',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T10:30:00.000Z',
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-24T10:30:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Shallow Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T15:00:00.000Z',
    category: 'Admin',
    dimension: 'WORK_MODE',
    source: 'API',
  },
  {
    start: '2025-11-30T16:00:00.000Z',
    end: '2025-11-30T18:30:00.000Z',
    category: 'Recovery',
    dimension: 'WORK_MODE',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Deep Work',
    dimension: 'WORK_MODE',
    source: 'SHORTCUT',
    linkedTaskId: 'task-implement-time-engine',
  },

  // SOCIAL dimension
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T22:00:00.000Z',
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-23T11:00:00.000Z',
    end: '2025-11-23T12:00:00.000Z',
    category: 'In-Person',
    dimension: 'SOCIAL',
    source: 'MANUAL',
  },
  {
    start: '2025-11-26T19:00:00.000Z',
    end: '2025-11-26T21:00:00.000Z',
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-11-29T18:00:00.000Z',
    end: '2025-11-29T21:00:00.000Z',
    category: 'Date Night',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },
  {
    start: '2025-12-02T17:00:00.000Z',
    end: '2025-12-02T19:00:00.000Z',
    category: 'Family Time',
    dimension: 'SOCIAL',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:30:00.000Z',
    end: null,
    category: 'Discord Call',
    dimension: 'SOCIAL',
    source: 'SHORTCUT',
  },

  // SEGMENT dimension
  {
    start: '2025-11-21T07:00:00.000Z',
    end: '2025-11-21T12:00:00.000Z',
    category: 'Morning Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T13:00:00.000Z',
    end: '2025-11-21T17:00:00.000Z',
    category: 'Afternoon Work Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-21T20:00:00.000Z',
    end: '2025-11-21T23:00:00.000Z',
    category: 'Evening Wind-down',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-24T09:00:00.000Z',
    end: '2025-11-24T12:00:00.000Z',
    category: 'Workday Focus Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-28T14:00:00.000Z',
    end: '2025-11-28T18:00:00.000Z',
    category: 'Meetings Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-11-30T15:00:00.000Z',
    end: '2025-11-30T19:00:00.000Z',
    category: 'Weekend Project Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
  {
    start: '2025-12-03T08:00:00.000Z',
    end: null,
    category: 'Morning Build Block',
    dimension: 'SEGMENT',
    source: 'MANUAL',
  },
];
```

