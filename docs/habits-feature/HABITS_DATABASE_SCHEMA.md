# Habits Feature - Database Schema

## Entity Relationship Diagram

```
┌──────────────────┐
│      Habit       │
│ (Template)       │
├──────────────────┤
│ id               │──┐
│ name             │  │
│ description      │  │
│ category         │  │
│ frequencyType    │  │
│ targetPerWeek    │  │
│ isActive         │  │
│ ...              │  │
└──────────────────┘  │
                      │ 1:N
         ┌────────────┴─────────────┐
         │                          │
         │                          │
         ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│  HabitRecord     │       │      Task        │
│ (Tracking)       │       │  (Instances)     │
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ habitId   (FK)   │       │ habitId   (FK)   │
│ date  (unique)   │       │ isHabitInstance  │
│ completed        │       │ scheduledStart   │
│ effortLevel      │       │ ...              │
│ taskId    (FK)   │──────▶│                  │
│ ...              │  1:1  └──────────────────┘
└──────────────────┘              │
                                  │ 1:1
                                  ▼
                         ┌──────────────────┐
                         │   PostDoLog      │
                         │ (Analytics)      │
                         ├──────────────────┤
                         │ id               │
                         │ taskId    (FK)   │
                         │ outcome          │
                         │ actualDuration   │
                         │ ...              │
                         └──────────────────┘
```

## Prisma Schema

### New Models

```prisma
// ============================================================================
// HABITS SYSTEM MODELS
// ============================================================================

// ----------------------------------------------------------------------------
// Habit Template
// ----------------------------------------------------------------------------
// Defines a recurring habit with frequency rules and metadata
// Example: "Gym - Upper Body" habit that runs 3x per week
model Habit {
  id                String         @id @default(uuid())

  // Basic Info
  name              String         // "Gym - Upper Body", "Dog Medicine", etc.
  description       String?        // Optional detailed description

  // Categorization (leverage existing enums)
  category          Category       // FITNESS, NUTRITION, PET, MUSIC, etc.
  context           Context        @default(ANYWHERE)
  energyRequired    Energy         @default(MEDIUM)

  // Frequency Configuration
  frequencyType     FrequencyType  // DAILY, WEEKLY, INTERVAL, CONSTRAINT
  targetPerWeek     Int?           // Used for WEEKLY (e.g., 3 = 3x per week)
  intervalValue     Int?           // Used for INTERVAL (e.g., 3 = every 3 days)
  intervalUnit      IntervalUnit?  // Used for INTERVAL (DAYS, WEEKS, MONTHS)

  // Scheduling Metadata
  duration          Int?           // Estimated minutes per instance
  color             String?        // Custom color (hex) - defaults to category color
  icon              String?        // Custom icon (Lucide icon name)

  // Lifecycle
  isActive          Boolean        @default(true)  // Soft delete flag
  startDate         DateTime       @default(now()) @db.Date
  endDate           DateTime?      @db.Date        // Optional end date

  // Relationships
  records           HabitRecord[]  // All completion records
  instances         Task[]         @relation("HabitInstances") // Generated tasks

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // Indexes for performance
  @@index([category])
  @@index([isActive])
}

// ----------------------------------------------------------------------------
// Habit Record
// ----------------------------------------------------------------------------
// Tracks completion of a habit on a specific date
// One record per habit per day (enforced by unique constraint)
model HabitRecord {
  id                String         @id @default(uuid())

  // Core Fields
  habitId           String
  habit             Habit          @relation(fields: [habitId], references: [id], onDelete: Cascade)
  date              DateTime       @db.Date  // Date of completion
  completed         Boolean        @default(false)

  // Optional Completion Metadata
  notes             String?        // User notes (e.g., "Felt great today")
  effortLevel       Effort?        // SMALL, MEDIUM, LARGE

  // Time Tracking (optional - for habits with duration)
  startTime         DateTime?
  endTime           DateTime?
  actualDuration    Int?           // Calculated minutes

  // Context Tracking (for pattern analytics)
  timeOfDay         TimeOfDay?     // EARLY_MORNING, MORNING, etc.
  dayOfWeek         Int?           // 0-6 (Sunday = 0)

  // Link to Task (if habit was completed via full task workflow)
  taskId            String?        @unique
  task              Task?          @relation("HabitTask", fields: [taskId], references: [id])

  createdAt         DateTime       @default(now())

  // Constraints & Indexes
  @@unique([habitId, date])  // Prevent duplicate records for same day
  @@index([habitId, date])   // Fast lookup for streak calculation
  @@index([date])            // Fast lookup for daily summaries
  @@index([completed])       // Fast filtering of completed records
}

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------

enum FrequencyType {
  DAILY           // Every day (e.g., Dog Medicine)
  WEEKLY          // N times per week, flexible days (e.g., Gym 3x/week)
  INTERVAL        // Every N days/weeks/months (e.g., Dog Shower every 2 weeks)
  CONSTRAINT      // Complex constraints (Phase 2 - e.g., Cooking LP)
}

enum IntervalUnit {
  DAYS
  WEEKS
  MONTHS
}
```

### Modified Existing Models

```prisma
// ----------------------------------------------------------------------------
// Task (MODIFIED)
// ----------------------------------------------------------------------------
// Added fields to support habit instances
model Task {
  id                String         @id @default(uuid())

  // ... existing fields (name, status, priority, etc.) ...

  // NEW HABIT FIELDS
  habitId           String?        // Reference to parent Habit (nullable)
  habit             Habit?         @relation("HabitInstances", fields: [habitId], references: [id], onDelete: SetNull)
  isHabitInstance   Boolean        @default(false)  // Flag for quick filtering
  habitRecord       HabitRecord?   @relation("HabitTask")  // Reverse relation

  // ... existing relations (postDoLog, etc.) ...
}
```

## Data Flow Diagrams

### Flow 1: Habit Creation & Instance Generation

```
┌────────────────────────────────────────────────────────────────┐
│ USER ACTION: Create "Gym" habit (WEEKLY, 3x/week)             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB INSERT: Habit table                                         │
│ {                                                              │
│   name: "Gym - Upper Body",                                   │
│   category: "FITNESS",                                        │
│   frequencyType: "WEEKLY",                                    │
│   targetPerWeek: 3,                                           │
│   duration: 60                                                │
│ }                                                              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ USER ACTION: Generate instances for next 4 weeks              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ API: POST /api/habits/:id/generate                            │
│ Body: { startDate, endDate, mode: "TASKS_ONLY" }             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVICE: generateInstances()                                   │
│ - Calculate dates (Mon/Wed/Fri for 4 weeks = 12 dates)       │
│ - Create 12 Task records with habitId set                     │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB INSERT: Task table (12 records)                            │
│ {                                                              │
│   name: "Gym - Upper Body",                                   │
│   category: "FITNESS",                                        │
│   habitId: <habit_id>,                                        │
│   isHabitInstance: true,                                      │
│   status: "NEXT"                                              │
│ }                                                              │
└────────────────────────────────────────────────────────────────┘
```

### Flow 2: Quick Check-In (Without Task)

```
┌────────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Check In" on "Dog Medicine" habit         │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ API: POST /api/habits/:id/complete                            │
│ Body: { date: "2025-11-10" }                                  │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVICE: quickComplete()                                       │
│ - Upsert HabitRecord (create or update if exists)            │
│ - Set completed = true                                         │
│ - Calculate streak                                             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB UPSERT: HabitRecord table                                   │
│ {                                                              │
│   habitId: <habit_id>,                                        │
│   date: "2025-11-10",                                         │
│   completed: true,                                            │
│   dayOfWeek: 0,                                               │
│   taskId: null  (no task involved)                            │
│ }                                                              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ RESPONSE: HabitRecord + Streak data                           │
│ Toast: "Dog Medicine completed! Streak: 7 days 🔥"           │
└────────────────────────────────────────────────────────────────┘
```

### Flow 3: Task Completion (Full Workflow)

```
┌────────────────────────────────────────────────────────────────┐
│ USER ACTION: Complete "Gym" task via calendar                 │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ API: POST /api/tasks/:id/complete                             │
│ Body: { outcome, effortLevel, keyInsight, ... }              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB INSERT: PostDoLog table                                     │
│ (Existing flow - detailed task analytics)                     │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ NEW: Check if task.isHabitInstance === true                   │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ YES
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB UPSERT: HabitRecord table                                   │
│ {                                                              │
│   habitId: task.habitId,                                      │
│   date: today,                                                │
│   completed: true,                                            │
│   effortLevel: postDoLog.effortLevel,                         │
│   startTime: postDoLog.startTime,                             │
│   actualDuration: postDoLog.actualDuration,                   │
│   taskId: task.id  (link to task)                             │
│ }                                                              │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ RESULT: Both PostDoLog AND HabitRecord created                │
│ - Detailed analytics in PostDoLog                             │
│ - Streak tracking in HabitRecord                              │
└────────────────────────────────────────────────────────────────┘
```

### Flow 4: Streak Calculation

```
┌────────────────────────────────────────────────────────────────┐
│ API: GET /api/habits/:id/streak                               │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ DB QUERY: Fetch all HabitRecords                              │
│ WHERE habitId = :id AND completed = true                      │
│ ORDER BY date DESC                                             │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVICE: calculateStreak()                                     │
│                                                                │
│ IF frequencyType === "DAILY":                                 │
│   - Start from today, count backwards                         │
│   - Stop at first gap (missed day)                            │
│                                                                │
│ IF frequencyType === "WEEKLY":                                │
│   - Group records by week                                     │
│   - Count consecutive weeks meeting targetPerWeek             │
│   - e.g., 3/week target: [3,4,5,2,3] = streak of 3 weeks    │
│                                                                │
│ IF frequencyType === "INTERVAL":                              │
│   - Check if completed within ±1 day of target dates          │
│   - Count consecutive hits                                     │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────┐
│ RESPONSE:                                                      │
│ {                                                              │
│   currentStreak: 12,                                          │
│   longestStreak: 28,                                          │
│   lastCompletedDate: "2025-11-10",                           │
│   completionRate: 87                                          │
│ }                                                              │
└────────────────────────────────────────────────────────────────┘
```

## Indexing Strategy

### Performance Requirements

| Query Type | Expected Frequency | Target Performance |
|-----------|-------------------|-------------------|
| List habits (filtered) | High | <100ms |
| Get habit with records | Medium | <200ms |
| Calculate streak | Medium | <50ms |
| Quick check-in | High | <100ms |
| Daily summary (all habits) | High | <150ms |

### Index Justifications

```prisma
// Habit indexes
@@index([category])      // Filter habits by category (Gym, Music, etc.)
@@index([isActive])      // Quickly filter out deleted habits

// HabitRecord indexes
@@index([habitId, date]) // Streak calculation (fetch all records for a habit)
@@index([date])          // Daily summaries (all habits completed today)
@@index([completed])     // Analytics (completion rate queries)
```

### Query Examples

```sql
-- Get all active fitness habits
SELECT * FROM Habit
WHERE category = 'FITNESS' AND isActive = true;
-- Uses: @@index([category]) + @@index([isActive])

-- Get last 30 days of records for streak calculation
SELECT * FROM HabitRecord
WHERE habitId = '...' AND date >= '2025-10-11'
ORDER BY date DESC;
-- Uses: @@index([habitId, date])

-- Get all habits completed today
SELECT * FROM HabitRecord
WHERE date = '2025-11-10' AND completed = true;
-- Uses: @@index([date]) + @@index([completed])
```

## Database Constraints & Rules

### Uniqueness Constraints

```prisma
@@unique([habitId, date])  // HabitRecord: One record per habit per day
```

**Enforcement**: Database-level unique constraint prevents duplicate check-ins

**Example Violation**:
```sql
-- First insert: OK
INSERT INTO HabitRecord (habitId, date, completed)
VALUES ('habit-123', '2025-11-10', true);

-- Second insert: ERROR (duplicate key)
INSERT INTO HabitRecord (habitId, date, completed)
VALUES ('habit-123', '2025-11-10', true);

-- Solution: Use UPSERT
UPDATE OR INSERT INTO HabitRecord ...
```

### Foreign Key Cascade Rules

```prisma
// HabitRecord → Habit: onDelete: Cascade
// If habit deleted, all records deleted too

// HabitRecord → Task: onDelete: Set null (default)
// If task deleted, habitRecord.taskId set to null

// Task → Habit: onDelete: SetNull
// If habit deleted, task.habitId set to null (task becomes regular task)
```

**Rationale**:
- Deleting a habit should remove all tracking data (records)
- Deleting a task shouldn't orphan the habit record (set link to null)
- Deleting a habit shouldn't delete the tasks (convert to regular tasks)

### Validation Rules (Application-Level)

```typescript
// Habit creation validation
if (frequencyType === 'WEEKLY' && !targetPerWeek) {
  throw new ValidationError('targetPerWeek required for WEEKLY habits');
}

if (frequencyType === 'INTERVAL' && (!intervalValue || !intervalUnit)) {
  throw new ValidationError('intervalValue and intervalUnit required for INTERVAL habits');
}

if (endDate && endDate <= startDate) {
  throw new ValidationError('endDate must be after startDate');
}

// HabitRecord completion validation
if (date > today) {
  throw new ValidationError('Cannot complete future dates');
}

if (date < habit.startDate) {
  throw new ValidationError('Cannot complete before habit start date');
}
```

## Migration Strategy

### Initial Migration (Phase 1)

```bash
# Create migration file
npx prisma migrate dev --name add_habits_system

# Generated SQL (PostgreSQL):
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "Category" NOT NULL,
    -- ... all fields
    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HabitRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    -- ... all fields
    CONSTRAINT "HabitRecord_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE,
    CONSTRAINT "HabitRecord_habitId_date_key" UNIQUE ("habitId", "date")
);

ALTER TABLE "Task" ADD COLUMN "habitId" TEXT;
ALTER TABLE "Task" ADD COLUMN "isHabitInstance" BOOLEAN DEFAULT false;

CREATE INDEX "Habit_category_idx" ON "Habit"("category");
CREATE INDEX "HabitRecord_habitId_date_idx" ON "HabitRecord"("habitId", "date");
```

### Rollback Plan

```sql
-- Drop tables
DROP TABLE "HabitRecord";
DROP TABLE "Habit";

-- Remove columns from Task
ALTER TABLE "Task" DROP COLUMN "habitId";
ALTER TABLE "Task" DROP COLUMN "isHabitInstance";

-- Drop enums
DROP TYPE "FrequencyType";
DROP TYPE "IntervalUnit";
```

### Data Seeding (Development/Testing)

```typescript
// seed.ts - Example habits for testing
await prisma.habit.createMany({
  data: [
    {
      name: 'Morning Gym',
      category: 'FITNESS',
      frequencyType: 'WEEKLY',
      targetPerWeek: 3,
      duration: 60,
      energyRequired: 'HIGH',
    },
    {
      name: 'Dog Medicine',
      category: 'PET',
      frequencyType: 'DAILY',
      duration: 5,
      energyRequired: 'LOW',
    },
    {
      name: 'Music Practice',
      category: 'MUSIC',
      frequencyType: 'WEEKLY',
      targetPerWeek: 5,
      duration: 30,
      energyRequired: 'MEDIUM',
    },
  ],
});
```

---

**Document Version**: 1.0.0
**Generated By**: Agent 4 (Doer)
**For**: Database implementation reference
