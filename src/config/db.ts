import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connected to Prisma Relational Database Engine');
  } catch (error) {
    console.error('❌ Database Connection Error:', error);
    process.exit(1);
  }
};
