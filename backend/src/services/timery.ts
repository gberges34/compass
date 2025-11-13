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
      togglAPI.get('/time_entries/current')
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

    // Use the entry ID from currentEntry (no duplicate API call)
    await withRetry(() =>
      togglAPI.patch(`/time_entries/${currentEntry.id}/stop`)
    );
    return await fetchTimeryEntry(currentEntry.id);
  } catch (error: any) {
    console.error('Error stopping entry:', error.response?.data || error.message);
    throw new InternalError(`Failed to stop Timery entry: ${error.message}`);
  }
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
}

/**
 * Fetch all time entries for a date range.
 * @returns {TogglTimeEntry[]} Time entries or empty array on error
 */
export async function getTimeEntriesForDateRange(startDate: Date, endDate: Date): Promise<TogglTimeEntry[]> {
  try {
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
  } catch (error: any) {
    console.error('Error fetching time entries:', error.response?.data || error.message);
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Get all projects to map project_id to project name.
 * @returns {Map<number, string>} Project map or empty map on error
 */
export async function getProjects(): Promise<Map<number, string>> {
  try {
    const response = await withRetry(() =>
      togglAPI.get('/me/projects')
    );

    const projects: TogglProject[] = response.data || [];

    const projectMap = new Map<number, string>();
    projects.forEach(project => {
      projectMap.set(project.id, project.name);
    });

    return projectMap;
  } catch (error: any) {
    console.error('Error fetching projects:', error.response?.data || error.message);
    return new Map();
  }
}

/**
 * Calculate category balance from Toggl time entries.
 * @returns {Record<string, number>} Category balance or empty object on error
 */
export async function getCategoryBalanceFromToggl(
  startDate: Date,
  endDate: Date,
  postDoLogs: PostDoLogTimeRange[] = []
): Promise<Record<string, number>> {
  try {
    // Get time entries and projects
    const [entries, projectMap] = await Promise.all([
      getTimeEntriesForDateRange(startDate, endDate),
      getProjects(),
    ]);

    const categoryBalance: Record<string, number> = {};

    entries.forEach(entry => {
      // Skip running entries (negative duration)
      if (entry.duration < 0) return;

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
  } catch (error: any) {
    console.error('Error calculating category balance:', error.response?.data || error.message);
    // Return empty balance on error
    return {};
  }
}
