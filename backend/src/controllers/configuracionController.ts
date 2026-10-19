import { Request, Response } from 'express';
import { ConfiguracionModel } from '../models/ConfiguracionModel';

export class ConfiguracionController {
  static async getComision(req: Request, res: Response) {
    try {
      let config = await ConfiguracionModel.getValor('tasa_comision');
      if (!config) {
        config = await ConfiguracionModel.getValor('tasa_comision_porcentaje');
      }
      res.json({ comision: config ? parseFloat(config) : 5 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateComision(req: Request, res: Response) {
    try {
      const { comision } = req.body;
      if (comision < 5 || comision > 10) {
        return res.status(400).json({ error: 'La comisión debe estar entre 5% y 10%' });
      }
      await ConfiguracionModel.setValor('tasa_comision', comision.toString());
      await ConfiguracionModel.setValor('tasa_comision_porcentaje', comision.toString());
      res.json({ message: 'Comisión actualizada correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
