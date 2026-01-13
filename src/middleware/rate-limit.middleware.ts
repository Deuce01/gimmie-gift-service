import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const rateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: {
        error: 'Too many requests',
        message: `You have exceeded the ${env.RATE_LIMIT_MAX_REQUESTS} requests in ${env.RATE_LIMIT_WINDOW_MS / 1000 / 60} minutes limit. Please try again later.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
});
