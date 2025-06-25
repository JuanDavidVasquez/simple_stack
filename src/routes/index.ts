import { Router } from 'express';
import userRoutes from '../api/users/user.routes';
import { createAuthRouter } from '../api/auth/auth.routes';

export const apiRoutes = async () => {
  const router = Router();

  const authRouter = await createAuthRouter();
  router.use('/auth', authRouter);
  router.use('/users', userRoutes);

  return router;
};