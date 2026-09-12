import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface Calificacion {
  id_calificacion?: number;
  id_vinculacion: number;
  puntuacion: number;
  comentario?: string;
  fecha_calificacion?: Date;
}

export class CalificacionModel {
  static async create(calificacion: Calificacion): Promise<number> {
    const { id_vinculacion, puntuacion, comentario } = calificacion;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO calificaciones (id_vinculacion, puntuacion, comentario) 
       VALUES (?, ?, ?)`,
      [id_vinculacion, puntuacion, comentario || null]
    );
    return result.insertId;
  }

  static async findByVinculacion(id_vinculacion: number): Promise<Calificacion | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM calificaciones WHERE id_vinculacion = ?`,
      [id_vinculacion]
    );
    if (rows.length > 0) return rows[0] as Calificacion;
    return null;
  }

  static async getResenasByPrestador(id_prestador: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.puntuacion as rating, c.comentario, c.fecha_calificacion as fecha,
              u.nombres as cliente_nombre, u.apellidos as cliente_apellido,
              s.tipo_servicio, s.descripcion AS solicitud_descripcion
       FROM calificaciones c
       JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion
       JOIN solicitudes s ON v.id_solicitud = s.id_solicitud
       JOIN usuarios u ON s.id_cliente = u.id_usuario
       WHERE v.id_prestador = ?
       ORDER BY c.fecha_calificacion DESC`,
      [id_prestador]
    );
    return rows;
  }
}
