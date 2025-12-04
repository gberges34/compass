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

  // Close the slice
  const stoppedSlice = await prisma.timeSlice.update({
    where: { id: activeSlice.id },
    data: { end: now },
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
  // Build update data object
  const updateData: {
    start?: Date;
    end?: Date | null;
    category?: string;
  } = {};

  if (data.start !== undefined) {
    updateData.start = data.start;
  }
  if (data.end !== undefined) {
    updateData.end = data.end;
  }
  if (data.category !== undefined) {
    updateData.category = data.category;
  }

  try {
    const updatedSlice = await prisma.timeSlice.update({
      where: { id },
      data: updateData,
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

