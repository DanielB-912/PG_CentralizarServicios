import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Ruta de prueba protegida
router.get('/me', authenticateToken, (req, res) => {
  res.json({ message: 'Información del perfil obtenida con éxito', user: (req as any).user });
});

// Ruta de prueba para admin
router.get('/admin-only', authenticateToken, checkRole(['ADMINISTRADOR']), (req, res) => {
  res.json({ message: 'Acceso concedido a área de administración' });
});

export default router;
