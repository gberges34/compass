import { Request, Response, NextFunction } from 'express';

export interface CacheControlOptions {
  /** Max age in seconds for Cache-Control header */
  maxAge: number;
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number;
}

/**
 * Middleware to set Cache-Control headers for GET requests.
 *
 * Uses private caching with stale-while-revalidate strategy for better UX.
 *
 * @param options Cache duration configuration
 * @returns Express middleware function
 *
 * @example
 * router.get('/tasks', cacheControl({ maxAge: 60, staleWhileRevalidate: 120 }), handler);
 */
export function cacheControl(options: CacheControlOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      const swr = options.staleWhileRevalidate || options.maxAge * 2;
      res.set(
        'Cache-Control',
        `private, max-age=${options.maxAge}, stale-while-revalidate=${swr}`
      );
    } else {
      // Mutations should never be cached
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
    }
    next();
  };
}

/**
 * Predefined cache policies for common use cases
 */
export const CachePolicies = {
  /** Frequently changing data (tasks, etc.) - 60s cache */
  SHORT: { maxAge: 60, staleWhileRevalidate: 120 },

  /** Moderate frequency data (analytics, reviews) - 5min cache */
  MEDIUM: { maxAge: 300, staleWhileRevalidate: 600 },

  /** Infrequently changing data (daily plans) - 10min cache */
  LONG: { maxAge: 600, staleWhileRevalidate: 1200 },

  /** External API data (Todoist) - 2min cache */
  EXTERNAL: { maxAge: 120, staleWhileRevalidate: 240 },
} as const;
