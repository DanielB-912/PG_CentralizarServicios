import { Request, Response } from 'express';
import pool from '../config/db';

export class ReportesController {
  static async getDashboardMetrics(req: Request, res: Response) {
    try {
      console.log(">>> [AUDITORIA DB] Ejecutando getReportesDashboard...");

      // Inspeccionar columnas reales de ofertas para evitar ER_BAD_FIELD_ERROR
      const [cols]: any = await pool.query("DESCRIBE ofertas;");
      const colNames: string[] = cols.map((c: any) => c.Field);
      console.log(">>> [AUDITORIA DB] Columnas en tabla ofertas:", colNames);

      let montoCol = "precio_ofertado";
      if (colNames.includes("monto")) montoCol = "monto";
      else if (colNames.includes("monto_ofertado")) montoCol = "monto_ofertado";
      else if (colNames.includes("precio")) montoCol = "precio";
      else if (colNames.includes("tarifa")) montoCol = "tarifa";

      // 1. Usuarios reales (excluyendo admin)
      const [usuariosRows]: any = await pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol != 'ADMIN' AND rol != 'ADMINISTRADOR'");
      const totalUsuarios = Number(usuariosRows[0]?.total || 0);

      // 2. Solicitudes vinculadas
      const [vinculacionesRows]: any = await pool.query("SELECT COUNT(*) AS total FROM solicitudes WHERE estado_solicitud = 'VINCULADA'");
      const totalVinculaciones = Number(vinculacionesRows[0]?.total || 0);

      // 3. Comisiones generadas (8% sobre ofertas aceptadas usando la columna real detectada)
      const [ingresosRows]: any = await pool.query(`
        SELECT COALESCE(SUM(${montoCol} * 0.08), 0) AS total 
        FROM ofertas 
        WHERE estado_oferta = 'ACEPTADA'
      `);
      const totalIngresos = Number(ingresosRows[0]?.total || 0);

      // 4. Demanda por macrodistrito
      const [macroRows]: any = await pool.query(`
        SELECT COALESCE(macrodistrito, 'Cochabamba Cercado') AS macrodistrito, COUNT(*) AS cantidad 
        FROM solicitudes 
        GROUP BY macrodistrito
      `);

      // Inspeccionar columnas reales de solicitudes
      const [colsSol]: any = await pool.query("DESCRIBE solicitudes;");
      const solColNames: string[] = colsSol.map((c: any) => c.Field);
      console.log(">>> [AUDITORIA DB] Columnas en tabla solicitudes:", solColNames);

      let fechaCol = "fecha_solicitud";
      if (solColNames.includes("fecha_solicitud")) fechaCol = "fecha_solicitud";
      else if (solColNames.includes("fecha_creacion")) fechaCol = "fecha_creacion";
      else if (solColNames.includes("created_at")) fechaCol = "created_at";
      else if (solColNames.includes("fecha")) fechaCol = "fecha";

      // 5. Historial de transacciones (Últimas 100 con la columna real)
      const [txRows]: any = await pool.query(`
        SELECT s.id_solicitud AS id, s.${fechaCol} AS fecha, CONCAT(u.nombres, ' ', u.apellidos) AS prestador, pr.especialidad AS prestador_especialidad, o.${montoCol} AS monto
        FROM ofertas o
        JOIN solicitudes s ON o.id_solicitud = s.id_solicitud
        JOIN prestadores pr ON o.id_prestador = pr.id_prestador
        JOIN usuarios u ON pr.id_usuario = u.id_usuario
        WHERE o.estado_oferta = 'ACEPTADA'
        ORDER BY s.${fechaCol} DESC LIMIT 100
      `);

      // 6. Ingresos diarios para el gráfico
      const [diariosRows]: any = await pool.query(`
        SELECT DATE(s.${fechaCol}) AS fecha, SUM(o.${montoCol} * 0.08) AS total_comision, COUNT(*) AS total_vinculaciones
        FROM ofertas o
        JOIN solicitudes s ON o.id_solicitud = s.id_solicitud
        WHERE o.estado_oferta = 'ACEPTADA'
        GROUP BY DATE(s.${fechaCol})
        ORDER BY fecha DESC
        LIMIT 10
      `);

      const payload = {
        usuariosTotales: totalUsuarios,
        serviciosVinculados: totalVinculaciones,
        ingresosTotales: totalIngresos,
        tasaComision: 8,
        macrodistritos: macroRows.length > 0 ? macroRows : [{ macrodistrito: 'Cercado', cantidad: totalVinculaciones || 1 }],
        transacciones: txRows,
        ingresosDiarios: diariosRows
      };

      console.log(">>> [AUDITORIA DB] Payload generado con éxito:", payload);
      return res.json({ success: true, ...payload });
    } catch (error: any) {
      console.error(">>> [ERROR CRITICO DB] En getReportesDashboard:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}
