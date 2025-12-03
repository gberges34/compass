import { prisma } from '../prisma';
import { TimeSlice, TimeDimension } from '@prisma/client';
import { NotFoundError } from '../errors/AppError';

export interface StartSliceInput {
  category: string;
  dimension: TimeDimension;
  source: 'SHORTCUT' | 'TIMERY' | 'MANUAL' | 'API';
  linkedTaskId?: string;
}

export interface StopSliceInput {
  dimension: TimeDimension;
  category?: string;
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

/**
 * Starts a new time slice, automatically closing any conflicting slice in the same dimension.
 * @param input - Slice details including category, dimension, source, and optional linkedTaskId
 * @returns The newly created TimeSlice
 */
export async function startSlice(input: StartSliceInput): Promise<TimeSlice> {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();

    const activeSlice = await tx.timeSlice.findFirst({
      where: {
        dimension: input.dimension,
        end: null,
      },
    });

    // If the exact same slice is already active, return it (idempotent)
    if (activeSlice && activeSlice.category === input.category) {
      return activeSlice;
    }

    // Close any active slice in the same dimension
    if (activeSlice) {
      await tx.timeSlice.update({
        where: { id: activeSlice.id },
        data: { end: now },
      });
    }

    // Create new slice
    const newSlice = await tx.timeSlice.create({
      data: {
        start: now,
        category: input.category,
        dimension: input.dimension,
        source: input.source,
        linkedTaskId: input.linkedTaskId,
      },
    });

    return newSlice;
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

  // Close the slice
  const stoppedSlice = await prisma.timeSlice.update({
    where: { id: activeSlice.id },
    data: { end: now },
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

