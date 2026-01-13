import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { eventRequestSchema } from '../schemas/event.schema';
import { ZodError } from 'zod';

export class EventController {
    /**
     * Handle event tracking requests
     * POST /api/events
     */
    async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate request body
            const validatedBody = eventRequestSchema.parse(req.body);

            // Track the event
            const event = await eventService.trackEvent(validatedBody);

            // Return response
            res.status(201).json({
                success: true,
                data: event,
                message: 'Event tracked successfully',
            });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.errors,
                });
                return;
            }
            next(error);
        }
    }
}

export const eventController = new EventController();
