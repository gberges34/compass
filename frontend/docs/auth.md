# Frontend Authentication

The Compass frontend uses API key authentication to secure access to the backend API.

## Overview

Authentication is handled through a `LoginGate` component that wraps the entire application. Users must enter an API secret that matches the backend's `API_SECRET` environment variable to access the application.

## Components

### LoginGate

Located at `src/components/LoginGate.tsx`, this component:

- Checks for a stored API secret in localStorage on mount
- Verifies the stored secret by making a test API call
- Shows a login form if no valid secret is found
- Provides the authenticated app content once verified

**Storage Key:** `apiSecret` (localStorage)

**Verification Endpoint:** `GET /api/tasks?limit=1`

### AuthContext

Located at `src/contexts/AuthContext.tsx`, provides:

- `logout()` function to clear authentication and return to login screen
- Available via `useAuth()` hook throughout the app

## API Client Integration

The Axios client in `src/lib/api.ts` automatically handles authentication:

### Request Interceptor

Injects the API secret from localStorage into all requests:

```typescript
api.interceptors.request.use((config) => {
  const apiSecret = localStorage.getItem('apiSecret');
  if (apiSecret) {
    config.headers['x-api-secret'] = apiSecret;
  }
  return config;
});
```

### Response Interceptor

Handles 401 Unauthorized responses globally:

- Clears the stored API secret from localStorage
- Redirects to `/` to show the login screen
- Prevents further API calls until re-authentication

## User Flow

1. **First Visit:** User sees login form
2. **Enter API Secret:** User enters the secret matching backend `API_SECRET`
3. **Verification:** Frontend makes a test request to verify the secret
4. **Storage:** Valid secret is stored in localStorage as `apiSecret`
5. **Access:** User can now access all application features
6. **Logout:** User can logout via the logout button in the Layout component
7. **Session Expiry:** If backend returns 401, user is automatically logged out

## Backend Requirements

The backend must:

- Set `API_SECRET` environment variable in `backend/.env`
- Require `x-api-secret` header on all routes except `/api/health`
- Return 401 Unauthorized for invalid or missing secrets

See `backend/src/middleware/auth.ts` for backend implementation details.

## Security Notes

- API secret is stored in localStorage (persists across sessions)
- Secret is sent as a header on every request
- Backend uses timing-safe comparison to prevent timing attacks
- 401 responses automatically clear stored credentials

## Related Documentation

- Backend auth middleware: `backend/src/middleware/auth.ts`
- Authentication implementation plan: `docs/plans/2025-11-24-process-captured-refactor.md`

