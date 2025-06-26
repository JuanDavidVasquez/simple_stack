import { Router } from 'express';
import { createUserController } from '../../factories/user.factory';
import { adminOrOwnerMiddleware, authMiddleware } from '../../core/middlewares/auth.middleware';
import { authorizeRoles } from '../../core/middlewares/authorizeRoles.middleware';
import { UserRole } from '../../shared/constants/roles';

const router = Router();
const userController = createUserController();

router.post('/', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getAllUsers
);

router.post('/create', userController.createUser);

// ✅ Rutas específicas primero
router.get('/email/:email', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getUserByEmail
);
router.get('/get-users-count', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getUsersCount
);
router.get('/get-users-by-role/:role', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getUsersByRole
);

// ✅ Ruta dinámica
router.get('/:id', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getUserById
);
router.put('/:id', 
    authMiddleware, 
    adminOrOwnerMiddleware, 
    userController.updateUser
);
router.delete('/:id', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.deleteUser
);
router.delete('/soft/:id', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.softDeleteUser
);

router.post('/update-role/:id', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.updateUserRole
);
router.post('/active', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.activateUserOrDeactivateUser
);
router.post('/verifyUser', 
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.verifyUser
);




export default router;
