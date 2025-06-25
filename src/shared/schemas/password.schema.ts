import { z } from 'zod';
import { BcryptUtil } from '../utils/bcrypt.util';

/**
 * Schema base para validación de contraseñas
 */
export const passwordSchema = z
  .string()
  .min(BcryptUtil.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${BcryptUtil.PASSWORD_MIN_LENGTH} characters long`,
  })
  .max(BcryptUtil.PASSWORD_MAX_LENGTH, {
    message: `Password must not exceed ${BcryptUtil.PASSWORD_MAX_LENGTH} characters`,
  })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  .regex(/\d/, {
    message: 'Password must contain at least one number',
  })
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Password must contain at least one special character',
  })
  .refine((password: string) => {
    // Verificar patrones comunes
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
    ];
    
    return !commonPatterns.some(pattern => pattern.test(password));
  }, {
    message: 'Password contains common patterns and is not secure',
  });

/**
 * Schema para contraseña simple (menos restrictivo)
 * Útil para casos donde se requiere menos validación
 */
export const simplePasswordSchema = z
  .string()
  .min(6, { message: 'Password must be at least 6 characters long' })
  .max(BcryptUtil.PASSWORD_MAX_LENGTH, {
    message: `Password must not exceed ${BcryptUtil.PASSWORD_MAX_LENGTH} characters`,
  });

/**
 * Schema para contraseña muy fuerte (más restrictivo)
 * Útil para administradores o cuentas privilegiadas
 */
export const strongPasswordSchema = z
  .string()
  .min(12, { message: 'Strong password must be at least 12 characters long' })
  .max(BcryptUtil.PASSWORD_MAX_LENGTH, {
    message: `Password must not exceed ${BcryptUtil.PASSWORD_MAX_LENGTH} characters`,
  })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  .regex(/\d/, {
    message: 'Password must contain at least one number',
  })
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Password must contain at least one special character',
  })
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{2,}/, {
    message: 'Strong password must contain at least 2 special characters',
  })
  .refine((password: string) => {
    // Verificar patrones comunes
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
    ];
    return !commonPatterns.some(pattern => pattern.test(password));
  }, {
    message: 'Password contains common patterns and is not secure',
  })
  .refine((password: string) => {
    // Verificar que no tenga más de 2 caracteres consecutivos iguales
    return !/(.)\1{2,}/.test(password);
  }, {
    message: 'Password cannot have more than 2 consecutive identical characters',
  })
  .refine((password) => {
    // Verificar que no sea una secuencia obvia
    const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc'];
    return !sequences.some(seq => password.toLowerCase().includes(seq));
  }, {
    message: 'Password cannot contain obvious sequences',
  });

/**
 * Schema para validar cambio de contraseña
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

/**
 * Schema para reset de contraseña
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Reset token is required' }),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password and confirmation do not match',
  path: ['confirmPassword'],
});

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

/**
 * Schema para creación de usuario
 */
export const createUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: passwordSchema,
  firstName: z.string()
    .min(1, { message: 'First name is required' })
    .max(50, { message: 'First name must not exceed 50 characters' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { 
      message: 'First name can only contain letters and spaces' 
    }),
  lastName: z.string()
    .min(1, { message: 'Last name is required' })
    .max(50, { message: 'Last name must not exceed 50 characters' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { 
      message: 'Last name can only contain letters and spaces' 
    }),
  username: z.string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(30, { message: 'Username must not exceed 30 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { 
      message: 'Username can only contain letters, numbers, and underscores' 
    })
    .optional(),
  role: z.enum(['admin', 'user', 'doctor'], {
    errorMap: () => ({ message: 'Invalid role. Must be admin, user, or doctor' })
  }).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  lenguaje: z.enum(['en', 'es'], {
    errorMap: () => ({ message: 'Invalid language. Must be en or es' })
  }).optional(),
});

/**
 * Schema para actualización de usuario (todos los campos opcionales excepto el ID)
 */
export const updateUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }).optional(),
  password: passwordSchema.optional(),
  firstName: z.string()
    .min(1, { message: 'First name cannot be empty' })
    .max(50, { message: 'First name must not exceed 50 characters' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { 
      message: 'First name can only contain letters and spaces' 
    })
    .optional(),
  lastName: z.string()
    .min(1, { message: 'Last name cannot be empty' })
    .max(50, { message: 'Last name must not exceed 50 characters' })
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { 
      message: 'Last name can only contain letters and spaces' 
    })
    .optional(),
  username: z.string()
    .min(3, { message: 'Username must be at least 3 characters long' })
    .max(30, { message: 'Username must not exceed 30 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { 
      message: 'Username can only contain letters, numbers, and underscores' 
    })
    .optional(),
  role: z.enum(['admin', 'user', 'doctor'], {
    errorMap: () => ({ message: 'Invalid role. Must be admin, user, or doctor' })
  }).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

/**
 * Función helper para validar contraseña según el rol del usuario
 */
export const getPasswordSchemaByRole = (role?: string) => {
  switch (role) {
    case 'admin':
      return strongPasswordSchema;
    case 'doctor':
      return passwordSchema;
    case 'user':
    default:
      return passwordSchema;
  }
};

/**
 * Tipos TypeScript derivados de los schemas
 */
export type PasswordValidation = z.infer<typeof passwordSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;