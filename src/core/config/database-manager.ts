// src/core/config/database-manager.ts

import { DataSource } from "typeorm";
import { Service } from "typedi"; // 🚩 Usar Service de typedi
import setupLogger from "../../shared/utils/logger";
import { config } from "./env";
import { AppDataSource, initializeDatabase } from "../database/config/database.config";

/**
 * DatabaseManager gestionado por typedi
 * Sin singleton manual: typedi se encarga de una sola instancia
 */
@Service()
export class DatabaseManager {
  private initialized = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/database`,
  });

  // 🚩 Constructor público, ya no privado
  constructor() {
    this.logger.info("DatabaseManager instance created");
  }

  /**
   * Inicializa la conexión a la base de datos con manejo de reintentos
   */
  public async initialize(): Promise<void> {
    if (this.initialized && AppDataSource.isInitialized) {
      this.logger.info("Database manager already initialized");
      return;
    }

    try {
      this.logger.info("Initializing database connection...");
      await this.connect();
      this.startHealthChecks();
      this.logger.info("Database manager initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize database manager", error);
      throw error;
    }
  }

  /**
   * Intenta conectar a la base de datos con reintentos automáticos
   */
  private async connect(): Promise<void> {
    try {
      await initializeDatabase();
      this.initialized = true;
      this.reconnectAttempts = 0;
      this.logger.info(
        `Connected to ${config.database.type} database at ${config.database.host}:${config.database.port}`
      );
    } catch (error) {
      this.reconnectAttempts++;

      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.logger.warn(
          `Database connection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} failed. Retrying in ${this.reconnectDelay / 1000} seconds...`,
          error
        );

        await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);

        return this.connect();
      } else {
        this.logger.error("Maximum database connection retries reached", error);
        if (error instanceof Error) {
          throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`);
        } else {
          throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: Unknown error`);
        }
      }
    }
  }

  /**
   * Inicia health checks periódicos
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const checkInterval = 30_000; // 30 segundos

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.isConnected()) {
          this.logger.warn("Database connection lost. Attempting to reconnect...");
          this.reconnectAttempts = 0;
          this.reconnectDelay = 5000;
          await this.connect();
        }
      } catch (error) {
        this.logger.error("Database health check failed", error);
      }
    }, checkInterval);

    this.logger.info(`Database health check started (interval: ${checkInterval / 1000}s)`);
  }

  /**
   * Detiene los health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.info("Database health checks stopped");
    }
  }

  /**
   * Obtiene la conexión de TypeORM
   */
  public getConnection(): DataSource {
    if (!this.initialized || !AppDataSource.isInitialized) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return AppDataSource;
  }

  /**
   * Verifica si la conexión está activa
   */
  public isConnected(): boolean {
    return this.initialized && AppDataSource.isInitialized;
  }

  /**
   * Cierra la conexión a la base de datos
   */
  public async disconnect(): Promise<void> {
    this.stopHealthChecks();

    if (this.initialized && AppDataSource.isInitialized) {
      try {
        await AppDataSource.destroy();
        this.initialized = false;
        this.logger.info("Database connection closed successfully");
      } catch (error) {
        this.logger.error("Error closing database connection", error);
        throw error;
      }
    }
  }

  /**
   * Ejecuta una función dentro de una transacción
   */
  public async executeTransaction<T>(callback: (queryRunner: any) => Promise<T>): Promise<T> {
    const connection = this.getConnection();
    const queryRunner = connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      this.logger.warn("Rolling back transaction due to error", error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reinicia la conexión
   */
  public async restart(): Promise<void> {
    this.logger.info("Restarting database connection...");
    await this.disconnect();
    await this.initialize();
  }

  /**
   * Estadísticas de conexión
   */
  public getStats(): Record<string, any> {
    if (!this.isConnected()) {
      return {
        status: "disconnected",
        initialized: this.initialized,
        reconnectAttempts: this.reconnectAttempts,
      };
    }

    return {
      status: "connected",
      initialized: this.initialized,
      type: config.database.type,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      options: {
        synchronize: config.database.synchronize,
        logging: config.database.logging,
        connectionLimit: config.database.connectionLimit,
      },
    };
  }
}
