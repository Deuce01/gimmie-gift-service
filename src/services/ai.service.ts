import OpenAI from 'openai';
import { env } from '../config/env';
import { Product } from '@prisma/client';
import { RecommendationParams } from './recommendation.service';

export class AIService {
    private openai: OpenAI | null = null;
    private isEnabled: boolean = false;

    constructor() {
        // Initialize OpenAI client only if API key is provided
        if (env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: env.OPENAI_API_KEY,
            });
            this.isEnabled = true;
        }
    }

    /**
     * Generate a personalized explanation for why a product is recommended
     */
    async generateGiftExplanation(
        product: Product,
        params: RecommendationParams,
        score: number,
        scoreBreakdown: {
            interestMatch: number;
            budgetOptimization: number;
            occasionMatch: number;
            learningBoost: number;
        }
    ): Promise<string | null> {
        // If OpenAI is not configured, return null
        if (!this.isEnabled || !this.openai) {
            return null;
        }

        try {
            const prompt = this.buildPrompt(product, params, score, scoreBreakdown);

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a gift recommendation expert. Generate brief, personalized explanations (2-3 sentences) for why a product is a great gift match. Be enthusiastic but concise.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 150,
                temperature: 0.7,
            });

            return completion.choices[0]?.message?.content || null;
        } catch (error) {
            console.error('Error generating AI explanation:', error);
            return null; // Gracefully degrade if AI fails
        }
    }

    /**
     * Generate explanations for multiple products (batch operation)
     */
    async generateBatchExplanations(
        products: Array<{
            product: Product;
            params: RecommendationParams;
            score: number;
            scoreBreakdown: {
                interestMatch: number;
                budgetOptimization: number;
                occasionMatch: number;
                learningBoost: number;
            };
        }>,
        limit: number = 5
    ): Promise<Map<string, string>> {
        const explanations = new Map<string, string>();

        if (!this.isEnabled) {
            return explanations;
        }

        // Only generate for top products to save API costs
        const topProducts = products.slice(0, limit);

        // Generate explanations in parallel (but respect rate limits)
        const promises = topProducts.map(async (item) => {
            const explanation = await this.generateGiftExplanation(
                item.product,
                item.params,
                item.score,
                item.scoreBreakdown
            );
            if (explanation) {
                explanations.set(item.product.id, explanation);
            }
        });

        await Promise.all(promises);

        return explanations;
    }

    /**
     * Build the prompt for OpenAI
     */
    private buildPrompt(
        product: Product,
        params: RecommendationParams,
        score: number,
        scoreBreakdown: {
            interestMatch: number;
            budgetOptimization: number;
            occasionMatch: number;
            learningBoost: number;
        }
    ): string {
        const recipient = params.age
            ? `a ${params.age}-year-old`
            : 'someone';
        const occasion = params.occasion
            ? ` for ${params.occasion}`
            : '';
        const interests = params.interests.join(', ');

        let reasonParts: string[] = [];

        if (scoreBreakdown.interestMatch > 0) {
            reasonParts.push(`matches their interests in ${interests}`);
        }

        if (scoreBreakdown.budgetOptimization > 0) {
            reasonParts.push('fits perfectly within the budget');
        }

        if (scoreBreakdown.occasionMatch > 0) {
            reasonParts.push(`is ideal for ${params.occasion}`);
        }

        if (scoreBreakdown.learningBoost > 0) {
            reasonParts.push('aligns with their previous preferences');
        }

        const reasons = reasonParts.length > 0 ? reasonParts.join(', and ') : 'is a great match';

        return `Product: "${product.title}"
Description: ${product.description}
Price: $${product.price}
Budget: $${params.budget}

This is being recommended as a gift for ${recipient}${occasion} who is interested in: ${interests}.

The recommendation score is ${score} because it ${reasons}.

Write a brief, engaging explanation (2-3 sentences) of why this would make a perfect gift for them.`;
    }

    /**
     * Check if AI service is enabled
     */
    isAIEnabled(): boolean {
        return this.isEnabled;
    }
}

export const aiService = new AIService();
