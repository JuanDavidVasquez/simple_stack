import { AuthController } from "../api/auth/auth.controller";
import { AuthService } from "../api/auth/auth.service";
import { UserRepository } from "../api/users/user.repository";
import { DatabaseManager } from "../core/config/database-manager";
import { createLocalizedProxy } from "../shared/utils/controller-proxy.util";


export const createAuthController = () => {
  const databaseManager = DatabaseManager.getInstance();
  const authService = new AuthService(databaseManager, UserRepository);
  const controller = new AuthController(authService);
  
  // ✅ Mismo patrón, reutilizable para cualquier controlador
  return createLocalizedProxy(controller);
};