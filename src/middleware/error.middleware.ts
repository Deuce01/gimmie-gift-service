import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Global error handler middleware
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log the error
    console.error('Error occurred:', {
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    // Determine status code
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    // Send error response
    res.status(statusCode).json({
        error: {
            message: err.message,
            ...(env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
