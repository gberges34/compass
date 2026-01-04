import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../prisma';
import type { PostDoLog } from '@prisma/client';
import { withRetry } from '../utils/retry';
import { InternalError } from '../errors/AppError';

const togglAPI = axios.create({
  baseURL: 'https://api.track.toggl.com/api/v9',
  auth: {
    username: env.TOGGL_API_TOKEN || '',
    password: 'api_token'
  },
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000, // 15 seconds
});

type TogglContext = {
  workspaceId: number;
};

let cachedContext: { value: TogglContext; fetchedAt: number } | null = null;
const TOGGL_CONTEXT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function normalizeCategoryNameKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function fetchDefaultWorkspaceId(): Promise<number> {
  const response = await withRetry(() =>
    togglAPI.get('/me')
  );
  const workspaceId = response.data?.default_workspace_id;
  if (!workspaceId) {
    throw new InternalError('Failed to resolve default Toggl workspace');
  }
  return workspaceId;
}

export function clearTogglContextCache(): void {
  cachedContext = null;
}

/**
 * Fetches and caches Toggl workspace metadata.
 */
export async function getTogglContext(): Promise<TogglContext> {
  if (cachedContext && Date.now() - cachedContext.fetchedAt < TOGGL_CONTEXT_TTL_MS) {
    return cachedContext.value;
  }

  const workspaceId = await fetchDefaultWorkspaceId();
  const value = { workspaceId };
  cachedContext = { value, fetchedAt: Date.now() };
  return value;
}

/**
 * Resolves a Compass category to Toggl project_id if mapped; otherwise null.
 * Manual mapping only: uses Category.togglProjectId and never auto-creates projects.
 */
export async function resolveProjectIdForCategory(input: {
  categoryId?: string;
  categoryName?: string;
}): Promise<number | null> {
  const category =
    input.categoryId
      ? await prisma.category.findUnique({
          where: { id: input.categoryId },
          select: { togglProjectId: true },
        })
      : input.categoryName
        ? await prisma.category.findUnique({
            where: { nameKey: normalizeCategoryNameKey(input.categoryName) },
            select: { togglProjectId: true },
          })
        : null;

  const raw = category?.togglProjectId?.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export const TOGGL_OVERLAP_TOLERANCE_MINUTES = 15;

export interface TimeryEntry {
  id: string;
  duration: number; // minutes
  startTime: Date;
  endTime: Date;
  description: string;
  project?: string;
}

/**
 * Fetches a Timery entry by ID.
 * @throws {InternalError} If Toggl API call fails
 */
export async function fetchTimeryEntry(entryId: string): Promise<TimeryEntry> {
  try {
    const response = await withRetry(() =>
      togglAPI.get(`/time_entries/${entryId}`)
    );
    const data = response.data;

    // Toggl returns duration in seconds (negative if running)
    const durationSeconds = Math.abs(data.duration);
    const durationMinutes = Math.floor(durationSeconds / 60);

    return {
      id: data.id.toString(),
      duration: durationMinutes,
      startTime: new Date(data.start),
      endTime: new Date(data.stop || new Date()),
      description: data.description || '',
      project: data.project_id?.toString()
    };
  } catch (error: any) {
    console.error('Error fetching Timery entry:', error.response?.data || error.message);
    throw new InternalError(`Failed to fetch Timery entry: ${error.message}`);
  }
}

/**
 * Gets the currently running time entry.
 * @returns {TimeryEntry | null} Current entry or null if none running or on error
 */
export async function getCurrentRunningEntry(): Promise<TimeryEntry | null> {
  try {
    const response = await withRetry(() =>
      togglAPI.get('/me/time_entries/current')
    );

    if (!response.data) {
      return null; // No running entry
    }

    const data = response.data;
    const now = new Date();
    const startTime = new Date(data.start);
    const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);

    return {
      id: data.id.toString(),
      duration: durationMinutes,
      startTime,
      endTime: now,
      description: data.description || '',
      project: data.project_id?.toString()
    };
  } catch (error: any) {
    console.error('Error fetching current entry:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Stops the currently running time entry.
 * @returns {TimeryEntry | null} Stopped entry or null if none running
 * @throws {InternalError} If Toggl API call fails
 */
export async function stopRunningEntry(): Promise<TimeryEntry | null> {
  try {
    const currentEntry = await getCurrentRunningEntry();
    if (!currentEntry) {
      return null;
    }

    const { workspaceId } = await getTogglContext();

    // Use the entry ID from currentEntry (no duplicate API call)
    await withRetry(() =>
      togglAPI.patch(`/workspaces/${workspaceId}/time_entries/${currentEntry.id}/stop`)
    );
    return await fetchTimeryEntry(currentEntry.id);
  } catch (error: any) {
    console.error('Error stopping entry:', error.response?.data || error.message);
    throw new InternalError(`Failed to stop Timery entry: ${error.message}`);
  }
}

export async function createRunningTimeEntry(input: {
  workspaceId: number;
  description: string;
  start: Date;
  projectId: number | null;
  tags: string[];
}): Promise<{ id: number }> {
  const payload: Record<string, any> = {
    workspace_id: input.workspaceId,
    description: input.description,
    start: input.start.toISOString(),
    duration: -1, // running entry
    created_with: 'Compass Time Engine',
    tags: input.tags,
  };

  if (input.projectId) {
    payload.project_id = input.projectId;
  }

  const response = await withRetry(() =>
    togglAPI.post(`/workspaces/${input.workspaceId}/time_entries`, payload)
  );

  return response.data;
}

export async function stopTimeEntry(input: {
  workspaceId: number;
  entryId: number;
}): Promise<void> {
  await withRetry(() =>
    togglAPI.patch(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}/stop`)
  );
}

export async function stopTimeEntryAt(input: {
  workspaceId: number;
  entryId: number;
  start: Date;
  stop: Date;
}): Promise<void> {
  const stopMs = input.stop.getTime();
  const startMs = input.start.getTime();
  const durationSeconds = Math.max(0, Math.floor((stopMs - startMs) / 1000));

  // Ensure the entry is no longer running (safe to ignore failures here)
  try {
    await withRetry(() =>
      togglAPI.patch(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}/stop`)
    );
  } catch (error) {
    console.warn('Failed to stop Toggl entry before backdating; continuing', error);
  }

  await withRetry(() =>
    togglAPI.put(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}`, {
      stop: input.stop.toISOString(),
      duration: durationSeconds,
    })
  );
}

async function fetchTimeEntryTags(entryId: number): Promise<string[]> {
  const response = await withRetry(() =>
    togglAPI.get(`/me/time_entries/${entryId}`)
  );
  const data = response.data as { tags?: string[] | null } | null;
  return (data?.tags || []).filter(Boolean);
}

export async function updateTimeEntryTags(input: {
  workspaceId: number;
  entryId: number;
  tags: string[];
  action: 'add' | 'delete';
}): Promise<void> {
  if (input.action === 'add') {
    await withRetry(() =>
      togglAPI.put(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}`, {
        tag_action: 'add',
        tags: input.tags,
      })
    );
    return;
  }

  // Wrap delete logic - abort entirely if tag fetch fails
  let existingTags: string[];
  try {
    existingTags = await fetchTimeEntryTags(input.entryId);
  } catch (error) {
    console.warn('Failed to fetch existing tags for Toggl entry; skipping delete to prevent data loss', error);
    return;
  }

  const removeSet = new Set(input.tags.map((tag) => tag.toLowerCase()));
  const remainingTags = existingTags.filter((tag) => !removeSet.has(tag.toLowerCase()));

  // Optimization: skip API call if no tags need removal
  if (existingTags.length === remainingTags.length) {
    return;
  }

  await withRetry(() =>
    togglAPI.put(`/workspaces/${input.workspaceId}/time_entries/${input.entryId}`, {
      tags: remainingTags,
    })
  );
}

export type PostDoLogTimeRange = Pick<PostDoLog, 'startTime' | 'endTime'>;

// Helper to detect if a Toggl entry overlaps with any Compass PostDoLog
export function isTogglEntryDuplicate(
  togglEntry: { start: string; stop: string | null },
  postDoLogs: PostDoLogTimeRange[]
): boolean {
  const toleranceMs = TOGGL_OVERLAP_TOLERANCE_MINUTES * 60 * 1000;

  const togglStart = new Date(togglEntry.start);
  const togglEnd = togglEntry.stop ? new Date(togglEntry.stop) : new Date();

  return postDoLogs.some(log => {
    const compassStart = new Date(log.startTime);
    const compassEnd = new Date(log.endTime);

    const compassStartWithTolerance = new Date(compassStart.getTime() - toleranceMs);
    const compassEndWithTolerance = new Date(compassEnd.getTime() + toleranceMs);

    return togglStart <= compassEndWithTolerance && togglEnd >= compassStartWithTolerance;
  });
}

interface TogglTimeEntry {
  id: number;
  duration: number; // seconds (negative if running)
  start: string; // ISO 8601
  stop: string | null;
  description: string;
  project_id: number | null;
  tags?: string[] | null;
}

/**
 * Fetch all time entries for a date range.
 * @throws {Error} If Toggl API call fails
 * @returns {TogglTimeEntry[]} Time entries
 */
export async function getTimeEntriesForDateRange(startDate: Date, endDate: Date): Promise<TogglTimeEntry[]> {
  // Toggl API expects ISO 8601 format
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const response = await withRetry(() =>
    togglAPI.get('/me/time_entries', {
      params: {
        start_date: startISO,
        end_date: endISO,
      }
    })
  );

  // Toggl Track responses are documented as ISO 8601 UTC timestamps:
  // https://developers.track.toggl.com/docs/time_entries#response
  // Compass also stores UTC, so no additional conversion is required here.
  return response.data || [];
}

/**
 * Calculate category balance from Toggl time entries.
 * @throws {Error} If Toggl API calls fail
 * @returns {Record<string, number>} Category balance
 */
export async function getCategoryBalanceFromToggl(
  startDate: Date,
  endDate: Date,
  postDoLogs: PostDoLogTimeRange[] = []
): Promise<Record<string, number>> {
  const [entries, mappedCategories] = await Promise.all([
    getTimeEntriesForDateRange(startDate, endDate),
    prisma.category.findMany({
      where: { togglProjectId: { not: null } },
      select: { togglProjectId: true, name: true },
    }),
  ]);

  const projectIdToCategoryName = new Map<number, string>();
  mappedCategories.forEach((category) => {
    const raw = category.togglProjectId?.trim();
    if (!raw || !/^\d+$/.test(raw)) return;
    projectIdToCategoryName.set(Number(raw), category.name);
  });

  const categoryBalance: Record<string, number> = {};

  entries.forEach(entry => {
    // Skip running entries (negative duration)
    if (entry.duration < 0) return;

    // Skip Compass-created entries (avoid double counting projection)
    const hasCompassTag = (entry.tags || []).some((tag) => tag.toLowerCase() === 'compass');
    if (hasCompassTag) return;

    // Skip if this overlaps with a Compass task (dedupe)
    if (isTogglEntryDuplicate(entry, postDoLogs)) {
      console.log(
        `Skipping duplicate Toggl entry (overlaps with Compass task): ` +
        `"${entry.description || 'No description'}", ${Math.floor(entry.duration / 60)}m`
      );
      return;
    }

    const categoryName = entry.project_id ? projectIdToCategoryName.get(entry.project_id) : null;

    // Skip unmapped projects with warning
    if (!categoryName) {
      console.warn(
        `Skipping Toggl entry: unmapped project ` +
          `(ID: ${entry.project_id || 'none'}, duration: ${Math.floor(entry.duration / 60)}m). ` +
          `Map a Compass category to this project ID to include it in metrics.`
      );
      return;
    }

    // Convert seconds to minutes
    const durationMinutes = Math.floor(entry.duration / 60);

    // Accumulate
    categoryBalance[categoryName] = (categoryBalance[categoryName] || 0) + durationMinutes;
  });

  return categoryBalance;
}
