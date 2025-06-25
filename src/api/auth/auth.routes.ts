import { Router } from 'express';
import { createAuthController } from '../../factories/auth.factory';

const router = Router();
const authController = createAuthController();

/**
 * @route POST /auth/login
 * @desc Autenticar usuario
 * @body { email: string, password: string }
 */
router.post('/login', authController.login);

/**
 * @route POST /auth/logout
 * @desc Cerrar sesión de usuario
 */
router.post('/logout', authController.logout);

/**
 * @route PUT /auth/change-password/:userId
 * @desc Cambiar contraseña de usuario
 * @body { currentPassword: string, newPassword: string, confirmPassword: string }
 */
router.put('/change-password/:userId', authController.changePassword);

/**
 * @route POST /auth/reset-password
 * @desc Resetear contraseña de usuario
 * @body { email: string }
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route GET /auth/login-status
 * @desc Verificar si un usuario puede intentar hacer login
 * @query { email: string }
 */
router.get('/login-status', authController.checkLoginStatus);

/**
 * @route PUT /auth/unlock-account/:userId
 * @desc Desbloquear cuenta de usuario (solo admin)
 */
router.put('/unlock-account/:userId', authController.unlockAccount);

/**
 * @route GET /auth/security-stats/:userId
 * @desc Obtener estadísticas de seguridad de usuario
 */
router.get('/security-stats/:userId', authController.getUserSecurityStats);

export default router;