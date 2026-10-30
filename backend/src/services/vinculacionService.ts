import pool from '../config/db';
import { VinculacionModel } from '../models/VinculacionModel';
import { TransaccionModel } from '../models/TransaccionModel';
import { PrestadorModel } from '../models/PrestadorModel';
import { SolicitudModel } from '../models/SolicitudModel';
import { ConfiguracionModel } from '../models/ConfiguracionModel';

export class VinculacionService {
  static async aceptarOferta(id_solicitud: number, id_prestador: number, monto_ofertado: number, id_oferta?: number): Promise<{ id_vinculacion: number, telefono_prestador: string, cliente_telefono: string, cliente_nombres: string, cliente_apellidos: string, latitud: number, longitud: number, direccion: string }> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Consulta la tasa de comisión configurada
      const tasa = await ConfiguracionModel.getTasaComision();

      // 2. Calcula monto_comision
      const monto_comision = parseFloat(((monto_ofertado * tasa) / 100).toFixed(2));

      // 3. Verifica saldo del prestador
      // Reutilizamos el query o hacemos una consulta en la transaccion para bloquear la fila si es necesario.
      const [prestadorRows] = await connection.execute<any[]>(
        `SELECT p.saldo, u.telefono FROM prestadores p
         INNER JOIN usuarios u ON p.id_usuario = u.id_usuario 
         WHERE p.id_prestador = ? FOR UPDATE`,
        [id_prestador]
      );

      if (prestadorRows.length === 0) {
        throw new Error("Prestador no encontrado.");
      }

      const saldo_actual = parseFloat(prestadorRows[0].saldo);
      const telefono_prestador = prestadorRows[0].telefono;

      // Allow negative balance instead of throwing an error for insufficient funds
      const saldo_posterior = parseFloat((saldo_actual - monto_comision).toFixed(2));

      // 4. Si cumple: resta saldo en prestadores
      await connection.execute(
        `UPDATE prestadores SET saldo = ? WHERE id_prestador = ?`,
        [saldo_posterior, id_prestador]
      );

      // inserta en vinculaciones
      const id_vinculacion = await VinculacionModel.createWithTransaction({
        id_solicitud,
        id_prestador,
        valor_acordado: monto_ofertado,
        comision_aplicada: monto_comision,
        tasa_porcentaje: tasa
      }, connection);

      // crea registro en transacciones
      await TransaccionModel.createWithTransaction({
        id_vinculacion,
        id_prestador,
        tipo_transaccion: 'DEBITO_COMISION',
        monto: monto_comision,
        saldo_anterior: saldo_actual,
        saldo_posterior: saldo_posterior
      }, connection);

      // actualiza estado de la solicitud
      await connection.execute(
        `UPDATE solicitudes SET estado_solicitud = 'VINCULADA' WHERE id_solicitud = ?`,
        [id_solicitud]
      );

      // actualiza estado de la oferta seleccionada a ACEPTADA y las demás a NO_SELECCIONADA
      let targetOfertaId = id_oferta;
      if (!targetOfertaId) {
        const [ofertaRows] = await connection.execute<any[]>(
          `SELECT id_oferta FROM ofertas WHERE id_solicitud = ? AND id_prestador = ? ORDER BY fecha_oferta DESC LIMIT 1`,
          [id_solicitud, id_prestador]
        );
        if (ofertaRows.length > 0) {
          targetOfertaId = ofertaRows[0].id_oferta;
        }
      }

      if (targetOfertaId) {
        await connection.execute(
          `UPDATE ofertas SET estado_oferta = 'ACEPTADA' WHERE id_oferta = ?`,
          [targetOfertaId]
        );
        await connection.execute(
          `UPDATE ofertas 
           SET estado_oferta = 'NO_SELECCIONADA' 
           WHERE id_solicitud = ? AND id_oferta != ? AND estado_oferta IN ('PENDIENTE', 'ENVIADA', 'CONTRAOFERTADA')`,
          [id_solicitud, targetOfertaId]
        );
      } else {
        await connection.execute(
          `UPDATE ofertas SET estado_oferta = 'ACEPTADA' WHERE id_solicitud = ? AND id_prestador = ?`,
          [id_solicitud, id_prestador]
        );
        await connection.execute(
          `UPDATE ofertas 
           SET estado_oferta = 'NO_SELECCIONADA' 
           WHERE id_solicitud = ? AND id_prestador != ? AND estado_oferta IN ('PENDIENTE', 'ENVIADA', 'CONTRAOFERTADA')`,
          [id_solicitud, id_prestador]
        );
      }

      // get client's full details and location
      const [clienteRows] = await connection.execute<any[]>(
        `SELECT u_cli.telefono, u_cli.nombres, u_cli.apellidos, s.ubicacion_lat as latitud, s.ubicacion_lng as longitud, s.descripcion as direccion 
         FROM solicitudes s 
         JOIN usuarios u_cli ON s.id_cliente = u_cli.id_usuario 
         WHERE s.id_solicitud = ?`,
        [id_solicitud]
      );
      
      const clientData = clienteRows.length > 0 ? clienteRows[0] : {};

      await connection.commit();
      return { 
        id_vinculacion,
        telefono_prestador, 
        cliente_telefono: clientData.telefono || '',
        cliente_nombres: clientData.nombres || '',
        cliente_apellidos: clientData.apellidos || '',
        latitud: clientData.latitud || 0,
        longitud: clientData.longitud || 0,
        direccion: clientData.direccion || ''
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async recargarSaldo(id_prestador: number, monto: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [prestadorRows] = await connection.execute<any[]>(
        `SELECT saldo FROM prestadores WHERE id_prestador = ? FOR UPDATE`,
        [id_prestador]
      );

      if (prestadorRows.length === 0) {
        throw new Error("Prestador no encontrado.");
      }

      const saldo_actual = parseFloat(prestadorRows[0].saldo);
      const saldo_posterior = parseFloat((saldo_actual + monto).toFixed(2));

      await connection.execute(
        `UPDATE prestadores SET saldo = ? WHERE id_prestador = ?`,
        [saldo_posterior, id_prestador]
      );

      await TransaccionModel.createWithTransaction({
        id_prestador,
        tipo_transaccion: 'RECARGA_SALDO',
        monto,
        saldo_anterior: saldo_actual,
        saldo_posterior: saldo_posterior
      }, connection);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
