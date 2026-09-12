import pool from '../config/db';
import { RowDataPacket, ResultSetHeader, Connection } from 'mysql2/promise';

export interface Transaccion {
  id_transaccion?: number;
  id_vinculacion?: number;
  id_prestador: number;
  tipo_transaccion: 'DEBITO_COMISION' | 'RECARGA_SALDO';
  monto: number;
  saldo_anterior: number;
  saldo_posterior: number;
  fecha_transaccion?: Date;
}

export class TransaccionModel {
  static async createWithTransaction(transaccion: Transaccion, connection: Connection): Promise<number> {
    const { id_vinculacion, id_prestador, tipo_transaccion, monto, saldo_anterior, saldo_posterior } = transaccion;
    
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO transacciones (id_vinculacion, id_prestador, tipo_transaccion, monto, saldo_anterior, saldo_posterior) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_vinculacion || null, id_prestador, tipo_transaccion, monto, saldo_anterior, saldo_posterior]
    );
    return result.insertId;
  }

  static async getHistoryByPrestador(id_prestador: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM transacciones WHERE id_prestador = ? ORDER BY fecha_transaccion DESC`,
      [id_prestador]
    );
    return rows;
  }
}
