// src/core/config/auth-table.config.ts
/**
 * Configuración para el nombre dinámico de la tabla de autenticación
 * Permite que el mismo stack base se use para diferentes tipos de usuarios
 * guardándolos en tablas diferentes
 * 
 * Ejemplos de uso:
 * - API Clientes: AUTH_TABLE_NAME=clients
 * - API Panaderos: AUTH_TABLE_NAME=bakers  
 * - API Admin: AUTH_TABLE_NAME=admins
 */

// Obtener el nombre de la tabla desde las variables de entorno
export const AUTH_TABLE_NAME = process.env.AUTH_TABLE_NAME || 'users';

// Validar que el nombre de tabla sea válido
function validateTableName(tableName: string): boolean {
  const invalidChars = /[^a-zA-Z0-9_]/;
  
  if (!tableName || typeof tableName !== 'string') {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  if (invalidChars.test(tableName)) {
    throw new Error(`Table name '${tableName}' contains invalid characters. Only alphanumeric and underscore allowed.`);
  }
  
  if (tableName.length > 64) {
    throw new Error(`Table name '${tableName}' is too long (max 64 characters)`);
  }
  
  if (/^\d/.test(tableName)) {
    throw new Error(`Table name '${tableName}' cannot start with a number`);
  }
  
  return true;
}

// Validar al iniciar la aplicación
validateTableName(AUTH_TABLE_NAME);

// Log para confirmar qué tabla se está usando
console.log(`🔐 Auth table configured as: '${AUTH_TABLE_NAME}'`);

/**
 * Obtener el nombre de la tabla de autenticación
 */
export function getAuthTableName(): string {
  return AUTH_TABLE_NAME;
}

/**
 * Verificar si una tabla es válida para autenticación
 */
export function isValidAuthTable(tableName: string): boolean {
  try {
    validateTableName(tableName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Configuración de mapeo de campos por tabla
 * Útil si diferentes tablas usan nombres de campos diferentes
 */
interface TableFieldMapping {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: string;
  isVerified: string;
  loginAttempts: string;
  lockedUntil: string;
  lastLoginAt: string;
}

const tableFieldMappings: Record<string, Partial<TableFieldMapping>> = {
  'users': {
    // Campos estándar - no necesita mapeo especial
  },
  'students': {
    email: 'student_email',
    role: 'student_type',
    // Otros campos mantienen nombres estándar
  },
  'instructors': {
    email: 'instructor_email', 
    role: 'instructor_level',
    // Otros campos mantienen nombres estándar
  },
  // Agregar más mapeos según sea necesario
};

/**
 * Obtener el mapeo de campos para una tabla específica
 */
export function getFieldMapping(tableName: string = AUTH_TABLE_NAME): TableFieldMapping {
  const defaultMapping: TableFieldMapping = {
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    role: 'role',
    isActive: 'isActive',
    isVerified: 'isVerified',
    loginAttempts: 'loginAttempts',
    lockedUntil: 'lockedUntil',
    lastLoginAt: 'lastLoginAt',
  };

  const customMapping = tableFieldMappings[tableName] || {};
  
  return {
    ...defaultMapping,
    ...customMapping
  };
}

/**
 * Generar identificador único para sesiones basado en tabla
 */
export function generateTableSessionPrefix(): string {
  // Crear un prefijo corto y único basado en el nombre de la tabla
  return AUTH_TABLE_NAME.substring(0, 8).toLowerCase();
}