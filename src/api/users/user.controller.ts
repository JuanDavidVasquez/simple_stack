import { Request, Response } from 'express';
import { config } from '../../core/config/env';
import setupLogger from '../../shared/utils/logger';
import { PaginatedRequest } from '../../shared/interfaces/pagination.interface';
import { UserService } from './user.service';

export class UserController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers/user`,
  });

  constructor(private readonly userService: UserService) {
    this.logger.info('UserController initialized');
  }

  public getAllUsers = async (req: Request, res: Response): Promise<void> => {
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
      res.status(200).json(result);

    } catch (error) {
      this.logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public createUser = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received request to create user', { body: req.body });

    try {
      const userData = req.body;
      console.log('Creating user with data CONTROLLER:', userData);
      const user = await this.userService.createUser(userData);

      this.logger.info(`User created successfully with ID: ${user.id}`);
      res.status(201).json(user);

    } catch (error) {
      this.logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public getUserById = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to get user by ID: ${userId}`);

    try {
      const user = await this.userService.getUserById(userId);

      if (!user) {
        this.logger.warn(`User with ID ${userId} not found`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with ID ${userId} retrieved successfully`);
      res.status(200).json(user);

    } catch (error) {
      this.logger.error(`Error fetching user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to update user with ID: ${userId}`, { body: req.body });

    try {
      const userData = req.body;
      const updatedUser = await this.userService.updateUser(userId, userData);

      if (!updatedUser) {
        this.logger.warn(`User with ID ${userId} not found for update`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with ID ${userId} updated successfully`);
      res.status(200).json(updatedUser);

    } catch (error) {
      this.logger.error(`Error updating user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to delete user with ID: ${userId}`);

    try {
      const deleted = await this.userService.deleteUser(userId);

      // If deleteUser returns void, assume success and always return 204
      this.logger.info(`User with ID ${userId} deleted (deleteUser returned void, cannot check existence)`);
      res.status(204).send();

    } catch (error) {
      this.logger.error(`Error deleting user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public softDeleteUser = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    this.logger.info(`Received request to soft delete user with ID: ${userId}`);

    try {
      const deletedUser = await this.userService.softDeleteUser(userId);

      if (!deletedUser) {
        this.logger.warn(`User with ID ${userId} not found for soft deletion`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with ID ${userId} soft deleted successfully`);
      res.status(200).json(deletedUser);

    } catch (error) {
      this.logger.error(`Error soft deleting user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public getUserByEmail = async (req: Request, res: Response): Promise<void> => {
    const email = req.params.email;
    this.logger.info(`Received request to get user by email: ${email}`);

    try {
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        this.logger.warn(`User with email ${email} not found`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with email ${email} retrieved successfully`);
      res.status(200).json(user);

    } catch (error) {
      this.logger.error(`Error fetching user with email ${email}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  public activateUserOrDeactivateUser = async (req: Request, res: Response): Promise<void> => {
    const userId = req.body.id;
    
    try{
      const updateStatus = await this.userService.activateUserOrDeactivateUser(userId);
      if (!updateStatus) {
        this.logger.warn(`User with ID ${userId} not found for activation/deactivation`);
        res.status(404).json({ error: 'User not found' });
        return;
      }
      this.logger.info(`User with ID ${userId} activation/deactivation status updated successfully`);
      res.status(200).json({ message: 'User activation/deactivation status updated successfully'});
    }catch (error) {
      this.logger.error(`Error updating activation/deactivation status for user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  public verifyUser = async (req: Request, res: Response): Promise<void> => {
    const userId = req.body.id;
    this.logger.info(`Received request to verify user with ID: ${userId}`);

    try {
      const verifiedUser = await this.userService.verifyUser(userId);

      if (!verifiedUser) {
        this.logger.warn(`User with ID ${userId} not found for verification`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with ID ${userId} verified successfully`);
      res.status(200).json(verifiedUser);

    } catch (error) {
      this.logger.error(`Error verifying user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  public updateUserRole = async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    const { role } = req.body;

    this.logger.info(`Received request to update role for user with ID: ${userId}`, { role });

    try {
      const updatedUser = await this.userService.updateUserRole(userId, role);

      if (!updatedUser) {
        this.logger.warn(`User with ID ${userId} not found for role update`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      this.logger.info(`User with ID ${userId} role updated successfully`);
      res.status(200).json(updatedUser);

    } catch (error) {
      this.logger.error(`Error updating role for user with ID ${userId}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  public getUsersCount = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received request to get users count');

    try {
      const count = await this.userService.getUsersCount();
      this.logger.info(`Total users count: ${count}`);
      res.status(200).json({ count });

    } catch (error) {
      this.logger.error('Error fetching users count:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  public getUsersByRole = async (req: Request, res: Response): Promise<void> => {
    const role = req.params.role;
    this.logger.info(`Received request to get users by role: ${role}`);

    try {
      const users = await this.userService.getUsersByRole(role);

      if (!users || users.length === 0) {
        this.logger.warn(`No users found with role ${role}`);
        res.status(404).json({ error: 'No users found with the specified role' });
        return;
      }

      this.logger.info(`Users with role ${role} retrieved successfully`);
      res.status(200).json(users);

    } catch (error) {
      this.logger.error(`Error fetching users with role ${role}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}