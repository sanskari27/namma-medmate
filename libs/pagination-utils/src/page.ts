export interface PageInput {
  page: number;
  pageSize: number;
}

export function toOffset({ page, pageSize }: PageInput): number {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return (safePage - 1) * safeSize;
}

export function hasNextPage(page: number, pageSize: number, total: number): boolean {
  return page * pageSize < total;
}
