import { eventRepository } from '../repositories/event.repository';
import { productRepository } from '../repositories/product.repository';

export interface UserDiagnostics {
    userId: string;
    topCategories: Array<{ category: string; interactionCount: number }>;
    topBoostedTags: string[];
    rankingExplanation: string;
    totalEvents: number;
}

export class LearningService {
    /**
     * Get diagnostics for a user's learning profile
     * Shows how events have affected their recommendation ranking
     */
    async getUserDiagnostics(userId: string): Promise<UserDiagnostics> {
        // Get all events for the user
        const events = await eventRepository.getUserEvents(userId, 100);

        if (events.length === 0) {
            return {
                userId,
                topCategories: [],
                topBoostedTags: [],
                rankingExplanation: 'No interaction history found. Recommendations will be based solely on your profile preferences.',
                totalEvents: 0,
            };
        }

        // Get unique product IDs from events
        const productIds = [...new Set(events.map(e => e.productId))];

        // Fetch products to get their categories and tags
        const products = await productRepository.getProductsByIds(productIds);

        // Create maps for quick lookups
        const productMap = new Map(products.map(p => [p.id, p]));

        // Count interactions per category
        const categoryCount = new Map<string, number>();
        const tagCount = new Map<string, number>();

        events.forEach(event => {
            const product = productMap.get(event.productId);
            if (product) {
                // Count category interactions
                const currentCategoryCount = categoryCount.get(product.category) || 0;
                categoryCount.set(product.category, currentCategoryCount + 1);

                // Count tag interactions
                product.tags.forEach(tag => {
                    const currentTagCount = tagCount.get(tag) || 0;
                    tagCount.set(tag, currentTagCount + 1);
                });
            }
        });

        // Sort categories by interaction count
        const topCategories = Array.from(categoryCount.entries())
            .map(([category, interactionCount]) => ({ category, interactionCount }))
            .sort((a, b) => b.interactionCount - a.interactionCount)
            .slice(0, 5);

        // Get top boosted tags (top 10 most interacted tags)
        const topBoostedTags = Array.from(tagCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag]) => tag);

        // Generate ranking explanation
        let rankingExplanation = 'Based on your interaction history:\n';

        if (topCategories.length > 0) {
            rankingExplanation += `\n• Products in "${topCategories[0].category}" category receive a +15 point boost\n`;
            rankingExplanation += `• You have shown interest in ${topCategories.length} different categories\n`;
        }

        if (topBoostedTags.length > 0) {
            rankingExplanation += `• Products with tags like "${topBoostedTags.slice(0, 3).join('", "')}" are prioritized\n`;
        }

        rankingExplanation += `• Total of ${events.length} interactions analyzed`;

        return {
            userId,
            topCategories,
            topBoostedTags,
            rankingExplanation,
            totalEvents: events.length,
        };
    }
}

export const learningService = new LearningService();
