import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import {
  AUTH_STORAGE_KEY,
  SESSION_END_REASON_KEY,
} from '@/libs/constants/session.const';
import { ROUTES } from '@/libs/constants/routes.const';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Opt into toast.promise. Failures still toast when this is omitted. */
    toast?: {
      loading: string;
      success?: string | ((value: unknown) => string);
    };
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  code: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const CREDENTIAL_CODES = new Set(['INVALID_CREDENTIALS', 'INVALID_PIN']);

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

function clearClientSession(reason: string) {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.setItem(SESSION_END_REASON_KEY, reason);
  if (!window.location.pathname.startsWith(ROUTES.LOGIN)) {
    window.location.assign(ROUTES.LOGIN);
  }
}

function maybeRecoverSession(status: number, code: string | null) {
  if (status !== 401) {
    return;
  }
  if (code && CREDENTIAL_CODES.has(code)) {
    return;
  }
  if (!localStorage.getItem(AUTH_STORAGE_KEY)) {
    return;
  }
  const reason =
    code === 'SESSION_REVOKED' ? 'revoked' : code === 'CONCURRENT_SESSION' ? 'elsewhere' : 'expired';
  clearClientSession(reason);
}

const errorToast = {
  ariaProps: { role: 'alert' as const, 'aria-live': 'assertive' as const },
};

function apiErrorMessage(error: unknown): string {
  if (isApiError(error) && error.message.trim()) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Request failed';
}

function toastApiError(error: ApiError, config?: AxiosRequestConfig) {
  // ponytail: config.toast owns the error toast via toast.promise
  if (config?.toast) return;
  const message = error.message.trim() || 'Request failed';
  toast.error(message, { id: message, ...errorToast });
}

function rejectApi(error: ApiError, config?: AxiosRequestConfig): Promise<never> {
  toastApiError(error, config);
  return Promise.reject(error);
}

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        const err = new ApiError(body.message ?? 'Request failed', response.status, body.code);
        maybeRecoverSession(response.status, body.code);
        return rejectApi(err, response.config);
      }
      response.data = body.data;
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new ApiError('Could not reach the server', 0, 'NETWORK'));
    }
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as ApiResponse<unknown> | undefined;
      const message =
        body && typeof body === 'object' && 'message' in body
          ? (body.message ?? 'Request failed')
          : (error.message ?? 'Request failed');
      const code = body && typeof body === 'object' ? body.code : null;
      maybeRecoverSession(error.response.status, code ?? null);
      return rejectApi(new ApiError(message, error.response.status, code ?? null), error.config);
    }
    const config = axios.isAxiosError(error) ? error.config : undefined;
    return rejectApi(new ApiError('Could not reach the server', 0, 'NETWORK'), config);
  },
);

function promiseToast<T>(pending: Promise<T>, labels: AxiosRequestConfig['toast']): Promise<T> {
  if (!labels) return pending;
  return toast.promise(
    pending,
    {
      loading: labels.loading,
      success: labels.success,
      error: (reason: unknown) => apiErrorMessage(reason),
    },
    { error: errorToast },
  );
}

// get/post call Axios.prototype.request internally, so wrapping apiClient.request
// would miss them. Wrap the methods the app actually calls.
for (const method of ['get', 'delete'] as const) {
  const original = apiClient[method];
  apiClient[method] = ((url: string, config?: AxiosRequestConfig) =>
    promiseToast(original(url, config), config?.toast)) as typeof original;
}

for (const method of ['post', 'put', 'patch'] as const) {
  const original = apiClient[method];
  apiClient[method] = ((url: string, data?: unknown, config?: AxiosRequestConfig) =>
    promiseToast(original(url, data, config), config?.toast)) as typeof original;
}
