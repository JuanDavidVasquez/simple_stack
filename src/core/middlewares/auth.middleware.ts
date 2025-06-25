import { Request, Response, NextFunction } from 'express';

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