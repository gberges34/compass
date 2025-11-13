# Timery Project Name Mapping

Compass maps Toggl/Timery project names to internal categories. Update this file whenever a new project is added so the backend map in `backend/src/services/timery.ts` can stay in sync.

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
