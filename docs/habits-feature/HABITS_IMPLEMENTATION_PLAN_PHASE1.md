# Habits Feature - Phase 1 Implementation Plan

## Phase 1 Scope: Foundation (MVP)

**Goal**: Core habit creation, manual check-ins, basic streaks
**Timeline**: 2-3 weeks
**Deliverables**: Users can create habits, check in daily/weekly, see streaks

---

## Implementation Checklist

### Backend Development

#### Task 1: Database Schema & Migration
**Estimated Time**: 2-3 hours
**Files to Modify**: `backend/prisma/schema.prisma`

**Steps**:
1. Add new enums after existing enums:
   ```prisma
   enum FrequencyType {
     DAILY
     WEEKLY
     INTERVAL
     CONSTRAINT
   }

   enum IntervalUnit {
     DAYS
     WEEKS
     MONTHS
   }
   ```

2. Add Habit model after Review model:
   ```prisma
   model Habit {
     id                String         @id @default(uuid())
     name              String
     description       String?
     category          Category
     context           Context        @default(ANYWHERE)
     energyRequired    Energy         @default(MEDIUM)
     frequencyType     FrequencyType
     targetPerWeek     Int?
     intervalValue     Int?
     intervalUnit      IntervalUnit?
     duration          Int?
     color             String?
     icon              String?
     isActive          Boolean        @default(true)
     startDate         DateTime       @default(now()) @db.Date
     endDate           DateTime?      @db.Date
     records           HabitRecord[]
     instances         Task[]         @relation("HabitInstances")
     createdAt         DateTime       @default(now())
     updatedAt         DateTime       @updatedAt

     @@index([category])
     @@index([isActive])
   }
   ```

3. Add HabitRecord model:
   ```prisma
   model HabitRecord {
     id                String         @id @default(uuid())
     habitId           String
     habit             Habit          @relation(fields: [habitId], references: [id], onDelete: Cascade)
     date              DateTime       @db.Date
     completed         Boolean        @default(false)
     notes             String?
     effortLevel       Effort?
     startTime         DateTime?
     endTime           DateTime?
     actualDuration    Int?
     timeOfDay         TimeOfDay?
     dayOfWeek         Int?
     taskId            String?        @unique
     task              Task?          @relation("HabitTask", fields: [taskId], references: [id])
     createdAt         DateTime       @default(now())

     @@unique([habitId, date])
     @@index([habitId, date])
     @@index([date])
     @@index([completed])
   }
   ```

4. Modify Task model (add these fields to existing model):
   ```prisma
   habitId           String?
   habit             Habit?         @relation("HabitInstances", fields: [habitId], references: [id], onDelete: SetNull)
   isHabitInstance   Boolean        @default(false)
   habitRecord       HabitRecord?   @relation("HabitTask")
   ```

5. Run migration:
   ```bash
   cd backend
   npx prisma migrate dev --name add_habits_system
   npx prisma generate
   ```

**Validation**:
- [ ] Migration runs without errors
- [ ] Database tables created (Habit, HabitRecord)
- [ ] Task table has new habit fields
- [ ] Prisma client regenerated

---

#### Task 2: Habit Service Layer
**Estimated Time**: 4-6 hours
**Files to Create**: `backend/src/services/habitService.ts`

**Implementation**:

```typescript
import { prisma } from '../prisma';
import { startOfDay, subDays, differenceInDays, getDay } from 'date-fns';
import type { Habit, HabitRecord } from '@prisma/client';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: Date | null;
  completionRate: number;
}

/**
 * Calculate streak for a habit based on its frequency type
 */
export async function calculateStreak(habitId: string): Promise<StreakData> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      records: {
        where: { completed: true },
        orderBy: { date: 'desc' },
      },
    },
  });

  if (!habit) {
    throw new Error('Habit not found');
  }

  const records = habit.records;

  if (records.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      completionRate: 0,
    };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate completion rate
  const daysSinceStart = differenceInDays(new Date(), habit.startDate) + 1;
  const completionRate = (records.length / daysSinceStart) * 100;

  if (habit.frequencyType === 'DAILY') {
    // For daily habits: count consecutive days from today backwards
    const today = startOfDay(new Date());
    let checkDate = today;
    let foundGap = false;

    for (const record of records) {
      const recordDate = startOfDay(new Date(record.date));
      const daysDiff = differenceInDays(checkDate, recordDate);

      if (daysDiff === 0) {
        if (!foundGap) currentStreak++;
        tempStreak++;
        checkDate = subDays(checkDate, 1);
      } else if (daysDiff === 1) {
        if (!foundGap) currentStreak++;
        tempStreak++;
        checkDate = recordDate;
        checkDate = subDays(checkDate, 1);
      } else {
        // Gap found
        foundGap = true;
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        checkDate = recordDate;
        checkDate = subDays(checkDate, 1);
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  } else if (habit.frequencyType === 'WEEKLY') {
    // For weekly habits: count consecutive weeks meeting target
    const targetPerWeek = habit.targetPerWeek || 1;
    const weeklyCompletions: { [weekKey: string]: number } = {};

    // Group records by week
    records.forEach((record) => {
      const recordDate = new Date(record.date);
      const weekStart = startOfDay(subDays(recordDate, getDay(recordDate)));
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyCompletions[weekKey] = (weeklyCompletions[weekKey] || 0) + 1;
    });

    // Sort weeks
    const weeks = Object.keys(weeklyCompletions).sort().reverse();
    let foundGap = false;

    for (const week of weeks) {
      if (weeklyCompletions[week] >= targetPerWeek) {
        if (!foundGap) currentStreak++;
        tempStreak++;
      } else {
        foundGap = true;
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
  }

  return {
    currentStreak,
    longestStreak,
    lastCompletedDate: records[0]?.date || null,
    completionRate: Math.round(completionRate),
  };
}

/**
 * Generate habit instances (tasks and/or records) for a date range
 */
export async function generateInstances(
  habitId: string,
  startDate: Date,
  endDate: Date,
  mode: 'TASKS_ONLY' | 'RECORDS_ONLY' | 'BOTH'
): Promise<{ tasksCreated: number; recordsCreated: number }> {
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) {
    throw new Error('Habit not found');
  }

  const dates = generateDatesForFrequency(habit, startDate, endDate);
  let tasksCreated = 0;
  let recordsCreated = 0;

  for (const date of dates) {
    // Create task if mode includes TASKS
    if (mode === 'TASKS_ONLY' || mode === 'BOTH') {
      const task = await prisma.task.create({
        data: {
          name: habit.name,
          category: habit.category,
          context: habit.context,
          energyRequired: habit.energyRequired,
          duration: habit.duration,
          habitId: habit.id,
          isHabitInstance: true,
          status: 'NEXT',
          priority: 'SHOULD',
        },
      });
      tasksCreated++;
    }

    // Create record if mode includes RECORDS
    if (mode === 'RECORDS_ONLY' || mode === 'BOTH') {
      await prisma.habitRecord.upsert({
        where: {
          habitId_date: {
            habitId: habit.id,
            date: startOfDay(date),
          },
        },
        create: {
          habitId: habit.id,
          date: startOfDay(date),
          completed: false,
          dayOfWeek: getDay(date),
        },
        update: {},
      });
      recordsCreated++;
    }
  }

  return { tasksCreated, recordsCreated };
}

/**
 * Generate dates based on habit frequency type
 */
function generateDatesForFrequency(
  habit: Habit,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];

  if (habit.frequencyType === 'DAILY') {
    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
  } else if (habit.frequencyType === 'WEEKLY') {
    // For weekly: distribute evenly across the range
    const targetPerWeek = habit.targetPerWeek || 1;
    const daysBetweenInstances = Math.floor(7 / targetPerWeek);

    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);
    let instancesThisWeek = 0;
    let weekStart = currentDate;

    while (currentDate <= end) {
      if (instancesThisWeek < targetPerWeek) {
        dates.push(new Date(currentDate));
        instancesThisWeek++;
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + daysBetweenInstances));
      }

      // Check if we've moved to a new week
      const daysSinceWeekStart = differenceInDays(currentDate, weekStart);
      if (daysSinceWeekStart >= 7) {
        weekStart = currentDate;
        instancesThisWeek = 0;
      }
    }
  } else if (habit.frequencyType === 'INTERVAL') {
    // For interval: every N days/weeks/months
    const intervalValue = habit.intervalValue || 1;
    const intervalUnit = habit.intervalUnit || 'DAYS';

    let currentDate = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));

      if (intervalUnit === 'DAYS') {
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + intervalValue));
      } else if (intervalUnit === 'WEEKS') {
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + intervalValue * 7));
      } else if (intervalUnit === 'MONTHS') {
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + intervalValue));
      }
    }
  }

  return dates;
}

/**
 * Quick completion - create/update HabitRecord
 */
export async function quickComplete(
  habitId: string,
  date: Date,
  data: {
    notes?: string;
    effortLevel?: string;
    startTime?: Date;
    endTime?: Date;
  }
): Promise<HabitRecord> {
  const completionDate = startOfDay(date);

  // Calculate timeOfDay if startTime provided
  let timeOfDay = undefined;
  if (data.startTime) {
    const hour = data.startTime.getHours();
    if (hour < 6) timeOfDay = 'NIGHT';
    else if (hour < 9) timeOfDay = 'EARLY_MORNING';
    else if (hour < 12) timeOfDay = 'MORNING';
    else if (hour < 14) timeOfDay = 'MIDDAY';
    else if (hour < 17) timeOfDay = 'AFTERNOON';
    else if (hour < 20) timeOfDay = 'EVENING';
    else timeOfDay = 'NIGHT';
  }

  // Calculate actualDuration if both times provided
  let actualDuration = undefined;
  if (data.startTime && data.endTime) {
    actualDuration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000);
  }

  const record = await prisma.habitRecord.upsert({
    where: {
      habitId_date: {
        habitId,
        date: completionDate,
      },
    },
    create: {
      habitId,
      date: completionDate,
      completed: true,
      notes: data.notes,
      effortLevel: data.effortLevel as any,
      startTime: data.startTime,
      endTime: data.endTime,
      actualDuration,
      timeOfDay: timeOfDay as any,
      dayOfWeek: getDay(completionDate),
    },
    update: {
      completed: true,
      notes: data.notes,
      effortLevel: data.effortLevel as any,
      startTime: data.startTime,
      endTime: data.endTime,
      actualDuration,
      timeOfDay: timeOfDay as any,
    },
  });

  return record;
}
```

**Validation**:
- [ ] Functions compile without errors
- [ ] Import statements resolve correctly
- [ ] Types match Prisma schema

---

#### Task 3: Habits API Routes
**Estimated Time**: 4-6 hours
**Files to Create**: `backend/src/routes/habits.ts`

**Implementation**: See HABITS_API_SPECIFICATION.md for full endpoint details

**Key Endpoints to Implement**:
1. `POST /api/habits` - Create habit
2. `GET /api/habits` - List habits with filters
3. `GET /api/habits/:id` - Get habit with records and streak
4. `PATCH /api/habits/:id` - Update habit
5. `DELETE /api/habits/:id` - Soft delete (set isActive = false)
6. `POST /api/habits/:id/complete` - Quick check-in
7. `GET /api/habits/:id/streak` - Get streak data

**Validation Schema Example**:
```typescript
const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['SCHOOL', 'MUSIC', 'FITNESS', 'GAMING', 'NUTRITION', 'HYGIENE', 'PET', 'SOCIAL', 'PERSONAL', 'ADMIN']),
  context: z.enum(['HOME', 'OFFICE', 'COMPUTER', 'PHONE', 'ERRANDS', 'ANYWHERE']).default('ANYWHERE'),
  energyRequired: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  frequencyType: z.enum(['DAILY', 'WEEKLY', 'INTERVAL', 'CONSTRAINT']),
  targetPerWeek: z.number().int().min(1).max(7).optional(),
  intervalValue: z.number().int().min(1).max(365).optional(),
  intervalUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS']).optional(),
  duration: z.number().int().min(5).max(480).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
```

**Register Router in Main App**:
```typescript
// In backend/src/index.ts
import habitsRouter from './routes/habits';

app.use('/api/habits', habitsRouter);
```

**Validation**:
- [ ] All endpoints respond correctly
- [ ] Validation errors return 400 with details
- [ ] Success responses match schema
- [ ] Error handling for not found (404)

---

#### Task 4: Modify Task Completion to Create HabitRecord
**Estimated Time**: 1-2 hours
**Files to Modify**: `backend/src/routes/tasks.ts`

**In the `POST /api/tasks/:id/complete` endpoint, add**:

```typescript
// After creating PostDoLog, add this:

// If task is a habit instance, also create/update HabitRecord
if (task.isHabitInstance && task.habitId) {
  await prisma.habitRecord.upsert({
    where: {
      habitId_date: {
        habitId: task.habitId,
        date: startOfDay(new Date()),
      },
    },
    create: {
      habitId: task.habitId,
      date: startOfDay(new Date()),
      completed: true,
      effortLevel: postDoLog.effortLevel,
      startTime: postDoLog.startTime,
      endTime: postDoLog.endTime,
      actualDuration: postDoLog.actualDuration,
      timeOfDay: postDoLog.timeOfDay,
      dayOfWeek: getDay(new Date()),
      taskId: task.id,
    },
    update: {
      completed: true,
      effortLevel: postDoLog.effortLevel,
      startTime: postDoLog.startTime,
      endTime: postDoLog.endTime,
      actualDuration: postDoLog.actualDuration,
      timeOfDay: postDoLog.timeOfDay,
      taskId: task.id,
    },
  });
}
```

**Validation**:
- [ ] Completing a habit task creates HabitRecord
- [ ] HabitRecord linked to Task via taskId
- [ ] Non-habit tasks unaffected

---

### Frontend Development

#### Task 5: TypeScript Types
**Estimated Time**: 30 minutes
**Files to Create**: `frontend/src/types/habit.ts`

**Content**: See implementation guide for full type definitions

**Validation**:
- [ ] Types compile without errors
- [ ] Types match backend Prisma schema

---

#### Task 6: API Client Functions
**Estimated Time**: 1-2 hours
**Files to Modify**: `frontend/src/lib/api.ts`

**Add Functions**:
- `getHabits(filters?)`
- `getHabit(id)`
- `createHabit(habit)`
- `updateHabit(id, updates)`
- `deleteHabit(id)`
- `completeHabit(habitId, data)`

**Validation**:
- [ ] All functions have proper TypeScript types
- [ ] Axios calls use correct HTTP methods
- [ ] Query params formatted correctly

---

#### Task 7: React Query Hooks
**Estimated Time**: 2-3 hours
**Files to Create**: `frontend/src/hooks/useHabits.ts`

**Hooks to Implement**:
- `useHabits(filters?)` - Query
- `useHabit(id)` - Query
- `useCreateHabit()` - Mutation
- `useUpdateHabit()` - Mutation
- `useDeleteHabit()` - Mutation
- `useCompleteHabit()` - Mutation

**Query Invalidation Rules**:
- Create/Update/Delete → Invalidate lists
- Complete → Invalidate detail + lists + dailyPlans

**Validation**:
- [ ] Hooks follow existing React Query patterns
- [ ] Query keys structured correctly
- [ ] Mutations invalidate appropriate queries

---

#### Task 8: Habit Modal Component
**Estimated Time**: 3-4 hours
**Files to Create**: `frontend/src/components/HabitModal.tsx`

**Form Fields**:
- Name (required)
- Description (optional)
- Category (dropdown)
- Frequency Type (dropdown)
- Target Per Week (shown if WEEKLY)
- Duration (minutes)

**Features**:
- Create mode (no habit prop)
- Edit mode (habit prop provided)
- Form validation
- Loading state during submission
- Toast notifications on success/error

**Validation**:
- [ ] Modal opens and closes correctly
- [ ] Form validation works
- [ ] Create and edit modes both functional
- [ ] Toast notifications appear

---

#### Task 9: Habits Page
**Estimated Time**: 4-5 hours
**Files to Create**: `frontend/src/pages/HabitsPage.tsx`

**Layout**:
- Header card with "New Habit" button
- Grid of habit cards (3 columns on desktop)
- Each card shows:
  - Name, description
  - Category badge
  - Current streak (🔥 icon)
  - Completion rate (💯 icon)
  - Edit button

**Features**:
- Loading state
- Empty state (no habits yet)
- Filter by category (optional)
- Open modal on "New Habit" or "Edit"

**Validation**:
- [ ] Page renders without errors
- [ ] Habit cards display correct data
- [ ] Modal opens on button clicks
- [ ] Data refreshes after create/update

---

#### Task 10: Add Route for Habits Page
**Estimated Time**: 15 minutes
**Files to Modify**: `frontend/src/App.tsx` or router config

**Add Route**:
```typescript
<Route path="/habits" element={<HabitsPage />} />
```

**Add Navigation Link** (in Layout component):
```typescript
<NavLink to="/habits">Habits</NavLink>
```

**Validation**:
- [ ] /habits route renders HabitsPage
- [ ] Navigation link visible in sidebar
- [ ] Active state styling works

---

#### Task 11: Add Habits Widget to TodayPage
**Estimated Time**: 2-3 hours
**Files to Modify**: `frontend/src/pages/TodayPage.tsx`

**New Section**:
- Card with title "Today's Habits"
- List of active habits
- Each habit shows:
  - Icon, name
  - Current streak
  - "Check In" button

**Quick Check-In Flow**:
1. User clicks "Check In"
2. Call `useCompleteHabit()` with today's date
3. Show toast: "Habit completed! Streak: X days 🔥"
4. Update UI optimistically

**Validation**:
- [ ] Habits widget appears on TodayPage
- [ ] Check-in button works
- [ ] Toast appears on completion
- [ ] Streak updates in real-time

---

### Testing

#### Task 12: Backend Unit Tests
**Estimated Time**: 4-6 hours
**Files to Create**: `backend/tests/habitService.test.ts`

**Test Cases**:
- Streak calculation for DAILY habits (consecutive days)
- Streak calculation for WEEKLY habits (target per week)
- Streak breaks on missed day
- Longest streak calculation
- Instance generation for DAILY (7 days = 7 instances)
- Instance generation for WEEKLY (1 week, 3x = 3 instances)

**Run Tests**:
```bash
cd backend
npm test
```

**Validation**:
- [ ] All test cases pass
- [ ] Streak algorithm matches manual calculation
- [ ] Edge cases covered (0 records, 1 record, etc.)

---

#### Task 13: Frontend E2E Test
**Estimated Time**: 2-3 hours
**Files to Create**: `frontend/e2e/habits.spec.ts`

**Test Scenarios**:
1. Create habit
2. Navigate to TodayPage
3. Click "Check In"
4. Verify streak appears
5. Navigate back to HabitsPage
6. Verify habit shows updated streak

**Run Tests**:
```bash
cd frontend
npm run test:e2e
```

**Validation**:
- [ ] E2E test passes
- [ ] Can be run in CI/CD pipeline

---

## Definition of Done (Phase 1)

### Backend
- [x] Database schema migrated
- [ ] Habit service functions implemented
- [ ] API routes created and tested
- [ ] Task completion modified to create HabitRecords
- [ ] All backend unit tests passing
- [ ] No TypeScript errors

### Frontend
- [ ] TypeScript types defined
- [ ] API client functions implemented
- [ ] React Query hooks created
- [ ] HabitModal component built
- [ ] HabitsPage created and routed
- [ ] TodayPage widget added
- [ ] E2E test passing
- [ ] No console errors

### Documentation
- [ ] API endpoints documented
- [ ] Component usage examples added
- [ ] Database schema diagram created

### Deployment
- [ ] Backend deployed to staging
- [ ] Frontend deployed to staging
- [ ] Manual QA completed
- [ ] Performance metrics validated (<200ms API, <500ms page load)

---

## Next Steps After Phase 1

1. **Collect User Feedback** (1 week)
   - Survey users on habit creation experience
   - Track completion rate metrics
   - Identify pain points

2. **Plan Phase 2** (Calendar Integration)
   - Bulk generation modal
   - Drag-and-drop scheduling
   - Visual distinction on calendar

3. **Iterate on Phase 1** (if needed)
   - Fix bugs
   - Improve UX based on feedback
   - Optimize performance

---

**Document Version**: 1.0.0
**Generated By**: Agent 4 (Doer)
**For**: Terminal Agent `/superpowers-execute-plans`
