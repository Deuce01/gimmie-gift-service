import { Request, Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { recommendationRequestSchema } from '../schemas/recommendation.schema';
import { ZodError } from 'zod';

export class RecommendationController {
    /**
     * Handle recommendation requests
     * POST /api/recommendations
     */
    async getRecommendations(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            // Validate request body
            const validatedBody = recommendationRequestSchema.parse(req.body);

            // Get recommendations
            const recommendations = await recommendationService.getRecommendations(
                validatedBody,
                20 // Default limit
            );

            // Return response
            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length,
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

export const recommendationController = new RecommendationController();
