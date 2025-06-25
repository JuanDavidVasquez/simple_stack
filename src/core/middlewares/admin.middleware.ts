import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database/config/database.config';
import { UserSession } from '../database/entities/user-session.entity';

// Extiende la interfaz Request para incluir 'session'
declare module 'express-serve-static-core' {
  interface Request {
    session?: {
      id: number;
      sessionId: string;
      deviceName: string;
      ipAddress: string;
      lastActivity: Date;
    };
  }
}


/**
 * Middleware para validar sesiones activas
 * Este middleware debe usarse DESPUÉS de authMiddleware
 * Solo para rutas que requieren validación estricta de sesión
 */
export const validateSessionMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user || !req.user.sessionId) {
      res.status(401).json({
        success: false,
        message: 'Sesión no válida'
      });
      return;
    }

    // Obtener el repositorio de sesiones
    const sessionRepository = AppDataSource.getRepository(UserSession);
    
    // Buscar la sesión en la base de datos
    const session = await sessionRepository.findOne({
      where: {
        sessionId: req.user.sessionId,
        userId: req.user.userId,
        isActive: true
      }
    });

    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Sesión no encontrada o inactiva'
      });
      return;
    }

    // Verificar si la sesión ha expirado
    if (session.expiresAt < new Date()) {
      // Marcar la sesión como inactiva
      await sessionRepository.update(session.id, {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'expired'
      });

      res.status(401).json({
        success: false,
        message: 'Sesión expirada'
      });
      return;
    }

    // Verificar si la sesión fue revocada
    if (session.revokedAt) {
      res.status(401).json({
        success: false,
        message: 'Sesión revocada'
      });
      return;
    }

    // Actualizar la última actividad de la sesión
    await sessionRepository.update(session.id, {
      lastActivity: new Date()
    });

    // Añadir información de sesión a la request
    req.session = {
      id: Number(session.id),
      sessionId: session.sessionId,
      deviceName: session.deviceName ?? '',
      ipAddress: session.ipAddress ?? '',
      lastActivity: new Date()
    };

    next();
  } catch (error) {
    console.error('Error en validateSessionMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
    return;
  }
};

/**
 * Middleware ligero para actualizar última actividad sin validaciones estrictas
 */
export const updateActivityMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.sessionId) {
      const sessionRepository = AppDataSource.getRepository(UserSession);
      
      // Actualizar sin await para no bloquear la request
      sessionRepository.update(
        { sessionId: req.user.sessionId, userId: req.user.userId },
        { lastActivity: new Date() }
      ).catch(error => {
        console.error('Error actualizando actividad de sesión:', error);
      });
    }
    
    next();
  } catch (error) {
    // No bloquear la request por errores en actualización de actividad
    console.error('Error en updateActivityMiddleware:', error);
    next();
  }
};