import { AuthController } from "../api/auth/auth.controller";
import { AuthService } from "../api/auth/auth.service";
import { SessionService } from "../api/session/session.service";
import { UserRepository } from "../api/users/user.repository";
import { DatabaseManager } from "../core/config/database-manager";
import { createLocalizedProxy } from "../shared/utils/controller-proxy.util";
import { EmailService } from "../templates/email.service";

export const createAuthController = async () => {
  const databaseManager = DatabaseManager.getInstance();


  await databaseManager.initialize();

  const sessionService = new SessionService(databaseManager);
    const emailService = new EmailService();
  const authService = new AuthService(databaseManager, UserRepository, emailService);
  const controller = new AuthController(authService, sessionService);

  return createLocalizedProxy(controller);
};
