import { Request, Response } from 'express';
import { VinculacionService } from '../services/vinculacionService';
import { CalificacionModel } from '../models/CalificacionModel';
import { PrestadorModel } from '../models/PrestadorModel';

export class VinculacionController {
  static async aceptarOferta(req: Request, res: Response) {
    try {
      const { id_solicitud, id_prestador, monto_ofertado, id_oferta } = req.body;
      const result = await VinculacionService.aceptarOferta(
        Number(id_solicitud), 
        Number(id_prestador), 
        Number(monto_ofertado),
        id_oferta ? Number(id_oferta) : undefined
      );
      res.json({ 
        success: true, 
        message: 'Vinculación exitosa', 
        id_vinculacion: result.id_vinculacion,
        telefono_prestador: result.telefono_prestador, 
        cliente_telefono: result.cliente_telefono,
        cliente_nombres: result.cliente_nombres,
        cliente_apellidos: result.cliente_apellidos,
        latitud: result.latitud,
        longitud: result.longitud,
        direccion: result.direccion
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async recargarSaldo(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const { monto } = req.body;
      
      const prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) {
        return res.status(403).json({ error: 'Prestador no encontrado.' });
      }

      await VinculacionService.recargarSaldo(prestador.id_prestador!, monto);
      res.json({ message: 'Saldo recargado exitosamente.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async calificar(req: Request, res: Response) {
    try {
      const { id_vinculacion, puntuacion, comentario } = req.body;
      const id = await CalificacionModel.create({
        id_vinculacion,
        puntuacion,
        comentario
      });
      res.status(201).json({ message: 'Calificación registrada', id_calificacion: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerSaldo(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) return res.status(404).json({ error: 'No es prestador' });
      const saldo = await PrestadorModel.getSaldo(prestador.id_prestador!);
      res.json({ saldo });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
