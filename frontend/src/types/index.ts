import type { PaginationResponse } from '@compass/dto/pagination';

// Compass Frontend - Type Definitions

export type TaskStatus = 'NEXT' | 'WAITING' | 'ACTIVE' | 'DONE' | 'SOMEDAY';
export type Priority = 'MUST' | 'SHOULD' | 'COULD' | 'MAYBE';
export type Category = 'SCHOOL' | 'MUSIC' | 'FITNESS' | 'GAMING' | 'NUTRITION' | 'HYGIENE' | 'PET' | 'SOCIAL' | 'PERSONAL' | 'ADMIN';
export type Context = 'HOME' | 'OFFICE' | 'COMPUTER' | 'PHONE' | 'ERRANDS' | 'ANYWHERE';
export type Energy = 'HIGH' | 'MEDIUM' | 'LOW';
export type Effort = 'SMALL' | 'MEDIUM' | 'LARGE';
export type TimeOfDay = 'EARLY_MORNING' | 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type EnergyMatch = 'PERFECT' | 'MOSTLY_ALIGNED' | 'SOME_MISMATCH' | 'POOR';
export type ReviewType = 'DAILY' | 'WEEKLY';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  category: Category;
  context: Context;
  energyRequired: Energy;
  duration: number;
  definitionOfDone: string;
  dueDate?: string;
  scheduledStart?: string | null;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TempCapturedTask {
  id: string;
  name: string;
  dueDate?: string;
  source: string;
  processed: boolean;
  createdAt: string;
}

export interface PostDoLog {
  id: string;
  taskId: string;
  task?: Task;
  outcome: string;
  effortLevel: Effort;
  keyInsight: string;
  estimatedDuration: number;
  actualDuration: number;
  variance: number;
  efficiency: number;
  startTime: string;
  endTime: string;
  timeOfDay: TimeOfDay;
  dayOfWeek: string;
  timeryEntryId?: string;
  completionDate: string;
}

export interface PlannedBlock {
  id: string;
  start: string;
  end: string;
  label: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  energyLevel: Energy;
  plannedBlocks: PlannedBlock[];
  topOutcomes: string[];
  reward?: string;
  reflection?: string;
  actualOutcomes?: number;
  energyMatch?: EnergyMatch;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  type: ReviewType;
  periodStart: string;
  periodEnd: string;
  wins: string[];
  misses: string[];
  lessons: string[];
  nextGoals: string[];
  executionRate?: number;
  tasksCompleted: number;
  deepWorkHours: number;
  categoryBalance: Record<string, number>;
  activityBreakdown?: Record<string, number>;
  totalTrackedTime: number;
  timeCoverage: number;
  contextSwitches?: number;
  energyAssessment?: Energy;
  createdAt: string;
}

// API Request/Response types

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// Replaced EnrichTaskRequest with ProcessCapturedTaskRequest
export interface ProcessCapturedTaskRequest {
  tempTaskId: string;
  name: string;
  priority: Priority;
  category: Category;
  context: Context;
  energyRequired: Energy;
  duration: number;
  definitionOfDone: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface ActivateTaskResponse {
  task: Task;
  focusMode: string;
  timeryProject: string;
  definitionOfDone: string;
}

export interface CompleteTaskRequest {
  outcome: string;
  effortLevel: Effort;
  keyInsight: string;
  actualDuration: number;
  startTime: string;
  endTime: string;
}

export interface CompleteTaskResponse {
  task: Task;
  postDoLog: PostDoLog;
  metrics: {
    variance: number;
    efficiency: number;
    timeOfDay: TimeOfDay;
    dayOfWeek: string;
  };
}

export interface CreateDailyPlanRequest {
  energyLevel: Energy;
  plannedBlocks: PlannedBlock[];
  topOutcomes: string[];
  reward?: string;
}

export interface UpdateDailyPlanRequest {
  reflection: string;
  actualOutcomes: number;
  energyMatch: EnergyMatch;
}

export interface CreateReviewRequest {
  wins: string[];
  misses: string[];
  lessons: string[];
  nextGoals: string[];
  energyAssessment?: Energy;
}

// UI State types

export interface TaskFilters {
  status?: TaskStatus;
  category?: Category;
  context?: Context;
  priority?: Priority;
  energyRequired?: Energy;
  scheduledFilter?: string;
  timezone?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  task?: Task;
  type: 'task' | 'plannedBlock';
}
