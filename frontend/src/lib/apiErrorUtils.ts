export interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

export function getUserFriendlyError(status?: number, data?: ApiErrorPayload): string {
  const serverMessage = data?.error || data?.message;

  switch (status) {
    case 400:
      return serverMessage || 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return serverMessage || 'The requested resource was not found.';
    case 422:
      return serverMessage || 'One or more fields need attention.';
    case 429:
      return 'Too many requests. Please slow down and retry shortly.';
    case 500:
      return serverMessage || 'An unexpected error occurred. Please try again.';
    default:
      return serverMessage || 'An unexpected error occurred. Please try again.';
  }
}
