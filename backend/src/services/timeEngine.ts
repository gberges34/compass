import { prisma } from '../prisma';
import { TimeSlice, TimeDimension, Prisma } from '@prisma/client';
import { NotFoundError } from '../errors/AppError';

// Derive transaction client type from the extended Prisma client to support both base and extended clients
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface StartSliceInput {
  category: string;
  dimension: TimeDimension;
  source: 'SHORTCUT' | 'TIMERY' | 'MANUAL' | 'API';
  linkedTaskId?: string;
}

export interface StopSliceInput {
  dimension: TimeDimension;
  category?: string;
  endAt?: Date;
}

export interface ActiveSlice {
  category: string;
  start: Date;
}

export interface CurrentState {
  primary: ActiveSlice | null;
  work_mode: ActiveSlice | null;
  social: ActiveSlice | null;
  segment: ActiveSlice | null;
}

export interface HealthSleepSyncInput {
  windowStart: string;
  windowEnd: string;
  sleepStart: string;
  sleepEnd: string;
}

export interface HealthSyncInput {
  date: string;
  sleepSessions?: Array<{
    start: string;
    end: string;
    quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  }>;
  workouts?: Array<{
    start: string;
    end: string;
    type: string;
    calories?: number;
  }>;
  activity?: {
    steps?: number;
    activeCalories?: number;
    exerciseMinutes?: number;
    standHours?: number;
  };
}

export interface HealthSyncResult {
  sleepSlicesCreated: number;
  workoutSlicesCreated: number;
  healthMetricUpdated: boolean;
}

/**
 * Core logic for starting a time slice. Can be used within an existing transaction.
 * @param input - Slice details including category, dimension, source, and optional linkedTaskId
 * @param tx - Optional transaction client. If not provided, uses prisma directly (caller must handle transaction)
 * @returns The newly created TimeSlice
 */
async function startSliceCore(
  input: StartSliceInput,
  tx?: PrismaTransactionClient
): Promise<TimeSlice> {
  const db = tx || prisma;
  const now = new Date();

  const activeSlice = await db.timeSlice.findFirst({
    where: {
      dimension: input.dimension,
      end: null,
    },
  });

  // If the exact same slice is already active (category and linkedTaskId match), return it (idempotent)
  // Normalize undefined to null for comparison (DB uses null, API may use undefined)
  const normalizedInputLinkedTaskId = input.linkedTaskId ?? null;
  if (
    activeSlice &&
    activeSlice.category === input.category &&
    activeSlice.linkedTaskId === normalizedInputLinkedTaskId
  ) {
    return activeSlice;
  }

  // Close any active slice in the same dimension
  if (activeSlice) {
    await db.timeSlice.update({
      where: { id: activeSlice.id },
      data: { end: now },
    });
  }

  // Create new slice
  const newSlice = await db.timeSlice.create({
    data: {
      start: now,
      category: input.category,
      dimension: input.dimension,
      source: input.source,
      linkedTaskId: input.linkedTaskId,
    },
  });

  return newSlice;
}

/**
 * Starts a new time slice, automatically closing any conflicting slice in the same dimension.
 * Creates its own transaction if not provided with one.
 * @param input - Slice details including category, dimension, source, and optional linkedTaskId
 * @param tx - Optional transaction client. If provided, uses it; otherwise creates its own transaction
 * @returns The newly created TimeSlice
 */
export async function startSlice(
  input: StartSliceInput,
  tx?: PrismaTransactionClient
): Promise<TimeSlice> {
  // If transaction client provided, use it directly (caller handles transaction)
  if (tx) {
    return startSliceCore(input, tx);
  }

  // Otherwise, create our own transaction
  return await prisma.$transaction(async (transactionTx) => {
    return startSliceCore(input, transactionTx);
  });
}

/**
 * Stops the active slice for a given dimension.
 * @param input - Dimension to stop, with optional category for validation
 * @returns The stopped TimeSlice
 * @throws {NotFoundError} If no active slice exists for the dimension
 */
export async function stopSlice(input: StopSliceInput): Promise<TimeSlice> {
  const now = new Date();

  // Find active slice for the dimension
  const activeSlice = await prisma.timeSlice.findFirst({
    where: {
      dimension: input.dimension,
      end: null,
    },
  });

  if (!activeSlice) {
    throw new NotFoundError(`Active ${input.dimension} slice`);
  }

  // Optional category validation
  if (input.category && activeSlice.category !== input.category) {
    throw new NotFoundError(
      `Active ${input.dimension} slice with category "${input.category}"`
    );
  }

  const requestedEndAt = input.endAt ?? now;
  const effectiveEndAt = new Date(
    Math.min(requestedEndAt.getTime(), now.getTime())
  );
  const endAt =
    effectiveEndAt.getTime() < activeSlice.start.getTime()
      ? activeSlice.start
      : effectiveEndAt;

  // Close the slice
  const stoppedSlice = await prisma.timeSlice.update({
    where: { id: activeSlice.id },
    data: { end: endAt },
  });

  return stoppedSlice;
}

/**
 * Stops the active slice for a given dimension if it exists.
 * @param input - Dimension to stop, with optional category for validation
 * @returns The stopped TimeSlice, or null if no active slice exists
 */
export async function stopSliceIfExists(input: StopSliceInput): Promise<TimeSlice | null> {
  const now = new Date();

  // Find active slice for the dimension
  const activeSlice = await prisma.timeSlice.findFirst({
    where: {
      dimension: input.dimension,
      end: null,
    },
  });

  if (!activeSlice) {
    return null;
  }

  // Optional category validation
  if (input.category && activeSlice.category !== input.category) {
    return null;
  }

  const requestedEndAt = input.endAt ?? now;
  const effectiveEndAt = new Date(
    Math.min(requestedEndAt.getTime(), now.getTime())
  );
  const endAt =
    effectiveEndAt.getTime() < activeSlice.start.getTime()
      ? activeSlice.start
      : effectiveEndAt;

  // Close the slice
  const stoppedSlice = await prisma.timeSlice.update({
    where: { id: activeSlice.id },
    data: { end: endAt },
  });

  return stoppedSlice;
}

/**
 * Maps TimeDimension enum to CurrentState key
 */
function dimensionToStateKey(dimension: TimeDimension): keyof CurrentState | null {
  const mapping: Record<TimeDimension, keyof CurrentState> = {
    PRIMARY: 'primary',
    WORK_MODE: 'work_mode',
    SOCIAL: 'social',
    SEGMENT: 'segment',
  };
  return mapping[dimension] || null;
}

/**
 * Gets the current state of all active time slices across all dimensions.
 * @returns A map of active slices by dimension
 */
export async function getCurrentState(): Promise<CurrentState> {
  const activeSlices = await prisma.timeSlice.findMany({
    where: {
      end: null,
    },
  });

  // Build state map
  const state: CurrentState = {
    primary: null,
    work_mode: null,
    social: null,
    segment: null,
  };

  activeSlices.forEach((slice) => {
    const dimensionKey = dimensionToStateKey(slice.dimension);
    if (dimensionKey) {
      state[dimensionKey] = {
        category: slice.category,
        start: slice.start,
      };
    }
  });

  return state;
}

/**
 * Syncs a single authoritative Sleep slice from Health for a given window.
 * Deletes overlapping HEALTH Sleep slices in that window before inserting the new one.
 * @deprecated Use syncHealthData instead for unified health sync
 */
export async function syncHealthSleep(input: HealthSleepSyncInput): Promise<TimeSlice> {
  const windowStart = new Date(input.windowStart);
  const windowEnd = new Date(input.windowEnd);
  const sleepStart = new Date(input.sleepStart);
  const sleepEnd = new Date(input.sleepEnd);

  return prisma.$transaction(async (tx) => {
    await tx.timeSlice.deleteMany({
      where: {
        category: 'Sleep',
        dimension: 'PRIMARY',
        start: { lt: windowEnd },
        OR: [
          { end: { gt: windowStart } },
          { end: null },
        ],
      },
    });

    const slice = await tx.timeSlice.create({
      data: {
        start: sleepStart,
        end: sleepEnd,
        category: 'Sleep',
        dimension: 'PRIMARY',
        source: 'API',
        isLocked: true,
        linkedTaskId: null,
      },
    });

    return slice;
  });
}

/**
 * Syncs health data from HealthKit (Sleep sessions, Workouts, Activity metrics).
 * This is idempotent - re-running for the same date replaces data cleanly.
 * Does NOT call Toggl projection (health data stays Compass-only).
 */
export async function syncHealthData(input: HealthSyncInput): Promise<HealthSyncResult> {
  const syncDate = new Date(input.date);
  const dayStart = new Date(syncDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(syncDate);
  dayEnd.setHours(23, 59, 59, 999);

  return prisma.$transaction(async (tx) => {
    let sleepSlicesCreated = 0;
    let workoutSlicesCreated = 0;

    // Delete existing Sleep and Workout TimeSlices for this day (idempotent)
    if (input.sleepSessions?.length || input.workouts?.length) {
      await tx.timeSlice.deleteMany({
        where: {
          dimension: 'PRIMARY',
          start: { gte: dayStart, lte: dayEnd },
          OR: [
            { category: 'Sleep', source: 'API' },
            { category: { startsWith: 'Workout' }, source: 'API' },
          ],
        },
      });
    }

    // Create Sleep TimeSlices
    if (input.sleepSessions?.length) {
      for (const session of input.sleepSessions) {
        const sleepStart = new Date(session.start);
        const sleepEnd = new Date(session.end);

        await tx.timeSlice.create({
          data: {
            start: sleepStart,
            end: sleepEnd,
            category: 'Sleep',
            dimension: 'PRIMARY',
            source: 'API',
            isLocked: true,
            linkedTaskId: null,
          },
        });
        sleepSlicesCreated++;
      }
    }

    // Create Workout TimeSlices
    if (input.workouts?.length) {
      for (const workout of input.workouts) {
        const workoutStart = new Date(workout.start);
        const workoutEnd = new Date(workout.end);
        const category = workout.type.startsWith('Workout') ? workout.type : `Workout: ${workout.type}`;

        await tx.timeSlice.create({
          data: {
            start: workoutStart,
            end: workoutEnd,
            category,
            dimension: 'PRIMARY',
            source: 'API',
            isLocked: false,
            linkedTaskId: null,
          },
        });
        workoutSlicesCreated++;
      }
    }

    // Upsert DailyHealthMetric with activity data
    let healthMetricUpdated = false;
    if (input.activity) {
      // Calculate total sleep duration from sessions if provided
      let totalSleepDuration: number | undefined;
      if (input.sleepSessions?.length) {
        totalSleepDuration = input.sleepSessions.reduce((total, session) => {
          const start = new Date(session.start);
          const end = new Date(session.end);
          return total + Math.floor((end.getTime() - start.getTime()) / 60000);
        }, 0);
      }

      // Determine sleep quality (use best quality if multiple sessions)
      let sleepQuality: string | undefined;
      if (input.sleepSessions?.length) {
        const qualities = input.sleepSessions
          .map(s => s.quality)
          .filter((q): q is 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' => !!q);
        if (qualities.length > 0) {
          const qualityOrder = { POOR: 0, FAIR: 1, GOOD: 2, EXCELLENT: 3 };
          sleepQuality = qualities.reduce((best, current) =>
            qualityOrder[current] > qualityOrder[best] ? current : best
          );
        }
      }

      await tx.dailyHealthMetric.upsert({
        where: { date: dayStart },
        update: {
          steps: input.activity.steps ?? undefined,
          activeCalories: input.activity.activeCalories ?? undefined,
          exerciseMinutes: input.activity.exerciseMinutes ?? undefined,
          standHours: input.activity.standHours ?? undefined,
          sleepDuration: totalSleepDuration ?? undefined,
          sleepQuality: sleepQuality ?? undefined,
        },
        create: {
          date: dayStart,
          steps: input.activity.steps ?? null,
          activeCalories: input.activity.activeCalories ?? null,
          exerciseMinutes: input.activity.exerciseMinutes ?? null,
          standHours: input.activity.standHours ?? null,
          sleepDuration: totalSleepDuration ?? null,
          sleepQuality: sleepQuality ?? null,
        },
      });
      healthMetricUpdated = true;
    }

    return {
      sleepSlicesCreated,
      workoutSlicesCreated,
      healthMetricUpdated,
    };
  });
}

/**
 * Updates a time slice by ID.
 * @param id - The slice ID to update
 * @param data - Partial update data (start, end, category)
 * @returns The updated TimeSlice
 * @throws {NotFoundError} If the slice doesn't exist
 */
export async function updateSlice(
  id: string,
  data: { start?: Date; end?: Date | null; category?: string }
): Promise<TimeSlice> {
  try {
    const updatedSlice = await prisma.timeSlice.update({
      where: { id },
      data,
    });
    return updatedSlice;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundError(`TimeSlice with id ${id}`);
    }
    throw error;
  }
}

/**
 * Deletes a time slice by ID.
 * @param id - The slice ID to delete
 * @returns The deleted TimeSlice
 * @throws {NotFoundError} If the slice doesn't exist
 */
export async function deleteSlice(id: string): Promise<TimeSlice> {
  try {
    const deletedSlice = await prisma.timeSlice.delete({
      where: { id },
    });
    return deletedSlice;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundError(`TimeSlice with id ${id}`);
    }
    throw error;
  }
}
