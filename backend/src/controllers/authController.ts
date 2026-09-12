import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, contrasena } = req.body;
      const result = await AuthService.login(email, contrasena);
      res.json({
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        token: result.token,
        user: result.user
      });
    } catch (error: any) {
      if (error.message === 'El correo electrónico ya se encuentra registrado en la plataforma.') {
        res.status(409).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }
}
