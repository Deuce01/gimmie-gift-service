import { z } from 'zod';

export const searchQuerySchema = z.object({
    category: z.string().optional(),
    retailer: z.string().optional(),
    minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    searchTerm: z.string().optional(),
    limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1).max(100))
        .default('20'),
    offset: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(0))
        .default('0'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
