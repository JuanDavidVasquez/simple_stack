import { DatabaseManager } from "../core/config/database-manager";
import { UserRepository } from "../api/users/user.repository";
import { UserController } from "../api/users/user.controller";
import { UserService } from "../api/users/user.service";
import { createLocalizedProxy } from "../shared/utils/controller-proxy.util";

export const createUserController = () => {
  const databaseManager = DatabaseManager.getInstance();
  const userService = new UserService(databaseManager, UserRepository);
  const controller = new UserController(userService);
  
  // ✅ Configurar proxy con opciones específicas
  return createLocalizedProxy(controller);
};
