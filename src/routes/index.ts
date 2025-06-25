import { Router } from 'express';
import userRoutes from '../api/users/user.routes';
import authRoutes from '../api/auth/auth.routes';

const router = Router();

// Registrar todas las rutas de módulos
router.use('/users', userRoutes);
router.use('/auth', authRoutes);


export default router;