import { Router } from 'express';
import { createAuthController } from '../../factories/auth.factory';
import { adminMiddleware } from '../../core/middlewares/auth.middleware';

export const createAuthRouter = async () => {
  const router = Router();
  const authController = await createAuthController();

  // ===============================
  // RUTAS PÚBLICAS (sin autenticación)
  // ===============================
  
  /**
   * @route POST /auth/login
   * @desc Iniciar sesión
   * @body { email: string, password: string, deviceName?: string }
   */
  router.post('/login', authController.login);

  /**
   * @route POST /auth/refresh
   * @desc Renovar token de acceso
   * @body { refreshToken: string }
   */
  router.post('/refresh', authController.refreshToken);

  /**
   * @route POST /auth/reset-password
   * @desc Solicitar reset de contraseña
   * @body { email: string }
   */
  router.post('/reset-password', authController.resetPassword);

  /**
   * @route GET /auth/login-status
   * @desc Verificar si un email puede intentar login
   * @query { email: string }
   */
  router.get('/login-status', authController.checkLoginStatus);

  /**
   * @route GET /auth/validate-session/:sessionId
   * @desc Verificar si una sesión está activa
   * @params { sessionId: string }
   */
  router.get('/validate-session/:sessionId', authController.validateSession);

  // ===============================
  // RUTAS PROTEGIDAS (requieren autenticación)
  // ===============================
  
  /**
   * @route POST /auth/logout
   * @desc Cerrar sesión actual
   * @access Private
   */
  router.post('/logout', adminMiddleware, authController.logout);

  /**
   * @route POST /auth/logout-all
   * @desc Cerrar todas las sesiones del usuario
   * @access Private
   */
  router.post('/logout-all', adminMiddleware, authController.logoutAll);

  /**
   * @route PUT /auth/change-password/:userId
   * @desc Cambiar contraseña de usuario
   * @params { userId: string }
   * @body { currentPassword: string, newPassword: string, confirmPassword: string, logoutOtherDevices?: boolean }
   * @access Private (solo el propio usuario)
   */
  router.put('/change-password/:userId', adminMiddleware, authController.changePassword);

  /**
   * @route GET /auth/sessions
   * @desc Obtener sesiones activas del usuario actual
   * @access Private
   */
  router.get('/sessions', adminMiddleware, authController.getUserSessions);

  /**
   * @route DELETE /auth/sessions/:sessionId
   * @desc Revocar una sesión específica
   * @params { sessionId: string }
   * @access Private (solo propias sesiones)
   */
  router.delete('/sessions/:sessionId', adminMiddleware, authController.revokeSession);

  /**
   * @route GET /auth/security-stats/:userId
   * @desc Obtener estadísticas de seguridad
   * @params { userId: string }
   * @access Private (solo el propio usuario o admin)
   */
  router.get('/security-stats/:userId', adminMiddleware, authController.getUserSecurityStats);

  // ===============================
  // RUTAS ADMINISTRATIVAS (requieren role admin)
  // ===============================

  /**
   * @route PUT /auth/unlock-account/:userId
   * @desc Desbloquear cuenta de usuario
   * @params { userId: string }
   * @access Admin only
   */
  router.put('/unlock-account/:userId', adminMiddleware, adminMiddleware, authController.unlockAccount);

  /**
   * @route POST /auth/cleanup-sessions
   * @desc Limpiar sesiones expiradas del sistema
   * @access Admin only
   */
  router.post('/cleanup-sessions', adminMiddleware, adminMiddleware, authController.cleanupSessions);

  return router;
};