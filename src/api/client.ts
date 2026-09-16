import { config } from '../config';

export class ApiError extends Error {
  status: number;
  code: string;
  runId?: string;

  constructor(status: number, code: string, message: string, runId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.runId = runId;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function redirectToLogin(): boolean {
  // Don't redirect if already on login page
  if (window.location.pathname === '/login') {
    return false;
  }

  // Use only pathname, not nested redirect params
  const redirectTo = window.location.pathname;
  window.location.href = `/login?redirect=${encodeURIComponent(redirectTo)}`;
  return true;
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshToken();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// Fetch with automatic token refresh - returns raw Response for streaming use cases
export async function fetchWithRefresh(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const makeRequest = () =>
    fetch(`${config.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

  let response = await makeRequest();

  // Handle 401 with token refresh
  if (response.status === 401) {
    const refreshed = await waitForRefresh();
    if (refreshed) {
      response = await makeRequest();
    } else {
      redirectToLogin();
    }
  }

  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  skipRefresh = false
): Promise<T> {
  const headers: HeadersInit = {
    // Only set Content-Type if there's a body
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const makeRequest = async () => {
    const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    return response;
  };

  // Auth endpoints that should never trigger refresh (login, logout, refresh itself)
  const noRefreshEndpoints = ['/auth/login', '/auth/logout', '/auth/refresh'];
  const shouldSkipRefresh = noRefreshEndpoints.some((e) => endpoint.includes(e));

  let response = await makeRequest();

  // If 401 and not already refreshing, try to refresh token
  if (response.status === 401 && !skipRefresh && !shouldSkipRefresh) {
    const refreshed = await waitForRefresh();

    if (refreshed) {
      // Retry original request with new token
      response = await makeRequest();
    } else {
      // Refresh failed - redirect to login or throw if already on login
      if (redirectToLogin()) {
        return new Promise(() => {});
      }
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
  }

  // If still 401 after refresh attempt, redirect to login
  if (response.status === 401 && !shouldSkipRefresh) {
    if (redirectToLogin()) {
      return new Promise(() => {});
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }

  const data = await response.json();

  // Check both HTTP status and response body success flag
  if (!response.ok || data.success === false) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.runId || data.runId
    );
  }

  return data.data;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
