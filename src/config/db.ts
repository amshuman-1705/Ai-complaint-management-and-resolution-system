import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// On Vercel serverless, SQLite requires writing to /tmp/dev.db
if (process.env.VERCEL && process.env.DATABASE_URL?.includes('/tmp')) {
  const dbPath = '/tmp/dev.db';
  if (!fs.existsSync(dbPath)) {
    try {
      fs.writeFileSync(dbPath, '');
    } catch (e) {
      console.warn('Unable to initialize /tmp/dev.db:', e);
    }
  }
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Prisma Relational Database Engine');
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
  }
};
