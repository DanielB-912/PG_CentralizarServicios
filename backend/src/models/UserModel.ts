import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface User {
  id_usuario?: number;
  email: string;
  password_hash: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  direccion: string;
  foto_url?: string | null;
  rol: 'ADMINISTRADOR' | 'PRESTADOR_TECNICO' | 'CLIENTE';
  estado_activo?: boolean;
  fecha_registro?: Date;
}

export class UserModel {
  static async findByEmail(email: string): Promise<any | null> {
    const query = `
      SELECT u.id_usuario, u.email, u.password_hash, u.nombres, u.apellidos, u.telefono, u.direccion, u.foto_url, u.rol, u.estado_activo, u.fecha_registro,
             p.id_prestador, p.especialidad, p.descripcion_profesional, p.disponibilidad_horaria, 
             p.zona_cobertura, p.macrodistrito, p.saldo, p.lat_cobertura, p.lng_cobertura, p.radio_cobertura,
             (SELECT COUNT(*) FROM credenciales c WHERE c.id_usuario = u.id_usuario AND c.estado_validacion = 'APROBADO') as credenciales_aprobadas
      FROM usuarios u
      LEFT JOIN prestadores p ON u.id_usuario = p.id_usuario
      WHERE u.email = ? AND u.estado_activo = TRUE
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [email]);
    if (rows.length > 0) {
      const row = rows[0];
      const user: any = {
        id_usuario: row.id_usuario,
        email: row.email,
        password_hash: row.password_hash,
        nombres: row.nombres,
        apellidos: row.apellidos,
        telefono: row.telefono,
        direccion: row.direccion,
        foto_url: row.foto_url,
        rol: row.rol,
        estado_activo: row.estado_activo,
        fecha_registro: row.fecha_registro,
        credenciales_aprobadas: row.credenciales_aprobadas
      };
      
      if (row.id_prestador) {
        user.prestador = {
          id_prestador: row.id_prestador,
          especialidad: row.especialidad,
          descripcion_profesional: row.descripcion_profesional,
          disponibilidad_horaria: row.disponibilidad_horaria,
          zona_cobertura: row.zona_cobertura,
          lat_cobertura: row.lat_cobertura,
          lng_cobertura: row.lng_cobertura,
          radio_cobertura: row.radio_cobertura,
          macrodistrito: row.macrodistrito,
          saldo: row.saldo
        };
      }
      return user;
    }
    return null;
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id_usuario, email, password_hash, nombres, apellidos, telefono, direccion, foto_url, rol, estado_activo, fecha_registro FROM usuarios WHERE id_usuario = ? AND estado_activo = TRUE`,
      [id]
    );
    if (rows.length > 0) {
      return rows[0] as User;
    }
    return null;
  }

  static async create(user: User): Promise<number> {
    const { email, password_hash, nombres, apellidos, telefono, direccion, rol, foto_url } = user;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO usuarios (email, password_hash, nombres, apellidos, telefono, direccion, rol, foto_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, password_hash, nombres, apellidos, telefono, direccion, rol, foto_url || null]
    );
    return result.insertId;
  }

  static async findAll(): Promise<User[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id_usuario, email, nombres, apellidos, telefono, direccion, rol, estado_activo, fecha_registro, foto_url 
       FROM usuarios 
       WHERE estado_activo = TRUE`
    );
    return rows as User[];
  }

  static async softDelete(id: number): Promise<void> {
    await pool.execute(
      `UPDATE usuarios SET estado_activo = FALSE WHERE id_usuario = ?`,
      [id]
    );
  }

  static async updateProfile(id: number, data: Partial<User>): Promise<void> {
    const updates = [];
    const values = [];

    if (data.nombres !== undefined) { updates.push('nombres = ?'); values.push(data.nombres); }
    if (data.apellidos !== undefined) { updates.push('apellidos = ?'); values.push(data.apellidos); }
    if (data.telefono !== undefined) { updates.push('telefono = ?'); values.push(data.telefono); }
    if (data.direccion !== undefined) { updates.push('direccion = ?'); values.push(data.direccion); }
    if (data.foto_url !== undefined) { updates.push('foto_url = ?'); values.push(data.foto_url); }
    if (data.rol !== undefined) { updates.push('rol = ?'); values.push(data.rol); }

    if (updates.length > 0) {
      values.push(id);
      await pool.execute(
        `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`,
        values
      );
    }
  }

  static async updatePassword(id: number, hash: string): Promise<void> {
    await pool.execute(
      `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`,
      [hash, id]
    );
  }
}
