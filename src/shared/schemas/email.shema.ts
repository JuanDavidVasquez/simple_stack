import { z } from 'zod'

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, { message: 'Email is too short.' })
    .max(320, { message: 'Email is too long.' }) // RFC 5321: max length 320
    .email({ message: 'Invalid email format.' }),
});