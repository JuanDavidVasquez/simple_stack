import { z } from 'zod';

export const uuidSchema = z.object({
    id: z.string().uuid({ message: 'Invalid UUID format.' })
});