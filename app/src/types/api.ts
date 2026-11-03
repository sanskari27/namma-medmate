/** Transport-level types shared by every service. */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'unknown';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status?: number;
  details?: Record<string, string>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined>;
}
