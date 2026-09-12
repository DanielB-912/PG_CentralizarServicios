import { UserModel } from '../models/UserModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db';

dotenv.config();

export class AuthService {
  static async login(email: string, contrasena: string) {
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(contrasena, user.password_hash);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    const payload = {
      id_usuario: user.id_usuario,
      email: user.email,
      rol: user.rol,
      nombres: user.nombres,
      apellidos: user.apellidos,
      telefono: user.telefono,
      foto_url: user.foto_url,
      prestador: user.prestador,
      credenciales_aprobadas: user.credenciales_aprobadas
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '12h' });

    return { token, user: payload };
  }

  static async register(datos: any) {
    const { nombres, apellidos, email, contrasena, rol, telefono, direccion } = datos;

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new Error('El correo electrónico ya se encuentra registrado en la plataforma.');
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passRegex.test(contrasena)) {
      throw new Error('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.');
    }

    const password_hash = await bcrypt.hash(contrasena, 10);

    const newUser = {
      nombres,
      apellidos,
      email,
      password_hash,
      rol,
      telefono: telefono || '',
      direccion: direccion || ''
    };

    let id_usuario: number;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [userResult] = await connection.execute<any>(
        `INSERT INTO usuarios (email, password_hash, nombres, apellidos, telefono, direccion, rol, foto_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newUser.email, newUser.password_hash, newUser.nombres, newUser.apellidos, newUser.telefono, newUser.direccion, newUser.rol, null]
      );
      id_usuario = userResult.insertId;

      if (rol === 'PRESTADOR_TECNICO') {
        await connection.execute(
          `INSERT INTO prestadores (id_usuario, tipo_perfil, especialidad, macrodistrito, saldo) 
           VALUES (?, ?, ?, ?, ?)`,
          [id_usuario, 'TECNICO', 'General', 'Centro', 0.00]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const payload = {
      id_usuario: id_usuario,
      email: newUser.email,
      rol: newUser.rol,
      nombres: newUser.nombres,
      apellidos: newUser.apellidos,
      telefono: newUser.telefono,
      foto_url: null,
      prestador: rol === 'PRESTADOR_TECNICO' ? {
        especialidad: 'General',
        macrodistrito: 'Centro',
        saldo: 0.00
      } : undefined,
      credenciales_aprobadas: 0
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '12h' });

    return { token, user: payload };
  }
}
