# Review Creation Methods

Compass supports two methods for creating daily and weekly reviews:

## 1. Web Application Modal (Current Implementation)

Users can create reviews directly through the web interface:

- Navigate to Reviews page
- Click "Create Daily Review" or "Create Weekly Review"
- Fill in the modal form with wins, misses, lessons, and goals
- Submit to create the review

**Endpoint Used:**
- `POST /api/reviews/daily`
- `POST /api/reviews/weekly`

## 2. iOS Shortcuts Integration (Planned)

Users will be able to create reviews via iOS Shortcuts:

- Run the shortcut from iOS
- Shortcut collects reflection data
- Calls the same API endpoints as the web app
- Review appears in both web and shortcut interfaces

**Endpoint Used:**
- `POST /api/reviews/daily`
- `POST /api/reviews/weekly`

## Technical Notes

Both methods use the same backend API endpoints. The request format is identical:

```json
{
  "wins": ["string"],
  "misses": ["string"],
  "lessons": ["string"],
  "nextGoals": ["string"],
  "energyAssessment": "HIGH" | "MEDIUM" | "LOW" (optional)
}
```

The backend automatically calculates metrics (execution rate, tasks completed, deep work hours, etc.) based on the period (daily/weekly) and existing data.

## Future Enhancements

- Mobile-responsive modal for smartphone browsers
- Pre-fill suggestions based on completed tasks
- Review templates
- Reminder notifications
