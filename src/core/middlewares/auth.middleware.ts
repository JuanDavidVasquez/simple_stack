import { Request, Response, NextFunction } from 'express';
import JwtUtil from '../../shared/utils/jwt.util';
import { UserRole } from '../../shared/constants/roles';
import { AppDataSource } from '../database/config/database.config';
import { UserSession } from '../database/entities/entities/user-session.entity';
import { ResponseUtil } from '../../shared/utils/response.util';


/**
 * Middleware de autenticación principal
 * Verifica el token Bearer y agrega información del usuario a req.user
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ResponseUtil.error(
        req,
        res,
        'errors.auth.token_required',
        401
      );
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JwtUtil.verifyAccessToken(token);
      //Verificar sesión en base de datos
      const sessionRepository = AppDataSource.getRepository(UserSession);
      const session = await sessionRepository.findOne({
        where: {
          sessionId: decoded.sessionId,
          userId: decoded.userId,
          isActive: true
        },
      });
      if (!session) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.session_not_found',
          401
        );
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
      console.log('Sesión válida encontrada:');
      console.log(session)
      // Verificar si el usuario está activo
      if (!session.isActive) {
        ResponseUtil.error(
          req,
          res,
          'errors.auth.inactive_user',
          403
        );
        return;
      }
      req.user = {
        userId: decoded.userId,
        role: session.userRole as UserRole,
        sessionId: decoded.sessionId
      };
      req.sessionId = decoded.sessionId;
      next();

    } catch (jwtError) {
      ResponseUtil.error(
        req,
        res,
        'errors.auth.invalid_token',
        401
      );
      return;
    }
  } catch (error) {
    console.error('Error en authMiddleware:', error);

    ResponseUtil.error(
      req,
      res,
      'errors.general.internal_server',
      500
    );
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

      ResponseUtil.error(
        req,
        res,
        'errors.general.unauthenticated',
        401
      );
      return;
    }

    // Verificar que el usuario tenga rol de administrador
    if (req.user.role !== 'admin') {

      ResponseUtil.error(
        req,
        res,
        'errors.general.forbidden',
        403
      );
      return;
    }

    // Si llegamos aquí, el usuario es admin y puede continuar
    next();
  } catch (error) {
    console.error('Error en adminMiddleware:', error);
    ResponseUtil.error(
      req,
      res,
      'errors.general.internal_server',
      500
    );
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
      ResponseUtil.error(
        req,
        res,
        'errors.general.unauthenticated',
        401
      );
      return;
    }

    const targetUserId = req.params.id;
    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.userId === targetUserId;

    console.log(`Usuario autenticado: ${req.user.userId}, Rol: ${req.user.role}`);
    console.log(`ID del usuario objetivo: ${targetUserId}`);

    if (!isAdmin && !isOwner) {
      ResponseUtil.error(
        req,
        res,
        'errors.general.forbidden',
        403,
        {
          required_roles: ['admin', 'owner'],
          user_role: req.user.role
        }
      );
      return;
    }

    next();
  } catch (error) {
    console.error('Error en adminOrOwnerMiddleware:', error);
    ResponseUtil.error(
      req,
      res,
      'errors.general.internal_server',
      500
    );
    return;
  }
};