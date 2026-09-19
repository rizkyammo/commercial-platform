export type PaginationParams = {
  page: number;
  pageSize: number;
};

export function getPaginationRange({ page, pageSize }: PaginationParams) {
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  return { from, to };
}

export function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function sanitizePage(page: unknown): number {
  const p = Number(page);
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
}

export function sanitizePageSize(size: unknown): number {
  const s = Number(size);
  if (!Number.isFinite(s) || s < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(s), MAX_PAGE_SIZE);
}