import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 8000;

connectDB();

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 AI Multi-Tenant Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 REST API Endpoint: http://localhost:${PORT}/api/v1`);
  });
}

export default app;
