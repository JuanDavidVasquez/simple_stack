import { Response } from 'express';
import { config } from '../../core/config/env';
import { PaginatedRequest } from '../../shared/interfaces/pagination.interface';
import { UserService } from './user.service';
import { LocalizedRequest } from '../../i18n/middleware';
import { TRANSLATION_KEYS } from '../../i18n/constants';
import { ResponseUtil } from '../../shared/utils/response.util';
import setupLogger from '../../shared/utils/logger/index';

export class UserController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers/user`,
  });

  constructor(private readonly userService: UserService) {
    this.logger.info('UserController initialized');
  }

  public getAllUsers = async (req: LocalizedRequest, res: Response): Promise<void> => {
    this.logger.info('Received request to get all users', { body: req.body });

    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        filters = {},
      } = req.body as PaginatedRequest;

      const params: PaginatedRequest = {
        page: Number(page),
        limit: Number(limit),
        sortBy,
        sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc',
        filters,
      };

      const result = await this.userService.getAllUsers(params);

      this.logger.info(`Successfully fetched ${result.data.length} users`);
      
      // ✅ Respuesta localizada con interpolación
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.LIST_RETRIEVED,
        result,
        200,
        { count: result.data.length }
      );

    } catch (error) {
      this.logger.error('Error fetching users:', error);
      
      // ✅ Error localizado
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public createUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    this.logger.info('Received request to create user', { body: req.body });

    try {
      const userData = req.body;
      console.log('Creating user with data CONTROLLER:', userData);
      const user = await this.userService.createUser(userData);

      this.logger.info(`User created successfully with ID: ${user.id}`);
      
      // ✅ Respuesta localizada de creación exitosa
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.CREATED,
        user,
        201
      );

    } catch (error) {
      this.logger.error('Error creating user:', error);
      
      // ✅ Manejo de errores específicos con mensajes localizados
      if (error instanceof Error) {
        if (error.message.includes('email already exists')) {
          ResponseUtil.error(
            req,
            res,
            TRANSLATION_KEYS.ERRORS.USER.EMAIL_EXISTS,
            400
          );
          return;
        }
        
        if (error.message.includes('username already exists')) {
          ResponseUtil.error(
            req,
            res,
            TRANSLATION_KEYS.ERRORS.USER.USERNAME_EXISTS,
            400
          );
          return;
        }
        
        if (error.message.includes('Validation failed')) {
          ResponseUtil.error(
            req,
            res,
            TRANSLATION_KEYS.ERRORS.GENERAL.VALIDATION_FAILED,
            400
          );
          return;
        }
      }
      
      // Error genérico
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public getUserById = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to get user by ID: ${userId}`);

    try {
      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.logger.warn(`User with ID ${userId} not found`);
        
        // ✅ Error localizado de usuario no encontrado
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} retrieved successfully`);
      
      // ✅ Respuesta localizada exitosa
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.RETRIEVED,
        user,
        200
      );

    } catch (error) {
      this.logger.error(`Error fetching user with ID ${userId}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public updateUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to update user with ID: ${userId}`, { body: req.body });

    try {
      const userData = req.body;
      const updatedUser = await this.userService.updateUser(userId, userData);

      if (!updatedUser) {
        this.logger.warn(`User with ID ${userId} not found for update`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} updated successfully`);
      
      // ✅ Respuesta de actualización exitosa
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.UPDATED,
        updatedUser,
        200
      );

    } catch (error) {
      this.logger.error(`Error updating user with ID ${userId}:`, error);
      
      // Manejo de errores específicos
      if (error instanceof Error) {
        if (error.message.includes('email already exists')) {
          ResponseUtil.error(
            req,
            res,
            TRANSLATION_KEYS.ERRORS.USER.EMAIL_EXISTS,
            400
          );
          return;
        }
        
        if (error.message.includes('Validation failed')) {
          ResponseUtil.error(
            req,
            res,
            TRANSLATION_KEYS.ERRORS.GENERAL.VALIDATION_FAILED,
            400
          );
          return;
        }
      }
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public deleteUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to delete user with ID: ${userId}`);

    try {
      await this.userService.deleteUser(userId);

      this.logger.info(`User with ID ${userId} deleted successfully`);
      
      // ✅ Respuesta de eliminación exitosa (204 No Content con mensaje)
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.DELETED,
        null,
        204
      );

    } catch (error) {
      this.logger.error(`Error deleting user with ID ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public softDeleteUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to soft delete user with ID: ${userId}`);

    try {
      const deletedUser = await this.userService.softDeleteUser(userId);

      if (!deletedUser) {
        this.logger.warn(`User with ID ${userId} not found for soft deletion`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} soft deleted successfully`);
      
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.DELETED,
        deletedUser,
        200
      );

    } catch (error) {
      this.logger.error(`Error soft deleting user with ID ${userId}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public getUserByEmail = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const email = req.params.email;
    this.logger.info(`Received request to get user by email: ${email}`);

    try {
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        this.logger.warn(`User with email ${email} not found`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with email ${email} retrieved successfully`);
      
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.RETRIEVED,
        user,
        200
      );

    } catch (error) {
      this.logger.error(`Error fetching user with email ${email}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public activateUserOrDeactivateUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.body.id;
    
    try {
      const updateStatus = await this.userService.activateUserOrDeactivateUser(userId);
      
      if (!updateStatus) {
        this.logger.warn(`User with ID ${userId} not found for activation/deactivation`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }
      
      this.logger.info(`User with ID ${userId} activation/deactivation status updated successfully`);
      
      // ✅ Mensaje dinámico según el estado
      const messageKey = updateStatus.isActive 
        ? TRANSLATION_KEYS.RESPONSES.USER.ACTIVATED 
        : TRANSLATION_KEYS.RESPONSES.USER.DEACTIVATED;
      
      ResponseUtil.success(
        req,
        res,
        messageKey,
        updateStatus,
        200
      );
      
    } catch (error) {
      this.logger.error(`Error updating activation/deactivation status for user with ID ${userId}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public verifyUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.body.id;
    this.logger.info(`Received request to verify user with ID: ${userId}`);

    try {
      const verifiedUser = await this.userService.verifyUser(userId);

      if (!verifiedUser) {
        this.logger.warn(`User with ID ${userId} not found for verification`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} verified successfully`);
      
      // ✅ Mensaje de verificación exitosa
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.VERIFIED,
        verifiedUser,
        200
      );

    } catch (error) {
      this.logger.error(`Error verifying user with ID ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('already verified')) {
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.ALREADY_VERIFIED,
          400
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public updateUserRole = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const userId = req.params.id;
    const { role } = req.body;

    this.logger.info(`Received request to update role for user with ID: ${userId}`, { role });

    try {
      const updatedUser = await this.userService.updateUserRole(userId, role);

      if (!updatedUser) {
        this.logger.warn(`User with ID ${userId} not found for role update`);
        
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.USER.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} role updated successfully`);
      
      // ✅ Mensaje de rol actualizado con interpolación
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.ROLE_UPDATED,
        updatedUser,
        200,
        { role } // Interpolación para mostrar el nuevo rol
      );

    } catch (error) {
      this.logger.error(`Error updating role for user with ID ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('Invalid role')) {
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.VALIDATION.INVALID_ROLE,
          400
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public getUsersCount = async (req: LocalizedRequest, res: Response): Promise<void> => {
    this.logger.info('Received request to get users count');

    try {
      const count = await this.userService.getUsersCount();
      this.logger.info(`Total users count: ${count}`);
      
      // ✅ Respuesta con conteo
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.GENERAL.OPERATION_SUCCESSFUL,
        { count },
        200
      );

    } catch (error) {
      this.logger.error('Error fetching users count:', error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };

  public getUsersByRole = async (req: LocalizedRequest, res: Response): Promise<void> => {
    const role = req.params.role;
    this.logger.info(`Received request to get users by role: ${role}`);

    try {
      const users = await this.userService.getUsersByRole(role);

      if (!users || users.length === 0) {
        this.logger.warn(`No users found with role ${role}`);
        
        // ✅ Mensaje específico para "no encontrado" pero diferenciado
        ResponseUtil.error(
          req,
          res,
          TRANSLATION_KEYS.ERRORS.GENERAL.NOT_FOUND,
          404
        );
        return;
      }

      this.logger.info(`Users with role ${role} retrieved successfully`);
      
      // ✅ Respuesta exitosa con lista de usuarios
      ResponseUtil.success(
        req,
        res,
        TRANSLATION_KEYS.RESPONSES.USER.LIST_RETRIEVED,
        users,
        200,
        { count: users.length }
      );

    } catch (error) {
      this.logger.error(`Error fetching users with role ${role}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        TRANSLATION_KEYS.ERRORS.GENERAL.INTERNAL_SERVER,
        500
      );
    }
  };
}
