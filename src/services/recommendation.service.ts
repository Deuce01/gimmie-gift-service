import { Product } from '@prisma/client';
import { productRepository } from '../repositories/product.repository';
import { eventRepository } from '../repositories/event.repository';
import { aiService } from './ai.service';

export interface RecommendationParams {
    userId: string;
    budget: number;
    interests: string[];
    age?: number;
    occasion?: string;
}

export interface ScoredProduct extends Product {
    score: number;
    scoreBreakdown?: {
        interestMatch: number;
        budgetOptimization: number;
        occasionMatch: number;
        learningBoost: number;
    };
    aiExplanation?: string | null;
}

export class RecommendationService {
    /**
     * Generate personalized product recommendations with scoring
     */
    async getRecommendations(
        params: RecommendationParams,
        limit: number = 20
    ): Promise<ScoredProduct[]> {
        // Step 1: Hard Filter - Get candidates within budget (with 15% buffer)
        const maxPrice = params.budget * 1.15;
        const candidates = await productRepository.getRecommendationCandidates(
            maxPrice,
            100 // Limit candidates to keep scoring fast
        );

        if (candidates.length === 0) {
            return [];
        }

        // Step 2: Get user's learning data (top category)
        const userTopCategory = await eventRepository.getUserTopCategory(
            params.userId
        );

        // Step 3: Score each candidate
        const scoredProducts: ScoredProduct[] = candidates.map((product) => {
            const breakdown = this.calculateScore(
                product,
                params,
                userTopCategory?.category
            );
            const totalScore =
                breakdown.interestMatch +
                breakdown.budgetOptimization +
                breakdown.occasionMatch +
                breakdown.learningBoost;

            return {
                ...product,
                score: totalScore,
                scoreBreakdown: breakdown,
            };
        });

        // Step 4: Sort by score (descending) and return top N
        const topRecommendations = scoredProducts
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Step 5: Generate AI explanations for top recommendations (async, non-blocking)
        if (aiService.isAIEnabled() && topRecommendations.length > 0) {
            try {
                // Generate explanations for top 5 products to save API costs
                const productsForAI = topRecommendations.slice(0, 5).map((sp) => ({
                    product: sp,
                    params,
                    score: sp.score,
                    scoreBreakdown: sp.scoreBreakdown!,
                }));

                const explanations = await aiService.generateBatchExplanations(productsForAI);

                // Attach explanations to products
                topRecommendations.forEach((product) => {
                    product.aiExplanation = explanations.get(product.id) || null;
                });
            } catch (error) {
                console.error('Error generating AI explanations:', error);
                // Continue without explanations - graceful degradation
            }
        }

        return topRecommendations;
    }

    /**
     * Calculate score for a single product based on the weighted heuristic algorithm
     */
    private calculateScore(
        product: Product,
        params: RecommendationParams,
        userTopCategory?: string
    ): {
        interestMatch: number;
        budgetOptimization: number;
        occasionMatch: number;
        learningBoost: number;
    } {
        let interestMatch = 0;
        let budgetOptimization = 0;
        let occasionMatch = 0;
        let learningBoost = 0;

        // Interest Matching: +10 points per tag overlap
        if (params.interests && params.interests.length > 0) {
            const productTags = product.tags.map((tag: string) => tag.toLowerCase());
            const userInterests = params.interests.map((interest: string) =>
                interest.toLowerCase()
            );

            const matches = productTags.filter((tag: string) =>
                userInterests.some((interest: string) => tag.includes(interest) || interest.includes(tag))
            );
            interestMatch = matches.length * 10;
        }

        // Budget Optimization: +5 points if price is 80-100% of budget
        const pricePercentage = (product.price / params.budget) * 100;
        if (pricePercentage >= 80 && pricePercentage <= 100) {
            budgetOptimization = 5;
        }

        // Occasion Matching: +5 points if title contains occasion keywords
        if (params.occasion) {
            const occasionKeywords = this.getOccasionKeywords(params.occasion);
            const titleLower = product.title.toLowerCase();
            const descLower = product.description.toLowerCase();

            const hasKeyword = occasionKeywords.some(
                (keyword) => titleLower.includes(keyword) || descLower.includes(keyword)
            );

            if (hasKeyword) {
                occasionMatch = 5;
            }
        }

        // Learning Layer Boost: +15 points if product category matches user's top category
        if (userTopCategory && product.category === userTopCategory) {
            learningBoost = 15;
        }

        return {
            interestMatch,
            budgetOptimization,
            occasionMatch,
            learningBoost,
        };
    }

    /**
     * Get keywords associated with different occasions
     */
    private getOccasionKeywords(occasion: string): string[] {
        const occasionMap: Record<string, string[]> = {
            birthday: ['birthday', 'celebration', 'party', 'gift'],
            anniversary: ['anniversary', 'romantic', 'love', 'couple'],
            wedding: ['wedding', 'bride', 'groom', 'marriage'],
            graduation: ['graduation', 'graduate', 'student', 'achievement'],
            christmas: ['christmas', 'holiday', 'festive', 'xmas'],
            valentines: ['valentine', 'romantic', 'love', 'heart'],
            'mothers-day': ['mother', 'mom', 'maternal'],
            'fathers-day': ['father', 'dad', 'paternal'],
            housewarming: ['home', 'house', 'living', 'kitchen'],
            baby: ['baby', 'newborn', 'infant', 'nursery'],
        };

        const occasionLower = occasion.toLowerCase();
        return occasionMap[occasionLower] || [occasionLower];
    }
}

export const recommendationService = new RecommendationService();
