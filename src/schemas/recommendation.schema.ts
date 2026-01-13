import { z } from 'zod';

export const recommendationRequestSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
    budget: z.number().min(0, 'Budget must be positive'),
    interests: z.array(z.string()).min(1, 'At least one interest is required'),
    age: z.number().int().min(0).max(120).optional(),
    occasion: z.string().optional(),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
