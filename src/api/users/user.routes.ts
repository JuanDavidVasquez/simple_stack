import { Router } from 'express';
import { createUserController } from '../../factories/user.factory';

const router = Router();
const userController = createUserController();

router.post('/', userController.getAllUsers);
router.post('/create', userController.createUser);

// ✅ Rutas específicas primero
router.get('/email/:email', userController.getUserByEmail);
router.get('/get-users-count', userController.getUsersCount);
router.get('/get-users-by-role/:role', userController.getUsersByRole);

// ✅ Ruta dinámica
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.delete('/soft/:id', userController.softDeleteUser);

router.post('/update-role/:id', userController.updateUserRole);
router.post('/active', userController.activateUserOrDeactivateUser);
router.post('/verifyUser', userController.verifyUser);




export default router;
