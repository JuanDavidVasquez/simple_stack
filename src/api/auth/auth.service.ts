import z from 'zod';
import { DatabaseManager } from '../../core/config/database-manager';
import { config } from '../../core/config/env';
import { ApplicationError } from '../../shared/errors/application.error';
import { ChangePasswordData, changePasswordSchema, getPasswordSchemaByRole, LoginData, loginSchema } from '../../shared/schemas/password.schema';
import BcryptUtil from '../../shared/utils/bcrypt.util';
import setupLogger from '../../shared/utils/logger';
import { EmailService, SupportedLanguage } from '../../templates/email.service';
import { Repository } from 'typeorm';
import { AUTH_TABLE_NAME } from '../../core/config/user-table.config';

export class AuthService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/auth`,
  });

  private authRepository: Repository<any>;

  constructor(
    private readonly databaseManager: DatabaseManager,
    private readonly emailService: EmailService
  ) {
    // Inicializar el repositorio dinámico con la tabla configurada
    const connection = this.databaseManager.getConnection();
    this.authRepository = connection.getRepository(AUTH_TABLE_NAME);
    
    this.logger.info(`AuthService initialized for table: ${AUTH_TABLE_NAME}`);
  }

  /**
   * Autentica un usuario con email y contraseña
   */
  public async authenticateUser(loginData: LoginData): Promise<any> {
    this.logger.info(`Authenticating user with email: ${loginData.email} from table: ${AUTH_TABLE_NAME}`);
    
    try {
      // Validar datos de login con Zod
      const validatedData = loginSchema.parse(loginData);
      
      // Buscar usuario por email en la tabla dinámica
      const user = await this.authRepository
        .createQueryBuilder('user')
        .select([
          'user.id', 'user.email', 'user.password', 'user.firstName', 'user.lastName', 
          'user.role', 'user.isActive', 'user.isVerified', 'user.loginAttempts', 
          'user.lockedUntil', 'user.username'
        ])
        .where('user.email = :email', { email: validatedData.email.toLowerCase() })
        .getOne();

      if (!user) {
        throw new ApplicationError('Invalid credentials');
      }

      // Verificar si la cuenta está activa
      if (!user.isActive) {
        throw new ApplicationError('Account is deactivated');
      }

      // Verificar si la cuenta está bloqueada
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const lockTimeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new ApplicationError(`Account is temporarily locked. Try again in ${lockTimeRemaining} minutes`);
      }

      // Verificar la contraseña
      const isPasswordValid = await BcryptUtil.comparePassword(validatedData.password, user.password);
      
      if (!isPasswordValid) {
        // Incrementar intentos de login
        await this.handleFailedLogin(user);
        throw new ApplicationError('Invalid credentials');
      }

      // Login exitoso - resetear intentos y actualizar último login
      await this.handleSuccessfulLogin(user);

      // Remover la contraseña de la respuesta
      const { password: _, ...userResponse } = user;
      
      this.logger.info(`User ${user.id} from table ${AUTH_TABLE_NAME} authenticated successfully`);
      return userResponse as any;
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }
      
      this.logger.error(`Error authenticating user from table ${AUTH_TABLE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Cambia la contraseña de un usuario
   */
  public async changePassword(userId: string, changeData: ChangePasswordData): Promise<void> {
    this.logger.info(`Changing password for user ${userId} in table ${AUTH_TABLE_NAME}`);
    
    try {
      // Validar datos con Zod
      const validatedData = changePasswordSchema.parse(changeData);
      
      // Obtener usuario con contraseña
      const user = await this.authRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.password', 'user.role'])
        .where('user.id = :id', { id: userId })
        .getOne();

      if (!user) {
        throw new ApplicationError('User not found');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await BcryptUtil.comparePassword(
        validatedData.currentPassword, 
        user.password
      );
      
      if (!isCurrentPasswordValid) {
        throw new ApplicationError('Current password is incorrect');
      }

      // Validar nueva contraseña según el rol del usuario
      const rolePasswordSchema = getPasswordSchemaByRole(user.role);
      rolePasswordSchema.parse(validatedData.newPassword);

      // Verificar que la nueva contraseña sea diferente
      const isSamePassword = await BcryptUtil.comparePassword(
        validatedData.newPassword, 
        user.password
      );
      
      if (isSamePassword) {
        throw new ApplicationError('New password must be different from current password');
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await BcryptUtil.hashPassword(validatedData.newPassword);

      // Actualizar contraseña en la tabla dinámica
      await this.authRepository.update(userId, { 
        password: hashedNewPassword,
        updatedAt: new Date()
      });
      
      this.logger.info(`Password changed successfully for user ${userId} in table ${AUTH_TABLE_NAME}`);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new ApplicationError(`Validation failed: ${errorMessages.join(', ')}`);
      }
      
      this.logger.error(`Error changing password for user ${userId} in table ${AUTH_TABLE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Genera y establece una nueva contraseña temporal para un usuario
   */
  public async resetPassword(email: string, acceptLanguage: string): Promise<{ success: boolean; temporaryPassword?: string }> {
    this.logger.info(`Resetting password for user with email: ${email} from table ${AUTH_TABLE_NAME}`);
    
    try {
      const user = await this.authRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email: email.toLowerCase() })
        .getOne();
      
      if (!user) {
        // Por seguridad, no revelar si el email existe o no
        this.logger.warn(`Password reset attempted for non-existent email: ${email} in table ${AUTH_TABLE_NAME}`);
        return { 
          success: true // Siempre devolver éxito por seguridad
        };
      }

      // Generar nueva contraseña temporal
      const temporaryPassword = BcryptUtil.generateTemporaryPassword(12);
      const hashedPassword = await BcryptUtil.hashPassword(temporaryPassword);

      // Generar token de reset (opcional para verificación adicional)
      const resetToken = this.generateResetToken();
      const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      // Actualizar usuario con nueva contraseña y token de reset
      await this.authRepository.update(user.id, { 
        password: hashedPassword,
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpiry,
        loginAttempts: 0, // Resetear intentos de login
        lockedUntil: null, // Desbloquear cuenta si estaba bloqueada
        updatedAt: new Date()
      });

      this.logger.info(`Password reset successfully for user ${user.id} in table ${AUTH_TABLE_NAME}`);
      
      // Enviar email con la nueva contraseña al usuario
      await this.emailService.sendEmail({
        to: user.email,
        template: 'password-reset',
        language: (['en', 'es'].includes(acceptLanguage) ? acceptLanguage : 'en') as SupportedLanguage,
        data: {
          firstName: user.firstName,
          temporaryPassword: temporaryPassword,
          resetToken: resetToken,
          resetExpiry: resetExpiry.toISOString()
        }
      });

      return {
        success: true,
        ...(config.app.env === 'development' && { temporaryPassword })
      };
      
    } catch (error) {
      this.logger.error(`Error resetting password for email ${email} in table ${AUTH_TABLE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario puede intentar hacer login
   */
  public async canAttemptLogin(email: string): Promise<{ canAttempt: boolean; lockTimeRemaining?: number }> {
    try {
      const user = await this.authRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.lockedUntil', 'user.loginAttempts', 'user.isActive'])
        .where('user.email = :email', { email: email.toLowerCase() })
        .getOne();

      if (!user || !user.isActive) {
        return { canAttempt: false };
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const lockTimeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return { 
          canAttempt: false, 
          lockTimeRemaining 
        };
      }

      return { canAttempt: true };
      
    } catch (error) {
      this.logger.error(`Error checking login attempt for email ${email} in table ${AUTH_TABLE_NAME}:`, error);
      return { canAttempt: false };
    }
  }

  /**
   * Desbloquea manualmente una cuenta (para administradores)
   */
  public async unlockAccount(userId: string): Promise<void> {
    this.logger.info(`Manually unlocking account for user ${userId} in table ${AUTH_TABLE_NAME}`);
    
    try {
      await this.authRepository.update(userId, {
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      });
      
      this.logger.info(`Account unlocked successfully for user ${userId} in table ${AUTH_TABLE_NAME}`);
      
    } catch (error) {
      this.logger.error(`Error unlocking account for user ${userId} in table ${AUTH_TABLE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de seguridad de un usuario
   */
  public async getUserSecurityStats(userId: string): Promise<{
    loginAttempts: number;
    isLocked: boolean;
    lockTimeRemaining?: number;
    lastLoginAt?: Date;
    hasResetToken: boolean;
  }> {
    try {
      const user = await this.authRepository
        .createQueryBuilder('user')
        .select(['user.loginAttempts', 'user.lockedUntil', 'user.lastLoginAt', 'user.resetPasswordToken'])
        .where('user.id = :id', { id: userId })
        .getOne();

      if (!user) {
        throw new ApplicationError('User not found');
      }

      const isLocked = user.lockedUntil ? user.lockedUntil > new Date() : false;
      const lockTimeRemaining = isLocked 
        ? Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60000)
        : undefined;

      return {
        loginAttempts: user.loginAttempts || 0,
        isLocked,
        lockTimeRemaining,
        lastLoginAt: user.lastLoginAt || undefined,
        hasResetToken: !!user.resetPasswordToken
      };
      
    } catch (error) {
      this.logger.error(`Error getting security stats for user ${userId} in table ${AUTH_TABLE_NAME}:`, error);
      throw error;
    }
  }

  /**
   * Maneja intentos de login fallidos
   */
  private async handleFailedLogin(user: any): Promise<void> {
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutos

    const newAttempts = (user.loginAttempts || 0) + 1;
    
    if (newAttempts >= maxAttempts) {
      // Bloquear cuenta temporalmente
      const lockedUntil = new Date(Date.now() + lockoutDuration);
      await this.authRepository.update(user.id, {
        loginAttempts: newAttempts,
        lockedUntil
      });
      
      this.logger.warn(`User ${user.id} account locked due to ${newAttempts} failed login attempts in table ${AUTH_TABLE_NAME}`);
    } else {
      await this.authRepository.update(user.id, {
        loginAttempts: newAttempts
      });
      
      this.logger.info(`Failed login attempt ${newAttempts}/${maxAttempts} for user ${user.id} in table ${AUTH_TABLE_NAME}`);
    }
  }

  /**
   * Maneja login exitoso
   */
  private async handleSuccessfulLogin(user: any): Promise<void> {
    await this.authRepository.update(user.id, {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    });

    this.logger.info(`Successful login for user ${user.id} in table ${AUTH_TABLE_NAME}, attempts reset`);
  }

  /**
   * Genera un token de reset seguro
   */
  private generateResetToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}