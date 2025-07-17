import { Router } from 'express';
import { createUserController } from '../../factories/user.factory';
import { adminOrOwnerMiddleware, authMiddleware } from '../../core/middlewares/auth.middleware';
import { authorizeRoles } from '../../core/middlewares/authorizeRoles.middleware';
import { UserRole } from '../../shared/constants/roles';
import { validateBody, validateParams } from '../../core/middlewares/validationShema.middleware';
import { emailSchema } from '../../shared/schemas/email.shema';
import { uuidSchema } from '../../shared/schemas/uuid.shema';
import { userUpdateSchema } from '../../shared/schemas/user.shema';

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
    validateBody(emailSchema),
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
    validateParams(uuidSchema),
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.getUserById
);
router.put('/:id', 
    validateParams(uuidSchema),
    validateBody(userUpdateSchema),
    authMiddleware, 
    adminOrOwnerMiddleware, 
    userController.updateUser
);
router.delete('/:id', 
    validateParams(uuidSchema),
    authMiddleware, 
    authorizeRoles(UserRole.ADMIN), 
    userController.deleteUser
);
router.delete('/soft/:id', 
    validateParams(uuidSchema),
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
