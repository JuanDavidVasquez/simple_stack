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

      if (!result || result.data.length === 0) {
        this.logger.warn('No users found');
        
        // ✅ Usar clave de error correcta para "no encontrado"
        ResponseUtil.error(
          req,
          res,
          'errors.general.not_found',
          404
        );
        return;
      }

      this.logger.info(`Successfully fetched ${result.data.length} users`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.list_retrieved',
        result,
        200,
        { count: result.data.length }
      );

    } catch (error) {
      this.logger.error('Error fetching users:', error);
      
      // ✅ Usar clave de error correcta
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
        500
      );
    }
  };

  public createUser = async (req: LocalizedRequest, res: Response): Promise<void> => {
    this.logger.info('Received request to create user', { body: req.body });

    try {
      const userData = req.body;
      const user = await this.userService.createUser(userData);

      this.logger.info(`User created successfully with ID: ${user.id}`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.created',
        user,
        201
      );

    } catch (error) {
      this.logger.error('Error creating user:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('email already exists')) {
          ResponseUtil.error(
            req,
            res,
            'errors.user.email_exists',
            400
          );
          return;
        }
        
        if (error.message.includes('username already exists')) {
          ResponseUtil.error(
            req,
            res,
            'errors.user.username_exists',
            400
          );
          return;
        }
        
        if (error.message.includes('Validation failed')) {
          ResponseUtil.error(
            req,
            res,
            'errors.general.validation_failed',
            400
          );
          return;
        }
      }
      
      // Error genérico
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
        
        ResponseUtil.error(
          req,
          res,
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} retrieved successfully`);

      ResponseUtil.success(
        req,
        res,
        'responses.user.retrieved',
        user,
        200
      );

    } catch (error) {
      this.logger.error(`Error fetching user with ID ${userId}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} updated successfully`);

      ResponseUtil.success(
        req,
        res,
        'responses.user.updated',
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
            'errors.user.email_exists',
            400
          );
          return;
        }
        
        if (error.message.includes('Validation failed')) {
          ResponseUtil.error(
            req,
            res,
            'errors.general.validation_failed',
            400
          );
          return;
        }
      }
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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

      ResponseUtil.success(
        req,
        res,
        'responses.user.deleted',
        null,
        204
      );

    } catch (error) {
      this.logger.error(`Error deleting user with ID ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        ResponseUtil.error(
          req,
          res,
          'errors.user.not_found',
          404
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} soft deleted successfully`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.deleted',
        deletedUser,
        200
      );

    } catch (error) {
      this.logger.error(`Error soft deleting user with ID ${userId}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with email ${email} retrieved successfully`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.retrieved',
        user,
        200
      );

    } catch (error) {
      this.logger.error(`Error fetching user with email ${email}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404,
        );
        return;
      }
      
      this.logger.info(`User with ID ${userId} activation/deactivation status updated successfully`);
      
      // ✅ Mensaje dinámico según el estado
      const messageKey = updateStatus.isActive 
        ? 'responses.user.activated'
        : 'responses.user.deactivated';
      
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
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} verified successfully`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.verified',
        verifiedUser,
        200
      );

    } catch (error) {
      this.logger.error(`Error verifying user with ID ${userId}:`, error);
      
      if (error instanceof Error && error.message.includes('already verified')) {
        ResponseUtil.error(
          req,
          res,
          'errors.user.already_verified',
          400
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
          'errors.user.not_found',
          404
        );
        return;
      }

      this.logger.info(`User with ID ${userId} role updated successfully`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.role_updated',
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
          'validation.user.role_invalid',
          400
        );
        return;
      }
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
        500
      );
    }
  };

  public getUsersCount = async (req: LocalizedRequest, res: Response): Promise<void> => {
    this.logger.info('Received request to get users count');

    try {
      const count = await this.userService.getUsersCount();
      this.logger.info(`Total users count: ${count}`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.general.operation_successful',
        { count },
        200
      );

    } catch (error) {
      this.logger.error('Error fetching users count:', error);
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
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
        
        ResponseUtil.error(
          req,
          res,
          'errors.general.not_found',
          404
        );
        return;
      }

      this.logger.info(`Users with role ${role} retrieved successfully`);
      
      ResponseUtil.success(
        req,
        res,
        'responses.user.list_retrieved',
        users,
        200,
        { count: users.length }
      );

    } catch (error) {
      this.logger.error(`Error fetching users with role ${role}:`, error);
      
      ResponseUtil.error(
        req,
        res,
        'errors.general.internal_server',
        500
      );
    }
  };
}