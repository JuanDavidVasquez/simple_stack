import { Request, Response } from 'express';
import { ApplicationError } from '../../shared/errors/application.error';
import { z } from 'zod';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import { AuthService } from './auth.service';

export class AuthController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers/auth`,
  });

  constructor(private readonly authService: AuthService) {
    this.logger.info('AuthController initialized');
  }

  /**
   * Login de usuario
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received login request', { 
      email: req.body.email,
      ip: req.ip 
    });

    try {
      const { email, password } = req.body;

      // Verificar si puede intentar login
      const loginCheck = await this.authService.canAttemptLogin(email);
      if (!loginCheck.canAttempt) {
        const message = loginCheck.lockTimeRemaining 
          ? `Account is locked. Try again in ${loginCheck.lockTimeRemaining} minutes`
          : 'Cannot attempt login at this time';
        
        res.status(423).json({ 
          status: 'error',
          message,
          lockTimeRemaining: loginCheck.lockTimeRemaining
        });
        return;
      }

      // Autenticar usuario
      const user = await this.authService.authenticateUser({ email, password });

      // Aquí normalmente generarías un JWT token
      // const token = generateJWT(user);

      this.logger.info(`User ${user.id} logged in successfully`);
      
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user,
          // token // Agregar cuando implementes JWT
        }
      });

    } catch (error) {
      this.logger.error('Login error:', error);
      
      if (error instanceof ApplicationError) {
        res.status(401).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error during login'
        });
      }
    }
  };

  /**
   * Cambio de contraseña
   */
  public changePassword = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received change password request', { 
      userId: req.params.userId 
    });

    try {
      const { userId } = req.params;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      await this.authService.changePassword(userId, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      this.logger.info(`Password changed successfully for user ${userId}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully'
      });

    } catch (error) {
      this.logger.error('Change password error:', error);
      
      if (error instanceof ApplicationError) {
        res.status(400).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error during password change'
        });
      }
    }
  };

  /**
   * Reset de contraseña
   */
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received password reset request', { 
      email: req.body.email 
    });

    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
        return;
      }

      const result = await this.authService.resetPassword(email);

      // En desarrollo, devolver la contraseña temporal
      // En producción, solo confirmar que se envió el email
      res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset has been sent',
        ...(config.app.env === 'development' && result.temporaryPassword && {
          temporaryPassword: result.temporaryPassword
        })
      });

    } catch (error) {
      this.logger.error('Password reset error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during password reset'
      });
    }
  };

  /**
   * Verificar estado de login (si puede intentar login)
   */
  public checkLoginStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
        return;
      }

      const loginCheck = await this.authService.canAttemptLogin(email);

      res.status(200).json({
        status: 'success',
        data: loginCheck
      });

    } catch (error) {
      this.logger.error('Check login status error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Desbloquear cuenta (solo para administradores)
   */
  public unlockAccount = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received unlock account request', { 
      userId: req.params.userId 
    });

    try {
      const { userId } = req.params;

      // Aquí deberías verificar que el usuario actual es admin
      // if (!req.user || req.user.role !== 'admin') {
      //   return res.status(403).json({ message: 'Admin access required' });
      // }

      await this.authService.unlockAccount(userId);

      this.logger.info(`Account unlocked successfully for user ${userId}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Account unlocked successfully'
      });

    } catch (error) {
      this.logger.error('Unlock account error:', error);
      
      if (error instanceof ApplicationError) {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error during account unlock'
        });
      }
    }
  };

  /**
   * Obtener estadísticas de seguridad de usuario
   */
  public getUserSecurityStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const stats = await this.authService.getUserSecurityStats(userId);

      res.status(200).json({
        status: 'success',
        data: stats
      });

    } catch (error) {
      this.logger.error('Get security stats error:', error);
      
      if (error instanceof ApplicationError) {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error'
        });
      }
    }
  };

  /**
   * Logout (cuando implementes JWT)
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received logout request');

    try {
      // Aquí invalidarías el JWT token
      // await invalidateToken(req.token);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });

    } catch (error) {
      this.logger.error('Logout error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during logout'
      });
    }
  };
}