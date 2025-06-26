import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database/config/database.config';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../../shared/constants/roles';

// Extiende la interfaz Request para incluir información del usuario y roles
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      sessionId: string;
      email?: string;
      role?: UserRole;
    };
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
 * Middleware de autorización basado en roles
 * @param allowedRoles - Rol o array de roles permitidos (usando UserRole enum o strings)
 * @returns Middleware function
 * 
 * Uso:
 * - Single role: authorizeRoles(UserRole.ADMIN) o authorizeRoles('admin')
 * - Multiple roles: authorizeRoles([UserRole.ADMIN, UserRole.DOCTOR]) o authorizeRoles(['admin', 'doctor'])
 * - As array: authorizeRoles(UserRole.ADMIN, UserRole.USER)
 */
export const authorizeRoles = (...allowedRoles: (UserRole | string | (UserRole | string)[])[]): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Normalizar los roles permitidos en un array plano
      const normalizedRoles: string[] = allowedRoles.flat().map(role => 
        (typeof role === 'string' ? role : role as string).toLowerCase().trim()
      );

      if (normalizedRoles.length === 0) {
        res.status(500).json({
          success: false,
          message: 'Error de configuración: No se especificaron roles'
        });
        return;
      }

      // Si ya tenemos el rol en req.user, usarlo
      if (req.user.role) {
        const userRole = req.user.role.toLowerCase().trim();
        const hasPermission = normalizedRoles.includes(userRole);

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a este recurso',
            required_roles: normalizedRoles,
            user_role: userRole
          });
          return;
        }

        next();
        return;
      }

      // Si no tenemos rol en req.user, consultarlo desde la base de datos
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({
        where: { id: req.user.userId },
        select: ['id', 'role', 'isActive']
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: 'Usuario inactivo'
        });
        return;
      }

      // Actualizar req.user con el rol para futuras validaciones
      req.user.role = user.role;

      // Verificar si el usuario tiene uno de los roles permitidos
      const userRole = user.role.toLowerCase().trim();
      const hasPermission = normalizedRoles.includes(userRole);

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          required_roles: normalizedRoles,
          user_role: userRole
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en authorizeRoles middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };
};

/**
 * Middleware para verificar si el usuario tiene un rol específico
 * @param roleName - Nombre del rol a verificar (UserRole enum o string)
 * @returns Middleware function
 */
export const requireRole = (roleName: UserRole | string) => {
  return authorizeRoles(roleName);
};

/**
 * Middleware para verificar si el usuario es administrador
 * @returns Middleware function
 */
export const requireAdmin = () => {
  return authorizeRoles(UserRole.ADMIN);
};

/**
 * Middleware para verificar si el usuario es doctor
 * @returns Middleware function
 */
export const requireDoctor = () => {
  return authorizeRoles(UserRole.DOCTOR);
};

/**
 * Middleware para verificar si el usuario es doctor o administrador
 * @returns Middleware function
 */
export const requireDoctorOrAdmin = () => {
  return authorizeRoles(UserRole.ADMIN, UserRole.DOCTOR);
};

/**
 * Middleware para verificar múltiples roles con lógica OR
 * @param roles - Array de roles permitidos
 * @returns Middleware function
 */
export const requireAnyRole = (roles: (UserRole | string)[]) => {
  return authorizeRoles(roles);
};

// Nota: Como tu sistema usa un solo rol por usuario (enum), 
// no incluimos requireAllRoles ya que no tendría sentido
// En su lugar, puedes usar authorizeRoles para verificar roles específicos