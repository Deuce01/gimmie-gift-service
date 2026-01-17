import { Request, Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { learningService } from '../services/learning.service';
import { recommendationRequestSchema } from '../schemas/recommendation.schema';
import { z } from 'zod';

const diagnosticsQuerySchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
});

export class RecommendationController {
    async getRecommendations(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate request body
            const validationResult = recommendationRequestSchema.safeParse(req.body);

            if (!validationResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid request body',
                    details: validationResult.error.format(),
                });
                return;
            }

            const params = validationResult.data;

            // Normalize age field (recipientAge takes precedence over age)
            const normalizedParams = {
                userId: params.userId,
                budget: params.budget,
                interests: params.interests,
                recipientAge: params.recipientAge ?? params.age,
                occasion: params.occasion,
                relationship: params.relationship,
            };

            const recommendations = await recommendationService.getRecommendations(
                normalizedParams,
                10 // Return top 10 as per spec
            );

            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length,
            });
        } catch (error) {
            next(error);
        }
    }

    async getDiagnostics(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate query parameters
            const validationResult = diagnosticsQuerySchema.safeParse(req.query);

            if (!validationResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    details: validationResult.error.format(),
                });
                return;
            }

            const { userId } = validationResult.data;

            const diagnostics = await learningService.getUserDiagnostics(userId);

            res.json({
                success: true,
                data: diagnostics,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const recommendationController = new RecommendationController();
