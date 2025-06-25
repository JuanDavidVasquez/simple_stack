import { Router } from 'express';
import { createUserController } from '../../factories/user.factory';

const router = Router();
const userController = createUserController();

router.post('/', userController.getAllUsers);
router.post('/create', userController.createUser);

export default router;
