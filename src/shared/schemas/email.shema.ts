import { z } from 'zod';

// Regex más completo para validación de email según RFC 5322
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Lista de dominios desechables comunes (puedes expandir esta lista)
const disposableEmailDomains = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'trashmail.com',
  'yopmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'sharklasers.com',
];

// Lista de dominios bloqueados o no permitidos
const blockedDomains = [
  'example.com',
  'test.com',
];

// Función para validar caracteres especiales peligrosos
const containsDangerousCharacters = (email: string): boolean => {
  const dangerousChars = ['<', '>', '"', '\'', '&', '\n', '\r', '\t', '\0'];
  return dangerousChars.some(char => email.includes(char));
};

// Función para validar la estructura del dominio
const isValidDomainStructure = (domain: string): boolean => {
  // Verifica que no tenga puntos consecutivos
  if (domain.includes('..')) return false;
  
  // Verifica que no empiece o termine con punto
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  
  // Verifica que tenga al menos un punto (TLD)
  if (!domain.includes('.')) return false;
  
  // Verifica la longitud del TLD (entre 2 y 63 caracteres)
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2 || tld.length > 63) return false;
  
  return true;
};

// Schema principal mejorado
export const emailSchema = z.object({
  email: z
    .string({ 
      required_error: 'Email is required.',
      invalid_type_error: 'Email must be a string.',
    })
    .trim()
    .toLowerCase()
    .min(5, { message: 'Email is too short. Minimum 5 characters.' })
    .max(320, { message: 'Email is too long. Maximum 320 characters.' })
    .email({ message: 'Invalid email format.' })
    .regex(emailRegex, { message: 'Email format is not valid.' })
    .refine((email) => !containsDangerousCharacters(email), {
      message: 'Email contains invalid characters.',
    })
    .refine((email) => {
      const [localPart, domain] = email.split('@');
      // Validar longitud de la parte local (antes del @)
      return localPart.length <= 64;
    }, {
      message: 'Local part of email (before @) is too long. Maximum 64 characters.',
    })
    .refine((email) => {
      const [, domain] = email.split('@');
      // Validar longitud del dominio
      return domain && domain.length <= 253;
    }, {
      message: 'Domain part of email is too long. Maximum 253 characters.',
    })
    .refine((email) => {
      const [, domain] = email.split('@');
      return domain && isValidDomainStructure(domain);
    }, {
      message: 'Email domain structure is invalid.',
    })
    .refine((email) => {
      // Verificar que no tenga espacios
      return !email.includes(' ');
    }, {
      message: 'Email cannot contain spaces.',
    })
    .refine((email) => {
      // Verificar que no tenga múltiples @ símbolos
      return (email.match(/@/g) || []).length === 1;
    }, {
      message: 'Email must contain exactly one @ symbol.',
    })
});

// Schema con validación de dominios desechables (opcional)
export const emailSchemaNoDisposable = emailSchema.extend({
  email: emailSchema.shape.email.refine(
    (email) => {
      const domain = email.split('@')[1];
      return !disposableEmailDomains.includes(domain);
    },
    { message: 'Disposable email addresses are not allowed.' }
  ),
});

// Schema con validación de dominios bloqueados (opcional)
export const emailSchemaWithBlocklist = emailSchema.extend({
  email: emailSchema.shape.email.refine(
    (email) => {
      const domain = email.split('@')[1];
      return !blockedDomains.includes(domain);
    },
    { message: 'This email domain is not allowed.' }
  ),
});

// Schema para casos que requieren emails corporativos (no públicos)
export const corporateEmailSchema = emailSchema.extend({
  email: emailSchema.shape.email.refine(
    (email) => {
      const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
      const domain = email.split('@')[1];
      return !publicDomains.includes(domain);
    },
    { message: 'Please use a corporate email address.' }
  ),
});

// Función helper para normalizar emails antes de guardar
export const normalizeEmail = (email: string): string => {
  const normalized = email.trim().toLowerCase();
  
  // Para Gmail, ignorar puntos y todo después de '+'
  if (normalized.includes('@gmail.com')) {
    const [localPart, domain] = normalized.split('@');
    const cleanLocal = localPart
      .split('+')[0]  // Remover alias
      .replace(/\./g, ''); // Remover puntos
    return `${cleanLocal}@${domain}`;
  }
  
  return normalized;
};

// Función para validar y parsear con manejo de errores mejorado
export const validateEmail = (email: unknown) => {
  try {
    const result = emailSchema.safeParse({ email });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error.errors[0]?.message || 'Invalid email',
        errors: result.error.errors,
      };
    }
    
    return {
      success: true,
      data: result.data,
      normalized: normalizeEmail(result.data.email),
    };
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred during email validation',
    };
  }
};

// Tipos TypeScript inferidos
export type EmailInput = z.infer<typeof emailSchema>;
export type EmailValidationResult = ReturnType<typeof validateEmail>;
