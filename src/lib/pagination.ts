import { z } from "zod";

import { parseWithSchema } from "@/lib/validation";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).max(128).optional(),
});

export type PaginationInput = {
  limit: number;
  cursor?: string;
};

export function parsePagination(input: unknown): PaginationInput {
  const parsed = parseWithSchema(paginationSchema, input);
  return {
    limit: parsed.limit ?? DEFAULT_PAGE_SIZE,
    cursor: parsed.cursor,
  };
}

export function emptyPage<T>(): { items: T[]; nextCursor: string | null } {
  return { items: [], nextCursor: null };
}
