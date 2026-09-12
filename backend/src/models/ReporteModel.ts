import pool from '../config/db';
import { RowDataPacket } from 'mysql2/promise';

export class ReporteModel {
  static async getMetricasGenerales() {
    // Total Usuarios (sin ADMIN)
    const [usuariosRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM usuarios WHERE rol != 'ADMIN' AND rol != 'ADMINISTRADOR'`);
    // Total Solicitudes Vinculadas
    const [vinculacionesRows] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM solicitudes WHERE estado_solicitud = 'VINCULADA'`);
    // Total Recaudado (Comisiones)
    const [comisionesRows] = await pool.execute<RowDataPacket[]>(`SELECT COALESCE(SUM(monto * 0.08), 0) AS total FROM ofertas WHERE estado_oferta = 'ACEPTADA'`);

    // Grouping by Macrodistrito
    const [demandaMacrodistrito] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(macrodistrito, 'Cochabamba') AS macrodistrito, COUNT(*) AS cantidad 
       FROM solicitudes 
       GROUP BY macrodistrito`
    );

    // Grouping Income by Date (Last 7 Days approximated, or just group by Date)
    const [ingresosPorDia] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(fecha_transaccion) as fecha, SUM(monto) as monto 
       FROM transacciones 
       WHERE tipo_transaccion IN ('COMISION_PLATAFORMA', 'DEBITO_COMISION')
       GROUP BY DATE(fecha_transaccion)
       ORDER BY fecha DESC
       LIMIT 7`
    );

    return {
      totalUsuarios: usuariosRows[0].total,
      totalVinculaciones: vinculacionesRows[0].total,
      totalRecaudado: comisionesRows[0].total,
      demandaMacrodistrito,
      ingresosPorDia: ingresosPorDia.reverse(), // For charts
    };
  }

  static async getReporteTransacciones(limit = 100) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.id_solicitud AS id, s.fecha_creacion AS fecha, u.nombres AS prestador, o.monto AS monto
       FROM ofertas o
       JOIN solicitudes s ON o.id_solicitud = s.id_solicitud
       JOIN prestadores pr ON o.id_prestador = pr.id_prestador
       JOIN usuarios u ON pr.id_usuario = u.id_usuario
       WHERE o.estado_oferta = 'ACEPTADA'
       ORDER BY s.fecha_creacion DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }
}
