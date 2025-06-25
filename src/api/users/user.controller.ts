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
}