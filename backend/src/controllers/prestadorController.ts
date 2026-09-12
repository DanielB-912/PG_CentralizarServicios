import { Request, Response } from 'express';
import { PrestadorModel } from '../models/PrestadorModel';
import { CalificacionModel } from '../models/CalificacionModel';

export class PrestadorController {
  static async getMe(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) {
        return res.status(404).json({ error: 'Perfil de prestador no encontrado.' });
      }
      res.json(prestador);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  static async getVerificados(req: Request, res: Response) {
    try {
      const verificados = await PrestadorModel.getVerificados();
      res.json(verificados);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCercanos(req: Request, res: Response) {
    try {
      const { macrodistrito, especialidad } = req.query;
      if (!macrodistrito) {
        return res.status(400).json({ error: 'El macrodistrito es requerido' });
      }
      const cercanos = await PrestadorModel.getCercanos(String(macrodistrito), especialidad ? String(especialidad) : undefined);
      res.json(cercanos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id_prestador, 10);
      const prestador = await PrestadorModel.findPublicById(id);
      if (!prestador) {
        return res.status(404).json({ error: 'Prestador no encontrado' });
      }
      res.json(prestador);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getResenas(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id_prestador, 10);
      const resenas = await CalificacionModel.getResenasByPrestador(id);
      res.json(resenas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const data = req.body;
      let prestador = await PrestadorModel.findByUserId(id_usuario);
      if (!prestador) {
        // Upsert: create if not exists
        await PrestadorModel.create({
          id_usuario,
          tipo_perfil: 'TECNICO',
          especialidad: data.especialidad || 'General',
          macrodistrito: data.macrodistrito || 'Centro',
          saldo: 0.00
        });
        prestador = await PrestadorModel.findByUserId(id_usuario);
      } else {
        await PrestadorModel.updateProfile(prestador.id_prestador, data);
      }
      res.json({ message: 'Perfil de prestador actualizado' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
