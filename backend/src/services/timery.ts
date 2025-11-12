import axios from 'axios';
import { env } from '../config/env';
import { Category } from '@prisma/client';
import { withRetry } from '../utils/retry';

const togglAPI = axios.create({
  baseURL: 'https://api.track.toggl.com/api/v9',
  auth: {
    username: env.TOGGL_API_TOKEN || '',
    password: 'api_token'
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// Toggl Project Name → Compass Category mapping
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

export interface TimeryEntry {
  duration: number; // minutes
  startTime: Date;
  endTime: Date;
  description: string;
  project?: string;
}

export async function fetchTimeryEntry(entryId: string): Promise<TimeryEntry> {
  try {
    const response = await togglAPI.get(`/time_entries/${entryId}`);
    const data = response.data;

    // Toggl returns duration in seconds (negative if running)
    const durationSeconds = Math.abs(data.duration);
    const durationMinutes = Math.floor(durationSeconds / 60);

    return {
      duration: durationMinutes,
      startTime: new Date(data.start),
      endTime: new Date(data.stop || new Date()),
      description: data.description || '',
      project: data.project_id?.toString()
    };
  } catch (error: any) {
    console.error('Error fetching Timery entry:', error.response?.data || error.message);
    throw new Error(`Failed to fetch Timery entry: ${error.message}`);
  }
}

export async function getCurrentRunningEntry(): Promise<TimeryEntry | null> {
  try {
    const response = await togglAPI.get('/time_entries/current');

    if (!response.data) {
      return null; // No running entry
    }

    const data = response.data;
    const now = new Date();
    const startTime = new Date(data.start);
    const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);

    return {
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

export async function stopRunningEntry(): Promise<TimeryEntry | null> {
  try {
    const currentEntry = await getCurrentRunningEntry();
    if (!currentEntry) {
      return null;
    }

    // Get the running entry ID
    const response = await togglAPI.get('/time_entries/current');
    const entryId = response.data?.id;

    if (entryId) {
      // Stop the entry by setting the stop time
      await togglAPI.patch(`/time_entries/${entryId}/stop`);

      // Fetch the stopped entry
      return await fetchTimeryEntry(entryId.toString());
    }

    return null;
  } catch (error: any) {
    console.error('Error stopping entry:', error.response?.data || error.message);
    throw new Error(`Failed to stop Timery entry: ${error.message}`);
  }
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

// Fetch all time entries for a date range
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

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching time entries:', error.response?.data || error.message);
    // Return empty array on error (graceful degradation)
    return [];
  }
}

// Get all projects to map project_id → project name
async function getProjects(): Promise<Map<number, string>> {
  try {
    const response = await togglAPI.get('/me/projects');
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

// Calculate category balance from Toggl time entries
export async function getCategoryBalanceFromToggl(
  startDate: Date,
  endDate: Date
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

      // Get project name
      const projectName = entry.project_id
        ? projectMap.get(entry.project_id)
        : null;

      // Map project to category
      const category = projectName && TOGGL_PROJECT_CATEGORY_MAP[projectName]
        ? TOGGL_PROJECT_CATEGORY_MAP[projectName]
        : 'PERSONAL'; // Default to PERSONAL

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
