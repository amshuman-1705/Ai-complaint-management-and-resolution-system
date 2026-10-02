import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// On Vercel serverless, copy database initialized during build to /tmp/dev.db
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  const localDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  if (!fs.existsSync(tmpDbPath)) {
    try {
      if (fs.existsSync(localDbPath)) {
        fs.copyFileSync(localDbPath, tmpDbPath);
      } else {
        fs.writeFileSync(tmpDbPath, '');
      }
    } catch (e) {
      console.warn('Unable to copy dev.db to /tmp:', e);
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
