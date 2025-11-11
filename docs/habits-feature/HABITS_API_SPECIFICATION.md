# Habits Feature - API Specification

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.compass.app/api
```

## Authentication

All endpoints require authentication (JWT token or session cookie, following existing Compass auth pattern).

---

## Endpoints

### 1. Create Habit

**Endpoint**: `POST /api/habits`

**Description**: Create a new habit template

**Request Body**:
```json
{
  "name": "Morning Gym",
  "description": "Upper body workout routine",
  "category": "FITNESS",
  "context": "ERRANDS",
  "energyRequired": "HIGH",
  "frequencyType": "WEEKLY",
  "targetPerWeek": 3,
  "duration": 60,
  "color": "#10b981",
  "icon": "Dumbbell",
  "startDate": "2025-11-10",
  "endDate": null
}
```

**Field Validation**:
- `name`: required, 1-100 chars
- `category`: required, must be valid Category enum
- `frequencyType`: required, must be DAILY | WEEKLY | INTERVAL | CONSTRAINT
- `targetPerWeek`: required if frequencyType = WEEKLY, 1-7
- `intervalValue` + `intervalUnit`: required if frequencyType = INTERVAL
- `duration`: optional, 5-480 minutes
- `color`: optional, valid hex color
- `startDate`: optional, defaults to today
- `endDate`: optional, must be after startDate

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Morning Gym",
  "description": "Upper body workout routine",
  "category": "FITNESS",
  "context": "ERRANDS",
  "energyRequired": "HIGH",
  "frequencyType": "WEEKLY",
  "targetPerWeek": 3,
  "intervalValue": null,
  "intervalUnit": null,
  "duration": 60,
  "color": "#10b981",
  "icon": "Dumbbell",
  "isActive": true,
  "startDate": "2025-11-10",
  "endDate": null,
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-10T10:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
  ```json
  {
    "error": "Validation failed",
    "details": [
      "targetPerWeek is required for WEEKLY frequency type"
    ]
  }
  ```
- `401 Unauthorized`: Not authenticated

---

### 2. List Habits

**Endpoint**: `GET /api/habits`

**Description**: Get all habits with optional filters

**Query Parameters**:
- `isActive` (boolean, optional): Filter by active status (default: true)
- `category` (Category enum, optional): Filter by category
- `frequencyType` (FrequencyType enum, optional): Filter by frequency type

**Examples**:
```
GET /api/habits
GET /api/habits?isActive=true
GET /api/habits?category=FITNESS
GET /api/habits?category=FITNESS&frequencyType=WEEKLY
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Morning Gym",
    "description": "Upper body workout routine",
    "category": "FITNESS",
    "frequencyType": "WEEKLY",
    "targetPerWeek": 3,
    "duration": 60,
    "isActive": true,
    "currentStreak": 12,
    "longestStreak": 28,
    "lastCompletedDate": "2025-11-09",
    "completionRate": 87,
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "name": "Dog Medicine",
    "category": "PET",
    "frequencyType": "DAILY",
    "duration": 5,
    "isActive": true,
    "currentStreak": 7,
    "longestStreak": 14,
    "lastCompletedDate": "2025-11-09",
    "completionRate": 95,
    "createdAt": "2025-11-01T10:00:00Z",
    "updatedAt": "2025-11-01T10:00:00Z"
  }
]
```

---

### 3. Get Single Habit

**Endpoint**: `GET /api/habits/:id`

**Description**: Get habit details with recent records and streak data

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Morning Gym",
  "description": "Upper body workout routine",
  "category": "FITNESS",
  "frequencyType": "WEEKLY",
  "targetPerWeek": 3,
  "duration": 60,
  "isActive": true,
  "startDate": "2025-11-01",
  "endDate": null,
  "currentStreak": 12,
  "longestStreak": 28,
  "lastCompletedDate": "2025-11-09",
  "completionRate": 87,
  "weeklyAverage": 3.2,
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-01T10:00:00Z",
  "records": [
    {
      "id": "record-1",
      "date": "2025-11-09",
      "completed": true,
      "effortLevel": "MEDIUM",
      "actualDuration": 65,
      "notes": "Great workout!",
      "timeOfDay": "MORNING",
      "createdAt": "2025-11-09T09:00:00Z"
    },
    {
      "id": "record-2",
      "date": "2025-11-07",
      "completed": true,
      "effortLevel": "LARGE",
      "actualDuration": 70,
      "timeOfDay": "MORNING",
      "createdAt": "2025-11-07T09:00:00Z"
    }
    // ... up to 30 most recent records
  ]
}
```

**Error Responses**:
- `404 Not Found`: Habit doesn't exist
  ```json
  {
    "error": "Habit not found"
  }
  ```

---

### 4. Update Habit

**Endpoint**: `PATCH /api/habits/:id`

**Description**: Update habit template properties

**Request Body** (all fields optional):
```json
{
  "name": "Evening Gym",
  "targetPerWeek": 4,
  "duration": 75,
  "isActive": true
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Evening Gym",
  // ... updated fields
  "updatedAt": "2025-11-10T15:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `404 Not Found`: Habit doesn't exist

---

### 5. Delete Habit (Soft Delete)

**Endpoint**: `DELETE /api/habits/:id`

**Description**: Soft delete habit (sets isActive = false, preserves data)

**Query Parameters**:
- `hard` (boolean, optional): If true, performs hard delete (deletes habit + cascade deletes records)

**Examples**:
```
DELETE /api/habits/:id           # Soft delete (default)
DELETE /api/habits/:id?hard=true # Hard delete
```

**Response** (200 OK):
```json
{
  "message": "Habit deleted successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "recordsDeleted": 0  // 0 for soft delete, N for hard delete
}
```

**Error Responses**:
- `404 Not Found`: Habit doesn't exist

---

### 6. Generate Habit Instances

**Endpoint**: `POST /api/habits/:id/generate`

**Description**: Bulk generate task instances and/or habit records for a date range

**Request Body**:
```json
{
  "startDate": "2025-11-11",
  "endDate": "2025-12-08",
  "mode": "BOTH"
}
```

**Fields**:
- `startDate` (required): Start of date range
- `endDate` (required): End of date range (max 90 days from startDate)
- `mode` (required): "TASKS_ONLY" | "RECORDS_ONLY" | "BOTH"

**Response** (201 Created):
```json
{
  "habitId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2025-11-11",
  "endDate": "2025-12-08",
  "mode": "BOTH",
  "tasksCreated": 12,
  "recordsCreated": 28,
  "instances": [
    {
      "type": "task",
      "id": "task-1",
      "date": null,  // Tasks are unscheduled by default
      "name": "Morning Gym"
    },
    {
      "type": "record",
      "id": "record-1",
      "date": "2025-11-11",
      "completed": false
    }
    // ... more instances
  ]
}
```

**Generation Logic by Frequency**:
- **DAILY**: 1 instance per day (28 days = 28 instances)
- **WEEKLY** (3x/week): 12 instances evenly distributed (4 weeks * 3 = 12)
- **INTERVAL** (every 3 days): ~9 instances (28 days / 3 = 9)

**Error Responses**:
- `400 Bad Request`:
  - Date range > 90 days
  - Invalid date format
  - endDate before startDate
- `404 Not Found`: Habit doesn't exist

---

### 7. Quick Complete Habit

**Endpoint**: `POST /api/habits/:id/complete`

**Description**: Quick check-in to mark habit complete for a date (no task required)

**Request Body**:
```json
{
  "date": "2025-11-10",
  "notes": "Felt great today!",
  "effortLevel": "MEDIUM",
  "startTime": "2025-11-10T09:00:00Z",
  "endTime": "2025-11-10T10:05:00Z"
}
```

**Fields**:
- `date` (optional): Date to complete (defaults to today)
- `notes` (optional): User notes
- `effortLevel` (optional): SMALL | MEDIUM | LARGE
- `startTime` (optional): When habit started
- `endTime` (optional): When habit ended (calculates duration)

**Response** (200 OK):
```json
{
  "record": {
    "id": "record-123",
    "habitId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2025-11-10",
    "completed": true,
    "notes": "Felt great today!",
    "effortLevel": "MEDIUM",
    "actualDuration": 65,
    "timeOfDay": "MORNING",
    "dayOfWeek": 0,
    "createdAt": "2025-11-10T10:05:00Z"
  },
  "streak": {
    "currentStreak": 13,
    "longestStreak": 28,
    "lastCompletedDate": "2025-11-10"
  }
}
```

**Error Responses**:
- `400 Bad Request`:
  - Future date (cannot complete tomorrow)
  - Date before habit.startDate
  - Invalid date format
- `404 Not Found`: Habit doesn't exist

---

### 8. Get Habit Streak

**Endpoint**: `GET /api/habits/:id/streak`

**Description**: Get current and longest streak for a habit

**Response** (200 OK):
```json
{
  "habitId": "550e8400-e29b-41d4-a716-446655440000",
  "currentStreak": 13,
  "longestStreak": 28,
  "lastCompletedDate": "2025-11-10",
  "completionRate": 87,
  "calculatedAt": "2025-11-10T15:00:00Z"
}
```

---

### 9. Get Habit Analytics

**Endpoint**: `GET /api/habits/:id/analytics`

**Description**: Get completion patterns and analytics

**Query Parameters**:
- `period` (number, optional): Days to analyze (default: 30, max: 365)

**Example**:
```
GET /api/habits/:id/analytics?period=90
```

**Response** (200 OK):
```json
{
  "habitId": "550e8400-e29b-41d4-a716-446655440000",
  "period": 90,
  "completionByDayOfWeek": [
    { "day": 0, "count": 10, "percentage": 77 },  // Sunday
    { "day": 1, "count": 12, "percentage": 92 },  // Monday
    { "day": 2, "count": 11, "percentage": 85 },  // Tuesday
    { "day": 3, "count": 13, "percentage": 100 }, // Wednesday
    { "day": 4, "count": 9, "percentage": 69 },   // Thursday
    { "day": 5, "count": 12, "percentage": 92 },  // Friday
    { "day": 6, "count": 8, "percentage": 62 }    // Saturday
  ],
  "completionByTimeOfDay": {
    "EARLY_MORNING": 2,
    "MORNING": 45,
    "MIDDAY": 5,
    "AFTERNOON": 3,
    "EVENING": 10,
    "NIGHT": 0
  },
  "averageEffortLevel": "MEDIUM",
  "consistencyScore": 87,
  "totalCompletions": 65,
  "expectedCompletions": 75,
  "completionRate": 87
}
```

---

### 10. Get Calendar Habits

**Endpoint**: `GET /api/habits/calendar/:date`

**Description**: Get all habit instances for a week (used by calendar view)

**Path Parameters**:
- `date`: Any date within the desired week (YYYY-MM-DD)

**Example**:
```
GET /api/habits/calendar/2025-11-10  # Returns Nov 10-16 week
```

**Response** (200 OK):
```json
{
  "weekStart": "2025-11-10",
  "weekEnd": "2025-11-16",
  "tasks": [
    {
      "id": "task-1",
      "name": "Morning Gym",
      "habitId": "550e8400-e29b-41d4-a716-446655440000",
      "isHabitInstance": true,
      "scheduledStart": "2025-11-11T09:00:00Z",
      "duration": 60,
      "category": "FITNESS",
      "status": "NEXT",
      "completed": false
    }
    // ... more tasks
  ],
  "records": [
    {
      "id": "record-1",
      "habitId": "550e8400-e29b-41d4-a716-446655440000",
      "habitName": "Morning Gym",
      "date": "2025-11-10",
      "completed": true,
      "duration": 65
    }
    // ... more records
  ]
}
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message",
  "details": ["Optional array of detailed errors"],
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|------------|------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Authenticated but not authorized |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate key violation |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limiting

| Endpoint Type | Rate Limit |
|--------------|-----------|
| GET requests | 100 req/min |
| POST/PATCH/DELETE | 30 req/min |
| Bulk generation | 10 req/min |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1699635600
```

---

## Caching

| Endpoint | Cache Strategy |
|----------|---------------|
| GET /api/habits | ETag + stale-while-revalidate |
| GET /api/habits/:id | ETag + stale-while-revalidate |
| POST/PATCH/DELETE | No caching |

**Cache Headers**:
```
ETag: "33a64df551425fcc"
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

---

**Document Version**: 1.0.0
**Generated By**: Agent 4 (Doer)
**For**: API implementation and frontend integration
