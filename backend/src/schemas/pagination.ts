import { z } from 'zod';

/**
 * Standard cursor-based pagination query parameters.
 *
 * @param cursor - Optional UUID of the last item from previous page
 * @param limit - Number of items to return (1-100, default 30)
 */
export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
});

/**
 * Type-safe pagination parameters extracted from query string
 */
export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Standard paginated response structure.
 *
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
