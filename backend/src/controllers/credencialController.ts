import { Request, Response } from 'express';
import { CredencialModel } from '../models/CredencialModel';

export class CredencialController {
  static async upload(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const { tipo_documento } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }

      // Multer guardará el archivo en backend/uploads y nos dará la ruta en req.file.path
      const documento_url = `/uploads/${req.file.filename}`;
      
      const id = await CredencialModel.create({
        id_usuario,
        tipo_documento,
        documento_url
      });

      res.status(201).json({ message: 'Credencial subida exitosamente', id_credencial: id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendientes(req: Request, res: Response) {
    try {
      const pendientes = await CredencialModel.getPendientes();
      res.json(pendientes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async validar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado_validacion, observaciones_admin, tipo_documento } = req.body;

      if (estado_validacion !== 'APROBADO' && estado_validacion !== 'RECHAZADO') {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      await CredencialModel.updateEstado(parseInt(id), estado_validacion, observaciones_admin, tipo_documento);
      res.json({ message: `Credencial ${estado_validacion}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
