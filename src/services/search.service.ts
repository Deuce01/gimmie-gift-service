import { Product } from '@prisma/client';
import {
    productRepository,
    SearchFilters,
    PaginationParams,
} from '../repositories/product.repository';

export interface SearchResult {
    products: Product[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export class SearchService {
    /**
     * Search for products with filters and pagination
     */
    async search(
        filters: SearchFilters,
        pagination: PaginationParams
    ): Promise<SearchResult> {
        const { products, total } = await productRepository.searchProducts(
            filters,
            pagination
        );

        const hasMore = pagination.offset + pagination.limit < total;

        return {
            products,
            pagination: {
                total,
                limit: pagination.limit,
                offset: pagination.offset,
                hasMore,
            },
        };
    }
}

export const searchService = new SearchService();
