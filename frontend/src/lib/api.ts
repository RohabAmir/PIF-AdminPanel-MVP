import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, Me } from './types';

/**
 * Axios client. The access token lives only in memory (never in localStorage);
 * the refresh token is an httpOnly cookie scoped to /api/auth.
 */
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 30_000 });

let accessToken: string | null = null;
let activeSiteId: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t;
  },
};

export function setActiveSiteHeader(id: string | null): void {
  activeSiteId = id;
}

export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

export interface SessionResponse {
  accessToken: string;
  expiresAt: string;
  user: Me;
}

/** One refresh at a time: concurrent 401s (and React StrictMode double effects) share it. */
let refreshing: Promise<SessionResponse> | null = null;
export function refreshSession(): Promise<SessionResponse> {
  if (!refreshing) {
    refreshing = axios
      .post<SessionResponse | ''>('/api/auth/refresh', null, { withCredentials: true, timeout: 20_000 })
      .then((r) => {
        // 204 = no refresh cookie, i.e. simply not signed in.
        if (r.status === 204 || !r.data) throw new Error('NO_SESSION');
        tokenStore.set(r.data.accessToken);
        return r.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  if (activeSiteId && !config.headers.has('X-Site-Id')) config.headers.set('X-Site-Id', activeSiteId);
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };
const NO_REFRESH = ['/auth/login', '/auth/verify-otp', '/auth/resend-otp', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as RetryConfig | undefined;
    const url = original?.url ?? '';
    if (error.response?.status === 401 && original && !original._retried && !NO_REFRESH.some((p) => url.startsWith(p))) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original as AxiosRequestConfig);
      } catch {
        tokenStore.set(null);
        onSessionExpired?.();
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;
  constructor(message: string, status: number, details?: unknown, requestId?: string) {
    super(message);
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

/** Normalises any thrown value into a user-facing message. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Network error — check your connection and try again.';
    const body = err.response.data as ApiErrorBody | undefined;
    if (body && typeof body.message === 'string') return body.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function errorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

export function errorDetails<T = unknown>(err: unknown): T | undefined {
  return axios.isAxiosError(err) ? ((err.response?.data as ApiErrorBody | undefined)?.details as T | undefined) : undefined;
}

/** Field-level errors from the API: `[{ field, errors[] }]`. */
export function fieldErrors(err: unknown): { field: string; message: string }[] {
  const d = errorDetails(err);
  if (!Array.isArray(d)) return [];
  return d
    .filter((x): x is { field: string; errors: string[] } => !!x && typeof x === 'object' && 'field' in x && 'errors' in x)
    .map((x) => ({ field: x.field, message: x.errors[0] }));
}

export async function downloadFile(url: string, params: Record<string, unknown>, fallbackName: string): Promise<void> {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
