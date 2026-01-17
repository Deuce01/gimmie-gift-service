import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import { searchQuerySchema } from '../schemas/search.schema';
import { SortOption } from '../repositories/product.repository';

export class SearchController {
    async search(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate and parse query parameters
            const validationResult = searchQuerySchema.safeParse(req.query);

            if (!validationResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    details: validationResult.error.format(),
                });
                return;
            }

            const query = validationResult.data;

            // Support both 'q' (spec) and 'searchTerm' (legacy)
            const searchTerm = query.q || query.searchTerm;

            // Build filters
            const filters = {
                category: query.category,
                retailer: query.retailer,
                brand: query.brand,
                minPrice: query.minPrice,
                maxPrice: query.maxPrice,
                searchTerm,
            };

            const pagination = {
                limit: query.limit,
                offset: query.offset,
            };

            const sort = query.sort as SortOption;

            const result = await searchService.search(filters, pagination, sort);

            res.json({
                success: true,
                data: result.products,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const searchController = new SearchController();
