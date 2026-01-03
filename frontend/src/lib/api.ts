// Compass API Client

import axios from 'axios';
import type {
  Task,
  TempCapturedTask,
  DailyPlan,
  Review,
  PostDoLog,
  CategoryEntity,
  ProcessCapturedTaskRequest,
  ActivateTaskResponse,
  CompleteTaskRequest,
  CompleteTaskResponse,
  CreateDailyPlanRequest,
  UpdateDailyPlanRequest,
  CreateReviewRequest,
  TaskFilters,
  PaginatedResponse,
} from '../types';

import { ApiErrorPayload, getUserFriendlyError } from './apiErrorUtils';

// Augment Axios error with user-friendly message and error code
declare module 'axios' {
  export interface AxiosError {
    userMessage?: string;
    errorCode?: string;
  }
}

// Development-only logging
const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log : () => {};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject API secret from localStorage
api.interceptors.request.use(
  (config) => {
    const apiSecret = localStorage.getItem('apiSecret');
    if (apiSecret) {
      config.headers['x-api-secret'] = apiSecret;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to extract error from new backend format
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response as { status?: number; data?: ApiErrorPayload };

      // Handle 401 Unauthorized globally
      if (status === 401) {
        localStorage.removeItem('apiSecret');
        // Dispatch custom event instead of hard reload to preserve form data
        window.dispatchEvent(new CustomEvent('session-expired'));
        return Promise.reject(error);
      }

      const userMessage = getUserFriendlyError(status, data);

      error.userMessage = userMessage;
      error.errorCode = data?.code;

      if (DEBUG) {
        console.error('API Error:', {
          status,
          code: data?.code,
          message: data?.error || data?.message || userMessage,
          details: data?.details,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
    } else if (error.request) {
      error.userMessage = 'Network error. Please check your connection.';

      if (DEBUG) {
        console.error('API Error:', {
          status: 'NETWORK_ERROR',
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
    } else {
      error.userMessage = 'Request configuration failed. Please retry.';

      if (DEBUG) {
        console.error('API Error:', {
          status: 'REQUEST_SETUP_FAILED',
          message: error.message,
          url: error.config?.url,
          method: error.config?.method,
        });
      }
    }

    return Promise.reject(error);
  }
);

// Tasks API

export const getTasks = async (
  filters?: TaskFilters,
  pagination?: { cursor?: string; limit?: number }
): Promise<PaginatedResponse<Task>> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.context) params.append('context', filters.context);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.energyRequired) params.append('energyRequired', filters.energyRequired);
  if (filters?.scheduledFilter) params.append('scheduledFilter', filters.scheduledFilter);
  
  // Always include user's timezone for timezone-aware date filtering
  if (filters?.timezone) {
    params.append('timezone', filters.timezone);
  } else {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    params.append('timezone', userTimezone);
  }

  // Add pagination params
  if (pagination?.cursor) params.append('cursor', pagination.cursor);
  if (pagination?.limit) params.append('limit', pagination.limit.toString());

  const response = await api.get<PaginatedResponse<Task>>(`/tasks?${params.toString()}`);
  return response.data;
};

export const getTask = async (id: string): Promise<Task> => {
  const response = await api.get<Task>(`/tasks/${id}`);
  return response.data;
};

export const createTask = async (task: Partial<Task>): Promise<Task> => {
  const response = await api.post<Task>('/tasks', task);
  return response.data;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const response = await api.patch<Task>(`/tasks/${id}`, updates);
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

// Categories API

export type CreateCategoryInput = {
  name: string;
  color: string;
  icon: string;
  togglProjectId?: string | null;
};

export type UpdateCategoryInput = Partial<{
  name: string;
  color: string;
  icon: string;
  togglProjectId: string | null;
  isArchived: boolean;
  sortOrder: number;
}>;

export const getCategories = async (): Promise<CategoryEntity[]> => {
  const response = await api.get<CategoryEntity[]>('/categories');
  return response.data;
};

export const createCategory = async (input: CreateCategoryInput): Promise<CategoryEntity> => {
  const response = await api.post<CategoryEntity>('/categories', input);
  return response.data;
};

export const updateCategory = async (id: string, updates: UpdateCategoryInput): Promise<CategoryEntity> => {
  const response = await api.patch<CategoryEntity>(`/categories/${id}`, updates);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<CategoryEntity> => {
  const response = await api.delete<CategoryEntity>(`/categories/${id}`);
  return response.data;
};

// Renamed from enrichTask to processCapturedTask
export const processCapturedTask = async (request: ProcessCapturedTaskRequest): Promise<Task> => {
  const response = await api.post<Task>('/tasks/process-captured', request);
  return response.data;
};

export const activateTask = async (id: string): Promise<ActivateTaskResponse> => {
  const response = await api.post<ActivateTaskResponse>(`/tasks/${id}/activate`);
  return response.data;
};

export const completeTask = async (
  id: string,
  request: CompleteTaskRequest
): Promise<CompleteTaskResponse> => {
  const response = await api.post<CompleteTaskResponse>(`/tasks/${id}/complete`, request);
  return response.data;
};

export const scheduleTask = async (id: string, scheduledStart: string): Promise<Task> => {
  log('[API] scheduleTask called:', { id, scheduledStart });

  const response = await api.patch<Task>(`/tasks/${id}/schedule`, { scheduledStart });
  log('[API] scheduleTask success:', response.data);
  return response.data;
};

export const unscheduleTask = async (id: string): Promise<Task> => {
  log('[API] unscheduleTask called:', { id });

  const response = await api.patch<Task>(`/tasks/${id}/unschedule`);
  log('[API] unscheduleTask success:', response.data);
  return response.data;
};

// Todoist API

export const getTodoistPending = async (): Promise<{ count: number; tasks: TempCapturedTask[] }> => {
  const response = await api.get<{ count: number; tasks: TempCapturedTask[] }>('/todoist/pending');
  return response.data;
};

export const importTodoistTasks = async (tasks: Array<{ name: string; due?: string }>): Promise<{
  success: boolean;
  count: number;
}> => {
  const response = await api.post<{ success: boolean; count: number }>(
    '/todoist/import',
    { tasks }
  );
  return response.data;
};

// Orient API

export const getTodayPlan = async (): Promise<DailyPlan> => {
  const response = await api.get<DailyPlan>('/orient/today');
  return response.data;
};

export const getPlanByDate = async (date: string): Promise<DailyPlan> => {
  const response = await api.get<DailyPlan>(`/orient/${date}`);
  return response.data;
};

export const createDailyPlan = async (request: CreateDailyPlanRequest): Promise<DailyPlan> => {
  const response = await api.post<DailyPlan>('/orient/east', request);
  return response.data;
};

export const updateDailyPlanReflection = async (
  planId: string,
  request: UpdateDailyPlanRequest
): Promise<DailyPlan> => {
  const response = await api.patch<DailyPlan>(`/orient/west/${planId}`, request);
  return response.data;
};

// Reviews API

export const getReviews = async (params?: {
  type?: 'DAILY' | 'WEEKLY';
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Review>> => {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await api.get<PaginatedResponse<Review>>(`/reviews?${queryParams}`);
  return response.data;
};

export const getReview = async (id: string): Promise<Review> => {
  const response = await api.get<Review>(`/reviews/${id}`);
  return response.data;
};

export const createDailyReview = async (request: CreateReviewRequest): Promise<Review> => {
  const response = await api.post<Review>('/reviews/daily', request);
  return response.data;
};

export const createWeeklyReview = async (request: CreateReviewRequest): Promise<Review> => {
  const response = await api.post<Review>('/reviews/weekly', request);
  return response.data;
};

// Post-Do Logs API (for analytics)

export const getPostDoLogs = async (filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<PostDoLog[]> => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.category) params.append('category', filters.category);

  const response = await api.get<PaginatedResponse<PostDoLog>>(`/postdo?${params.toString()}`);
  return response.data.items; // Extract items from paginated response
};

// Time Engine API

export interface TimeSlice {
  id: string;
  start: string;
  end: string | null;
  category: string;
  dimension: 'PRIMARY' | 'WORK_MODE' | 'SOCIAL' | 'SEGMENT';
  source: 'SHORTCUT' | 'TIMERY' | 'MANUAL' | 'API';
  isLocked: boolean;
  linkedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSlice {
  category: string;
  start: string;
}

export interface TimeEngineState {
  primary: ActiveSlice | null;
  work_mode: ActiveSlice | null;
  social: ActiveSlice | null;
  segment: ActiveSlice | null;
}

export interface StartSliceRequest {
  category: string;
  dimension: 'PRIMARY' | 'WORK_MODE' | 'SOCIAL' | 'SEGMENT';
  source: 'SHORTCUT' | 'TIMERY' | 'MANUAL' | 'API';
  linkedTaskId?: string;
}

export interface StopSliceRequest {
  dimension: 'PRIMARY' | 'WORK_MODE' | 'SOCIAL' | 'SEGMENT';
  category?: string;
}

export const getTimeEngineState = async (): Promise<TimeEngineState> => {
  const response = await api.get<TimeEngineState>('/engine/state');
  return response.data;
};

export const startTimeSlice = async (request: StartSliceRequest): Promise<TimeSlice> => {
  const response = await api.post<TimeSlice>('/engine/start', request);
  return response.data;
};

export const stopTimeSlice = async (request: StopSliceRequest): Promise<TimeSlice> => {
  const response = await api.post<TimeSlice>('/engine/stop', request);
  return response.data;
};

export interface QuerySlicesParams {
  startDate: string;
  endDate: string;
  dimension?: 'PRIMARY' | 'WORK_MODE' | 'SOCIAL' | 'SEGMENT';
  category?: string;
  linkedTaskId?: string;
}

export const getTimeSlices = async (params: QuerySlicesParams): Promise<TimeSlice[]> => {
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', params.startDate);
  queryParams.append('endDate', params.endDate);
  if (params.dimension) queryParams.append('dimension', params.dimension);
  if (params.category) queryParams.append('category', params.category);
  if (params.linkedTaskId) queryParams.append('linkedTaskId', params.linkedTaskId);

  const response = await api.get<TimeSlice[]>(`/engine/slices?${queryParams.toString()}`);
  return response.data;
};

export const updateTimeSlice = async (id: string, data: Partial<{ start: string; end: string | null; category: string }>): Promise<TimeSlice> => {
  const response = await api.patch<TimeSlice>(`/engine/slices/${id}`, data);
  return response.data;
};

export const deleteTimeSlice = async (id: string): Promise<TimeSlice> => {
  const response = await api.delete<TimeSlice>(`/engine/slices/${id}`);
  return response.data;
};

// Health Check

export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await axios.get<{ status: string; message: string }>(
    `${API_BASE_URL}/health`
  );
  return response.data;
};

export default api;
