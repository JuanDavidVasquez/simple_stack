// src/api/auth/auth.controller.ts
import { Request, Response } from 'express';
import { ApplicationError } from '../../shared/errors/application.error';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import { AUTH_TABLE_NAME } from '../../core/config/user-table.config';
import { ResponseUtil } from '../../shared/utils/response.util';
import { Service } from 'typedi';

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

@Service()
export class AuthController {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/controllers/auth`,
  });

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {
    this.logger.info(`AuthController initialized for table: ${AUTH_TABLE_NAME}`);
  }

  /**
   * Login de usuario con gestión de sesiones
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received login request', {
      email: req.body.email,
      table: AUTH_TABLE_NAME,
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

        ResponseUtil.error(
          req,
          res,
          message,
          423
        );
        return;
      }

      // Autenticar usuario
      const user = await this.authService.authenticateUser({ email, password });

      // Crear sesión con información de la tabla de origen
      const sessionData = await this.sessionService.createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceName: deviceName || 'Unknown Device',
        sourceTable: AUTH_TABLE_NAME // ✅ Agregar tabla de origen
      });

      this.logger.info(`User ${user.id} from table ${AUTH_TABLE_NAME} logged in successfully with session ${sessionData.sessionId}`);

    /*   res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            ...user,
            sourceTable: AUTH_TABLE_NAME // ✅ Incluir en respuesta
          },
          sessionId: sessionData.sessionId,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          accessExpiresAt: sessionData.accessExpiresAt,
          refreshExpiresAt: sessionData.refreshExpiresAt,
        }
      }); */

      ResponseUtil.success(
        req,
        res,
        'success.auth.login',
        {
          user: {
            ...user,
            sourceTable: AUTH_TABLE_NAME
          },
          sessionId: sessionData.sessionId,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          accessExpiresAt: sessionData.accessExpiresAt,
          refreshExpiresAt: sessionData.refreshExpiresAt,
        }
      );

    } catch (error) {
      this.logger.error(`Login error for table ${AUTH_TABLE_NAME}:`, error);

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
    this.logger.info(`Received refresh token request for table: ${AUTH_TABLE_NAME}`);

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

      this.logger.info(`Token refreshed successfully for table: ${AUTH_TABLE_NAME}`);

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
      this.logger.error(`Refresh token error for table ${AUTH_TABLE_NAME}:`, error);

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
    this.logger.info(`Received logout request for table: ${AUTH_TABLE_NAME}`);

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

      this.logger.info(`Session ${sessionId} from table ${AUTH_TABLE_NAME} logged out successfully`);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });

    } catch (error) {
      this.logger.error(`Logout error for table ${AUTH_TABLE_NAME}:`, error);

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
    this.logger.info(`Received logout all devices request for table: ${AUTH_TABLE_NAME}`);

    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated'
        });
        return;
      }

      // ✅ Revocar sesiones solo de esta tabla específica
      const revokedCount = await this.sessionService.revokeAllUserSessionsFromTable(
        userId,
        AUTH_TABLE_NAME,
        'user_logout_all'
      );

      this.logger.info(`All sessions for user ${userId} from table ${AUTH_TABLE_NAME} logged out successfully`);

      res.status(200).json({
        status: 'success',
        message: `Logged out from ${revokedCount} devices successfully`
      });

    } catch (error) {
      this.logger.error(`Logout all error for table ${AUTH_TABLE_NAME}:`, error);

      res.status(500).json({
        status: 'error',
        message: 'Internal server error during logout all'
      });
    }
  };

  /**
   * Obtener sesiones activas del usuario de esta tabla específica
   */
  public getUserSessions = async (req: Request, res: Response): Promise<void> => {
    this.logger.info(`Received get user sessions request for table: ${AUTH_TABLE_NAME}`);

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

      // ✅ Obtener sesiones solo de esta tabla específica
      const sessions = await this.sessionService.getUserSessionsFromTable(
        userId,
        AUTH_TABLE_NAME,
        currentSessionId
      );

      res.status(200).json({
        status: 'success',
        data: {
          sessions,
          totalActiveSessions: sessions.length,
          sourceTable: AUTH_TABLE_NAME
        }
      });

    } catch (error) {
      this.logger.error(`Get user sessions error for table ${AUTH_TABLE_NAME}:`, error);

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
      userId: req.params.userId,
      table: AUTH_TABLE_NAME
    });

    try {
      const { userId } = req.params;
      const { currentPassword, newPassword, confirmPassword, logoutOtherDevices } = req.body;

      await this.authService.changePassword(userId, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      // Si se solicita, cerrar sesiones en otros dispositivos de esta tabla
      if (logoutOtherDevices) {
        const currentSessionId = req.user?.sessionId;
        await this.sessionService.revokeAllUserSessionsFromTable(
          userId,
          AUTH_TABLE_NAME,
          'password_changed'
        );

        if (currentSessionId) {
          this.logger.info(`Maintained current session ${currentSessionId} after password change`);
        }
      }

      this.logger.info(`Password changed successfully for user ${userId} in table ${AUTH_TABLE_NAME}`);

      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
        ...(logoutOtherDevices && {
          sessionsRevoked: true
        })
      });

    } catch (error) {
      this.logger.error(`Change password error for table ${AUTH_TABLE_NAME}:`, error);

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
      email: req.body.email,
      table: AUTH_TABLE_NAME
    });

    const acceptLanguage = req.headers['accept-language'] || 'en';

    try {
      const { email } = req.body;

      if (!email) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.email_required',
          400
        );

        return;
      }

      const result = await this.authService.resetPassword(email, acceptLanguage);

      res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset has been sent',
        ...(config.app.env === 'local' && result.temporaryPassword && {
          temporaryPassword: result.temporaryPassword
        })
      });

      ResponseUtil.success(
        req,
        res,
        'success.auth.password_reset',
        undefined,
        200,

      )

    } catch (error) {
      this.logger.error(`Password reset error for table ${AUTH_TABLE_NAME}:`, error);

      ResponseUtil.error(
        req,
        res,
        'errors.auth.password_reset',
        500
      );
    }
  };

  /**
   * Verificar estado de login
   */
  public checkLoginStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.email_required',
          400
        );
        return;
      }

      const loginCheck = await this.authService.canAttemptLogin(email);

      ResponseUtil.success(
        req,
        res,
        'success.auth.check_login_status',
        {
          email: email,
          sourceTable: AUTH_TABLE_NAME
        },
        200,
      );

    } catch (error) {
      this.logger.error(`Check login status error for table ${AUTH_TABLE_NAME}:`, error);

      ResponseUtil.error(
        req,
        res,
        'errors.auth.check_login_status',
        500
      );
    }
  };

  /**
   * Desbloquear cuenta (solo para administradores)
   */
  public unlockAccount = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Received unlock account request', {
      userId: req.params.userId,
      table: AUTH_TABLE_NAME
    });

    try {
      const { userId } = req.params;

      if (!req.user || req.user.role !== 'admin') {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.unauthorized_access',
          403
        );
        return;
      }

      await this.authService.unlockAccount(userId);

      this.logger.info(`Account unlocked successfully for user ${userId} in table ${AUTH_TABLE_NAME}`);

      ResponseUtil.success(
        req,
        res,
        'success.auth.account_unlocked',
        {
          userId,
          sourceTable: AUTH_TABLE_NAME
        },
        200
      );

    } catch (error) {
      this.logger.error(`Unlock account error for table ${AUTH_TABLE_NAME}:`, error);

      if (error instanceof ApplicationError) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.account_not_found',
          404
        );
      } else {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.internal_server_error',
          500
        );
      }
    }
  };

  /**
   * Obtener estadísticas de seguridad de usuario
   */
  public getUserSecurityStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!req.user || (req.user.userId !== userId && req.user.role !== 'admin')) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.unauthorized_access',
          403
        );
        return;
      }

      const [authStats, sessions] = await Promise.all([
        this.authService.getUserSecurityStats(userId),
        this.sessionService.getUserSessionsFromTable(userId, AUTH_TABLE_NAME)
      ]);

      ResponseUtil.success(
        req,
        res,
        'success.auth.get_user_security_stats',
        {
          userId,
          authStats,
          activeSessions: sessions.length,
          sourceTable: AUTH_TABLE_NAME
        },
        200
      );

    } catch (error) {
      this.logger.error(`Get security stats error for table ${AUTH_TABLE_NAME}:`, error);

      if (error instanceof ApplicationError) {
        res.status(404).json({
          status: 'error',
          message: error.message
        });
      } else {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.get_user_security_stats',
          500
        );
      }
    }
  };

  /**
   * Revocar una sesión específica
   */
  public revokeSession = async (req: Request, res: Response): Promise<void> => {
    this.logger.info(`Received revoke session request for table: ${AUTH_TABLE_NAME}`);

    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.user_not_authenticated',
          401
        );
        return;
      }

      if (!sessionId) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.session_id_required',
          400
        );
        return;
      }

      // Verificar que la sesión pertenece al usuario actual y a esta tabla
      const userSessions = await this.sessionService.getUserSessionsFromTable(userId, AUTH_TABLE_NAME);
      const sessionExists = userSessions.some(session => session.sessionId === sessionId);

      if (!sessionExists) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.session_not_found',
          404
        );
        return;
      }

      await this.sessionService.revokeSession(sessionId, 'user_revoked');

      this.logger.info(`Session ${sessionId} revoked by user ${userId} from table ${AUTH_TABLE_NAME}`);

      ResponseUtil.success(
        req,
        res,
        'success.auth.session_revoked',
        {
          sessionId,
          userId,
          sourceTable: AUTH_TABLE_NAME
        },
        200
      );

    } catch (error) {
      this.logger.error(`Revoke session error for table ${AUTH_TABLE_NAME}:`, error);

      ResponseUtil.error(
        req,
        res,
        'errors.auth.revoke_session',
        500
      );
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
          sessionId,
          sourceTable: AUTH_TABLE_NAME
        }
      });

    } catch (error) {
      this.logger.error(`Validate session error for table ${AUTH_TABLE_NAME}:`, error);

      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };

  /**
   * Limpiar sesiones expiradas (endpoint administrativo)
   */
  public cleanupSessions = async (req: Request, res: Response): Promise<void> => {
    this.logger.info(`Received cleanup sessions request for table: ${AUTH_TABLE_NAME}`);

    try {
      // Verificar que el usuario es admin
      if (!req.user || req.user.role !== 'admin') {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.unauthorized_access',
          403
        );
        return;
      }

      // ✅ Limpiar sesiones solo de esta tabla específica
      const cleanedCount = await this.sessionService.cleanupExpiredSessionsFromTable(AUTH_TABLE_NAME);

      this.logger.info(`Cleaned up ${cleanedCount} expired sessions from table ${AUTH_TABLE_NAME}`);

      ResponseUtil.success(
        req,
        res,
        `Cleaned up ${cleanedCount} expired sessions`,
        {
          cleanedSessions: cleanedCount,
          sourceTable: AUTH_TABLE_NAME
        },
        200
      );

    } catch (error) {
      this.logger.error(`Cleanup sessions error for table ${AUTH_TABLE_NAME}:`, error);

      ResponseUtil.error(
        req,
        res,
        'errors.auth.internal_server_error',
        500
      );
    }
  };
}