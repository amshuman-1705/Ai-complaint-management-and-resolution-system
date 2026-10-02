import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserAuthPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2026';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJWT = (payload: UserAuthPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyJWT = (token: string): UserAuthPayload => {
  return jwt.verify(token, JWT_SECRET) as UserAuthPayload;
};
