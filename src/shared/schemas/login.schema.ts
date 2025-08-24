import z from "zod";

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});


export type LoginData = z.infer<typeof loginSchema>;