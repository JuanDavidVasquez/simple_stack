// src/api/session/session.service.ts
import { Repository } from 'typeorm';
import { DatabaseManager } from '../../core/config/database-manager';
import { ApplicationError } from '../../shared/errors/application.error';
import setupLogger from '../../shared/utils/logger';
import { config } from '../../core/config/env';
import JwtUtil, { TokenPair } from '../../shared/utils/jwt.util';
import { parseUserAgent } from '../../shared/utils/user-agent.util';
import { geolocationService } from '../../shared/services/geolocation.service';
import { UserSession } from '../../core/database/entities/entities/user-session.entity';
import type { SessionConfig } from '../../shared/interfaces/session.interface';
import { CreateSessionData, SessionInfo } from '../../shared/interfaces/session.interface';
import { Service } from 'typedi';


@Service()
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
    enableGeolocation: true, // Habilitar geolocalización por defecto
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
   * Crea una nueva sesión para el usuario con geolocalización y soporte multi-tabla
   */
  public async createSession(data: CreateSessionData): Promise<TokenPair & { sessionId: string }> {
    this.logger.info(`Creating session for user ${data.userId} from table: ${data.sourceTable || 'unknown'}`);

    try {
      const config = { ...this.defaultConfig, ...this.sessionConfig };

      // Parsear información del dispositivo
      const deviceInfo = data.userAgent ? parseUserAgent(data.userAgent) : {};
      const deviceId = data.userAgent && data.ipAddress 
        ? JwtUtil.generateDeviceId(data.userAgent, data.ipAddress)
        : undefined;

      // Obtener ubicación de la IP
      let location: string | undefined;
      if (config.enableGeolocation && data.ipAddress) {
        try {
          location = await geolocationService.getLocationFromIP(data.ipAddress);
          this.logger.debug(`Location determined for IP ${data.ipAddress}: ${location || 'Unknown'}`);
        } catch (error) {
          this.logger.warn(`Failed to get location for IP ${data.ipAddress}:`, error);
        }
      }

      // Verificar límite de sesiones concurrentes POR TABLA
      if (config.maxConcurrentSessions && config.maxConcurrentSessions > 0) {
        await this.enforceSessionLimitFromTable(
          data.userId, 
          data.sourceTable || 'users', 
          config.maxConcurrentSessions
        );
      }

      // Si no se permiten múltiples dispositivos, cerrar otras sesiones DE ESTA TABLA
      if (!config.allowMultipleDevices) {
        await this.revokeAllUserSessionsFromTable(
          data.userId, 
          data.sourceTable || 'users', 
          'new_device_login'
        );
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

      // Crear registro de sesión con información completa
      const session = this.sessionRepository.create({
        sessionId,
        userId: data.userId,
        refreshToken: tokenPair.refreshToken,
        sourceTable: data.sourceTable || 'users',
        userEmail: data.email,
        userRole: data.role,
        deviceId,
        deviceName: data.deviceName || deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        ipAddress: data.ipAddress,
        location,
        isActive: true,
        lastActivity: new Date(),
        expiresAt: tokenPair.refreshExpiresAt,
      });

      await this.sessionRepository.save(session);

      this.logger.info(`Session created successfully for user ${data.userId} from table: ${data.sourceTable}${location ? ` (${location})` : ''}`);
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
   * Revoca todas las sesiones de un usuario de una tabla específica
   */
  public async revokeAllUserSessionsFromTable(
    userId: string, 
    sourceTable: string, 
    reason: string = 'user_request'
  ): Promise<number> {
    this.logger.info(`Revoking all sessions for user ${userId} from table ${sourceTable}`);

    try {
      const result = await this.sessionRepository.update(
        { 
          userId, 
          sourceTable, 
          isActive: true 
        },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        }
      );

      const affectedCount = result.affected || 0;
      this.logger.info(`Revoked ${affectedCount} sessions for user ${userId} from table ${sourceTable}`);
      return affectedCount;

    } catch (error) {
      this.logger.error(`Error revoking user sessions from table ${sourceTable}:`, error);
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
        sourceTable: session.sourceTable,
      }));

    } catch (error) {
      this.logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las sesiones activas de un usuario de una tabla específica
   */
  public async getUserSessionsFromTable(
    userId: string, 
    sourceTable: string, 
    currentSessionId?: string
  ): Promise<SessionInfo[]> {
    this.logger.info(`Getting sessions for user ${userId} from table ${sourceTable}`);

    try {
      const sessions = await this.sessionRepository.find({
        where: { 
          userId, 
          sourceTable, 
          isActive: true 
        },
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
        sourceTable: session.sourceTable,
      }));

    } catch (error) {
      this.logger.error(`Error getting user sessions from table ${sourceTable}:`, error);
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
   * Aplica el límite de sesiones concurrentes para una tabla específica
   */
  private async enforceSessionLimitFromTable(
    userId: string, 
    sourceTable: string, 
    maxSessions: number
  ): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { 
        userId, 
        sourceTable, 
        isActive: true 
      },
      order: { lastActivity: 'ASC' }, // Ordenar por actividad, más antiguas primero
    });

    if (activeSessions.length >= maxSessions) {
      // Cerrar las sesiones más antiguas de esta tabla
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
   * Limpia sesiones expiradas de una tabla específica
   */
  public async cleanupExpiredSessionsFromTable(sourceTable: string): Promise<number> {
    this.logger.info(`Cleaning up expired sessions from table ${sourceTable}`);

    try {
      const result = await this.sessionRepository.update(
        {
          sourceTable,
          isActive: true,
          expiresAt: new Date(),
        },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'expired',
        }
      );

      const affectedCount = result.affected || 0;
      this.logger.info(`Cleaned up ${affectedCount} expired sessions from table ${sourceTable}`);
      return affectedCount;

    } catch (error) {
      this.logger.error(`Error cleaning up expired sessions from table ${sourceTable}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de sesiones por tabla
   */
  public async getSessionStatsByTable(): Promise<Record<string, {
    activeSessions: number;
    totalSessions: number;
    uniqueUsers: number;
  }>> {
    try {
      const stats = await this.sessionRepository
        .createQueryBuilder('session')
        .select([
          'session.sourceTable as sourceTable',
          'COUNT(*) as totalSessions',
          'SUM(CASE WHEN session.isActive = true THEN 1 ELSE 0 END) as activeSessions',
          'COUNT(DISTINCT session.userId) as uniqueUsers'
        ])
        .groupBy('session.sourceTable')
        .getRawMany();

      const result: Record<string, any> = {};
      
      stats.forEach(stat => {
        result[stat.sourceTable] = {
          activeSessions: parseInt(stat.activeSessions),
          totalSessions: parseInt(stat.totalSessions),
          uniqueUsers: parseInt(stat.uniqueUsers)
        };
      });

      return result;

    } catch (error) {
      this.logger.error('Error getting session stats by table:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por email en sesiones activas (útil para validaciones cruzadas)
   */
  public async findActiveSessionsByEmail(email: string, sourceTable?: string): Promise<SessionInfo[]> {
    try {
      const whereCondition: any = {
        userEmail: email.toLowerCase(),
        isActive: true
      };

      if (sourceTable) {
        whereCondition.sourceTable = sourceTable;
      }

      const sessions = await this.sessionRepository.find({
        where: whereCondition,
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
        isCurrent: false,
        sourceTable: session.sourceTable,
      }));

    } catch (error) {
      this.logger.error('Error finding active sessions by email:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de ubicaciones
   */
  public async getLocationStats(sourceTable?: string): Promise<Record<string, number>> {
    try {
      const whereCondition: any = { isActive: true };
      if (sourceTable) {
        whereCondition.sourceTable = sourceTable;
      }

      const sessions = await this.sessionRepository.find({
        where: whereCondition,
        select: ['location']
      });

      const locationCounts: Record<string, number> = {};
      
      sessions.forEach(session => {
        const location = session.location || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      });

      return locationCounts;

    } catch (error) {
      this.logger.error('Error getting location stats:', error);
      throw error;
    }
  }

  /**
   * Limpia caché de geolocalización
   */
  public clearGeolocationCache(): void {
    geolocationService.clearCache();
    this.logger.info('Geolocation cache cleared');
  }

  /**
   * Obtiene estadísticas completas del servicio
   */
  public getServiceStats(): any {
    const geoStats = geolocationService.getCacheStats();
    
    return {
      geolocation: {
        cacheSize: geoStats.size,
        oldestCacheEntry: geoStats.oldestEntry ? new Date(geoStats.oldestEntry) : null,
        newestCacheEntry: geoStats.newestEntry ? new Date(geoStats.newestEntry) : null,
      }
    };
  }
}