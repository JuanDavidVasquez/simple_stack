import { Router } from 'express';
import { AppModule } from '../modules';

export const apiRoutes = async () => {
  const router = Router();

  await AppModule.register(router);

  return router;
};