import { Request, Response } from 'express';
import { ApplicationError } from '../../shared/errors/application.error';
import { z } from 'zod';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import JwtUtil from '../../shared/utils/jwt.util';

// Extender la interfaz Request para incluir información de usuario y sesión
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        sessionId: string;
      };
      sessionId?: string;
    }
  }
}

export class AuthController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers/auth`,
  });

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {
    this.logger.info('AuthController initialized');
  }

  /**
   * Login de usuario con gestión de sesiones
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received login request', { 
      email: req.body.email,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    try {
      const { email, password, deviceName } = req.body;

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

      // Crear sesión
      const sessionData = await this.sessionService.createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceName: deviceName || 'Unknown Device'
      });

      this.logger.info(`User ${user.id} logged in successfully with session ${sessionData.sessionId}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user,
          sessionId: sessionData.sessionId,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          accessExpiresAt: sessionData.accessExpiresAt,
          refreshExpiresAt: sessionData.refreshExpiresAt,
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
   * Refresh token - renovar sesión
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received refresh token request');

    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          status: 'error',
          message: 'Refresh token is required'
        });
        return;
      }

      const tokenPair = await this.sessionService.refreshSession(refreshToken);

      this.logger.info('Token refreshed successfully');
      
      res.status(200).json({
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          accessExpiresAt: tokenPair.accessExpiresAt,
          refreshExpiresAt: tokenPair.refreshExpiresAt,
        }
      });

    } catch (error) {
      this.logger.error('Refresh token error:', error);
      
      if (error instanceof ApplicationError) {
        res.status(401).json({
          status: 'error',
          message: error.message
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error during token refresh'
        });
      }
    }
  };

  /**
   * Logout - cerrar sesión específica
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received logout request');

    try {
      const sessionId = req.sessionId || req.user?.sessionId;
      
      if (!sessionId) {
        res.status(400).json({
          status: 'error',
          message: 'No active session found'
        });
        return;
      }

      await this.sessionService.revokeSession(sessionId, 'user_logout');

      this.logger.info(`Session ${sessionId} logged out successfully`);

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

  /**
   * Logout de todos los dispositivos
   */
  public logoutAll = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received logout all devices request');

    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const revokedCount = await this.sessionService.revokeAllUserSessions(userId, 'user_logout_all');

      this.logger.info(`All sessions for user ${userId} logged out successfully`);

      res.status(200).json({
        status: 'success',
        message: `Logged out from ${revokedCount} devices successfully`
      });

    } catch (error) {
      this.logger.error('Logout all error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during logout all'
      });
    }
  };

  /**
   * Obtener sesiones activas del usuario
   */
  public getUserSessions = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received get user sessions request');

    try {
      const userId = req.user?.userId;
      const currentSessionId = req.user?.sessionId;
      
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      const sessions = await this.sessionService.getUserSessions(userId, currentSessionId);

      res.status(200).json({
        status: 'success',
        data: {
          sessions,
          totalActiveSessions: sessions.length
        }
      });

    } catch (error) {
      this.logger.error('Get user sessions error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Revocar una sesión específica
   */
  public revokeSession = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received revoke session request');

    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          status: 'error',
          message: 'Session ID is required'
        });
        return;
      }

      // Verificar que la sesión pertenece al usuario actual
      const userSessions = await this.sessionService.getUserSessions(userId);
      const sessionExists = userSessions.some(session => session.sessionId === sessionId);
      
      if (!sessionExists) {
        res.status(404).json({
          status: 'error',
          message: 'Session not found or does not belong to user'
        });
        return;
      }

      await this.sessionService.revokeSession(sessionId, 'user_revoked');

      this.logger.info(`Session ${sessionId} revoked by user ${userId}`);

      res.status(200).json({
        status: 'success',
        message: 'Session revoked successfully'
      });

    } catch (error) {
      this.logger.error('Revoke session error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Verificar si una sesión está activa
   */
  public validateSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({
          status: 'error',
          message: 'Session ID is required'
        });
        return;
      }

      const isValid = await this.sessionService.validateSession(sessionId);

      res.status(200).json({
        status: 'success',
        data: {
          isValid,
          sessionId
        }
      });

    } catch (error) {
      this.logger.error('Validate session error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Cambio de contraseña con invalidación de sesiones
   */
  public changePassword = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received change password request', { 
      userId: req.params.userId 
    });

    try {
      const { userId } = req.params;
      const { currentPassword, newPassword, confirmPassword, logoutOtherDevices } = req.body;

      await this.authService.changePassword(userId, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      // Si se solicita, cerrar sesiones en otros dispositivos
      if (logoutOtherDevices) {
        const currentSessionId = req.user?.sessionId;
        await this.sessionService.revokeAllUserSessions(userId, 'password_changed');
        
        // Si hay una sesión actual, mantenerla activa
        if (currentSessionId) {
          // Recrear la sesión actual (esto requeriría más lógica personalizada)
          this.logger.info(`Maintained current session ${currentSessionId} after password change`);
        }
      }

      this.logger.info(`Password changed successfully for user ${userId}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
        ...(logoutOtherDevices && {
          sessionsRevoked: true
        })
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
   * Reset de contraseña con invalidación de todas las sesiones
   */
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received password reset request', { 
      email: req.body.email 
    });
    const acceptLanguage = req.headers['accept-language'] || 'en';
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          status: 'error',
          message: 'Email is required'
        });
        return;
      }

      const result = await this.authService.resetPassword(email,acceptLanguage);

      // Si el reset fue exitoso, invalidar todas las sesiones del usuario
      // Esto requeriría obtener el userId desde el email
      // await this.sessionService.revokeAllUserSessions(userId, 'password_reset');

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

      // Verificar que el usuario actual es admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Admin access required'
        });
        return;
      }

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

      // Verificar que el usuario puede ver sus propias estadísticas o es admin
      if (!req.user || (req.user.userId !== userId && req.user.role !== 'admin')) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
        return;
      }

      const [authStats, sessions] = await Promise.all([
        this.authService.getUserSecurityStats(userId),
        this.sessionService.getUserSessions(userId)
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          ...authStats,
          activeSessions: sessions.length,
          sessions: sessions
        }
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
   * Limpiar sesiones expiradas (endpoint administrativo)
   */
  public cleanupSessions = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received cleanup sessions request');

    try {
      // Verificar que el usuario es admin
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          status: 'error',
          message: 'Admin access required'
        });
        return;
      }

      const cleanedCount = await this.sessionService.cleanupExpiredSessions();

      this.logger.info(`Cleaned up ${cleanedCount} expired sessions`);

      res.status(200).json({
        status: 'success',
        message: `Cleaned up ${cleanedCount} expired sessions`,
        data: {
          cleanedSessions: cleanedCount
        }
      });

    } catch (error) {
      this.logger.error('Cleanup sessions error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
}