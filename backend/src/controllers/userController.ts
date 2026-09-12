import { Request, Response } from 'express';
import { UserModel } from '../models/UserModel';
import bcrypt from 'bcryptjs';

export class UserController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await UserModel.findAll();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async softDeleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await UserModel.softDelete(parseInt(id));
      res.json({ message: 'Usuario desactivado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      await UserModel.updateProfile(parseInt(id), data);
      res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePassword(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      const user = await UserModel.findById(id_usuario);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passRegex.test(newPassword)) {
        return res.status(400).json({ error: 'La nueva contraseña no cumple los requisitos de seguridad' });
      }

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);

      await UserModel.updatePassword(id_usuario, hash);

      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateMe(req: Request, res: Response) {
    let connection;
    try {
      const { id_usuario } = (req as any).user;
      const data = req.body;
      
      const { 
        nombres, apellidos, telefono, direccion, foto_url, rol, // User fields
        especialidad, macrodistrito, descripcion_profesional, disponibilidad_horaria, zona_cobertura, lat_cobertura, lng_cobertura, radio_cobertura // Prestador fields
      } = data;

      // Import pool dynamically or at the top. Let's just use it dynamically if not imported, 
      // but wait, I can just require it or import it.
      const pool = require('../config/db').default;
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Update User
      const userUpdates = [];
      const userValues = [];
      if (nombres !== undefined) { userUpdates.push('nombres = ?'); userValues.push(nombres); }
      if (apellidos !== undefined) { userUpdates.push('apellidos = ?'); userValues.push(apellidos); }
      if (telefono !== undefined) { userUpdates.push('telefono = ?'); userValues.push(telefono); }
      if (direccion !== undefined) { userUpdates.push('direccion = ?'); userValues.push(direccion); }
      if (foto_url !== undefined) { userUpdates.push('foto_url = ?'); userValues.push(foto_url); }
      if (rol !== undefined) { userUpdates.push('rol = ?'); userValues.push(rol); }

      if (userUpdates.length > 0) {
        userValues.push(id_usuario);
        await connection.execute(
          `UPDATE usuarios SET ${userUpdates.join(', ')} WHERE id_usuario = ?`,
          userValues
        );
      }

      // If Prestador, Update Prestador
      if (especialidad !== undefined || macrodistrito !== undefined || descripcion_profesional !== undefined || disponibilidad_horaria !== undefined || zona_cobertura !== undefined || lat_cobertura !== undefined || lng_cobertura !== undefined || radio_cobertura !== undefined) {
        const prestadorUpdates = [];
        const prestadorValues = [];
        if (especialidad !== undefined) { prestadorUpdates.push('especialidad = ?'); prestadorValues.push(especialidad); }
        if (macrodistrito !== undefined) { prestadorUpdates.push('macrodistrito = ?'); prestadorValues.push(macrodistrito); }
        if (descripcion_profesional !== undefined) { prestadorUpdates.push('descripcion_profesional = ?'); prestadorValues.push(descripcion_profesional); }
        if (disponibilidad_horaria !== undefined) { prestadorUpdates.push('disponibilidad_horaria = ?'); prestadorValues.push(disponibilidad_horaria); }
        if (zona_cobertura !== undefined) { prestadorUpdates.push('zona_cobertura = ?'); prestadorValues.push(zona_cobertura); }
        if (lat_cobertura !== undefined) { prestadorUpdates.push('lat_cobertura = ?'); prestadorValues.push(lat_cobertura !== null ? Number(lat_cobertura) : null); }
        if (lng_cobertura !== undefined) { prestadorUpdates.push('lng_cobertura = ?'); prestadorValues.push(lng_cobertura !== null ? Number(lng_cobertura) : null); }
        if (radio_cobertura !== undefined) { prestadorUpdates.push('radio_cobertura = ?'); prestadorValues.push(radio_cobertura !== null ? Number(radio_cobertura) : null); }

        if (prestadorUpdates.length > 0) {
          prestadorValues.push(id_usuario); // Since prestadores has id_usuario
          await connection.execute(
            `UPDATE prestadores SET ${prestadorUpdates.join(', ')} WHERE id_usuario = ?`,
            prestadorValues
          );
        }
      }

      await connection.commit();
      
      const updatedUser = await UserModel.findById(id_usuario) as any;
      const prestadorData = await require('../models/PrestadorModel').PrestadorModel.findByUserId(id_usuario);
      if (prestadorData) {
        updatedUser.prestador = prestadorData;
      }
      
      res.json({ message: 'Perfil actualizado correctamente', user: updatedUser });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: error.message });
    } finally {
      if (connection) connection.release();
    }
  }

  static async uploadAvatar(req: Request, res: Response) {
    try {
      const { id_usuario } = (req as any).user;
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }
      const foto_url = `http://localhost:3001/uploads/${req.file.filename}`;
      await UserModel.updateProfile(id_usuario, { foto_url });
      res.json({ message: 'Avatar actualizado', foto_url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}