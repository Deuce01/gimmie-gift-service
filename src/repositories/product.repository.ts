import { PrismaClient, Product, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface SearchFilters {
    category?: string;
    retailer?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
}

export interface PaginationParams {
    limit: number;
    offset: number;
}

export type SortOption = 'price_asc' | 'price_desc' | 'relevance';

export class ProductRepository {
    /**
     * Search products with filters, sorting, and pagination
     */
    async searchProducts(
        filters: SearchFilters,
        pagination: PaginationParams,
        sort: SortOption = 'relevance'
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

        // Apply brand filter  
        if (filters.brand) {
            where.brand = { equals: filters.brand, mode: 'insensitive' };
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

        // Apply text search (searches in title, description, AND tags)
        if (filters.searchTerm) {
            where.OR = [
                { title: { contains: filters.searchTerm, mode: 'insensitive' } },
                { description: { contains: filters.searchTerm, mode: 'insensitive' } },
                { tags: { has: filters.searchTerm.toLowerCase() } },
            ];
        }

        // Determine sort order
        let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

        switch (sort) {
            case 'price_asc':
                orderBy = { price: 'asc' };
                break;
            case 'price_desc':
                orderBy = { price: 'desc' };
                break;
            case 'relevance':
            default:
                // For relevance, we order by createdAt as a simple proxy
                // In a production app, you might use full-text search scoring
                orderBy = { createdAt: 'desc' };
                break;
        }

        // Execute query with pagination
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                take: pagination.limit,
                skip: pagination.offset,
                orderBy,
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
