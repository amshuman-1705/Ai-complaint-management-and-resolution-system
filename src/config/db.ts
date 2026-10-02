import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Vercel runs in an ephemeral filesystem. SQLite must live under /tmp and the
// Prisma DATABASE_URL must point there or Prisma will try to open a non-existent
// file in the function bundle.
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

  process.env.DATABASE_URL = `file:${tmpDbPath}`;
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const ensureSeedData = async () => {
  try {
    const orgCount = await prisma.organization.count();
    if (orgCount === 0) {
      const { seedDatabase } = await import('../seed');
      await seedDatabase();
    }
  } catch (error) {
    console.warn('Unable to ensure default seed data:', error);
  }
};

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Prisma Relational Database Engine');
    await ensureSeedData();
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
  }
};
