import { DatabaseManager } from "../core/config/database-manager";
import { UserRepository } from "../api/users/user.repository";
import { UserController } from "../api/users/user.controller";
import { UserService } from "../api/users/user.service";




export const createUserController = (): UserController => {
  const databaseManager = DatabaseManager.getInstance();
  const userService = new UserService(databaseManager, UserRepository);
  return new UserController(userService);
};
