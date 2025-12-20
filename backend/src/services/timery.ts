import axios from 'axios';
import { env } from '../config/env';
import { Category } from '@prisma/client';
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

// Toggl Project Name → Compass Category mapping.
// Keep this in sync with docs/timery-projects.md so Compass knows how to bucket Timery data.
const TOGGL_PROJECT_CATEGORY_MAP: Record<string, Category> = {
  'School': 'SCHOOL',
  'Music': 'MUSIC',
  'Fitness': 'FITNESS',
  'Gaming': 'GAMING',
  'Nutrition': 'NUTRITION',
  'Hygiene': 'HYGIENE',
  'Pet': 'PET',
  'Social': 'SOCIAL',
  'Personal': 'PERSONAL',
  'Admin': 'ADMIN',
};

function normalizeProjectNameKey(value: string): string {
  return value
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toTitleCase(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\s_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!normalized) return '';

  return normalized
    .split(' ')
    .map((token) => {
      if (!token) return token;
      return token[0].toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

type TogglContext = {
  workspaceId: number;
  projectNameToId: Map<string, number>;
  projectNameKeyToId: Map<string, number>;
};

const CATEGORY_TO_TOGGL_PROJECT_NAME: Partial<Record<Category, string>> =
  Object.fromEntries(
    Object.entries(TOGGL_PROJECT_CATEGORY_MAP).map(([projectName, category]) => [category, projectName])
  );

const prismaCategorySet = new Set<string>(Object.values(Category));

let cachedContext: { value: TogglContext; fetchedAt: number } | null = null;
const TOGGL_CONTEXT_TTL_MS = 10 * 60 * 1000; // 10 minutes

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
 * Fetches and caches Toggl workspace + project metadata.
 */
export async function getTogglContext(): Promise<TogglContext> {
  if (cachedContext && Date.now() - cachedContext.fetchedAt < TOGGL_CONTEXT_TTL_MS) {
    return cachedContext.value;
  }

  const [workspaceId, projectIdToName] = await Promise.all([
    fetchDefaultWorkspaceId(),
    getProjects(),
  ]);

  const projectNameToId = new Map<string, number>();
  const projectNameKeyToId = new Map<string, number>();
  projectIdToName.forEach((name, id) => projectNameToId.set(name, id));
  projectIdToName.forEach((name, id) =>
    projectNameKeyToId.set(normalizeProjectNameKey(name), id)
  );

  const value = { workspaceId, projectNameToId, projectNameKeyToId };
  cachedContext = { value, fetchedAt: Date.now() };
  return value;
}

async function createProject(input: {
  workspaceId: number;
  name: string;
}): Promise<{ id: number; name: string }> {
  const response = await withRetry(() =>
    togglAPI.post(`/workspaces/${input.workspaceId}/projects`, {
      name: input.name,
    })
  );
  return response.data;
}

/**
 * Resolves Compass Category to Toggl project_id if mapped; otherwise null.
 */
export async function resolveProjectIdForCategory(category: string): Promise<number | null> {
  const ctx = await getTogglContext();

  const desiredProjectName = prismaCategorySet.has(category)
    ? CATEGORY_TO_TOGGL_PROJECT_NAME[category as Category] || toTitleCase(category)
    : toTitleCase(category);
  if (!desiredProjectName) return null;

  const key = normalizeProjectNameKey(desiredProjectName);
  const existingId = ctx.projectNameKeyToId.get(key);
  if (existingId) return existingId;

  try {
    const created = await createProject({
      workspaceId: ctx.workspaceId,
      name: desiredProjectName,
    });
    ctx.projectNameToId.set(created.name, created.id);
    ctx.projectNameKeyToId.set(normalizeProjectNameKey(created.name), created.id);
    cachedContext = { value: ctx, fetchedAt: Date.now() };
    return created.id;
  } catch (error) {
    console.warn(
      'Failed to auto-create Toggl project; will refresh and retry once',
      error
    );
  }

  clearTogglContextCache();
  try {
    const refreshed = await getTogglContext();
    return refreshed.projectNameKeyToId.get(key) ?? null;
  } catch (error) {
    console.warn('Failed to refresh Toggl context after project create failure', error);
    return null;
  }
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

interface TogglProject {
  id: number;
  name: string;
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
 * Get all projects to map project_id to project name.
 * @throws {Error} If Toggl API call fails
 * @returns {Map<number, string>} Project map
 */
export async function getProjects(): Promise<Map<number, string>> {
  const response = await withRetry(() =>
    togglAPI.get('/me/projects')
  );

  const projects: TogglProject[] = response.data || [];

  const projectMap = new Map<number, string>();
  projects.forEach(project => {
    projectMap.set(project.id, project.name);
  });

  return projectMap;
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
  // Get time entries and projects
  const [entries, projectMap] = await Promise.all([
    getTimeEntriesForDateRange(startDate, endDate),
    getProjects(),
  ]);

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

    // Get project name
    const projectName = entry.project_id
      ? projectMap.get(entry.project_id)
      : null;

    // Map project to category
    const category = projectName && TOGGL_PROJECT_CATEGORY_MAP[projectName]
      ? TOGGL_PROJECT_CATEGORY_MAP[projectName]
      : null;

    // Skip unmapped projects with warning
    if (!category) {
      console.warn(
        `Skipping Toggl entry: unmapped project "${projectName || 'No Project'}" ` +
        `(ID: ${entry.project_id || 'none'}, duration: ${Math.floor(entry.duration / 60)}m). ` +
        `Add to TOGGL_PROJECT_CATEGORY_MAP to include in metrics.`
      );
      return;
    }

    // Convert seconds to minutes
    const durationMinutes = Math.floor(entry.duration / 60);

    // Accumulate
    categoryBalance[category] = (categoryBalance[category] || 0) + durationMinutes;
  });

  return categoryBalance;
}
