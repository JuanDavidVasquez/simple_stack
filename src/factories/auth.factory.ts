// src/factories/auth.factory.ts
import { AuthController } from "../api/auth/auth.controller";
import { AuthService } from "../api/auth/auth.service";
import { SessionService } from "../api/session/session.service";
import { DatabaseManager } from "../core/config/database-manager";
import { createLocalizedProxy } from "../shared/utils/controller-proxy.util";
import { EmailService } from "../templates/email.service";
import { AUTH_TABLE_NAME } from "../core/config/auth-table.config";
import setupLogger from "../shared/utils/logger";
import { config } from "../core/config/env";

const logger = setupLogger({
  ...config.logging,
  dir: `${config.logging.dir}/factories`,
});

export const createAuthController = async () => {
  logger.info(`Creating AuthController for table: ${AUTH_TABLE_NAME}`);
  
  try {
    const databaseManager = DatabaseManager.getInstance();
    await databaseManager.initialize();

    // Crear servicios
    const emailService = new EmailService();
    const sessionService = new SessionService(databaseManager);
    
    // ✅ AuthService ahora recibe DatabaseManager y EmailService
    // El repositorio dinámico se crea internamente basado en AUTH_TABLE_NAME
    const authService = new AuthService(databaseManager, emailService);
    
    // Crear controlador
    const controller = new AuthController(authService, sessionService);

    logger.info(`AuthController created successfully for table: ${AUTH_TABLE_NAME}`);
    
    return createLocalizedProxy(controller);
    
  } catch (error) {
    logger.error(`Error creating AuthController for table ${AUTH_TABLE_NAME}:`, error);
    throw error;
  }
};