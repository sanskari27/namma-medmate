import { buildSuccess, type SuccessEnvelope } from './success.ts';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function buildPaginated<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
): SuccessEnvelope<{ items: T[] }> {
  const safePageSize = pageSize <= 0 ? 1 : pageSize;
  const totalPages = Math.ceil(total / safePageSize);
  return buildSuccess({ items }, { page, pageSize: safePageSize, total, totalPages });
}
