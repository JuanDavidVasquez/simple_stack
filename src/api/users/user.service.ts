import { UserRepository } from '../../api/users/user.repository';
import { PaginatedRequest, PaginatedResponse } from '../../shared/interfaces/pagination.interface';
import { ApplicationError } from '../../shared/errors/application.error';
import { z } from 'zod';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import { CreateUserData, createUserSchema, getPasswordSchemaByRole, UpdateUserData, updateUserSchema } from '../../shared/schemas/password.schema';
import BcryptUtil from '../../shared/utils/bcrypt.util';
import { User } from '../../core/database/entities/entities/user.entity';
import { NotificationClientService } from '../../adapters/notifications/notification-client.service';
import { Inject, Service } from 'typedi';

@Service()
export class UserService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/user`,
  });

  constructor(
    private readonly repository: UserRepository,
    private readonly notificationService: NotificationClientService
  ) {
    this.logger.info('UserService initialized');
  }

  async getAllUsers(params: PaginatedRequest): Promise<PaginatedResponse<User>> {
    this.logger.info('Fetching all users with params:', params);
    try {
      const result = await this.repository.getAllUsers(params);

      // Remover contraseñas de la respuesta por seguridad
      result.data = result.data.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      this.logger.info(`Fetched ${result.data.length} users successfully`);
      return result;
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    this.logger.info(`Fetching user by id: ${id}`);

    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = user;

      this.logger.info(`User ${id} fetched successfully`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User> {
    this.logger.info(`Fetching user by email: ${email}`);

    try {
      const user = await this.repository.findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = user;

      this.logger.info(`User with email ${email} fetched successfully`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error fetching user by email ${email}:`, error);
      throw error;
    }
  }

  async createUser(userData: CreateUserData): Promise<User> {
    this.logger.info('Creating user with data:', { ...userData, password: '[HIDDEN]' });

    try {
      // Validar datos con Zod
      const validatedData = createUserSchema.parse(userData);

      // Validar contraseña según el rol (si se especifica)
      if (validatedData.role) {
        const rolePasswordSchema = getPasswordSchemaByRole(validatedData.role);
        rolePasswordSchema.parse(validatedData.password);
      }

      // Verificar si el email ya existe
      const existingUser = await this.repository.findOne({
        where: { email: validatedData.email.toLowerCase() }
      });

      if (existingUser) {
        throw new ApplicationError('User with this email already exists');
      }

      // Verificar si el username ya existe (si se proporciona)
      if (validatedData.username) {
        const existingUsername = await this.repository.findOne({
          where: { username: validatedData.username.toLowerCase() }
        });

        if (existingUsername) {
          throw new ApplicationError('User with this username already exists');
        }
      }

      // Encriptar la contraseña
      const hashedPassword = await BcryptUtil.hashPassword(validatedData.password);

      // Preparar datos del usuario
      const userToCreate = {
        ...validatedData,
        email: validatedData.email.toLowerCase().trim(),
        username: validatedData.username?.toLowerCase().trim() || null,
        firstName: this.capitalizeFirstLetter(validatedData.firstName.trim()),
        lastName: this.capitalizeFirstLetter(validatedData.lastName.trim()),
        password: hashedPassword,
        isActive: validatedData.isActive ?? true,
        isVerified: validatedData.isVerified ?? false,
        language: validatedData.lenguaje || 'en',
        ...(validatedData.role && { role: validatedData.role as User['role'] }),
      } as Partial<User>;

      const user = await this.repository.createUser(userToCreate);

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = user;

      this.logger.info(`User created successfully with ID: ${user.id}`);

      // Generar código de verificación
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Guardar el código de verificación en el usuario
      await this.repository.update(user.id, { verificationCode });


      // Email de bienvenida
      this.logger.info(`Sending welcome email to ${user.email}`);

      const sendEmail = await this.notificationService.send({
        type: 'email',
        to: user.email,
        language: validatedData.lenguaje,
        priority: 'normal',
        url: 'emails/welcome',
        data: {
          appName: config.app.name,
          userName: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          confirmationCode: verificationCode,
          confirmationUrl: `${config.app.frontendUrl}/verify/${verificationCode}`,
          year: new Date().getFullYear(),
          companyLogoUrl: `${config.app.baseUrl}/images/logo.png`,
          companyName: config.app.name,
        }
      });

      if (!sendEmail) {
        this.logger.warn(`Failed to send welcome email to ${user.email}`);
      } else {
        this.logger.info(`Welcome email sent successfully to ${user.email}`);
      }

      return userResponse as User;

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }

      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, updateData: UpdateUserData): Promise<User> {
    this.logger.info(`Updating user ${id}`, {
      ...updateData,
      password: updateData.password ? '[HIDDEN]' : undefined
    });

    try {
      // Validar datos con Zod
      const validatedData = updateUserSchema.parse(updateData);

      // Verificar que el usuario existe
      const existingUser = await this.repository.findOne({ where: { id } });
      if (!existingUser) {
        throw new ApplicationError('User not found');
      }

      // Si se está actualizando la contraseña, encriptarla
      if (validatedData.password) {
        // Validar contraseña según el rol actual del usuario
        const rolePasswordSchema = getPasswordSchemaByRole(existingUser.role);
        rolePasswordSchema.parse(validatedData.password);

        validatedData.password = await BcryptUtil.hashPassword(validatedData.password);
      }

      // Validar email único (si se está actualizando)
      if (validatedData.email && validatedData.email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const existingEmail = await this.repository.findOne({
          where: { email: validatedData.email.toLowerCase() }
        });

        if (existingEmail) {
          throw new ApplicationError('User with this email already exists');
        }
      }

      // Validar username único (si se está actualizando)
      if (validatedData.username && validatedData.username.toLowerCase() !== existingUser.username?.toLowerCase()) {
        const existingUsername = await this.repository.findOne({
          where: { username: validatedData.username.toLowerCase() }
        });

        if (existingUsername) {
          throw new ApplicationError('User with this username already exists');
        }
      }

      // Normalizar datos si se proporcionan
      const normalizedData = {
        ...validatedData,
        ...(validatedData.email && { email: validatedData.email.toLowerCase().trim() }),
        ...(validatedData.username && { username: validatedData.username.toLowerCase().trim() }),
        ...(validatedData.firstName && { firstName: this.capitalizeFirstLetter(validatedData.firstName.trim()) }),
        ...(validatedData.lastName && { lastName: this.capitalizeFirstLetter(validatedData.lastName.trim()) }),
      };

      // Actualizar usuario
      await this.repository.update(id, {
        ...normalizedData,
        ...(normalizedData.role && { role: normalizedData.role as any }),
      });
      const updatedUser = await this.repository.findOne({ where: { id } });

      if (!updatedUser) {
        throw new ApplicationError('Failed to retrieve updated user');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = updatedUser;

      this.logger.info(`User ${id} updated successfully`);
      return userResponse as User;

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }

      this.logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info(`Deleting user ${id}`);

    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Soft delete (si tu entidad lo soporta) o hard delete
      await this.repository.delete(id);

      this.logger.info(`User ${id} deleted successfully`);

    } catch (error) {
      this.logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async activateUserOrDeactivateUser(id: string): Promise<User> {
    this.logger.info(`Activating user ${id}`);
    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Alternar estado de activación
      const isActive = !user.isActive;
      await this.repository.update(id, {
        isActive,
        updatedAt: new Date()
      });

      const updatedUser = await this.repository.findOne({ where: { id } });

      if (!updatedUser) {
        throw new ApplicationError('Failed to retrieve updated user');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = updatedUser;

      this.logger.info(`User ${id} activation status updated to ${isActive}`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error activating/deactivating user ${id}:`, error);
      throw error;
    }
  }

  async verifyUser(id: string): Promise<User> {
    this.logger.info(`Verifying user ${id}`);

    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      if (user.isVerified) {
        throw new ApplicationError('User is already verified');
      }

      await this.repository.update(id, {
        isVerified: true,
        verificationCode: null, // Limpiar código de verificación
        updatedAt: new Date()
      });

      const updatedUser = await this.repository.findOne({ where: { id } });

      if (!updatedUser) {
        throw new ApplicationError('Failed to retrieve updated user');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = updatedUser;

      this.logger.info(`User ${id} verified successfully`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error verifying user ${id}:`, error);
      throw error;
    }
  }

  async updateUserRole(id: string, newRole: string): Promise<User> {
    this.logger.info(`Updating role for user ${id} to ${newRole}`);

    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Validar que el rol sea válido
      const validRoles = ['admin', 'user', 'doctor'];
      if (!validRoles.includes(newRole)) {
        throw new ApplicationError('Invalid role specified');
      }

      if (user.role === newRole) {
        throw new ApplicationError(`User already has role: ${newRole}`);
      }

      await this.repository.update(id, {
        role: newRole as any,
        updatedAt: new Date()
      });

      const updatedUser = await this.repository.findOne({ where: { id } });

      if (!updatedUser) {
        throw new ApplicationError('Failed to retrieve updated user');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = updatedUser;

      this.logger.info(`User ${id} role updated to ${newRole} successfully`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error updating role for user ${id}:`, error);
      throw error;
    }
  }

  async getUsersCount(): Promise<number> {
    this.logger.info('Getting total users count');

    try {
      const count = await this.repository.getUsersCount();

      this.logger.info(`Total users count: ${count}`);
      return count;

    } catch (error) {
      this.logger.error('Error getting users count:', error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    this.logger.info(`Getting users by role: ${role}`);

    try {
      const users = await this.repository.find({
        where: { role: role as any }
      });

      // Remover contraseñas de la respuesta
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      this.logger.info(`Found ${users.length} users with role ${role}`);
      return usersWithoutPasswords;

    } catch (error) {
      this.logger.error(`Error getting users by role ${role}:`, error);
      throw error;
    }
  }

  async softDeleteUser(id: string): Promise<User> {
    this.logger.info(`Soft deleting user ${id}`);

    try {
      const user = await this.repository.findOne({ where: { id } });

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Marcar como eliminado (soft delete)
      await this.repository.softDeleteUser(id);

      const updatedUser = await this.repository.findOne({ where: { id } });

      if (!updatedUser) {
        throw new ApplicationError('Failed to retrieve updated user');
      }

      // Remover la contraseña de la respuesta
      const { password, ...userResponse } = updatedUser;

      this.logger.info(`User ${id} soft deleted successfully`);
      return userResponse as User;

    } catch (error) {
      this.logger.error(`Error soft deleting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Capitaliza la primera letra de una cadena
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}