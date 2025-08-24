// src/core/database/config/typeorm.config.ts
import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "../../config/env";

/**
 * Configuración específica de TypeORM para CLI y migraciones
 * Este archivo es utilizado por el CLI de TypeORM para generar migraciones,
 * ejecutar seeds y otras operaciones de línea de comandos
 */
const typeormConfig: DataSourceOptions = {
  type: config.database.type as any,
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  
  // Configuración específica para desarrollo/producción
  synchronize: false, // Siempre false en TypeORM CLI para evitar pérdida de datos
  logging: config.database.logging,
  timezone: config.database.timezone,
  
  // Rutas para entidades, migraciones y subscribers
  entities: [
    __dirname + "/../entities/**/*.entity{.ts,.js}",
  ],
  migrations: [
    __dirname + "/../migrations/**/*{.ts,.js}",
  ],
  subscribers: [
    __dirname + "/../subscribers/**/*{.ts,.js}",
  ],
  
  // Configuración para migraciones
  migrationsTableName: "migrations_history",
  migrationsRun: false, // No ejecutar migraciones automáticamente
  
  // Configuración del pool de conexiones
  extra: {
    connectionLimit: 5, // Menos conexiones para operaciones CLI
    queueLimit: 0,
    waitForConnections: true,
    connectTimeout: 30000, // Más tiempo para operaciones de migración
    acquireTimeout: 60000,
    idleTimeout: 300000, // 5 minutos para operaciones largas
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000,
  },
  
  // SSL configuration
  ssl: config.app.env === 'production' ? {
    rejectUnauthorized: true,
    // Descomentar si tienes certificados específicos:
    // ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
  } : false,
  
  // Configuración adicional para diferentes entornos
  ...(config.app.env === 'test' && {
    // Configuración específica para testing
    synchronize: true,
    dropSchema: true, // Limpiar esquema en cada test
    logging: false,
  }),
  
  ...(config.app.env === 'development' && {
    // Configuración específica para desarrollo
    logging: ["query", "error", "schema", "warn", "info", "log"],
    logger: "advanced-console",
  }),
};

// Exportar como DataSource para TypeORM CLI
export default new DataSource(typeormConfig);

// También exportar la configuración para uso programático
export { typeormConfig };

/**
 * Función utilitaria para crear una instancia de DataSource personalizada
 * Útil para testing o configuraciones específicas
 */
export const createTypeORMDataSource = (overrides: Partial<DataSourceOptions> = {}): DataSource => {
  const mergedConfig = {
    ...typeormConfig,
    ...overrides,
  };
  
  return new DataSource(mergedConfig as DataSourceOptions);
};

/**
 * Configuración específica para testing
 */
export const createTestDataSource = (): DataSource => {
  return createTypeORMDataSource({
    database: `${config.database.name}_test`,
    synchronize: true,
    dropSchema: true,
    logging: false,
    entities: [
      __dirname + "/../entities/**/*.entity{.ts,.js}",
      __dirname + "/../entities/entities/**/*.entity{.ts,.js}"
    ],
    migrations: [],
  });
};

/**
 * Función para validar la configuración de la base de datos
 */
export const validateDatabaseConfig = (): void => {
  const requiredFields = ['host', 'port', 'username', 'name'];
  const missingFields = requiredFields.filter(field => !config.database[field as keyof typeof config.database]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required database configuration fields: ${missingFields.join(', ')}`);
  }
  
  if (!['mysql', 'postgres', 'mariadb', 'sqlite', 'mssql'].includes(config.database.type)) {
    throw new Error(`Unsupported database type: ${config.database.type}`);
  }
};

validateDatabaseConfig();