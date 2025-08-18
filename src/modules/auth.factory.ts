// src/factories/auth.factory.ts
import { AuthController } from "../api/auth/auth.controller";
import { AuthService } from "../api/auth/auth.service";
import { SessionService } from "../api/session/session.service";
import { DatabaseManager } from "../core/config/database-manager";
import { createLocalizedProxy } from "../shared/utils/controller-proxy.util";
import { AUTH_TABLE_NAME } from "../core/config/auth-table.config";
import setupLogger from "../shared/utils/logger";
import { config } from "../core/config/env";
import { NotificationClientService } from "../adapters/notifications/notification-client.service";

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/factories`,
});

export const createAuthController = async () => {
  logger.info(`Creating AuthController for table: ${AUTH_TABLE_NAME}`);
  
  try {
    const dbManager = new DatabaseManager();
    await dbManager.initialize();

    // Crear servicios
    const notificationService = new NotificationClientService();
    const sessionService = new SessionService(dbManager);
    
    // ✅ AuthService ahora recibe DatabaseManager y EmailService
    // El repositorio dinámico se crea internamente basado en AUTH_TABLE_NAME
    const authService = new AuthService(dbManager, notificationService);

    // Crear controlador
    const controller = new AuthController(authService, sessionService);

    logger.info(`AuthController created successfully for table: ${AUTH_TABLE_NAME}`);
    
    return createLocalizedProxy(controller);
    
  } catch (error) {
    logger.error(`Error creating AuthController for table ${AUTH_TABLE_NAME}:`, error);
    throw error;
  }
};