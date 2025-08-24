import { z } from 'zod';

export const idSchema = z.object({
    id: z.number().int({ message: 'ID must be an integer.' }).positive({ message: 'ID must be a positive integer.' })
    .refine((value) => value > 0, { message: 'ID must be greater than zero.' })
    .refine((value) => Number.isSafeInteger(value), { message: 'ID must be a safe integer.' })
});