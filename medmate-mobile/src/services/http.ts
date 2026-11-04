import { env, shouldUseMockApi } from '@/config/env';
import type { ApiError, ApiErrorCode, ApiResult, RequestOptions } from '@/types';

import { mockRequest } from './mocks';

/** Error thrown by the transport layer. Carries a machine-readable code. */
export class HttpError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: Record<string, string>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'HttpError';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );

  return params.length ? `${url}?${params.join('&')}` : url;
}

function statusToCode(status: number): ApiErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function toApiResult<T>(error: ApiError): ApiResult<T> {
  return { ok: false, error };
}

export interface HttpRequest extends RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Bearer token, injected automatically by the auth store. */
  token?: string | null;
}

/**
 * Single entry point for all network traffic.
 *
 * While `shouldUseMockApi` is true the request is served by the in-app mock
 * layer, so screens and stores can be developed against realistic responses
 * with zero backend. Flipping `EXPO_PUBLIC_USE_MOCK_API=false` once the API
 * exists switches the same code path to the real service.
 */
export async function request<T>(
  path: string,
  options: HttpRequest = {},
): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    query,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    token,
  } = options;

  if (shouldUseMockApi) {
    return mockRequest<T>(method, path, { body, query });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return toApiResult<T>({
        code: statusToCode(response.status),
        message: payload?.message ?? `Request failed with status ${response.status}`,
        status: response.status,
        details: payload?.details,
      });
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return toApiResult<T>({
        code: 'timeout',
        message: 'The request timed out. Please try again.',
      });
    }
    return toApiResult<T>({
      code: 'network',
      message: 'You appear to be offline. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
