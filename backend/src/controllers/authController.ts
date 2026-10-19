import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const email = req.body.email ? req.body.email.toString().trim().toLowerCase() : '';
      const contrasena = req.body.contrasena ? req.body.contrasena.toString().trim() : '';

      if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Por favor, ingrese un correo electrónico válido.' });
      }

      if (!contrasena) {
        return res.status(400).json({ error: 'La contraseña es requerida.' });
      }

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
      const email = req.body.email ? req.body.email.toString().trim().toLowerCase() : '';
      const contrasena = req.body.contrasena ? req.body.contrasena.toString().trim() : '';
      const nombres = req.body.nombres ? req.body.nombres.toString().trim() : '';
      const apellidos = req.body.apellidos ? req.body.apellidos.toString().trim() : '';
      const telefono = req.body.telefono ? req.body.telefono.toString().trim() : '';
      const direccion = req.body.direccion ? req.body.direccion.toString().trim() : '';
      const rol = req.body.rol ? req.body.rol.toString().trim() : 'CLIENTE';

      if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Por favor, ingrese un correo electrónico válido.' });
      }

      if (!contrasena) {
        return res.status(400).json({ error: 'La contraseña es requerida.' });
      }

      if (!nombres || !apellidos) {
        return res.status(400).json({ error: 'Nombres y apellidos son requeridos.' });
      }

      const result = await AuthService.register({
        ...req.body,
        email,
        contrasena,
        nombres,
        apellidos,
        telefono,
        direccion,
        rol
      });
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
