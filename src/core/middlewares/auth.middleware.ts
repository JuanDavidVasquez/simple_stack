import { Request, Response, NextFunction } from 'express';
import JwtUtil from '../../shared/utils/jwt.util';
import { UserRole } from '../../shared/constants/roles';
import { UserSession } from '../database/entities/user-session.entity';
import { AppDataSource } from '../database/config/database.config';


/**
 * Middleware de autenticación principal
 * Verifica el token Bearer y agrega información del usuario a req.user
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
   
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = JwtUtil.verifyAccessToken(token);
      
      // NUEVA VALIDACIÓN: Verificar sesión en base de datos
      const sessionRepository = AppDataSource.getRepository(UserSession);
      const session = await sessionRepository.findOne({
        where: {
          sessionId: decoded.sessionId,
          userId: decoded.userId,
          isActive: true
        },
        relations: ['user']
      });

      if (!session) {
        res.status(401).json({
          success: false,
          message: 'Sesión no válida o inactiva'
        });
        return;
      }

      // Verificar si la sesión expiró
      if (session.expiresAt < new Date()) {
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

      // Verificar si el usuario está activo
      if (!session.user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Usuario inactivo'
        });
        return;
      }

      req.user = {
        userId: decoded.userId,
        role: session.user.role as UserRole,
        sessionId: decoded.sessionId
      };
      
      req.sessionId = decoded.sessionId;
      next();
      
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
    return;
  }
};

/**
 * Middleware de autorización administrativa
 * Verifica que el usuario autenticado tenga rol de administrador
 * NOTA: Este middleware debe usarse DESPUÉS de authMiddleware
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Verificar que el usuario esté autenticado (debe venir de authMiddleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Verificar que el usuario tenga rol de administrador
    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    // Si llegamos aquí, el usuario es admin y puede continuar
    next();
  } catch (error) {
    console.error('Error en adminMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
    return;
  }
};

/**
 * Middleware alternativo que permite tanto admin como el propio usuario
 * Útil para rutas donde un usuario puede acceder a sus propios datos
 * o un admin puede acceder a datos de cualquier usuario
 */
export const adminOrOwnerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const targetUserId = req.params.userId;
    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.userId === targetUserId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo puedes acceder a tus propios datos'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en adminOrOwnerMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
    return;
  }
};