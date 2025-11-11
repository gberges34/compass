// Compass API Client

import axios from 'axios';
import type {
  Task,
  TempCapturedTask,
  DailyPlan,
  Review,
  PostDoLog,
  EnrichTaskRequest,
  ActivateTaskResponse,
  CompleteTaskRequest,
  CompleteTaskResponse,
  CreateDailyPlanRequest,
  UpdateDailyPlanRequest,
  CreateReviewRequest,
  TaskFilters,
} from '../types';

// Augment Axios error with user-friendly message and error code
declare module 'axios' {
  export interface AxiosError {
    userMessage?: string;
    errorCode?: string;
  }
}

// Development-only logging
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => {};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to extract error from new backend format
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from new backend format
    const errorMessage = error.response?.data?.error || 'An error occurred. Please try again.';
    const errorCode = error.response?.data?.code;
    const errorDetails = error.response?.data?.details;

    // Attach user-friendly message to error object
    error.userMessage = errorMessage;
    error.errorCode = errorCode;

    // Log for debugging in development
    if (DEBUG) {
      console.error('API Error:', {
        status: error.response?.status,
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        url: error.config?.url
      });
    }

    return Promise.reject(error);
  }
);

// Tasks API

export const getTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.context) params.append('context', filters.context);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.energyRequired) params.append('energyRequired', filters.energyRequired);

  const response = await api.get<Task[]>(`/tasks?${params.toString()}`);
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

export const enrichTask = async (request: EnrichTaskRequest): Promise<Task> => {
  const response = await api.post<Task>('/tasks/enrich', request);
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

  try {
    const response = await api.patch<Task>(`/tasks/${id}/schedule`, { scheduledStart });
    log('[API] scheduleTask success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[API] scheduleTask failed:', {
      id,
      scheduledStart,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

export const unscheduleTask = async (id: string): Promise<Task> => {
  log('[API] unscheduleTask called:', { id });

  try {
    const response = await api.patch<Task>(`/tasks/${id}/unschedule`);
    log('[API] unscheduleTask success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[API] unscheduleTask failed:', {
      id,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

// Todoist API

export const getTodoistPending = async (): Promise<{ count: number; tasks: TempCapturedTask[] }> => {
  const response = await api.get<{ count: number; tasks: TempCapturedTask[] }>('/todoist/pending');
  return response.data;
};

export const importTodoistTasks = async (tasks: Array<{ name: string; due?: string }>): Promise<{
  success: boolean;
  count: number;
  tasks: TempCapturedTask[];
}> => {
  const response = await api.post<{ success: boolean; count: number; tasks: TempCapturedTask[] }>(
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

export const getReviews = async (type?: 'DAILY' | 'WEEKLY', limit?: number): Promise<Review[]> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (limit) params.append('limit', limit.toString());

  const response = await api.get<Review[]>(`/reviews?${params.toString()}`);
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

  const response = await api.get<PostDoLog[]>(`/postdo?${params.toString()}`);
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
