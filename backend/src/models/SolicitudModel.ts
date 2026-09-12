import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Solicitud {
  id_solicitud?: number;
  id_cliente: number;
  tipo_servicio: string;
  descripcion: string;
  presupuesto?: number;
  ubicacion_lat: number;
  ubicacion_lng: number;
  macrodistrito: string;
  estado_solicitud?: 'PENDIENTE' | 'OFERTADA' | 'VINCULADA' | 'FINALIZADA' | 'CANCELADA';
  fecha_solicitud?: Date;
}

export class SolicitudModel {
  static async create(solicitud: Solicitud): Promise<number> {
    const { id_cliente, tipo_servicio, descripcion, presupuesto, ubicacion_lat, ubicacion_lng, macrodistrito } = solicitud;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO solicitudes (id_cliente, tipo_servicio, descripcion, presupuesto, ubicacion_lat, ubicacion_lng, macrodistrito) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_cliente, tipo_servicio, descripcion, presupuesto || null, ubicacion_lat, ubicacion_lng, macrodistrito]
    );
    return result.insertId;
  }

  static async findFeed(macrodistrito?: string): Promise<any[]> {
    let query = `
      SELECT s.*, u.nombres as cliente_nombres, u.apellidos as cliente_apellidos 
      FROM solicitudes s
      INNER JOIN usuarios u ON s.id_cliente = u.id_usuario
      WHERE s.estado_solicitud = 'PENDIENTE'
    `;
    const params: any[] = [];

    if (macrodistrito) {
      query += ` AND s.macrodistrito = ?`;
      params.push(macrodistrito);
    }

    query += ` ORDER BY s.fecha_solicitud DESC`;

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    return rows;
  }

  static async updateEstado(id_solicitud: number, estado_solicitud: 'PENDIENTE' | 'OFERTADA' | 'VINCULADA' | 'FINALIZADA' | 'CANCELADA'): Promise<void> {
    await pool.execute(
      `UPDATE solicitudes SET estado_solicitud = ? WHERE id_solicitud = ?`,
      [estado_solicitud, id_solicitud]
    );
  }

  static async findByClient(id_cliente: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, 
              v.id_vinculacion, v.id_prestador, u.nombres as prestador_nombres, u.apellidos as prestador_apellidos, u.telefono as prestador_telefono,
              (SELECT COUNT(*) FROM ofertas o WHERE o.id_solicitud = s.id_solicitud AND o.estado_oferta IN ('PENDIENTE', 'RECOTIZADA')) as ofertas_pendientes
       FROM solicitudes s
       LEFT JOIN vinculaciones v ON s.id_solicitud = v.id_solicitud
       LEFT JOIN prestadores p ON v.id_prestador = p.id_prestador
       LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE s.id_cliente = ? ORDER BY s.fecha_solicitud DESC`,
      [id_cliente]
    );
    return rows;
  }

  static async findById(id_solicitud: number): Promise<Solicitud | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM solicitudes WHERE id_solicitud = ?`,
      [id_solicitud]
    );
    if (rows.length > 0) return rows[0] as Solicitud;
    return null;
  }
}
