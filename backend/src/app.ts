import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import apiRoutes from './routes/apiRoutes';
import pool from './config/db';
import { ensureDatabaseSchema } from './config/initDb';
import { seedPasswords } from './config/seedPasswords';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Auto-migrate schema and seed passwords
const initializeSystem = async () => {
  await ensureDatabaseSchema();
  await seedPasswords();
};
initializeSystem();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', apiRoutes);

app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.status(200).json({ status: 'OK', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected', error: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
