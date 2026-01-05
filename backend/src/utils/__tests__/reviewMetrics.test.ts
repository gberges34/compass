import { calculateMetrics } from '../reviewMetrics';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('../../prisma', () => ({
  prisma: {
    task: {
      count: jest.fn(),
    },
    postDoLog: {
      findMany: jest.fn(),
    },
    timeSlice: {
      findMany: jest.fn(),
    },
    dailyPlan: {
      findMany: jest.fn(),
    },
  },
}));

// Mock Timery service
jest.mock('../../services/timery', () => ({
  getCategoryBalanceFromToggl: jest.fn().mockResolvedValue({}),
}));

import { prisma } from '../../prisma';

describe('reviewMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.timeSlice.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('calculateMetrics', () => {
    const startDate = new Date('2025-01-01T00:00:00Z');
    const endDate = new Date('2025-01-01T23:59:59Z');

    it('should calculate metrics for daily review with valid daily plan', async () => {
      // Mock data
      (prisma.task.count as jest.Mock).mockResolvedValue(5);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([
        {
          task: { energyRequired: 'HIGH', category: { name: 'School' } },
          actualDuration: 120,
          startTime: new Date('2025-01-01T09:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
        },
        {
          task: { energyRequired: 'MEDIUM', category: { name: 'Fitness' } },
          actualDuration: 60,
          startTime: new Date('2025-01-01T14:00:00Z'),
          endTime: new Date('2025-01-01T15:00:00Z'),
        },
      ]);

      const result = await calculateMetrics({
        startDate,
        endDate,
        dailyPlan: { topOutcomes: ['Task 1', 'Task 2', 'Task 3'] },
        isWeekly: false,
      });

      expect(result.tasksCompleted).toBe(5);
      expect(result.executionRate).toBe(167); // Math.round((5/3) * 100)
      expect(result.deepWorkHours).toBe(2.0); // 120 minutes / 60
      expect(result.categoryBalance).toEqual({
        School: 120,
        Fitness: 60,
      });
      expect(result.totalTrackedTime).toBe(180);
      expect(result.contextSwitches).toBe(1); // 2 logs - 1
    });

    it('should return 0 execution rate when no tasks are planned (division by zero safeguard)', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(5);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculateMetrics({
        startDate,
        endDate,
        dailyPlan: null, // No daily plan
        isWeekly: false,
      });

      expect(result.executionRate).toBe(0); // Should not throw division by zero error
    });

    it('should calculate metrics for weekly review by aggregating daily plans', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(12);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.dailyPlan.findMany as jest.Mock).mockResolvedValue([
        { topOutcomes: ['A', 'B'] },
        { topOutcomes: ['C', 'D', 'E'] },
        { topOutcomes: ['F'] },
      ]);

      const weekStart = new Date('2025-01-01T00:00:00Z');
      const weekEnd = new Date('2025-01-07T23:59:59Z');

      const result = await calculateMetrics({
        startDate: weekStart,
        endDate: weekEnd,
        dailyPlan: null,
        isWeekly: true,
      });

      expect(result.executionRate).toBe(200); // Math.round((12/6) * 100)
      expect(prisma.dailyPlan.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        select: {
          topOutcomes: true,
        },
      });
    });

    it('should calculate time coverage based on waking hours', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(0);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([
        {
          task: { energyRequired: 'MEDIUM', category: { name: 'Personal' } },
          actualDuration: 480, // 8 hours
          startTime: new Date('2025-01-01T09:00:00Z'),
          endTime: new Date('2025-01-01T17:00:00Z'),
        },
      ]);

      const result = await calculateMetrics({
        startDate,
        endDate,
        dailyPlan: null,
        isWeekly: false,
      });

      // 480 minutes / 960 waking minutes = 50%
      expect(result.timeCoverage).toBe(50.0);
    });

    it('should return 0 context switches when no PostDo logs exist', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(0);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculateMetrics({
        startDate,
        endDate,
        dailyPlan: null,
        isWeekly: false,
      });

      expect(result.contextSwitches).toBe(0);
    });

    it('should merge Compass and Toggl category balances', async () => {
      const { getCategoryBalanceFromToggl } = require('../../services/timery');
      getCategoryBalanceFromToggl.mockResolvedValue({
        Music: 90,
        Fitness: 30, // Overlaps with Compass
      });

      (prisma.task.count as jest.Mock).mockResolvedValue(0);
      (prisma.postDoLog.findMany as jest.Mock).mockResolvedValue([
        {
          task: { energyRequired: 'LOW', category: { name: 'Fitness' } },
          actualDuration: 60,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
        },
      ]);

      const result = await calculateMetrics({
        startDate,
        endDate,
        dailyPlan: null,
        isWeekly: false,
      });

      expect(result.categoryBalance).toEqual({
        Fitness: 90, // 60 (Compass) + 30 (Toggl)
        Music: 90,   // 90 (Toggl only)
      });
      expect(result.totalTrackedTime).toBe(180); // 90 + 90
    });
  });
});
