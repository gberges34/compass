import type { TimeSlice } from '@prisma/client';
import { prisma } from '../prisma';
import { env } from '../config/env';
import {
  stopRunningEntry,
  createRunningTimeEntry,
  stopTimeEntryAt,
  updateTimeEntryTags,
  getTogglContext,
  resolveProjectIdForCategory,
  getCurrentRunningEntry,
} from './timery';

const primaryStartInFlight = new Map<string, Promise<void>>();

function workModeToTag(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Projects a PRIMARY slice start into Toggl (running entry).
 */
export function syncPrimaryStart(slice: TimeSlice): Promise<void> {
  if (!env.TOGGL_API_TOKEN || slice.dimension !== 'PRIMARY') {
    return Promise.resolve();
  }
  if (slice.togglEntryId) {
    return Promise.resolve();
  }

  const existing = primaryStartInFlight.get(slice.id);
  if (existing) return existing;

  const job = (async () => {
    const { workspaceId } = await getTogglContext();

    // Stop any running Toggl entry to avoid overlap
    try {
      await stopRunningEntry();
    } catch (error) {
      console.warn('Failed to stop running Toggl entry before PRIMARY start', error);
    }

    // Grab current WORK_MODE (if any) to tag the running entry
    const workMode = await prisma.timeSlice.findFirst({
      where: { dimension: 'WORK_MODE', end: null },
      select: { category: true },
    });

    const description = slice.category;

    const linkedTaskCategoryId = slice.linkedTaskId
      ? (
          await prisma.task.findUnique({
            where: { id: slice.linkedTaskId },
            select: { categoryId: true },
          })
        )?.categoryId ?? null
      : null;

    const projectId = await resolveProjectIdForCategory(
      linkedTaskCategoryId
        ? { categoryId: linkedTaskCategoryId }
        : { categoryName: slice.category }
    );

    const tags = ['compass'];
    if (workMode?.category) {
      tags.push(workModeToTag(workMode.category));
    }

    const entry = await createRunningTimeEntry({
      workspaceId,
      description,
      start: slice.start,
      projectId,
      tags,
    });

    await prisma.timeSlice.update({
      where: { id: slice.id },
      data: { togglEntryId: entry.id.toString() },
    });
  })();

  let wrapped: Promise<void>;
  wrapped = job.finally(() => {
    if (primaryStartInFlight.get(slice.id) === wrapped) {
      primaryStartInFlight.delete(slice.id);
    }
  });
  primaryStartInFlight.set(slice.id, wrapped);
  return wrapped;
}

/**
 * Projects a PRIMARY slice stop into Toggl.
 */
export async function syncPrimaryStop(slice: TimeSlice | null): Promise<void> {
  if (!env.TOGGL_API_TOKEN || !slice || slice.dimension !== 'PRIMARY') return;
  if (!slice.togglEntryId) return;

  const { workspaceId } = await getTogglContext();
  try {
    await stopTimeEntryAt({
      workspaceId,
      entryId: Number(slice.togglEntryId),
      start: slice.start,
      stop: slice.end ?? new Date(),
    });
  } catch (error) {
    console.warn('Failed to stop Toggl entry for PRIMARY stop', error);
  }
}

/**
 * Projects WORK_MODE start/stop as tags on the running PRIMARY Toggl entry.
 */
export async function syncWorkModeTags(
  primarySlice: TimeSlice | null,
  workModeCategory: string | null,
  action: 'add' | 'delete'
): Promise<void> {
  if (!env.TOGGL_API_TOKEN || !primarySlice || primarySlice.dimension !== 'PRIMARY') return;
  const { workspaceId } = await getTogglContext();

  let entryId: number | null = primarySlice.togglEntryId ? Number(primarySlice.togglEntryId) : null;
  if (!entryId) {
    const running = await getCurrentRunningEntry();
    entryId = running ? Number(running.id) : null;
  }
  if (!entryId || !workModeCategory) return;

  try {
    await updateTimeEntryTags({
      workspaceId,
      entryId,
      tags: [workModeToTag(workModeCategory)],
      action,
    });
  } catch (error) {
    console.warn('Failed to update Toggl tags for WORK_MODE', error);
  }
}
