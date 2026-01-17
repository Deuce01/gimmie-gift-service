import { Product } from '@prisma/client';
import { productRepository } from '../repositories/product.repository';
import { eventRepository } from '../repositories/event.repository';
import { aiService } from './ai.service';

export interface RecommendationParams {
    userId: string;
    budget: number;
    interests: string[];
    recipientAge?: number;
    age?: number; // Legacy support
    occasion?: string;
    relationship?: 'friend' | 'partner' | 'parent' | 'sibling' | 'colleague' | 'child' | 'other';
}

export interface ScoredProduct extends Product {
    score: number;
    scoreBreakdown?: {
        interestMatch: number;
        budgetOptimization: number;
        occasionMatch: number;
        relationshipMatch: number;
        learningBoost: number;
    };
    aiExplanation?: string | null;
    reason?: string;
}

export class RecommendationService {
    /**
     * Generate personalized product recommendations with scoring
     */
    async getRecommendations(
        params: RecommendationParams,
        limit: number = 10
    ): Promise<ScoredProduct[]> {
        // Normalize age field (recipientAge takes precedence)
        const age = params.recipientAge ?? params.age;
        const normalizedParams = { ...params, recipientAge: age };

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
                normalizedParams,
                userTopCategory?.category
            );
            const totalScore =
                breakdown.interestMatch +
                breakdown.budgetOptimization +
                breakdown.occasionMatch +
                breakdown.relationshipMatch +
                breakdown.learningBoost;

            // Generate a simple reason text
            const reason = this.generateReason(product, normalizedParams, breakdown);

            return {
                ...product,
                score: totalScore,
                scoreBreakdown: breakdown,
                reason,
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
                    params: normalizedParams,
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
     * Generate a human-readable reason for why this product was recommended
     */
    private generateReason(
        product: Product,
        params: RecommendationParams,
        breakdown: {
            interestMatch: number;
            budgetOptimization: number;
            occasionMatch: number;
            relationshipMatch: number;
            learningBoost: number;
        }
    ): string {
        const reasons: string[] = [];

        if (breakdown.interestMatch > 0) {
            const matchedInterests = params.interests.filter(interest =>
                product.tags.some(tag =>
                    tag.toLowerCase().includes(interest.toLowerCase()) ||
                    interest.toLowerCase().includes(tag.toLowerCase())
                )
            );
            if (matchedInterests.length > 0) {
                reasons.push(`matches interests: ${matchedInterests.join(', ')}`);
            }
        }

        if (breakdown.budgetOptimization > 0) {
            reasons.push('great value within budget');
        }

        if (breakdown.occasionMatch > 0 && params.occasion) {
            reasons.push(`perfect for ${params.occasion}`);
        }

        if (breakdown.relationshipMatch > 0 && params.relationship) {
            reasons.push(`ideal gift for a ${params.relationship}`);
        }

        if (breakdown.learningBoost > 0) {
            reasons.push('based on your previous preferences');
        }

        if (reasons.length === 0) {
            return `${product.title} is a popular choice in the ${product.category} category.`;
        }

        return `${product.title} is recommended because it ${reasons.join(', ')}.`;
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
        relationshipMatch: number;
        learningBoost: number;
    } {
        let interestMatch = 0;
        let budgetOptimization = 0;
        let occasionMatch = 0;
        let relationshipMatch = 0;
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

        // Relationship Matching: +5 points based on relationship type
        if (params.relationship) {
            const relationshipCategories = this.getRelationshipCategories(params.relationship);
            if (relationshipCategories.includes(product.category)) {
                relationshipMatch = 5;
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
            relationshipMatch,
            learningBoost,
        };
    }

    /**
     * Get categories typically associated with different relationship types
     */
    private getRelationshipCategories(relationship: string): string[] {
        const relationshipMap: Record<string, string[]> = {
            friend: ['Electronics', 'Toys', 'Books', 'Food', 'Sports'],
            partner: ['Jewelry', 'Beauty', 'Home', 'Fashion', 'Food'],
            parent: ['Home', 'Garden', 'Books', 'Food', 'Beauty'],
            sibling: ['Electronics', 'Toys', 'Fashion', 'Books', 'Sports'],
            colleague: ['Office', 'Food', 'Books', 'Home'],
            child: ['Toys', 'Books', 'Electronics', 'Art', 'Sports'],
            other: [],
        };

        return relationshipMap[relationship] || [];
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
