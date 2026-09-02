import axios from 'axios';

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

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        return Promise.reject(new ApiError(body.message ?? 'Request failed', response.status, body.code));
      }
      response.data = body.data;
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as ApiResponse<unknown> | undefined;
      const message =
        body && typeof body === 'object' && 'message' in body
          ? (body.message ?? 'Request failed')
          : (error.message ?? 'Request failed');
      const code = body && typeof body === 'object' ? body.code : null;
      return Promise.reject(new ApiError(message, error.response.status, code ?? null));
    }
    return Promise.reject(new ApiError('The platform API did not respond', 0, 'NETWORK'));
  },
);
