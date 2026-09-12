import { Request, Response } from 'express';
import { SolicitudModel } from '../models/SolicitudModel';

export class SolicitudController {
  static async create(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const { tipo_servicio, descripcion, presupuesto, ubicacion_lat, ubicacion_lng, macrodistrito } = req.body;

      const id = await SolicitudModel.create({
        id_cliente: id_usuario,
        tipo_servicio,
        descripcion,
        presupuesto,
        ubicacion_lat,
        ubicacion_lng,
        macrodistrito
      });

      res.status(201).json({ message: 'Solicitud creada', id_solicitud: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getFeed(req: Request, res: Response) {
    try {
      const { macrodistrito } = req.query;
      const feed = await SolicitudModel.findFeed(macrodistrito as string);
      res.json(feed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getMisSolicitudes(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const misSolicitudes = await SolicitudModel.findByClient(id_usuario);
      res.json(misSolicitudes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
