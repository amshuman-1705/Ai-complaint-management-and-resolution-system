import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/security';
import { UserAuthPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: UserAuthPayload;
  orgId?: string;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
