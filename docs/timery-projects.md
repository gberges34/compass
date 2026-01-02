# Timery Project Name Mapping

Compass maps Toggl/Timery project names to internal categories for review metrics. Update this file whenever a new project is added so the backend map in `backend/src/services/timery.ts` can stay in sync.

Note: Compass may auto-create missing Toggl projects when projecting `PRIMARY` TimeSlices to Toggl. Resolution matches project names case-insensitively and whitespace-insensitively, but this table should still reflect the canonical names you want in Timery/Toggl.

| Toggl Project Name | Compass Category |
| ------------------ | ---------------- |
| School             | SCHOOL           |
| Music              | MUSIC            |
| Fitness            | FITNESS          |
| Gaming             | GAMING           |
| Nutrition          | NUTRITION        |
| Hygiene            | HYGIENE          |
| Pet                | PET              |
| Social             | SOCIAL           |
| Personal           | PERSONAL         |
| Admin              | ADMIN            |

> If Timery introduces workspace-specific projects, add them here and update `TOGGL_PROJECT_CATEGORY_MAP` to keep category balance reports accurate.
