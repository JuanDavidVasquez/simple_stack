/**
 * Configuración para autenticación dinámica
 * Permite que el AuthService se conecte a diferentes tablas según la configuración
 * 
 * Ejemplos de uso:
 * - API Students: AUTH_TABLE_NAME=students, AUTH_API_NAME=students-api
 * - API Instructors: AUTH_TABLE_NAME=instructors, AUTH_API_NAME=instructors-api
 * - API Main: AUTH_TABLE_NAME=users, AUTH_API_NAME=main-api
 */

export interface AuthTableConfig {
  tableName: string;
  apiName: string;
  sessionPrefix: string;
  emailField: string;
  passwordField: string;
  primaryKeyField: string;
}

// Variables de entorno para configuración
export const AUTH_TABLE_NAME = process.env.AUTH_TABLE_NAME || 'users';
export const AUTH_API_NAME = process.env.AUTH_API_NAME || 'main';
export const AUTH_SESSION_PREFIX = process.env.AUTH_SESSION_PREFIX || AUTH_API_NAME;
export const AUTH_EMAIL_FIELD = process.env.AUTH_EMAIL_FIELD || 'email';
export const AUTH_PASSWORD_FIELD = process.env.AUTH_PASSWORD_FIELD || 'password';
export const AUTH_PRIMARY_KEY = process.env.AUTH_PRIMARY_KEY || 'id';

/**
 * Configuración completa de autenticación dinámica
 */
export const authTableConfig: AuthTableConfig = {
  tableName: AUTH_TABLE_NAME,
  apiName: AUTH_API_NAME,
  sessionPrefix: AUTH_SESSION_PREFIX,
  emailField: AUTH_EMAIL_FIELD,
  passwordField: AUTH_PASSWORD_FIELD,
  primaryKeyField: AUTH_PRIMARY_KEY,
};

/**
 * Validaciones de configuración
 */
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

function validateApiName(apiName: string): boolean {
  const invalidChars = /[^a-zA-Z0-9_-]/;
  
  if (!apiName || typeof apiName !== 'string') {
    throw new Error(`Invalid API name: ${apiName}`);
  }
  
  if (invalidChars.test(apiName)) {
    throw new Error(`API name '${apiName}' contains invalid characters. Only alphanumeric, underscore and dash allowed.`);
  }
  
  if (apiName.length > 32) {
    throw new Error(`API name '${apiName}' is too long (max 32 characters)`);
  }
  
  return true;
}

// Validar configuración al cargar
validateTableName(AUTH_TABLE_NAME);
validateApiName(AUTH_API_NAME);

// Log de configuración
console.log(`🔐 Auth configured:`);
console.log(`   API Name: '${AUTH_API_NAME}'`);
console.log(`   Target Table: '${AUTH_TABLE_NAME}'`);
console.log(`   Session Prefix: '${AUTH_SESSION_PREFIX}'`);

/**
 * Generar session ID con prefijo de API
 */
export function generateSessionId(): string {
  const crypto = require('crypto');
  const randomId = crypto.randomBytes(16).toString('hex');
  return `${AUTH_SESSION_PREFIX}_${randomId}`;
}

/**
 * Parsear sessionId para obtener información de la API
 */
export function parseSessionId(sessionId: string): { apiName: string; sessionId: string } | null {
  const parts = sessionId.split('_');
  if (parts.length >= 2) {
    const apiName = parts[0];
    const actualSessionId = parts.slice(1).join('_');
    return { apiName, sessionId: actualSessionId };
  }
  return null;
}

/**
 * Verificar si una sesión pertenece a esta API
 */
export function isSessionFromThisApi(sessionId: string): boolean {
  const parsed = parseSessionId(sessionId);
  return parsed?.apiName === AUTH_SESSION_PREFIX;
}

/**
 * Obtener configuración de tabla para diferentes APIs
 */
export function getTableConfigForApi(apiName: string): AuthTableConfig {
  // Mapeo de APIs a configuraciones de tabla
  const apiTableMap: Record<string, Partial<AuthTableConfig>> = {
    'students': {
      tableName: 'students',
      sessionPrefix: 'students',
    },
    'instructors': {
      tableName: 'instructors', 
      sessionPrefix: 'instructors',
    },
    'main': {
      tableName: 'users',
      sessionPrefix: 'main',
    },
    // Agregar más según necesidad
  };

  const customConfig = apiTableMap[apiName] || {};
  
  return {
    tableName: customConfig.tableName || 'users',
    apiName: apiName,
    sessionPrefix: customConfig.sessionPrefix || apiName,
    emailField: customConfig.emailField || 'email',
    passwordField: customConfig.passwordField || 'password',
    primaryKeyField: customConfig.primaryKeyField || 'id',
  };
}