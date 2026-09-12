import pool from '../config/db';
import { RowDataPacket, ResultSetHeader, Connection } from 'mysql2/promise';

export interface Vinculacion {
  id_vinculacion?: number;
  id_solicitud: number;
  id_prestador: number;
  valor_acordado: number;
  comision_aplicada: number;
  tasa_porcentaje: number;
  estado_vinculacion?: 'ACTIVA' | 'COMPLETADA' | 'CANCELADA';
  fecha_vinculacion?: Date;
}

export class VinculacionModel {
  static async createWithTransaction(vinculacion: Vinculacion, connection: Connection): Promise<number> {
    const { id_solicitud, id_prestador, valor_acordado, comision_aplicada, tasa_porcentaje } = vinculacion;
    
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO vinculaciones (id_solicitud, id_prestador, valor_acordado, comision_aplicada, tasa_porcentaje) 
       VALUES (?, ?, ?, ?, ?)`,
      [id_solicitud, id_prestador, valor_acordado, comision_aplicada, tasa_porcentaje]
    );
    return result.insertId;
  }

  static async findById(id_vinculacion: number): Promise<Vinculacion | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM vinculaciones WHERE id_vinculacion = ?`,
      [id_vinculacion]
    );
    if (rows.length > 0) return rows[0] as Vinculacion;
    return null;
  }

  static async updateEstado(id_vinculacion: number, estado_vinculacion: 'ACTIVA' | 'COMPLETADA' | 'CANCELADA'): Promise<void> {
    await pool.execute(
      `UPDATE vinculaciones SET estado_vinculacion = ? WHERE id_vinculacion = ?`,
      [estado_vinculacion, id_vinculacion]
    );
  }
}
