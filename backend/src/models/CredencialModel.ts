import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Credencial {
  id_credencial?: number;
  id_usuario: number;
  tipo_documento: 'CI_ANVERSO' | 'CI_REVERSO' | 'TITULO_PROVISION' | 'CERTIFICADO_TECNICO' | 'CURRICULUM';
  documento_url: string;
  estado_validacion?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  observaciones_admin?: string;
  fecha_subida?: Date;
}

export class CredencialModel {
  static async create(credencial: Credencial): Promise<number> {
    const { id_usuario, tipo_documento, documento_url } = credencial;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO credenciales (id_usuario, tipo_documento, documento_url) 
       VALUES (?, ?, ?)`,
      [id_usuario, tipo_documento, documento_url]
    );
    return result.insertId;
  }

  static async getPendientes(): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, u.nombres, u.apellidos, u.email 
       FROM credenciales c
       INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
       WHERE c.estado_validacion = 'PENDIENTE'`
    );
    return rows;
  }

  static async updateEstado(id_credencial: number, estado_validacion: 'APROBADO' | 'RECHAZADO', observaciones_admin?: string, tipo_documento?: string): Promise<void> {
    if (tipo_documento) {
      await pool.execute(
        `UPDATE credenciales SET estado_validacion = ?, observaciones_admin = ?, tipo_documento = ? WHERE id_credencial = ?`,
        [estado_validacion, observaciones_admin || null, tipo_documento, id_credencial]
      );
    } else {
      await pool.execute(
        `UPDATE credenciales SET estado_validacion = ?, observaciones_admin = ? WHERE id_credencial = ?`,
        [estado_validacion, observaciones_admin || null, id_credencial]
      );
    }
  }
}
