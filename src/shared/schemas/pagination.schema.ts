import { z } from 'zod';

export const paginationShema = z.object({
    page: z.number().int().positive().default(1).describe('Current page number').optional(),
    limit: z.number().int().positive().default(10).describe('Number of items per page').optional(),
    sortBy: z.string().optional().describe('Field to sort by'),
    sortOrder: z.enum(['asc', 'desc']).default('asc').describe('Sort order, either ascending or descending').optional(),
    filters: z.record(z.any()).optional().describe('Filters to apply to the query').optional(),
});