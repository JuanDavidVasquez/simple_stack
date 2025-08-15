import { z } from 'zod';
import { UserRole } from '../../core/database/entities/enums/user-role.enum';

export const userSchema = z.object({
    id: z.string().uuid().optional(),
    username: z.string().min(1, { message: 'Username is required.' }),
    email: z
        .string()
        .email({ message: 'Invalid email format.' })
        .trim()
        .toLowerCase(),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
    role: z.enum(Object.values(UserRole) as [string, ...string[]], { message: 'Invalid role.' }).optional(),
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    isActive: z.boolean().default(true),
    isVerified: z.boolean().default(false),
    avatarUrl: z.string().url({ message: 'Invalid URL format for avatar.' }).optional(),
    lastLogin: z.date().optional(),
    login_attempts: z.number().default(0),
    locked_until: z.date().optional(),
    resetPasswordToken: z.string().optional(),
    resetPasswordExpires: z.date().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

export const userUpdateSchema = userSchema.partial().omit({ id: true, createdAt: true, updatedAt: true });

export const userCreateSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true, isActive: true, isVerified: true });

export type User = z.infer<typeof userSchema>;