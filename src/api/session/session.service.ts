import { Repository } from 'typeorm';
import { UserSession } from '../../core/database/entities/user-session.entity';
import { DatabaseManager } from '../../core/config/database-manager';
import { ApplicationError } from '../../shared/errors/application.error';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import JwtUtil, { TokenPair } from '../../shared/utils/jwt.util';
import { parseUserAgent } from '../../shared/utils/user-agent.util';

export interface SessionConfig {
  maxConcurrentSessions?: number; // Máximo de sesiones concurrentes por usuario
  sessionTimeout?: number; // Tiempo en minutos de inactividad antes de cerrar sesión
  allowMultipleDevices?: boolean; // Permitir múltiples dispositivos
  requireDeviceVerification?: boolean; // Requerir verificación para nuevos dispositivos
}

export interface CreateSessionData {
  userId: string;
  email: string;
  role: string;
  userAgent?: string;
  ipAddress?: string;
  deviceName?: string;
}

export interface SessionInfo {
  sessionId: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  location?: string;
  lastActivity?: Date;
  createdAt: Date;
  isActive: boolean;
  isCurrent: boolean;
}

export class SessionService {
  private readonly logger = setupLogger({
    ...config.logging,
    dir: `${config.logging.dir}/services/session`,
  });
  private readonly sessionRepository: Repository<UserSession>;
  private readonly defaultConfig: SessionConfig = {
    maxConcurrentSessions: 3, // Por defecto, máximo 3 dispositivos
    sessionTimeout: 30, // 30 minutos de inactividad
    allowMultipleDevices: true,
    requireDeviceVerification: false,
  };

  constructor(
    private readonly databaseManager: DatabaseManager,
    private readonly sessionConfig?: SessionConfig
  ) {
    const connection = this.databaseManager.getConnection();
    this.sessionRepository = connection.getRepository(UserSession);
    this.logger.info('SessionService initialized');
  }

  /**
   * Crea una nueva sesión para el usuario
   */
  public async createSession(data: CreateSessionData): Promise<TokenPair & { sessionId: string }> {
    this.logger.info(`Creating session for user ${data.userId}`);

    try {
      const config = { ...this.defaultConfig, ...this.sessionConfig };

      // Parsear información del dispositivo
      const deviceInfo = data.userAgent ? parseUserAgent(data.userAgent) : {};
      const deviceId = data.userAgent && data.ipAddress 
        ? JwtUtil.generateDeviceId(data.userAgent, data.ipAddress)
        : undefined;

      // Verificar límite de sesiones concurrentes
      if (config.maxConcurrentSessions && config.maxConcurrentSessions > 0) {
        await this.enforceSessionLimit(data.userId, config.maxConcurrentSessions);
      }

      // Si no se permiten múltiples dispositivos, cerrar otras sesiones
      if (!config.allowMultipleDevices) {
        await this.revokeAllUserSessions(data.userId, 'new_device_login');
      }

      // Generar tokens
      const sessionId = JwtUtil.generateSessionId();
      const tokenPair = JwtUtil.generateTokenPair({
        userId: data.userId,
        email: data.email,
        role: data.role,
        sessionId,
        deviceId,
      });

      // Crear registro de sesión
      const session = this.sessionRepository.create({
        sessionId,
        userId: data.userId,
        refreshToken: tokenPair.refreshToken,
        deviceId,
        deviceName: data.deviceName || deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        ipAddress: data.ipAddress,
        location: await this.getLocationFromIP(data.ipAddress),
        isActive: true,
        lastActivity: new Date(),
        expiresAt: tokenPair.refreshExpiresAt,
      });

      await this.sessionRepository.save(session);

      this.logger.info(`Session created successfully for user ${data.userId}`);
      return {
        ...tokenPair,
        sessionId,
      };

    } catch (error) {
      this.logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Refresca una sesión existente
   */
  public async refreshSession(refreshToken: string): Promise<TokenPair> {
    this.logger.info('Refreshing session');

    try {
      // Verificar el refresh token
      const decoded = JwtUtil.verifyRefreshToken(refreshToken);

      // Buscar la sesión
      const session = await this.sessionRepository.findOne({
        where: {
          sessionId: decoded.sessionId,
          refreshToken,
          isActive: true,
        },
      });

      if (!session) {
        throw new ApplicationError('Invalid or expired session');
      }

      // Verificar que no haya expirado
      if (new Date() > new Date(session.expiresAt)) {
        await this.revokeSession(session.sessionId, 'expired');
        throw new ApplicationError('Session expired');
      }

      // Generar nuevos tokens
      const tokenPair = JwtUtil.generateTokenPair({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        sessionId: session.sessionId,
        deviceId: session.deviceId,
      });

      // Actualizar la sesión
      session.refreshToken = tokenPair.refreshToken;
      session.lastActivity = new Date();
      session.expiresAt = tokenPair.refreshExpiresAt;
      
      await this.sessionRepository.save(session);

      this.logger.info(`Session refreshed for user ${decoded.userId}`);
      return tokenPair;

    } catch (error) {
      this.logger.error('Error refreshing session:', error);
      throw error;
    }
  }

  /**
   * Revoca una sesión específica
   */
  public async revokeSession(sessionId: string, reason: string = 'logout'): Promise<void> {
    this.logger.info(`Revoking session ${sessionId} for reason: ${reason}`);

    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId, isActive: true },
      });

      if (!session) {
        throw new ApplicationError('Session not found');
      }

      session.isActive = false;
      session.revokedAt = new Date();
      session.revokedReason = reason;

      await this.sessionRepository.save(session);
      this.logger.info(`Session ${sessionId} revoked successfully`);

    } catch (error) {
      this.logger.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoca todas las sesiones de un usuario
   */
  public async revokeAllUserSessions(userId: string, reason: string = 'user_request'): Promise<number> {
    this.logger.info(`Revoking all sessions for user ${userId}`);

    try {
      const result = await this.sessionRepository.update(
        { userId, isActive: true },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        }
      );

      const affectedCount = result.affected || 0;
      this.logger.info(`Revoked ${affectedCount} sessions for user ${userId}`);
      return affectedCount;

    } catch (error) {
      this.logger.error('Error revoking user sessions:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las sesiones activas de un usuario
   */
  public async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    this.logger.info(`Getting sessions for user ${userId}`);

    try {
      const sessions = await this.sessionRepository.find({
        where: { userId, isActive: true },
        order: { lastActivity: 'DESC' },
      });

      return sessions.map(session => ({
        sessionId: session.sessionId,
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        location: session.location,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt,
        isActive: session.isActive,
        isCurrent: session.sessionId === currentSessionId,
      }));

    } catch (error) {
      this.logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Valida si una sesión está activa
   */
  public async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId, isActive: true },
      });

      if (!session) {
        return false;
      }

      // Verificar expiración
      if (new Date() > new Date(session.expiresAt)) {
        await this.revokeSession(sessionId, 'expired');
        return false;
      }

      // Verificar timeout por inactividad
      const config = { ...this.defaultConfig, ...this.sessionConfig };
      if (config.sessionTimeout && session.lastActivity) {
        const inactiveMinutes = (Date.now() - session.lastActivity.getTime()) / (1000 * 60);
        if (inactiveMinutes > config.sessionTimeout) {
          await this.revokeSession(sessionId, 'timeout');
          return false;
        }
      }

      // Actualizar última actividad
      session.lastActivity = new Date();
      await this.sessionRepository.save(session);

      return true;

    } catch (error) {
      this.logger.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Aplica el límite de sesiones concurrentes
   */
  private async enforceSessionLimit(userId: string, maxSessions: number): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivity: 'ASC' }, // Ordenar por actividad, más antiguas primero
    });

    if (activeSessions.length >= maxSessions) {
      // Cerrar las sesiones más antiguas
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
      
      for (const session of sessionsToRevoke) {
        await this.revokeSession(session.sessionId, 'session_limit_exceeded');
      }
    }
  }

  /**
   * Limpia sesiones expiradas (para ejecutar periódicamente)
   */
  public async cleanupExpiredSessions(): Promise<number> {
    this.logger.info('Cleaning up expired sessions');

    try {
      const result = await this.sessionRepository.update(
        {
          isActive: true,
          expiresAt: new Date(), // TypeORM manejará la comparación correctamente
        },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'expired',
        }
      );

      const affectedCount = result.affected || 0;
      this.logger.info(`Cleaned up ${affectedCount} expired sessions`);
      return affectedCount;

    } catch (error) {
      this.logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  /**
   * Obtiene la ubicación aproximada desde la IP (implementación básica)
   */
  private async getLocationFromIP(ipAddress?: string): Promise<string | undefined> {
    // Aquí podrías integrar un servicio de geolocalización como ipapi.co
    // Por ahora retornamos undefined
    return undefined;
  }
}