import { Service } from 'typedi';
import { UserRepository } from '../../api/users/user.repository';
import { PaginatedRequest, PaginatedResponse } from '../../shared/interfaces/pagination.interface';
import { ApplicationError } from '../../shared/errors/application.error';
import { z } from 'zod';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import { CreateUserData, createUserSchema, UpdateUserData, updateUserSchema } from '../../shared/schemas/password.schema';
import BcryptUtil from '../../shared/utils/bcrypt.util';
import { NotificationClientService } from '../../adapters/notifications/notification-client.service';
import { User, Veterinarian } from '../../core/database/entities';

// Configuración dinámica basada en el tipo de entidad
const AUTH_TABLE_NAME = process.env.AUTH_TABLE_NAME || 'users';

// +-+Mapeo de configuraciones específicas por entidad

const ENTITY_CONFIGS: Record<string, any> = {
  'users': User,
  'veterinarians': Veterinarian,
};

@Service()
export class UserService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/user`,
  });

  private config: any;

  constructor(
    private readonly repository: UserRepository,
    private readonly notificationService: NotificationClientService
  ) {
    // Obtener configuración dinámica
    this.config = ENTITY_CONFIGS[AUTH_TABLE_NAME];
    
    if (!this.config) {
      throw new Error(`Configuration not found for table: ${AUTH_TABLE_NAME}. Available tables: ${Object.keys(ENTITY_CONFIGS).join(', ')}`);
    }

    this.logger.info(`UserService initialized for table: ${this.repository.getTableName()} using entity: ${this.config.entityName}`);
  }

  async getAllUsers(params: PaginatedRequest): Promise<PaginatedResponse<any>> {
    this.logger.info('Fetching all users with params:', params);
    try {
      // Usar configuración dinámica para los campos de selección
      const dynamicParams = {
        ...params,
        sortBy: params.sortBy || this.config.defaultSortBy
      };

      const result = await this.repository.getAllUsers(dynamicParams);

      // Remover contraseñas de la respuesta por seguridad
      result.data = result.data.map(user => {
        const { [this.config.passwordField]: password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      this.logger.info(`Fetched ${result.data.length} ${this.config.entityName.toLowerCase()}s successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching ${this.config.entityName.toLowerCase()}s:`, error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<any> {
    this.logger.info(`Fetching ${this.config.entityName.toLowerCase()} by id: ${id}`);

    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = user;

      this.logger.info(`${this.config.entityName} ${id} fetched successfully`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error fetching ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    this.logger.info(`Fetching ${this.config.entityName.toLowerCase()} by email: ${email}`);

    try {
      const user = await this.repository.findByEmail(email.toLowerCase());

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = user;

      this.logger.info(`${this.config.entityName} with email ${email} fetched successfully`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error fetching ${this.config.entityName.toLowerCase()} by email ${email}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<any> {
    this.logger.info(`Fetching ${this.config.entityName.toLowerCase()} by ${this.config.usernameField}: ${username}`);

    try {
      const user = await this.repository.findByUsername(username.toLowerCase());

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = user;

      this.logger.info(`${this.config.entityName} with ${this.config.usernameField} ${username} fetched successfully`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error fetching ${this.config.entityName.toLowerCase()} by ${this.config.usernameField} ${username}:`, error);
      throw error;
    }
  }

  async createUser(userData: CreateUserData): Promise<any> {
    this.logger.info(`Creating ${this.config.entityName.toLowerCase()} with data:`, { 
      ...userData, 
      [this.config.passwordField]: '[HIDDEN]' 
    });

    try {
      // Validar datos con Zod
      const validatedData = createUserSchema.parse(userData) as Record<string, any>;

      // Verificar si el email ya existe
      if (await this.repository.emailExists(validatedData[this.config.emailField].toLowerCase())) {
        throw new ApplicationError(`${this.config.entityName} with this email already exists`);
      }

      // Verificar si el username/licenseNumber ya existe (si se proporciona y la entidad lo soporta)
      const usernameValue = (validatedData as Record<string, any>)[this.config.usernameField];
      if (this.config.hasUsername && usernameValue && await this.repository.usernameExists(usernameValue.toLowerCase())) {
        throw new ApplicationError(`${this.config.entityName} with this ${this.config.usernameField} already exists`);
      }

      // Encriptar la contraseña
      const hashedPassword = await BcryptUtil.hashPassword(validatedData[this.config.passwordField]);

      // Preparar datos del usuario dinámicamente
      const userToCreate = {
        ...validatedData,
        [this.config.emailField]: validatedData[this.config.emailField].toLowerCase().trim(),
        [this.config.passwordField]: hashedPassword,
        [this.config.isActiveField]: validatedData[this.config.isActiveField] ?? true,
        ...(this.config.hasVerification && { [this.config.isVerifiedField]: validatedData[this.config.isVerifiedField] ?? false }),
        language: validatedData.lenguaje || 'en',
      };

      // Normalizar campos de nombre si existen
      if (this.config.firstNameField && validatedData[this.config.firstNameField]) {
        userToCreate[this.config.firstNameField] = this.capitalizeFirstLetter(validatedData[this.config.firstNameField].trim());
      }
      if (this.config.lastNameField && validatedData[this.config.lastNameField]) {
        userToCreate[this.config.lastNameField] = this.capitalizeFirstLetter(validatedData[this.config.lastNameField].trim());
      }

      // Normalizar username/licenseNumber si existe
      if (this.config.hasUsername && usernameValue) {
        userToCreate[this.config.usernameField] = usernameValue.toLowerCase().trim();
      }

      // Permitir que la DB valide el rol/specialization
      if (validatedData[this.config.roleField]) {
        userToCreate[this.config.roleField] = validatedData[this.config.roleField];
      }

      const user = await this.repository.createUser(userToCreate);

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = user;

      this.logger.info(`${this.config.entityName} created successfully with ID: ${user.id} in table: ${this.repository.getTableName()}`);

      // Generar código de verificación si la entidad lo soporta
      if (this.config.hasVerification) {
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await this.repository.updateUser(user.id, { verificationCode });

        // Email de bienvenida
        await this.sendWelcomeEmail(user, verificationCode, validatedData.lenguaje);
      }

      return userResponse;

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }

      this.logger.error(`Error creating ${this.config.entityName.toLowerCase()}:`, error);
      throw error;
    }
  }

  async updateUser(id: string, updateData: UpdateUserData): Promise<any> {
    this.logger.info(`Updating ${this.config.entityName.toLowerCase()} ${id}`, {
      ...updateData,
      [this.config.passwordField]: (updateData as Record<string, any>)[this.config.passwordField] ? '[HIDDEN]' : undefined
    });

    try {
      // Validar datos con Zod
      const validatedData = updateUserSchema.parse(updateData) as Record<string, any>;

      // Verificar que el usuario existe
      const existingUser = await this.repository.getUserById(id);
      if (!existingUser) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Si se está actualizando la contraseña, encriptarla
      if (validatedData[this.config.passwordField]) {
        validatedData[this.config.passwordField] = await BcryptUtil.hashPassword(validatedData[this.config.passwordField]);
      }

      // Validar email único (si se está actualizando)
      const emailValue = validatedData[this.config.emailField];
      if (emailValue && emailValue.toLowerCase() !== existingUser[this.config.emailField].toLowerCase()) {
        if (await this.repository.emailExists(emailValue.toLowerCase())) {
          throw new ApplicationError(`${this.config.entityName} with this email already exists`);
        }
      }

      // Validar username/licenseNumber único (si se está actualizando y la entidad lo soporta)
      const usernameValue = validatedData[this.config.usernameField];
      if (this.config.hasUsername && usernameValue && usernameValue.toLowerCase() !== existingUser[this.config.usernameField]?.toLowerCase()) {
        if (await this.repository.usernameExists(usernameValue.toLowerCase())) {
          throw new ApplicationError(`${this.config.entityName} with this ${this.config.usernameField} already exists`);
        }
      }

      // Normalizar datos dinámicamente
      const normalizedData = { ...validatedData };

      if (emailValue) {
        normalizedData[this.config.emailField] = emailValue.toLowerCase().trim();
      }

      if (this.config.hasUsername && usernameValue) {
        normalizedData[this.config.usernameField] = usernameValue.toLowerCase().trim();
      }

      if (validatedData[this.config.firstNameField]) {
        normalizedData[this.config.firstNameField] = this.capitalizeFirstLetter(validatedData[this.config.firstNameField].trim());
      }

      if (validatedData[this.config.lastNameField]) {
        normalizedData[this.config.lastNameField] = this.capitalizeFirstLetter(validatedData[this.config.lastNameField].trim());
      }

      // Actualizar usuario
      const updatedUser = await this.repository.updateUser(id, normalizedData);

      if (!updatedUser) {
        throw new ApplicationError(`Failed to update ${this.config.entityName.toLowerCase()}`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} ${id} updated successfully in table: ${this.repository.getTableName()}`);
      return userResponse;

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }

      this.logger.error(`Error updating ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info(`Deleting ${this.config.entityName.toLowerCase()} ${id}`);

    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      await this.repository.deleteUser(id);

      this.logger.info(`${this.config.entityName} ${id} deleted successfully from table: ${this.repository.getTableName()}`);

    } catch (error) {
      this.logger.error(`Error deleting ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async activateUserOrDeactivateUser(id: string): Promise<any> {
    this.logger.info(`Toggling activation status for ${this.config.entityName.toLowerCase()} ${id}`);
    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Alternar estado de activación
      const isActive = !user[this.config.isActiveField];
      const updatedUser = await this.repository.updateUser(id, {
        [this.config.isActiveField]: isActive,
        updatedAt: new Date()
      });

      if (!updatedUser) {
        throw new ApplicationError(`Failed to update ${this.config.entityName.toLowerCase()} activation status`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} ${id} activation status updated to ${isActive} in table: ${this.repository.getTableName()}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error toggling activation for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async verifyUser(id: string): Promise<any> {
    this.logger.info(`Verifying ${this.config.entityName.toLowerCase()} ${id}`);

    try {
      if (!this.config.hasVerification) {
        throw new ApplicationError(`${this.config.entityName} entity does not support verification`);
      }

      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      if (user[this.config.isVerifiedField]) {
        throw new ApplicationError(`${this.config.entityName} is already verified`);
      }

      const updatedUser = await this.repository.updateUser(id, {
        [this.config.isVerifiedField]: true,
        verificationCode: null, // Limpiar código de verificación
        updatedAt: new Date()
      });

      if (!updatedUser) {
        throw new ApplicationError(`Failed to verify ${this.config.entityName.toLowerCase()}`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} ${id} verified successfully in table: ${this.repository.getTableName()}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error verifying ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async updateUserRole(id: string, newRole: string): Promise<any> {
    this.logger.info(`Updating ${this.config.roleField} for ${this.config.entityName.toLowerCase()} ${id} to ${newRole}`);

    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      if (user[this.config.roleField] === newRole) {
        throw new ApplicationError(`${this.config.entityName} already has ${this.config.roleField}: ${newRole}`);
      }

      // Dejar que la DB valide el rol/specialization
      const updatedUser = await this.repository.updateUser(id, {
        [this.config.roleField]: newRole,
        updatedAt: new Date()
      });

      if (!updatedUser) {
        throw new ApplicationError(`Failed to update ${this.config.entityName.toLowerCase()} ${this.config.roleField}`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} ${id} ${this.config.roleField} updated to ${newRole} successfully in table: ${this.repository.getTableName()}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error updating ${this.config.roleField} for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async getUsersCount(): Promise<number> {
    this.logger.info(`Getting total ${this.config.entityName.toLowerCase()}s count`);

    try {
      const count = await this.repository.getUsersCount();

      this.logger.info(`Total ${this.config.entityName.toLowerCase()}s count: ${count} in table: ${this.repository.getTableName()}`);
      return count;

    } catch (error) {
      this.logger.error(`Error getting ${this.config.entityName.toLowerCase()}s count:`, error);
      throw error;
    }
  }

  async getActiveUsersCount(): Promise<number> {
    this.logger.info(`Getting active ${this.config.entityName.toLowerCase()}s count`);

    try {
      const count = await this.repository.getActiveUsersCount();

      this.logger.info(`Active ${this.config.entityName.toLowerCase()}s count: ${count} in table: ${this.repository.getTableName()}`);
      return count;

    } catch (error) {
      this.logger.error(`Error getting active ${this.config.entityName.toLowerCase()}s count:`, error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<any[]> {
    this.logger.info(`Getting ${this.config.entityName.toLowerCase()}s by ${this.config.roleField}: ${role}`);

    try {
      const users = await this.repository.getUsersByRole(role);

      // Remover contraseñas de la respuesta
      const usersWithoutPasswords = users.map(user => {
        const { [this.config.passwordField]: password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      this.logger.info(`Found ${users.length} ${this.config.entityName.toLowerCase()}s with ${this.config.roleField} ${role} in table: ${this.repository.getTableName()}`);
      return usersWithoutPasswords;

    } catch (error) {
      this.logger.error(`Error getting ${this.config.entityName.toLowerCase()}s by ${this.config.roleField} ${role}:`, error);
      throw error;
    }
  }

  async softDeleteUser(id: string): Promise<any> {
    this.logger.info(`Soft deleting ${this.config.entityName.toLowerCase()} ${id}`);

    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      const updatedUser = await this.repository.softDeleteUser(id);

      if (!updatedUser) {
        throw new ApplicationError(`Failed to soft delete ${this.config.entityName.toLowerCase()}`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} ${id} soft deleted successfully in table: ${this.repository.getTableName()}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error soft deleting ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  // ✅ Método helper para obtener información de la tabla actual
  getCurrentTableInfo(): { tableName: string; entityClass: string; entityName: string; config: any } {
    return {
      tableName: this.repository.getTableName(),
      entityClass: this.repository.getEntityClass().name,
      entityName: this.config.entityName,
      config: this.config
    };
  }

  // ✅ Método para verificar si el usuario existe por email (útil para auth)
  async userExistsByEmail(email: string): Promise<boolean> {
    try {
      return await this.repository.emailExists(email.toLowerCase());
    } catch (error) {
      this.logger.error(`Error checking if ${this.config.entityName.toLowerCase()} exists by email:`, error);
      throw error;
    }
  }

  // ✅ Método para verificar si el usuario existe por username/licenseNumber
  async userExistsByUsername(username: string): Promise<boolean> {
    try {
      if (!this.config.hasUsername) {
        throw new ApplicationError(`${this.config.entityName} entity does not support username validation`);
      }
      return await this.repository.usernameExists(username.toLowerCase());
    } catch (error) {
      this.logger.error(`Error checking if ${this.config.entityName.toLowerCase()} exists by ${this.config.usernameField}:`, error);
      throw error;
    }
  }

  // ✅ Método para obtener usuario completo (con password) - solo para auth
  async getUserForAuth(email: string): Promise<any | null> {
    this.logger.info(`Getting ${this.config.entityName.toLowerCase()} for authentication: ${email}`);
    try {
      return await this.repository.findByEmail(email.toLowerCase());
    } catch (error) {
      this.logger.error(`Error getting ${this.config.entityName.toLowerCase()} for auth:`, error);
      throw error;
    }
  }

  // ✅ Métodos para manejo de login attempts (si la entidad lo soporta)
  async incrementLoginAttempts(id: string): Promise<void> {
    try {
      if (!this.config.hasLoginAttempts) {
        this.logger.warn(`${this.config.entityName} entity does not support login attempts tracking`);
        return;
      }

      await this.repository.incrementLoginAttempts(id);
      this.logger.info(`Login attempts incremented for ${this.config.entityName.toLowerCase()} ${id}`);
    } catch (error) {
      this.logger.error(`Error incrementing login attempts for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  async resetLoginAttempts(id: string): Promise<void> {
    try {
      if (!this.config.hasLoginAttempts) {
        this.logger.warn(`${this.config.entityName} entity does not support login attempts tracking`);
        return;
      }

      await this.repository.resetLoginAttempts(id);
      this.logger.info(`Login attempts reset for ${this.config.entityName.toLowerCase()} ${id}`);
    } catch (error) {
      this.logger.error(`Error resetting login attempts for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  // ✅ Método privado para enviar email de bienvenida
  private async sendWelcomeEmail(user: any, verificationCode: string, language?: string): Promise<void> {
    this.logger.info(`Sending welcome email to ${user[this.config.emailField]}`);

    try {
      const userName = `${user[this.config.firstNameField] || ''} ${user[this.config.lastNameField] || ''}`.trim() || user[this.config.emailField];

      const sendEmail = await this.notificationService.send({
        type: 'email',
        to: user[this.config.emailField],
        language: language || 'en',
        priority: 'normal',
        url: 'emails/welcome',
        data: {
          appName: config.app.name,
          userName,
          firstName: user[this.config.firstNameField] || 'User',
          confirmationCode: verificationCode,
          confirmationUrl: `${config.app.frontendUrl}/verify/${verificationCode}`,
          year: new Date().getFullYear(),
          companyLogoUrl: `${config.app.baseUrl}/images/logo.png`,
          companyName: config.app.name,
          entityType: this.config.entityName.toLowerCase()
        }
      });

      if (!sendEmail) {
        this.logger.warn(`Failed to send welcome email to ${user[this.config.emailField]}`);
      } else {
        this.logger.info(`Welcome email sent successfully to ${user[this.config.emailField]}`);
      }
    } catch (emailError) {
      this.logger.warn(`Error sending welcome email to ${user[this.config.emailField]}:`, emailError);
      // No interrumpir el flujo por error de email
    }
  }

  /**
   * Capitaliza la primera letra de una cadena
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // ✅ Métodos dinámicos específicos según la entidad
  async getEntitySpecificData(id: string): Promise<any> {
    this.logger.info(`Getting entity-specific data for ${this.config.entityName.toLowerCase()} ${id}`);

    try {
      const user = await this.repository.getUserById(id);

      if (!user) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Retornar solo los campos específicos de la entidad
      const specificFields = this.config.primaryFields.reduce((acc: any, field: string) => {
        if (user[field] !== undefined) {
          acc[field] = user[field];
        }
        return acc;
      }, {});

      this.logger.info(`Entity-specific data retrieved for ${this.config.entityName.toLowerCase()} ${id}`);
      return specificFields;

    } catch (error) {
      this.logger.error(`Error getting entity-specific data for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  // ✅ Método para obtener estadísticas específicas de la entidad
  async getEntityStats(): Promise<any> {
    this.logger.info(`Getting statistics for ${this.config.entityName.toLowerCase()}s`);

    try {
      const totalCount = await this.repository.getUsersCount();
      const activeCount = await this.repository.getActiveUsersCount();

      const stats: {
        entityName: any;
        tableName: string;
        totalCount: number;
        activeCount: number;
        inactiveCount: number;
        activationRate: string;
        verifiedCount?: number;
        unverifiedCount?: number;
        verificationRate?: string;
      } = {
        entityName: this.config.entityName,
        tableName: this.repository.getTableName(),
        totalCount,
        activeCount,
        inactiveCount: totalCount - activeCount,
        activationRate: totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(2) : '0.00'
      };

      // Estadísticas adicionales por verificación si la entidad lo soporta
      if (this.config.hasVerification) {
        const verifiedCount = await this.repository.count({ where: { [this.config.isVerifiedField]: true } });
        stats.verifiedCount = verifiedCount;
        stats.unverifiedCount = totalCount - verifiedCount;
        stats.verificationRate = totalCount > 0 ? ((verifiedCount / totalCount) * 100).toFixed(2) : '0.00';
      }

      this.logger.info(`Statistics retrieved for ${this.config.entityName.toLowerCase()}s:`, stats);
      return stats;

    } catch (error) {
      this.logger.error(`Error getting statistics for ${this.config.entityName.toLowerCase()}s:`, error);
      throw error;
    }
  }

  // ✅ Método para buscar usuarios por diferentes criterios según la entidad
  async searchUsers(searchTerm: string, searchFields?: string[]): Promise<any[]> {
    this.logger.info(`Searching ${this.config.entityName.toLowerCase()}s with term: ${searchTerm}`);

    try {
      // Campos de búsqueda por defecto según la entidad
      const defaultSearchFields = this.getDefaultSearchFields();
      const fieldsToSearch = searchFields || defaultSearchFields;

      const queryBuilder = this.repository.createQueryBuilder('user')
        .select(this.config.primaryFields.map((field: string) => `user.${field}`));

      // Construir condiciones de búsqueda OR para todos los campos
      const searchConditions = fieldsToSearch.map((field, index) => {
        const paramName = `search${index}`;
        queryBuilder.setParameter(paramName, `%${searchTerm}%`);
        return `user.${field} ILIKE :${paramName}`;
      });

      if (searchConditions.length > 0) {
        queryBuilder.where(`(${searchConditions.join(' OR ')})`);
      }

      // Solo usuarios activos en la búsqueda
      queryBuilder.andWhere(`user.${this.config.isActiveField} = :isActive`, { isActive: true });

      const users = await queryBuilder.getMany();

      // Remover contraseñas de la respuesta
      const usersWithoutPasswords = users.map(user => {
        const { [this.config.passwordField]: password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      this.logger.info(`Found ${users.length} ${this.config.entityName.toLowerCase()}s matching search term: ${searchTerm}`);
      return usersWithoutPasswords;

    } catch (error) {
      this.logger.error(`Error searching ${this.config.entityName.toLowerCase()}s:`, error);
      throw error;
    }
  }

  // ✅ Método para obtener campos de búsqueda por defecto según la entidad
  private getDefaultSearchFields(): string[] {
    const baseFields = [this.config.emailField];
    
    if (this.config.firstNameField) baseFields.push(this.config.firstNameField);
    if (this.config.lastNameField) baseFields.push(this.config.lastNameField);
    if (this.config.hasUsername && this.config.usernameField) baseFields.push(this.config.usernameField);

    return baseFields;
  }

  // ✅ Método para validar datos específicos de la entidad antes de operaciones
  private validateEntitySpecificData(data: any): void {
    // Validaciones específicas según el tipo de entidad
    switch (AUTH_TABLE_NAME) {
      case 'veterinarians':
        if (data.licenseNumber && !/^[A-Z0-9]{6,12}$/.test(data.licenseNumber)) {
          throw new ApplicationError('Invalid license number format. Must be 6-12 alphanumeric characters.');
        }
        break;
      
      case 'users':
        if (data.username && !/^[a-zA-Z0-9_]{3,20}$/.test(data.username)) {
          throw new ApplicationError('Invalid username format. Must be 3-20 alphanumeric characters or underscores.');
        }
        break;
    }
  }

  // ✅ Método para obtener configuración de campos disponibles
  getAvailableFields(): {
    primaryFields: string[];
    authFields: string[];
    searchableFields: string[];
    entityFeatures: {
      hasUsername: boolean;
      hasVerification: boolean;
      hasLoginAttempts: boolean;
    };
  } {
    return {
      primaryFields: this.config.primaryFields,
      authFields: this.config.authFields,
      searchableFields: this.getDefaultSearchFields(),
      entityFeatures: {
        hasUsername: this.config.hasUsername,
        hasVerification: this.config.hasVerification,
        hasLoginAttempts: this.config.hasLoginAttempts
      }
    };
  }

  // ✅ Método para cambiar contraseña con validaciones adicionales
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<any> {
    this.logger.info(`Changing password for ${this.config.entityName.toLowerCase()} ${id}`);

    try {
      // Obtener usuario con contraseña para verificar la actual
      const userWithPassword = await this.repository.findOne({ where: { id } });

      if (!userWithPassword) {
        throw new ApplicationError(`${this.config.entityName} not found`);
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await BcryptUtil.comparePassword(currentPassword, userWithPassword[this.config.passwordField]);
      
      if (!isCurrentPasswordValid) {
        throw new ApplicationError('Current password is incorrect');
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await BcryptUtil.hashPassword(newPassword);

      // Actualizar contraseña
      const updatedUser = await this.repository.updateUser(id, {
        [this.config.passwordField]: hashedNewPassword,
        updatedAt: new Date()
      });

      if (!updatedUser) {
        throw new ApplicationError(`Failed to update ${this.config.entityName.toLowerCase()} password`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`Password changed successfully for ${this.config.entityName.toLowerCase()} ${id}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error changing password for ${this.config.entityName.toLowerCase()} ${id}:`, error);
      throw error;
    }
  }

  // ✅ Método para verificar usuario por código de verificación
  async verifyUserByCode(verificationCode: string): Promise<any> {
    this.logger.info(`Verifying ${this.config.entityName.toLowerCase()} by code: ${verificationCode}`);

    try {
      if (!this.config.hasVerification) {
        throw new ApplicationError(`${this.config.entityName} entity does not support verification`);
      }

      const user = await this.repository.findOne({
        where: { verificationCode },
        select: this.config.authFields
      });

      if (!user) {
        throw new ApplicationError('Invalid verification code');
      }

      if (user[this.config.isVerifiedField]) {
        throw new ApplicationError(`${this.config.entityName} is already verified`);
      }

      // Verificar usuario y limpiar código
      const updatedUser = await this.repository.updateUser(user.id, {
        [this.config.isVerifiedField]: true,
        verificationCode: null,
        updatedAt: new Date()
      });

      if (!updatedUser) {
        throw new ApplicationError(`Failed to verify ${this.config.entityName.toLowerCase()}`);
      }

      // Remover la contraseña de la respuesta
      const { [this.config.passwordField]: password, ...userResponse } = updatedUser;

      this.logger.info(`${this.config.entityName} verified successfully by code: ${verificationCode}`);
      return userResponse;

    } catch (error) {
      this.logger.error(`Error verifying ${this.config.entityName.toLowerCase()} by code:`, error);
      throw error;
    }
  }
}