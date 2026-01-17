import { Product } from '@prisma/client';
import {
    productRepository,
    SearchFilters,
    PaginationParams,
    SortOption,
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
     * Search for products with filters, sorting, and pagination
     */
    async search(
        filters: SearchFilters,
        pagination: PaginationParams,
        sort: SortOption = 'relevance'
    ): Promise<SearchResult> {
        const { products, total } = await productRepository.searchProducts(
            filters,
            pagination,
            sort
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
