import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';
import { getCategoryBalanceFromToggl, type PostDoLogTimeRange } from '../services/timery';

type PostDoLogWithTask = Prisma.PostDoLogGetPayload<{ include: { task: true } }>;

interface MetricsInput {
  startDate: Date;
  endDate: Date;
  dailyPlan?: {
    topOutcomes: string[];
  } | null;
}

interface MetricsResult {
  executionRate: number;
  tasksCompleted: number;
  deepWorkHours: number;
  categoryBalance: Record<string, number>;
  totalTrackedTime: number;
  timeCoverage: number;
  contextSwitches: number;
}

/**
 * Calculates review metrics for a given date range.
 * Works for both daily and weekly periods.
 */
export async function calculateMetrics(input: MetricsInput): Promise<MetricsResult> {
  const { startDate, endDate, dailyPlan } = input;

  // Get completed tasks count
  const completedTasks = await prisma.task.count({
    where: {
      status: 'DONE',
      updatedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate execution rate
  const plannedTasks = dailyPlan?.topOutcomes.length || 0;
  const executionRate = plannedTasks > 0 ? (completedTasks / plannedTasks) * 100 : 0;

  // Get PostDo logs
  const postDoLogs: PostDoLogWithTask[] = await prisma.postDoLog.findMany({
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

  // Merge both sources
  const categoryBreakdown = mergeCategoryBalances(compassCategoryBalance, togglCategoryBalance);

  // Calculate total tracked time
  const totalTrackedTime = Object.values(categoryBreakdown).reduce((sum, mins) => sum + mins, 0);

  // Calculate time coverage
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const wakingMinutes = daysInPeriod * 960; // 16 hours per day
  const timeCoverage = Math.round((totalTrackedTime / wakingMinutes) * 100 * 10) / 10;

  // Calculate context switches
  const contextSwitches = postDoLogs.length > 1 ? postDoLogs.length - 1 : 0;

  return {
    executionRate: Math.round(executionRate * 10) / 10,
    tasksCompleted: completedTasks,
    deepWorkHours,
    categoryBalance: categoryBreakdown,
    totalTrackedTime,
    timeCoverage,
    contextSwitches,
  };
}

function mergeCategoryBalances(
  compassBalance: Record<string, number>,
  togglBalance: Record<string, number>
): Record<string, number> {
  const merged = { ...compassBalance };
  Object.entries(togglBalance).forEach(([category, minutes]) => {
    merged[category] = (merged[category] || 0) + minutes;
  });
  return merged;
}
