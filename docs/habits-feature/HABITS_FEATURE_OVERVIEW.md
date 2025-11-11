# Habits Feature - Executive Overview

## What is the Habits Feature?

A recurring task management and pattern tracking system that integrates with the existing Compass productivity system. It enables users to track regular activities (gym routines, cooking schedules, practice sessions, chores, pet care) with streak tracking, bulk scheduling, and pattern analytics.

## Problem Being Solved

- Current Compass only supports one-time tasks
- Users manually recreate recurring activities (gym, cooking, practice)
- No pattern tracking or consistency measurement
- No streak tracking for motivation
- Calendar gets cluttered with duplicate task creation

## Solution Overview

Introduce a **Habits system** that:
1. **Template-based Generation**: Create habit templates that generate task instances
2. **Dual Completion Modes**: Quick check-in OR full task completion
3. **Streak Tracking**: Motivational consistency metrics with current/longest streaks
4. **Calendar Integration**: Habits appear alongside tasks with visual distinction
5. **Pattern Analytics**: Track completion by time, day, energy level for optimization

## Key User Stories

### 1. Gym (Bulk Routine Templates)
**As a** fitness enthusiast
**I want to** create weekly gym routines and schedule them in bulk
**So that** I don't manually create 3 gym tasks per week and can track workout consistency

**Features**: Routine templates, bulk calendar drag-and-drop, exercise/weight tracking integration

### 2. Cooking (Constraint-Based Scheduling)
**As a** meal prepper
**I want to** schedule cooking with dependency chains (defrost → cook → consume)
**So that** I optimize my meal prep efficiency and never forget to defrost

**Features**: Linear programming scheduler, dependency chains, shopping list generation

### 3. Music Practice (Pomodoro Bulk Creation)
**As a** musician
**I want to** allocate 3-5 hours of practice per week in flexible pomodoro chunks
**So that** I hit my practice goals without rigid scheduling

**Features**: Time budget system, pomodoro templates, practice category tracking

### 4. Cleaning/Laundry (Pattern Detection)
**As a** busy professional
**I want the** system to learn my laundry patterns and remind me when it's due
**So that** I never run out of clean clothes

**Features**: Manual tracking → pattern detection → predictive reminders (ML)

### 5. Pet Care (Fixed Interval Scheduling)
**As a** pet owner
**I want** automated reminders for dog shower, medicine, and training
**So that** I never miss critical pet care tasks

**Features**: Interval-based recurrence, health tracking, proactive notifications

## Integration Points

| Existing System | Habits Integration | Benefit |
|----------------|-------------------|---------|
| **Task System** | Habits generate Tasks | Seamless workflow, reuse existing UI |
| **Calendar** | Habits render with dashed borders | Visual clarity, drag-and-drop scheduling |
| **PostDoLog** | Task completion creates HabitRecord | Dual analytics layer |
| **Reviews** | Weekly reviews include habit metrics | Holistic productivity view |
| **Categories** | Habits use existing Category enum | Consistent design language |

## Success Metrics

### Phase 1 (30 days post-launch)
- 60%+ users create at least 1 habit
- 40%+ users complete 7+ check-ins
- <5% error rate on completions
- 100% streak calculation accuracy

### Phase 2 (60 days)
- 30%+ users generate bulk instances
- 50%+ users schedule habits on calendar
- <500ms calendar render time (p95)

### Phase 3 (90 days)
- 25%+ users view analytics
- 70%+ average habit completion rate
- 10%+ users maintain 30+ day streaks

## Phased Rollout

### Phase 1: Foundation (2-3 weeks)
- Core habit CRUD
- Manual check-ins
- Basic streak calculation
- Daily/Weekly/Interval frequency types

### Phase 2: Calendar Integration (2-3 weeks)
- Bulk instance generation
- Drag-and-drop scheduling
- Calendar visual distinction
- Performance optimization

### Phase 3: Analytics & ML Prep (2-3 weeks)
- Completion pattern analytics
- Review integration
- Streak visualizations
- Data export for ML training

### Phase 4: Advanced Features (Future)
- ML-powered predictions
- Constraint-based scheduling (cooking LP)
- Template library
- Auto-generation cron job

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HABITS SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│  Database Layer                                              │
│  ┌──────────┐   ┌──────────────┐   ┌──────┐                │
│  │  Habit   │──→│ HabitRecord  │──→│ Task │ (extension)   │
│  │ Template │   │  (tracking)  │   └──────┘                │
│  └──────────┘   └──────────────┘                            │
│                                                               │
│  API Layer (REST)                                            │
│  /api/habits/*                                               │
│  - CRUD operations                                           │
│  - Bulk generation                                           │
│  - Quick completion                                          │
│  - Streak calculation                                        │
│  - Analytics                                                 │
│                                                               │
│  Frontend Layer                                              │
│  - HabitsPage (list view)                                   │
│  - HabitModal (create/edit)                                 │
│  - Calendar integration (Phase 2)                           │
│  - Analytics dashboard (Phase 3)                            │
│  - React Query hooks (state management)                     │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Habits Generate Tasks (Not Replace Them)
**Decision**: Habit instances are Tasks with `isHabitInstance = true`
**Rationale**: Leverage existing calendar, scheduling, and completion workflows
**Trade-off**: More database rows, but seamless UX

### 2. Dual Tracking System
**Decision**: Users can either quick-check-in OR complete full task
**Rationale**: Flexibility for different habit types (quick check vs detailed logging)
**Trade-off**: Two completion paths to maintain

### 3. Streak Algorithm by Frequency
**Decision**: Daily = consecutive days, Weekly = hit target in 7-day window
**Rationale**: Weekly habits shouldn't break streak if done different days each week
**Trade-off**: More complex calculation logic

### 4. Phase Gating for Complexity
**Decision**: Defer constraint-based scheduling and ML to later phases
**Rationale**: Ship MVP faster, validate user demand first
**Trade-off**: Some advanced use cases (cooking LP) not available at launch

## Files Generated by Agent 4

1. ✅ `HABITS_FEATURE_OVERVIEW.md` - This file
2. `HABITS_PRD.md` - Complete product requirements document
3. `HABITS_DATABASE_SCHEMA.md` - Prisma schema with relationships
4. `HABITS_API_SPECIFICATION.md` - REST API endpoints
5. `HABITS_IMPLEMENTATION_PLAN_PHASE1.md` - Step-by-step Phase 1 implementation
6. `HABITS_IMPLEMENTATION_PLAN_PHASE2.md` - Step-by-step Phase 2 implementation
7. `HABITS_IMPLEMENTATION_PLAN_PHASE3.md` - Step-by-step Phase 3 implementation
8. `HABITS_TESTING_STRATEGY.md` - Unit, integration, E2E tests

## Next Steps

1. **Review**: Stakeholders review all documents generated by Agent 4
2. **Planning**: Use `/superpowers-writing-plans` with Phase 1 implementation plan
3. **Execution**: Use `/superpowers-execute-plans` to build Phase 1
4. **Testing**: Run test suite, validate streak calculations
5. **Deploy**: Ship Phase 1 to production
6. **Iterate**: Collect user feedback, proceed to Phase 2

---

**Document Version**: 1.0.0
**Generated By**: Agent 4 (Doer)
**Date**: 2025-11-10
**For**: Terminal Agent Execution
