import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { CredencialController } from '../controllers/credencialController';
import { SolicitudController } from '../controllers/solicitudController';
import { OfertaController } from '../controllers/ofertaController';
import { VinculacionController } from '../controllers/vinculacionController';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Endpoints de Credenciales
router.post('/prestador/credenciales', authenticateToken, requireRole(['PRESTADOR_TECNICO']), upload.single('documento'), CredencialController.upload);
router.get('/admin/credenciales/pendientes', authenticateToken, requireRole(['ADMINISTRADOR']), CredencialController.getPendientes);
router.put('/admin/credenciales/:id/validar', authenticateToken, requireRole(['ADMINISTRADOR']), CredencialController.validar);

// Endpoints de Cliente y Prestador
router.post('/solicitudes', authenticateToken, requireRole(['CLIENTE']), SolicitudController.create);
router.get('/solicitudes/me', authenticateToken, requireRole(['CLIENTE']), SolicitudController.getMisSolicitudes);
router.get('/solicitudes/feed', authenticateToken, requireRole(['PRESTADOR_TECNICO']), SolicitudController.getFeed);

router.post('/ofertas', authenticateToken, requireRole(['PRESTADOR_TECNICO']), OfertaController.create);
router.get('/ofertas/me', authenticateToken, requireRole(['PRESTADOR_TECNICO']), OfertaController.getMisCotizaciones);
router.put('/ofertas/:id/contraoferta', authenticateToken, requireRole(['CLIENTE']), OfertaController.contraofertar);
router.put('/ofertas/:id/recotizar', authenticateToken, requireRole(['PRESTADOR_TECNICO']), OfertaController.recotizar);
router.get('/ofertas/:id', authenticateToken, OfertaController.getOfertasBySolicitud); // Puede verlo el cliente

router.post('/vinculaciones/aceptar', authenticateToken, requireRole(['CLIENTE', 'PRESTADOR_TECNICO']), VinculacionController.aceptarOferta);
router.post('/calificaciones', authenticateToken, requireRole(['CLIENTE']), VinculacionController.calificar);

import { ConfiguracionController } from '../controllers/configuracionController';

import { PrestadorController } from '../controllers/prestadorController';
import { UserController } from '../controllers/userController';

// Avatar upload
router.post('/users/me/avatar', authenticateToken, upload.single('avatar'), UserController.uploadAvatar);

// Monedero y saldo


router.post('/monedero/recargar', authenticateToken, requireRole(['PRESTADOR_TECNICO']), VinculacionController.recargarSaldo);
router.get('/monedero/saldo', authenticateToken, requireRole(['PRESTADOR_TECNICO']), VinculacionController.obtenerSaldo);
router.get('/prestadores/me', authenticateToken, requireRole(['PRESTADOR_TECNICO']), PrestadorController.getMe);
router.put('/prestadores/me', authenticateToken, requireRole(['PRESTADOR_TECNICO']), PrestadorController.updateMe);
router.get('/prestadores/cercanos', authenticateToken, requireRole(['CLIENTE']), PrestadorController.getCercanos);
router.get('/prestadores/verificados', authenticateToken, requireRole(['CLIENTE', 'ADMINISTRADOR']), PrestadorController.getVerificados);
router.get('/prestadores/:id_prestador', authenticateToken, requireRole(['CLIENTE', 'ADMINISTRADOR']), PrestadorController.getById);
router.get('/prestadores/:id_prestador/resenas', authenticateToken, PrestadorController.getResenas);

// Configuracion Admin
import { AiController } from '../controllers/aiController';
router.post('/ai/intent', authenticateToken, AiController.handleIntent);

import { ReportesController } from '../controllers/reportesController';
router.get('/admin/reportes', authenticateToken, requireRole(['ADMINISTRADOR']), ReportesController.getDashboardMetrics);
router.get('/admin/configuracion/comision', authenticateToken, requireRole(['ADMINISTRADOR']), ConfiguracionController.getComision);
router.put('/admin/configuracion/comision', authenticateToken, requireRole(['ADMINISTRADOR']), ConfiguracionController.updateComision);

export default router;
