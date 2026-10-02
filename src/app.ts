import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname, '../public')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'AI Multi-Organization Complaint System API Engine',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
