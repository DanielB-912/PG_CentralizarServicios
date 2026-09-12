import bcrypt from 'bcryptjs';
import pool from './db';
import { RowDataPacket } from 'mysql2';

const seeds = [
  { email: 'admin@univalle.edu', pass: 'Admin123!' },
  { email: 'cliente@correo.com', pass: 'Cliente123!' },
  { email: 'plomero@servicios.com', pass: 'Plomero123!' },
  { email: 'electricista@servicios.com', pass: 'Electricista123!' },
  { email: 'carpintero@servicios.com', pass: 'Carpintero123!' },
  { email: 'albanil@servicios.com', pass: 'Albanil123!' },
  { email: 'gasista@servicios.com', pass: 'Gasista123!' },
  { email: 'sistemas@servicios.com', pass: 'Sistemas123!' },
  { email: 'arquitecto@servicios.com', pass: 'Arquitecto123!' },
  { email: 'abogado@servicios.com', pass: 'Abogado123!' }
];

export const seedPasswords = async () => {
  let connection;
  try {
    console.log('[Seed] Verificando contraseñas semilla...');
    connection = await pool.getConnection();

    for (const seed of seeds) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT id_usuario, password_hash FROM usuarios WHERE email = ?',
        [seed.email]
      );
      
      if (rows.length > 0) {
        const user = rows[0];
        const isMatch = await bcrypt.compare(seed.pass, user.password_hash);
        
        if (!isMatch) {
          console.log(`[Seed] Actualizando hash para ${seed.email}...`);
          const newHash = await bcrypt.hash(seed.pass, 10);
          await connection.execute(
            'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
            [newHash, user.id_usuario]
          );
        }
      }
    }
    console.log('[Seed] Verificación completada.');
  } catch (error) {
    console.error('[Seed] Error verificando contraseñas:', error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
