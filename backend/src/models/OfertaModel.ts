import pool from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Oferta {
  id_oferta?: number;
  id_solicitud: number;
  id_prestador: number;
  monto_ofertado: number;
  mensaje_propuesta?: string;
  estado_oferta?: 'ENVIADA' | 'RECHAZADA' | 'ACEPTADA' | 'CONTRAOFERTADA';
  fecha_oferta?: Date;
}

export class OfertaModel {
  static async create(oferta: Oferta): Promise<number> {
    const { id_solicitud, id_prestador, monto_ofertado, mensaje_propuesta } = oferta;
    
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO ofertas (id_solicitud, id_prestador, monto_ofertado, mensaje_propuesta) 
       VALUES (?, ?, ?, ?)`,
      [id_solicitud, id_prestador, monto_ofertado, mensaje_propuesta || null]
    );
    return result.insertId;
  }

  static async findBySolicitud(id_solicitud: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.*, p.especialidad, u.nombres, u.apellidos,
              (SELECT AVG(c.puntuacion) FROM calificaciones c 
               INNER JOIN vinculaciones v ON c.id_vinculacion = v.id_vinculacion 
               WHERE v.id_prestador = p.id_prestador) as calificacion_promedio
       FROM ofertas o
       INNER JOIN prestadores p ON o.id_prestador = p.id_prestador
       INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE o.id_solicitud = ?`,
      [id_solicitud]
    );
    return rows;
  }

  static async findById(id_oferta: number): Promise<Oferta | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM ofertas WHERE id_oferta = ?`,
      [id_oferta]
    );
    if (rows.length > 0) return rows[0] as Oferta;
    return null;
  }

  static async updateEstado(id_oferta: number, estado_oferta: 'ENVIADA' | 'RECHAZADA' | 'ACEPTADA' | 'CONTRAOFERTADA'): Promise<void> {
    await pool.execute(
      `UPDATE ofertas SET estado_oferta = ? WHERE id_oferta = ?`,
      [estado_oferta, id_oferta]
    );
  }

  static async updateContraoferta(id_oferta: number, monto_ofertado: number, mensaje_propuesta: string): Promise<void> {
    await pool.execute(
      `UPDATE ofertas SET monto_ofertado = ?, mensaje_propuesta = ?, estado_oferta = 'CONTRAOFERTADA' WHERE id_oferta = ?`,
      [monto_ofertado, mensaje_propuesta || null, id_oferta]
    );
  }

  static async findByPrestador(id_prestador: number): Promise<any[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT o.*, s.tipo_servicio, s.descripcion, u.direccion as direccion, s.ubicacion_lat as latitud, s.ubicacion_lng as longitud, s.presupuesto, s.macrodistrito, s.fecha_solicitud, u.nombres as cliente_nombres, u.apellidos as cliente_apellidos, u.telefono as cliente_telefono 
       FROM ofertas o
       INNER JOIN solicitudes s ON o.id_solicitud = s.id_solicitud
       INNER JOIN usuarios u ON s.id_cliente = u.id_usuario
       WHERE o.id_prestador = ? ORDER BY o.fecha_oferta DESC`,
      [id_prestador]
    );
    return rows;
  }
}