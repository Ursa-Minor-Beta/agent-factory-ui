import { config } from '../config';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function redirectToLogin() {
  const currentPath = window.location.pathname + window.location.search;
  window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
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

  let response = await makeRequest();

  // If 401 and not already refreshing, try to refresh token
  if (response.status === 401 && !skipRefresh && !endpoint.includes('/auth/')) {
    const refreshed = await waitForRefresh();

    if (refreshed) {
      // Retry original request with new token
      response = await makeRequest();
    } else {
      // Refresh failed - redirect to login
      redirectToLogin();
      // Return a never-resolving promise to prevent further execution
      return new Promise(() => {});
    }
  }

  // If still 401 after refresh attempt, redirect to login
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    redirectToLogin();
    return new Promise(() => {});
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred'
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
