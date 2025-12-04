import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { getCategoryBalanceFromToggl, type PostDoLogTimeRange } from '../services/timery';

type PostDoLogWithTask = Prisma.PostDoLogGetPayload<{ include: { task: true } }>;

// Derive transaction client type from the extended Prisma client to support both base and extended clients
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface MetricsInput {
  startDate: Date;
  endDate: Date;
  dailyPlan?: {
    topOutcomes: string[];
  } | null;
  isWeekly?: boolean;
}

interface MetricsResult {
  executionRate: number;
  tasksCompleted: number;
  deepWorkHours: number;
  categoryBalance: Record<string, number>;      // Tasks only
  activityBreakdown: Record<string, number>;    // Time Engine only
  totalTrackedTime: number;
  timeCoverage: number;
  contextSwitches: number;
}

/**
 * Calculates review metrics for a given date range.
 * Works for both daily and weekly periods.
 * @param input - Metrics input parameters
 * @param tx - Optional Prisma transaction client. If provided, all database operations use this client for transactional consistency.
 */
export async function calculateMetrics(
  input: MetricsInput,
  tx?: PrismaTransactionClient
): Promise<MetricsResult> {
  const { startDate, endDate, dailyPlan, isWeekly = false } = input;
  const db = tx || prisma;

  // Get completed tasks count
  const completedTasks = await db.task.count({
    where: {
      status: 'DONE',
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate execution rate
  let plannedTasks = 0;
  if (isWeekly) {
    // For weekly reviews, query all daily plans in the date range
    const dailyPlans = await db.dailyPlan.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        topOutcomes: true,
      },
    });
    plannedTasks = dailyPlans.reduce((sum, plan) => sum + plan.topOutcomes.length, 0);
  } else {
    // For daily reviews, use the provided daily plan
    plannedTasks = dailyPlan?.topOutcomes.length || 0;
  }
  // Safeguard against division by zero when no tasks are planned
  const executionRate = plannedTasks > 0 ? Math.round((completedTasks / plannedTasks) * 100) : 0;

  // Get PostDo logs
  const postDoLogs: PostDoLogWithTask[] = await db.postDoLog.findMany({
    where: {
      completionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      task: true,
    },
  });

  // Calculate deep work hours (HIGH energy tasks)
  const deepWorkMinutes = postDoLogs
    .filter((log) => log.task.energyRequired === 'HIGH')
    .reduce((sum, log) => sum + log.actualDuration, 0);
  const deepWorkHours = Math.round((deepWorkMinutes / 60) * 10) / 10;

  // Calculate category balance from Compass tasks
  const compassCategoryBalance: Record<string, number> = {};
  postDoLogs.forEach((log) => {
    const category = log.task.category;
    compassCategoryBalance[category] = (compassCategoryBalance[category] || 0) + log.actualDuration;
  });

  // Get Toggl category balance
  const postDoLogRanges: PostDoLogTimeRange[] = postDoLogs.map((log) => ({
    startTime: log.startTime,
    endTime: log.endTime,
  }));

  const togglCategoryBalance = await getCategoryBalanceFromToggl(
    startDate,
    endDate,
    postDoLogRanges
  );

  // Get Time Engine category balance
  const timeEngineCategoryBalance = await getCategoryBalanceFromTimeEngine(
    startDate,
    endDate,
    postDoLogs.map((log) => log.task.id)
  );

  // Task categories only (from completed tasks + Toggl)
  const categoryBalance = mergeCategoryBalances(
    compassCategoryBalance,
    togglCategoryBalance
  );

  // Time Engine activities (standalone)
  const activityBreakdown = timeEngineCategoryBalance;

  // Calculate total tracked time (sum of both sources)
  const taskTime = Object.values(categoryBalance).reduce((sum, mins) => sum + mins, 0);
  const activityTime = Object.values(activityBreakdown).reduce((sum, mins) => sum + mins, 0);
  const totalTrackedTime = taskTime + activityTime;

  // Calculate time coverage
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const wakingMinutes = daysInPeriod * 960; // 16 hours per day
  const timeCoverage = Math.round((totalTrackedTime / wakingMinutes) * 100 * 10) / 10;

  // Calculate context switches
  const contextSwitches = postDoLogs.length > 1 ? postDoLogs.length - 1 : 0;

  return {
    executionRate,
    tasksCompleted: completedTasks,
    deepWorkHours,
    categoryBalance,
    activityBreakdown,
    totalTrackedTime,
    timeCoverage,
    contextSwitches,
  };
}

/**
 * Gets category balance from Time Engine, excluding slices linked to tasks
 * (since PostDoLog already captures that time).
 */
async function getCategoryBalanceFromTimeEngine(
  startDate: Date,
  endDate: Date,
  taskIds: string[]
): Promise<Record<string, number>> {
  const whereClause: Prisma.TimeSliceWhereInput = {
    dimension: 'PRIMARY',
    start: { lte: endDate },
    end: { not: null, gte: startDate }, // Only closed slices that overlap
  };

  // Exclude slices linked to tasks (PostDoLog already captures that time)
  if (taskIds.length > 0) {
    whereClause.AND = [
      {
        OR: [
          { linkedTaskId: null },
          { linkedTaskId: { notIn: taskIds } },
        ],
      },
    ];
  } else {
    whereClause.linkedTaskId = null;
  }

  const slices = await prisma.timeSlice.findMany({
    where: whereClause,
  });

  const balance: Record<string, number> = {};
  slices.forEach((slice) => {
    // Clamp slice duration to review window boundaries
    // slice.end is guaranteed to be non-null due to query filter
    const clampedStart = slice.start < startDate ? startDate : slice.start;
    const clampedEnd = slice.end! > endDate ? endDate : slice.end!;
    const minutes = Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 60000);
    balance[slice.category] = (balance[slice.category] || 0) + minutes;
  });

  return balance;
}

function mergeCategoryBalances(...balances: Record<string, number>[]): Record<string, number> {
  return balances.reduce((merged, balance) => {
    Object.entries(balance).forEach(([category, minutes]) => {
      merged[category] = (merged[category] || 0) + minutes;
    });
    return merged;
  }, {} as Record<string, number>);
}
