import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

// Initialize cache with TTL and check period from environment
const cache = new NodeCache({
    stdTTL: env.CACHE_TTL_SECONDS,
    checkperiod: env.CACHE_CHECK_PERIOD_SECONDS,
});

/**
 * Cache middleware for GET requests
 * Generates a cache key from the request URL and query parameters
 */
export const cacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        next();
        return;
    }

    // Generate cache key from URL and query params
    const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;

    // Check if we have cached data
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        // Cache hit - return cached data
        res.json(cachedData);
        return;
    }

    // Cache miss - store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = function (body: unknown) {
        // Store in cache
        cache.set(cacheKey, body);
        // Call original json method
        return originalJson(body);
    };

    next();
};

/**
 * Clear all cache entries
 */
export const clearCache = (): void => {
    cache.flushAll();
};

/**
 * Clear specific cache entry
 */
export const clearCacheKey = (key: string): void => {
    cache.del(key);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    return cache.getStats();
};
