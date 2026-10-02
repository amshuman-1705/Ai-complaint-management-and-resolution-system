import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/security';
import { UserAuthPayload } from '../types';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: UserAuthPayload;
  orgId?: string;
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Missing or malformed Bearer token.',
      timestamp: new Date().toISOString(),
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyJWT(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true, organization: true },
    });

    if (!user || !user.organization || user.orgId !== decoded.orgId) {
      return res.status(401).json({
        success: false,
        message: 'Session invalid. User or tenant no longer exists. Please log in again.',
        timestamp: new Date().toISOString(),
      });
    }

    req.user = decoded;
    req.orgId = decoded.orgId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired JWT authentication token.',
      timestamp: new Date().toISOString(),
    });
  }
};
