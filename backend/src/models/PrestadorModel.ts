import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Prestador {
  id_prestador?: number;
  id_usuario: number;
  tipo_perfil: 'TECNICO' | 'PROFESIONAL';
  especialidad: string;
  descripcion_profesional?: string;
  disponibilidad_horaria?: string;
  zona_cobertura?: string;
  macrodistrito: 'Cala Cala' | 'Centro' | 'Sud' | 'Sacaba' | 'Quillacollo';
  lat_cobertura?: number | null;
  lng_cobertura?: number | null;
  radio_cobertura?: number | null;
  saldo?: number;
  estado_activo?: boolean;
}

export class PrestadorModel {
  static async create(prestador: Prestador): Promise<number> {
    const { id_usuario, tipo_perfil, especialidad, descripcion_profesional, disponibilidad_horaria, zona_cobertura, macrodistrito } = prestador;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO prestadores (id_usuario, tipo_perfil, especialidad, descripcion_profesional, disponibilidad_horaria, zona_cobertura, macrodistrito) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_usuario, tipo_perfil, especialidad, descripcion_profesional || null, disponibilidad_horaria || null, zona_cobertura || null, macrodistrito]
    );
    return result.insertId;
  }

  static async findByUserId(id_usuario: number): Promise<any | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, 
       EXISTS(SELECT 1 FROM credenciales c WHERE c.id_usuario = p.id_usuario AND c.estado_validacion = 'APROBADO') as has_approved_credential,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id_credencial', c.id_credencial, 'tipo_documento', c.tipo_documento, 'estado_validacion', c.estado_validacion, 'documento_url', c.documento_url)) FROM credenciales c WHERE c.id_usuario = p.id_usuario) as credenciales
       FROM prestadores p WHERE p.id_usuario = ? AND p.estado_activo = TRUE`,
      [id_usuario]
    );
    if (rows.length > 0) {
      return rows[0] as Prestador;
    }
    return null;
  }

  static async findById(id_prestador: number): Promise<Prestador | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM prestadores WHERE id_prestador = ? AND estado_activo = TRUE`,
      [id_prestador]
    );
    if (rows.length > 0) {
      return rows[0] as Prestador;
    }
    return null;
  }

  static async getSaldo(id_prestador: number): Promise<number> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT saldo FROM prestadores WHERE id_prestador = ?`,
      [id_prestador]
    );
    if (rows.length > 0) {
      return parseFloat(rows[0].saldo);
    }
    return 0;
  }

  static async updateSaldo(id_prestador: number, nuevo_saldo: number): Promise<void> {
    await pool.execute(
      `UPDATE prestadores SET saldo = ? WHERE id_prestador = ?`,
      [nuevo_saldo, id_prestador]
    );
  }

  static async findFiltered(filtros: { especialidad?: string, macrodistrito?: string }): Promise<any[]> {
    let query = `
      SELECT p.*, u.nombres, u.apellidos, u.foto_url,
             (SELECT AVG(c.puntuacion) FROM calificaciones c 
              INNER JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion 
              WHERE v.id_prestador = p.id_prestador) as calificacion_promedio
      FROM prestadores p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.estado_activo = TRUE AND u.estado_activo = TRUE
    `;
    const params: any[] = [];

    if (filtros.especialidad) {
      query += ` AND p.especialidad LIKE ?`;
      params.push(`%${filtros.especialidad}%`);
    }
    if (filtros.macrodistrito) {
      query += ` AND p.macrodistrito = ?`;
      params.push(filtros.macrodistrito);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows;
  }
  static async getVerificados(): Promise<any[]> {
    const query = `
      SELECT p.id_prestador, p.especialidad, p.descripcion_profesional, p.macrodistrito, 
             p.lat_cobertura, p.lng_cobertura, p.radio_cobertura,
             u.nombres, u.apellidos, u.foto_url, u.telefono,
             (SELECT AVG(c.puntuacion) FROM calificaciones c 
              INNER JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion 
              WHERE v.id_prestador = p.id_prestador) as calificacion_promedio,
             (SELECT JSON_ARRAYAGG(documento_url) FROM credenciales cr WHERE cr.id_usuario = p.id_usuario AND cr.estado_validacion = 'APROBADO') as documentos
      FROM prestadores p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.estado_activo = TRUE AND u.estado_activo = TRUE 
        AND EXISTS (SELECT 1 FROM credenciales cr WHERE cr.id_usuario = p.id_usuario AND cr.estado_validacion = 'APROBADO')
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query);
    return rows;
  }

  static async getCercanos(macrodistrito: string, especialidad?: string): Promise<any[]> {
    let query = `
      SELECT p.id_prestador, p.especialidad, p.descripcion_profesional, p.macrodistrito, 
             p.lat_cobertura, p.lng_cobertura, p.radio_cobertura,
             u.nombres, u.apellidos, u.foto_url, u.telefono,
             (SELECT AVG(c.puntuacion) FROM calificaciones c 
              INNER JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion 
              WHERE v.id_prestador = p.id_prestador) as calificacion_promedio,
             (SELECT JSON_ARRAYAGG(documento_url) FROM credenciales cr WHERE cr.id_usuario = p.id_usuario AND cr.estado_validacion = 'APROBADO') as documentos
      FROM prestadores p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.estado_activo = TRUE AND u.estado_activo = TRUE 
        AND EXISTS (SELECT 1 FROM credenciales cr WHERE cr.id_usuario = p.id_usuario AND cr.estado_validacion = 'APROBADO')
        AND p.macrodistrito = ?
    `;
    const params: any[] = [macrodistrito];

    if (especialidad) {
      query += ` AND p.especialidad LIKE ?`;
      params.push(`%${especialidad}%`);
    }

    query += ` ORDER BY calificacion_promedio DESC LIMIT 5`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows;
  }

  static async findPublicById(id_prestador: number): Promise<any | null> {
    const query = `
      SELECT p.id_prestador, p.especialidad, p.descripcion_profesional, p.macrodistrito, 
             p.disponibilidad_horaria, p.zona_cobertura, p.lat_cobertura, p.lng_cobertura, p.radio_cobertura,
             u.nombres, u.apellidos, u.foto_url, u.telefono, u.rol,
             (SELECT AVG(c.puntuacion) FROM calificaciones c 
              INNER JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion 
              WHERE v.id_prestador = p.id_prestador) as calificacion_promedio,
             (SELECT JSON_ARRAYAGG(JSON_OBJECT('tipo_documento', cr.tipo_documento, 'documento_url', cr.documento_url)) FROM credenciales cr WHERE cr.id_usuario = p.id_usuario AND cr.estado_validacion = 'APROBADO') as documentos
      FROM prestadores p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE p.id_prestador = ? AND p.estado_activo = TRUE AND u.estado_activo = TRUE 
    `;
    const [rows] = await pool.execute<RowDataPacket[]>(query, [id_prestador]);
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  }

  static async updateProfile(id_prestador: number, data: Partial<Prestador>): Promise<void> {
    const updates = [];
    const values = [];

    if (data.especialidad !== undefined) { updates.push('especialidad = ?'); values.push(data.especialidad); }
    if (data.macrodistrito !== undefined) { updates.push('macrodistrito = ?'); values.push(data.macrodistrito); }
    if (data.descripcion_profesional !== undefined) { updates.push('descripcion_profesional = ?'); values.push(data.descripcion_profesional); }
    if (data.disponibilidad_horaria !== undefined) { updates.push('disponibilidad_horaria = ?'); values.push(data.disponibilidad_horaria); }
    if (data.zona_cobertura !== undefined) { updates.push('zona_cobertura = ?'); values.push(data.zona_cobertura); }
    if (data.lat_cobertura !== undefined) { updates.push('lat_cobertura = ?'); values.push(data.lat_cobertura); }
    if (data.lng_cobertura !== undefined) { updates.push('lng_cobertura = ?'); values.push(data.lng_cobertura); }
    if (data.radio_cobertura !== undefined) { updates.push('radio_cobertura = ?'); values.push(data.radio_cobertura); }

    if (updates.length > 0) {
      values.push(id_prestador);
      await pool.execute(
        `UPDATE prestadores SET ${updates.join(', ')} WHERE id_prestador = ?`,
        values
      );
    }
  }
}
