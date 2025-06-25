/**
 * Configuración para el nombre dinámico de la tabla de usuarios
 * Permite que el mismo stack base se use para diferentes tipos de usuarios
 * guardándolos en tablas diferentes
 * 
 * Ejemplos de uso:
 * - API Clientes: USER_TABLE_NAME=clients
 * - API Panaderos: USER_TABLE_NAME=bakers  
 * - API Admin: USER_TABLE_NAME=admins
 */

// Obtener el nombre de la tabla desde las variables de entorno
export const USER_TABLE_NAME = process.env.USER_TABLE_NAME || 'users';

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
validateTableName(USER_TABLE_NAME);

// Log para confirmar qué tabla se está usando
console.log(`🗄️  User table configured as: '${USER_TABLE_NAME}'`);

/**
 * Obtener el nombre de la tabla de usuarios
 */
export function getUserTableName(): string {
  return USER_TABLE_NAME;
}