import { PrismaClient, Product, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface SearchFilters {
    category?: string;
    retailer?: string;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
}

export interface PaginationParams {
    limit: number;
    offset: number;
}

export class ProductRepository {
    /**
     * Search products with filters and pagination
     */
    async searchProducts(
        filters: SearchFilters,
        pagination: PaginationParams
    ): Promise<{ products: Product[]; total: number }> {
        const where: Prisma.ProductWhereInput = {};

        // Apply category filter
        if (filters.category) {
            where.category = { equals: filters.category, mode: 'insensitive' };
        }

        // Apply retailer filter
        if (filters.retailer) {
            where.retailer = { equals: filters.retailer, mode: 'insensitive' };
        }

        // Apply price range filters
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
            where.price = {};
            if (filters.minPrice !== undefined) {
                where.price.gte = filters.minPrice;
            }
            if (filters.maxPrice !== undefined) {
                where.price.lte = filters.maxPrice;
            }
        }

        // Apply text search (searches in title and description)
        if (filters.searchTerm) {
            where.OR = [
                { title: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
            ];
        }

        // Execute query with pagination
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                take: pagination.limit,
                skip: pagination.offset,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.product.count({ where }),
        ]);

        return { products, total };
    }

    /**
     * Get products by their IDs
     */
    async getProductsByIds(productIds: string[]): Promise<Product[]> {
        return prisma.product.findMany({
            where: {
                id: { in: productIds },
            },
        });
    }

    /**
     * Get a single product by ID
     */
    async getProductById(productId: string): Promise<Product | null> {
        return prisma.product.findUnique({
            where: { id: productId },
        });
    }

    /**
     * Get products matching hard filters for recommendation candidates
     */
    async getRecommendationCandidates(
        maxPrice: number,
        limit: number = 100
    ): Promise<Product[]> {
        return prisma.product.findMany({
            where: {
                price: {
                    lte: maxPrice,
                },
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
    }
}

export const productRepository = new ProductRepository();
