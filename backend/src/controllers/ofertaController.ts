import { Request, Response } from 'express';
import { OfertaModel } from '../models/OfertaModel';
import { PrestadorModel } from '../models/PrestadorModel';

export class OfertaController {
  static async create(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const { id_solicitud, monto_ofertado, mensaje_propuesta } = req.body;

      if (!monto_ofertado || isNaN(monto_ofertado) || Number(monto_ofertado) <= 0) {
        return res.status(400).json({ error: "El monto ofertado debe ser un valor numérico válido mayor a 0 Bs." });
      }

      const prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) {
        return res.status(403).json({ error: 'Solo los prestadores pueden hacer ofertas.' });
      }

      const id = await OfertaModel.create({
        id_solicitud,
        id_prestador: prestador.id_prestador!,
        monto_ofertado: Number(monto_ofertado),
        mensaje_propuesta
      });

      res.status(201).json({ message: 'Oferta enviada', id_oferta: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getOfertasBySolicitud(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ofertas = await OfertaModel.findBySolicitud(parseInt(id));
      res.json(ofertas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async contraofertar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { monto_ofertado, mensaje_propuesta } = req.body;
      
      if (!monto_ofertado || isNaN(monto_ofertado) || Number(monto_ofertado) <= 0) {
        return res.status(400).json({ error: "El monto ofertado debe ser un valor numérico válido mayor a 0 Bs." });
      }

      await OfertaModel.updateContraoferta(parseInt(id), Number(monto_ofertado), mensaje_propuesta);
      res.json({ message: 'Contraoferta enviada correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async recotizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { monto_ofertado, mensaje_propuesta } = req.body;
      
      if (!monto_ofertado || isNaN(monto_ofertado) || Number(monto_ofertado) <= 0) {
        return res.status(400).json({ error: "El monto ofertado debe ser un valor numérico válido mayor a 0 Bs." });
      }

      const pool = require('../config/db').default;
      await pool.execute(
        `UPDATE ofertas SET monto_ofertado = ?, mensaje_propuesta = ?, estado_oferta = 'ENVIADA' WHERE id_oferta = ?`,
        [Number(monto_ofertado), mensaje_propuesta || null, parseInt(id)]
      );
      res.json({ message: 'Recotización enviada correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getMisCotizaciones(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const ofertas = await OfertaModel.findByPrestador(prestador.id_prestador!);
      res.json(ofertas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
