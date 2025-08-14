import { Router } from 'express';
import { createAuthController } from '../../modules/auth.factory';
import { authMiddleware, adminOrOwnerMiddleware } from '../../core/middlewares/auth.middleware';
import { authorizeRoles, requireAdmin } from '../../core/middlewares/authorizeRoles.middleware';
import { UserRole } from '../../shared/constants/roles';
import { passwordEncryptionMiddleware } from '../../core/middlewares/encryption.middleware';


export const createAuthRouter = async () => {
  const router = Router();
  const authController = await createAuthController();

  // ===============================
  // RUTAS PÚBLICAS (sin autenticación)
  // ===============================
 
  router.post('/login',
    passwordEncryptionMiddleware(),
    authController.login);
  router.post('/refresh', authController.refreshToken);
  router.post('/reset-password', authController.resetPassword);
  router.get('/login-status', authController.checkLoginStatus);
  router.get('/validate-session/:sessionId', authController.validateSession);

  // ===============================
  // RUTAS PROTEGIDAS (requieren autenticación)
  // ===============================
 
  router.post('/logout', 
    authMiddleware, 
    authController.logout
  );
  router.post('/logout-all', 
    authMiddleware, 
    authController.logoutAll
  );
  router.put('/change-password/:userId', 
    authMiddleware, 
    adminOrOwnerMiddleware, 
    authController.changePassword
  );
  router.get('/sessions', 
    authMiddleware, 
    authController.getUserSessions
  );
  router.delete('/sessions/:sessionId', 
    authMiddleware, 
    authController.revokeSession
  );
  router.get('/security-stats/:userId', 
    authMiddleware, 
    adminOrOwnerMiddleware, 
    authController.getUserSecurityStats
  );

  // ===============================
  // RUTAS ADMINISTRATIVAS 
  // ===============================

  router.put('/unlock-account/:userId', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    authController.unlockAccount
  );
  router.post('/cleanup-sessions', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    authController.cleanupSessions
  );


  return router;
};