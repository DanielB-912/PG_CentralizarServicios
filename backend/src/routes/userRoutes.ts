import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', authenticateToken, checkRole(['ADMINISTRADOR']), UserController.getAllUsers);
router.put('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), UserController.updateUser);
router.delete('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), UserController.softDeleteUser);
router.patch('/:id/estado', authenticateToken, checkRole(['ADMINISTRADOR']), UserController.toggleUserStatus);
router.patch('/:id/toggle-status', authenticateToken, checkRole(['ADMINISTRADOR']), UserController.toggleUserStatus);
router.put('/me/password', authenticateToken, UserController.updatePassword);
router.put('/me/profile', authenticateToken, UserController.updateMe);

export default router;
