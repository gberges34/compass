import axios from 'axios';

const togglAPI = axios.create({
  baseURL: 'https://api.track.toggl.com/api/v9',
  auth: {
    username: process.env.TOGGL_API_TOKEN || '',
    password: 'api_token'
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

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
