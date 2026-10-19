import pool from '../config/db';
import { RowDataPacket } from 'mysql2/promise';

export class ConfiguracionModel {
  static async getValor(clave: string): Promise<string | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT valor FROM configuracion_sistema WHERE clave = ?`,
      [clave]
    );
    if (rows.length > 0) return rows[0].valor;
    return null;
  }

  static async setValor(clave: string, valor: string): Promise<void> {
    await pool.execute(
      `INSERT INTO configuracion_sistema (clave, valor) VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE valor = ?`,
      [clave, valor, valor]
    );
  }

  static async getTasaComision(): Promise<number> {
    const valor = (await this.getValor('tasa_comision')) || (await this.getValor('tasa_comision_porcentaje'));
    return valor ? parseFloat(valor) : 5.00;
  }
}
