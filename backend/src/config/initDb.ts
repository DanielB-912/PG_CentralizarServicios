import fs from 'fs';
import path from 'path';
import pool from './db';
import { RowDataPacket } from 'mysql2';

export const ensureDatabaseSchema = async () => {
  let connection;
  try {
    console.log('[AutoMigrate] Verificando esquema de la base de datos...');
    connection = await pool.getConnection();

    // Check if the 'usuarios' table exists quickly
    const [rows] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'usuarios'");

    if (rows.length > 0) {
      console.log('[AutoMigrate] Esquema detectado. Verificando actualizaciones...');
      
      // Auto-migración no destructiva de columnas opcionales de geocobertura
      const [cols] = await connection.query<RowDataPacket[]>("SHOW COLUMNS FROM prestadores LIKE 'lat_cobertura'");
      if (cols.length === 0) {
        console.log('[AutoMigrate] Añadiendo columnas de cobertura geográfica a la tabla prestadores...');
        await connection.query(`ALTER TABLE prestadores 
          ADD COLUMN lat_cobertura DECIMAL(10, 6) NULL,
          ADD COLUMN lng_cobertura DECIMAL(10, 6) NULL,
          ADD COLUMN radio_cobertura INT NULL DEFAULT 3000
        `);
        console.log('[AutoMigrate] Columnas añadidas exitosamente.');
      } else {
        console.log('[AutoMigrate] Columnas de cobertura ya existen. No se requiere migración.');
      }

      return;
    }

    console.log('[AutoMigrate] Base de datos vacía detectada. Aplicando init.sql...');
    
    const initSqlPath = path.join(__dirname, '..', '..', '..', 'database', 'init.sql');
    if (!fs.existsSync(initSqlPath)) {
      console.warn(`[AutoMigrate] Archivo init.sql no encontrado en: ${initSqlPath}. Omitiendo migración.`);
      return;
    }

    const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
    
    // Execute the entire init.sql file.
    await connection.query(sqlContent);
    
    console.log('[AutoMigrate] Migración completada exitosamente.');
  } catch (error) {
    console.error('[AutoMigrate] Advertencia durante la verificación de esquema:', error);
    // We don't re-throw the error so the server continues to start
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
