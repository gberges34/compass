import { TimeDimension, TimeSource } from '@prisma/client';
import * as TimeEngine from '../timeEngine';
import { prisma } from '../../prisma';
import { NotFoundError } from '../../errors/AppError';

jest.mock('../../prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    timeSlice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TimeEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startSlice', () => {
    it('closes existing active slice in same dimension and creates new one', async () => {
      const now = new Date('2025-01-01T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const existingSlice = {
        id: 'existing-id',
        start: new Date('2025-01-01T09:00:00Z'),
        end: null,
        category: 'Sleep',
        dimension: 'PRIMARY' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: new Date('2025-01-01T09:00:00Z'),
        updatedAt: new Date('2025-01-01T09:00:00Z'),
      };

      const newSlice = {
        id: 'new-id',
        start: now,
        end: null,
        category: 'Gaming',
        dimension: 'PRIMARY' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          timeSlice: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue(newSlice),
          },
        };
        return callback(tx as any);
      });

      const result = await TimeEngine.startSlice({
        category: 'Gaming',
        dimension: 'PRIMARY',
        source: 'SHORTCUT',
      });

      expect(result).toEqual(newSlice);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('allows cross-dimension overlap', async () => {
      const now = new Date('2025-01-01T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const primarySlice = {
        id: 'primary-id',
        start: new Date('2025-01-01T09:00:00Z'),
        end: null,
        category: 'Gaming',
        dimension: 'PRIMARY' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: new Date('2025-01-01T09:00:00Z'),
        updatedAt: new Date('2025-01-01T09:00:00Z'),
      };

      const workModeSlice = {
        id: 'work-mode-id',
        start: now,
        end: null,
        category: 'Deep Work',
        dimension: 'WORK_MODE' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: now,
        updatedAt: now,
      };

      // Mock that no active WORK_MODE slice exists (different dimension)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          timeSlice: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }), // No conflict
            create: jest.fn().mockResolvedValue(workModeSlice),
          },
        };
        return callback(tx as any);
      });

      const result = await TimeEngine.startSlice({
        category: 'Deep Work',
        dimension: 'WORK_MODE',
        source: 'SHORTCUT',
      });

      expect(result).toEqual(workModeSlice);
      // updateMany should be called but with count 0 (no conflict)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('stopSlice', () => {
    it('stops active slice for dimension', async () => {
      const now = new Date('2025-01-01T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const activeSlice = {
        id: 'active-id',
        start: new Date('2025-01-01T09:00:00Z'),
        end: null,
        category: 'Gaming',
        dimension: 'PRIMARY' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: new Date('2025-01-01T09:00:00Z'),
        updatedAt: new Date('2025-01-01T09:00:00Z'),
      };

      const stoppedSlice = {
        ...activeSlice,
        end: now,
        updatedAt: now,
      };

      mockPrisma.timeSlice.findFirst.mockResolvedValue(activeSlice);
      mockPrisma.timeSlice.update.mockResolvedValue(stoppedSlice);

      const result = await TimeEngine.stopSlice({
        dimension: 'PRIMARY',
      });

      expect(result).toEqual(stoppedSlice);
      expect(mockPrisma.timeSlice.findFirst).toHaveBeenCalledWith({
        where: { dimension: 'PRIMARY', end: null },
      });
      expect(mockPrisma.timeSlice.update).toHaveBeenCalledWith({
        where: { id: 'active-id' },
        data: { end: now },
      });
    });

    it('validates category if provided', async () => {
      const activeSlice = {
        id: 'active-id',
        start: new Date('2025-01-01T09:00:00Z'),
        end: null,
        category: 'Gaming',
        dimension: 'PRIMARY' as TimeDimension,
        source: 'SHORTCUT' as TimeSource,
        isLocked: false,
        linkedTaskId: null,
        createdAt: new Date('2025-01-01T09:00:00Z'),
        updatedAt: new Date('2025-01-01T09:00:00Z'),
      };

      mockPrisma.timeSlice.findFirst.mockResolvedValue(activeSlice);

      await expect(
        TimeEngine.stopSlice({
          dimension: 'PRIMARY',
          category: 'Sleep', // Different category
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when no active slice exists', async () => {
      mockPrisma.timeSlice.findFirst.mockResolvedValue(null);

      await expect(
        TimeEngine.stopSlice({
          dimension: 'PRIMARY',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCurrentState', () => {
    it('returns map of active slices by dimension', async () => {
      const activeSlices = [
        {
          id: 'primary-id',
          start: new Date('2025-01-01T09:00:00Z'),
          end: null,
          category: 'Gaming',
          dimension: 'PRIMARY' as TimeDimension,
          source: 'SHORTCUT' as TimeSource,
          isLocked: false,
          linkedTaskId: null,
          createdAt: new Date('2025-01-01T09:00:00Z'),
          updatedAt: new Date('2025-01-01T09:00:00Z'),
        },
        {
          id: 'work-mode-id',
          start: new Date('2025-01-01T10:00:00Z'),
          end: null,
          category: 'Deep Work',
          dimension: 'WORK_MODE' as TimeDimension,
          source: 'SHORTCUT' as TimeSource,
          isLocked: false,
          linkedTaskId: null,
          createdAt: new Date('2025-01-01T10:00:00Z'),
          updatedAt: new Date('2025-01-01T10:00:00Z'),
        },
      ];

      mockPrisma.timeSlice.findMany.mockResolvedValue(activeSlices as any);

      const result = await TimeEngine.getCurrentState();

      expect(result).toEqual({
        primary: {
          category: 'Gaming',
          start: new Date('2025-01-01T09:00:00Z'),
        },
        work_mode: {
          category: 'Deep Work',
          start: new Date('2025-01-01T10:00:00Z'),
        },
        social: null,
        segment: null,
      });
    });

    it('returns null for dimensions with no active slices', async () => {
      mockPrisma.timeSlice.findMany.mockResolvedValue([]);

      const result = await TimeEngine.getCurrentState();

      expect(result).toEqual({
        primary: null,
        work_mode: null,
        social: null,
        segment: null,
      });
    });
  });
});


