import { DatabaseManager } from "../core/config/database-manager";
import { UserRepository } from "../api/users/user.repository";
import { AuthController } from "../api/auth/auth.controller";
import { AuthService } from "../api/auth/auth.service";

export const createAuthController = (): AuthController => {
  const databaseManager = DatabaseManager.getInstance();
  const authService = new AuthService(databaseManager, UserRepository);
  return new AuthController(authService);
};