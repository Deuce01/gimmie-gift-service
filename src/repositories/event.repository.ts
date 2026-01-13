import { PrismaClient, Event, EventType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateEventData {
    userId: string;
    productId: string;
    eventType: EventType;
}

export interface UserTopCategory {
    category: string;
    count: number;
}

export class EventRepository {
    /**
     * Create a new event
     */
    async createEvent(data: CreateEventData): Promise<Event> {
        return prisma.event.create({
            data: {
                userId: data.userId,
                productId: data.productId,
                eventType: data.eventType,
            },
        });
    }

    /**
     * Get user's most-interacted category (Learning Layer)
     * Returns the category with the most events for a given user
     */
    async getUserTopCategory(userId: string): Promise<UserTopCategory | null> {
        // Use Prisma groupBy with aggregation
        const result = await prisma.event.groupBy({
            by: ['productId'],
            where: { userId },
            _count: { productId: true },
        });

        if (result.length === 0) {
            return null;
        }

        // Get product IDs from events
        const productIds = result.map((r) => r.productId);

        // Get products to access their categories
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, category: true },
        });

        // Create a map of productId to category
        const productCategoryMap = new Map<string, string>();
        products.forEach((p) => {
            productCategoryMap.set(p.id, p.category);
        });

        // Count events per category
        const categoryCount = new Map<string, number>();
        result.forEach((r) => {
            const category = productCategoryMap.get(r.productId);
            if (category) {
                const currentCount = categoryCount.get(category) || 0;
                categoryCount.set(category, currentCount + r._count.productId);
            }
        });

        // Find the category with the most interactions
        let topCategory: UserTopCategory | null = null;
        categoryCount.forEach((count, category) => {
            if (!topCategory || count > topCategory.count) {
                topCategory = { category, count };
            }
        });

        return topCategory;
    }

    /**
     * Get event counts for a specific product by a user
     */
    async getUserInteractionsByProductId(
        userId: string,
        productId: string
    ): Promise<number> {
        return prisma.event.count({
            where: {
                userId,
                productId,
            },
        });
    }

    /**
     * Get all events for a user
     */
    async getUserEvents(userId: string, limit?: number): Promise<Event[]> {
        return prisma.event.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
}

export const eventRepository = new EventRepository();
