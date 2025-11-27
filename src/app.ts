import express from 'express';
import reportRoutes from './routes/reportRoutes';
import path from 'path';
import multer from 'multer';
import { authenticateJWT } from './middleware/auth';
import authRoutes from './routes/authRoutes';


const app = express();
app.use(express.json());

// health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// register report routes
app.use('/reports', reportRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ code: 'UPLOAD_ERROR', message: err.message });
  }
  res.status(500).json({ code: 'SERVER_ERROR', message: err.message || 'Internal Server Error' });
});


app.use('/auth', authRoutes);

// protect report routes
app.use('/reports', authenticateJWT, reportRoutes);

export default app;