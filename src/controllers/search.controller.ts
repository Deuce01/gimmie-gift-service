import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import { searchQuerySchema } from '../schemas/search.schema';
import { ZodError } from 'zod';

export class SearchController {
    /**
     * Handle search requests
     * GET /api/search
     */
    async search(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Validate and parse query parameters
            const validatedQuery = searchQuerySchema.parse(req.query);

            // Extract filters and pagination
            const filters = {
                category: validatedQuery.category,
                retailer: validatedQuery.retailer,
                minPrice: validatedQuery.minPrice,
                maxPrice: validatedQuery.maxPrice,
                searchTerm: validatedQuery.searchTerm,
            };

            const pagination = {
                limit: validatedQuery.limit,
                offset: validatedQuery.offset,
            };

            // Execute search
            const result = await searchService.search(filters, pagination);

            // Return response
            res.json({
                success: true,
                data: result.products,
                pagination: result.pagination,
            });
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.errors,
                });
                return;
            }
            next(error);
        }
    }
}

export const searchController = new SearchController();
