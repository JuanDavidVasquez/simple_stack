import { Router } from 'express';
import { createAuthController } from '../../factories/auth.factory';

export const createAuthRouter = async () => {
  const router = Router();
  const authController = await createAuthController();

  router.post('/login', authController.login);
  router.post('/logout', authController.logout);
  router.put('/change-password/:userId', authController.changePassword);
  router.post('/reset-password', authController.resetPassword);
  router.get('/login-status', authController.checkLoginStatus);
  router.put('/unlock-account/:userId', authController.unlockAccount);
  router.get('/security-stats/:userId', authController.getUserSecurityStats);

  return router;
};